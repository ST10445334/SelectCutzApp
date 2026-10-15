<?php
require_once 'common.php'; require_once '../db.php';

// Public: anyone can view the gallery.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    $r = $conn->query("SELECT GalleryID,Title,Caption,ImagePath,UploadedAt FROM gallery ORDER BY GalleryID DESC");
    if (!$r) json_error('Unable to load the gallery.', 500);
    $out = []; while ($row = $r->fetch_assoc()) $out[] = $row;
    echo json_encode($out); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed.', 405);

// Admin only: upload / delete.
$adminId = require_admin();
$d = input_json(); $action = $d['action'] ?? '';
if ($action === 'add') {
    $title = trim((string)($d['title'] ?? '')); $caption = trim((string)($d['caption'] ?? ''));
    if ($title === '' || text_length($title) > 100) json_error('A title of up to 100 characters is required.');
    if (text_length($caption) > 255) json_error('The caption must be 255 characters or fewer.');
    $img = save_uploaded_image($d['imageData'] ?? '', $d['imageName'] ?? '', 'gallery');
    if ($img === '') json_error('Please select a valid JPG, PNG or WebP image under 5 MB.');
    $s = $conn->prepare("INSERT INTO gallery(Title,Caption,ImagePath,UploadedBy) VALUES(?,?,?,?)");
    $s->bind_param('sssi', $title, $caption, $img, $adminId);
    if (!$s->execute()) json_error('Unable to save the gallery image.', 500);
    json_ok(['message' => 'Gallery image uploaded.', 'galleryId' => $conn->insert_id, 'imagePath' => $img]);
}
if ($action === 'delete') {
    $id = (int)($d['galleryId'] ?? 0); if ($id < 1) json_error('Invalid gallery image.');
    $q = $conn->prepare("SELECT ImagePath FROM gallery WHERE GalleryID=?"); $q->bind_param('i', $id); $q->execute();
    $row = $q->get_result()->fetch_assoc(); if (!$row) json_error('Gallery image not found.', 404);
    $x = $conn->prepare("DELETE FROM gallery WHERE GalleryID=?"); $x->bind_param('i', $id); $x->execute();
    // Remove the uploaded file too (never touch bundled assets).
    if (preg_match('#^uploads/[A-Za-z0-9._-]+$#', $row['ImagePath'])) @unlink(__DIR__ . '/' . $row['ImagePath']);
    json_ok(['message' => 'Gallery image deleted.']);
}
json_error('Invalid gallery action.');
?>
