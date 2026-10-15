<?php
require_once 'common.php'; require_once '../db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed.', 405);
$d = input_json(); $cid = require_customer(); $bid = (int)($d['bookingId'] ?? 0);
if ($bid < 1) json_error('Invalid booking.');

// Only the owner of a booking can see or cancel it.
$s = $conn->prepare("SELECT b.BookingDate,b.BookingTime,b.BookingStatus,sv.ServiceName FROM bookings b JOIN services sv ON sv.ServiceID=b.ServiceID WHERE b.BookingID=? AND b.CustomerID=? LIMIT 1");
$s->bind_param('ii', $bid, $cid); $s->execute(); $bk = $s->get_result()->fetch_assoc();
if (!$bk) json_error('Booking was not found.', 404);
if ($bk['BookingStatus'] === 'Cancelled') json_error('This booking is already cancelled.', 409);
$when = new DateTime($bk['BookingDate'] . ' ' . $bk['BookingTime'], new DateTimeZone('Africa/Johannesburg'));
if ($when <= new DateTime('now', new DateTimeZone('Africa/Johannesburg'))) json_error('Past bookings cannot be cancelled.', 409);

$conn->begin_transaction();
$u = $conn->prepare("UPDATE bookings SET BookingStatus='Cancelled' WHERE BookingID=? AND CustomerID=? AND BookingStatus!='Cancelled'");
$u->bind_param('ii', $bid, $cid); $u->execute();
if ($u->affected_rows === 0) { $conn->rollback(); json_error('This booking is already cancelled.', 409); }
$msg = "Your booking for " . $bk['ServiceName'] . " on " . $bk['BookingDate'] . " at " . substr($bk['BookingTime'], 0, 5) . " has been cancelled.";
$n = $conn->prepare("INSERT INTO notifications(CustomerID,BookingID,Message) VALUES(?,?,?)");
$n->bind_param('iis', $cid, $bid, $msg); $n->execute();
$p = $conn->prepare("UPDATE paymentstatus SET Status='Cancelled' WHERE BookingID=?");
$p->bind_param('i', $bid); $p->execute();
$conn->commit();
json_ok(['message' => 'Booking cancelled successfully.']);
?>
