<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Africa/Johannesburg');
// Never leak PHP errors/HTML to the app: always answer with JSON.
set_exception_handler(function ($e) {
    if (!headers_sent()) http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Something went wrong on the server. Please try again.']);
});
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && preg_match('#^(https?://(localhost|127\.0\.0\.1)(:\d+)?|capacitor://localhost|ionic://localhost)$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$sessionToken = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
if ($sessionToken !== '' && preg_match('/^[A-Za-z0-9,-]{16,128}$/', $sessionToken)) session_id($sessionToken);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);
// Strict mode: PHP ignores a session id it did not issue itself (blocks session fixation with a made-up token).
ini_set('session.use_strict_mode', '1');
session_start();
function input_json() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}
function json_ok($data = []) { echo json_encode(array_merge(['success'=>true], $data)); exit; }
function json_error($message, $status=400) { http_response_code($status); echo json_encode(['success'=>false,'message'=>$message]); exit; }
// Character length that works even when the optional mbstring extension is not installed.
function text_length($s) { return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s); }
function require_admin() {
    $id = (int)($_SESSION['admin_id'] ?? 0);
    if ($id < 1) json_error('Your admin session has expired. Please log in again.', 401);
    return $id;
}
function require_customer() {
    $id = (int)($_SESSION['customer_id'] ?? 0);
    if ($id < 1) json_error('Your customer session has expired. Please log in again.', 401);
    return $id;
}
function save_uploaded_image($dataUrl, $originalName, $prefix) {
    if (!is_string($dataUrl) || !preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#', $dataUrl, $m)) return '';
    $bytes = base64_decode($m[2], true);
    if ($bytes === false || strlen($bytes) > 5 * 1024 * 1024) return '';
    // Trust the file's real content, not the declared type: it must decode as a JPG, PNG or WebP image.
    $info = @getimagesizefromstring($bytes);
    $allowed = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($allowed[$info[2]])) return '';
    $extension = $allowed[$info[2]];
    $directory = __DIR__ . '/uploads';
    if (!is_dir($directory) && !mkdir($directory, 0755, true)) return '';
    $safe = $prefix . '-' . bin2hex(random_bytes(8)) . '.' . $extension;
    if (file_put_contents($directory . '/' . $safe, $bytes) === false) return '';
    return 'uploads/' . $safe;
}
?>
