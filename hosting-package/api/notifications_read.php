<?php
require_once 'common.php'; require_once '../db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed.', 405);
$d = input_json(); $cid = require_customer();
// Marks one notification (notificationId) or all of the customer's notifications as read.
$id = (int)($d['notificationId'] ?? 0);
if ($id > 0) {
    $s = $conn->prepare("UPDATE notifications SET NotificationStatus='Read' WHERE NotificationID=? AND CustomerID=?");
    $s->bind_param('ii', $id, $cid);
} else {
    $s = $conn->prepare("UPDATE notifications SET NotificationStatus='Read' WHERE CustomerID=? AND NotificationStatus='Unread'");
    $s->bind_param('i', $cid);
}
$s->execute();
json_ok(['message' => 'Notifications updated.']);
?>
