<?php
require_once 'common.php'; require_once '../db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed.', 405);

// The customer always comes from the server session - a customerId sent by the app is never trusted.
$d = input_json(); $cid = require_customer();
$sid = (int)($d['serviceId'] ?? 0);
$date = trim((string)($d['date'] ?? '')); $time = trim((string)($d['time'] ?? ''));
if ($sid < 1 || $date === '' || $time === '') json_error('Service, date and time are required.');

// Validate format, real calendar date and that the slot is in the future (South African time).
$tz = new DateTimeZone('Africa/Johannesburg');
$when = DateTime::createFromFormat('Y-m-d H:i', "$date $time", $tz);
if (!$when || $when->format('Y-m-d H:i') !== "$date $time") json_error('Invalid date or time.');
if ($when <= new DateTime('now', $tz)) json_error('Please choose a date and time in the future.');

$cu = $conn->prepare("SELECT CustomerID FROM customers WHERE CustomerID=? LIMIT 1");
$cu->bind_param('i', $cid); $cu->execute();
if (!$cu->get_result()->fetch_assoc()) json_error('Customer account was not found.', 401);

$sv = $conn->prepare("SELECT Price,ServiceName FROM services WHERE ServiceID=? AND (AvailabilityStatus='Available' OR AvailabilityStatus IS NULL OR AvailabilityStatus='')");
$sv->bind_param('i', $sid); $sv->execute(); $service = $sv->get_result()->fetch_assoc();
if (!$service) json_error('Selected service was not found.', 404);

// Duplicate protection 1: the same customer cannot hold two active bookings at the same date and time
// (this also stops a double-tap or a retry after a timeout from creating a second booking).
$mine = $conn->prepare("SELECT BookingID FROM bookings WHERE CustomerID=? AND BookingDate=? AND BookingTime=? AND BookingStatus!='Cancelled' LIMIT 1");
$mine->bind_param('iss', $cid, $date, $time); $mine->execute();
if ($row = $mine->get_result()->fetch_assoc()) json_error('You already have a booking at this date and time (reference #' . $row['BookingID'] . ').', 409);

// Duplicate protection 2: the slot for this service must be free.
$chk = $conn->prepare("SELECT BookingID FROM bookings WHERE ServiceID=? AND BookingDate=? AND BookingTime=? AND BookingStatus!='Cancelled' LIMIT 1");
$chk->bind_param('iss', $sid, $date, $time); $chk->execute(); $chk->store_result();
if ($chk->num_rows > 0) json_error('This time slot is already booked. Please choose another time.', 409);

$amount = (float)$service['Price']; $status = 'Confirmed';
$msg = "Your booking for " . $service['ServiceName'] . " on " . $date . " at " . $time . " is confirmed.";
try {
    $conn->begin_transaction();
    $b = $conn->prepare("INSERT INTO bookings(CustomerID,ServiceID,BookingDate,BookingTime,BookingStatus,BookingAmount) VALUES(?,?,?,?,?,?)");
    $b->bind_param('iisssd', $cid, $sid, $date, $time, $status, $amount); $b->execute();
    $bid = $conn->insert_id;
    $n = $conn->prepare("INSERT INTO notifications(CustomerID,BookingID,Message) VALUES(?,?,?)");
    $n->bind_param('iis', $cid, $bid, $msg); $n->execute();
    $p = $conn->prepare("INSERT INTO paymentstatus(BookingID,AmountDue,FinalAmount) VALUES(?,?,?)");
    $p->bind_param('idd', $bid, $amount, $amount); $p->execute();
    $conn->commit();
} catch (mysqli_sql_exception $e) {
    $conn->rollback();
    // 1062 = two people raced for the same slot; the unique index on active bookings caught it.
    if ((int)$e->getCode() === 1062) json_error('This time slot is already booked. Please choose another time.', 409);
    json_error('Booking failed. Please try again.', 500);
}
json_ok(['message' => $msg, 'bookingId' => $bid]);
?>
