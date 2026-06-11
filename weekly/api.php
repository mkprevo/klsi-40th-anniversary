<?php
/* 주간회의 데이터 저장 API (cafe24 PHP + MySQL)
   스토어별 JSON 한 묶음을 kv 테이블에 저장한다. 표는 처음 호출 시 자동 생성된다.
   - GET  ?all=1        : 전체 스토어를 한 번에 반환  {people:[...], ...}
   - GET  ?store=people : 해당 스토어 배열 반환
   - POST ?store=people : 본문(JSON 배열)을 해당 스토어로 저장 */

require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

$STORES = ['people', 'projects', 'members', 'meetings', 'entries', 'updates', 'schedule'];

// (선택) 토큰 검증
if (API_TOKEN !== '' && ($_GET['token'] ?? '') !== API_TOKEN) {
  http_response_code(403); echo '{"error":"forbidden"}'; exit;
}

mysqli_report(MYSQLI_REPORT_OFF); // PHP 8.1+ 예외 모드 해제(실패 시 JSON 오류로 응답)
$db = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($db->connect_errno) { http_response_code(500); echo '{"error":"db connect"}'; exit; }
$db->set_charset('utf8mb4');
$db->query('CREATE TABLE IF NOT EXISTS kv (k VARCHAR(32) PRIMARY KEY, v MEDIUMTEXT) DEFAULT CHARSET=utf8mb4');

// 전체 조회
if (isset($_GET['all'])) {
  $out = array_fill_keys($STORES, []);
  $res = $db->query('SELECT k, v FROM kv');
  while ($row = $res->fetch_assoc()) {
    if (in_array($row['k'], $STORES, true)) $out[$row['k']] = json_decode($row['v']);
  }
  echo json_encode($out); exit;
}

$k = $_GET['store'] ?? '';
if (!in_array($k, $STORES, true)) { http_response_code(400); echo '[]'; exit; }

// 저장
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $v = file_get_contents('php://input');
  if (json_decode($v) === null && trim($v) !== '[]') { http_response_code(400); echo '{"error":"bad json"}'; exit; }
  $stmt = $db->prepare('REPLACE INTO kv (k, v) VALUES (?, ?)');
  $stmt->bind_param('ss', $k, $v);
  $stmt->execute();
  echo '{"ok":true}'; exit;
}

// 단일 조회
$stmt = $db->prepare('SELECT v FROM kv WHERE k = ?');
$stmt->bind_param('s', $k);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
echo $row ? $row['v'] : '[]';
