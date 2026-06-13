<?php
/* 주간회의 데이터 저장 API (cafe24 PHP + MySQL) — 레코드 단위 저장본
   recs 테이블: (store, id) 단위로 한 레코드씩 저장 → 여러 명이 동시에
   서로 다른 칸을 편집해도 덮어쓰지 않는다. seq(자동증가)로 정렬 순서 보존.
   - GET  ?all=1            : 전체를 스토어별 배열로 반환 {people:[...], ...}
   - POST ?op=put&store=X   : 본문(JSON 객체, id 필수) 1건 업서트
   - POST ?op=del&store=X&id=Y : 1건 삭제
   - POST ?op=bulk&store=X  : 본문(JSON 배열) 일괄 업서트 (시드·가져오기용)
   기존 kv(스토어=배열) 데이터는 recs가 비어 있을 때 1회 자동 이전된다. */

require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_OFF); // 접속 실패를 예외 대신 코드로 처리

$STORES = ['people', 'sched', 'agenda', 'adminrec', 'members', 'biz', 'bizlog', 'research', 'meta'];

if (API_TOKEN !== '' && ($_GET['token'] ?? '') !== API_TOKEN) {
  http_response_code(403); echo '{"error":"forbidden"}'; exit;
}

$db = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($db->connect_errno) { http_response_code(500); echo '{"error":"db connect"}'; exit; }
$db->set_charset('utf8mb4');
$db->query('CREATE TABLE IF NOT EXISTS recs (
  seq BIGINT NOT NULL AUTO_INCREMENT,
  store VARCHAR(32) NOT NULL,
  id VARCHAR(64) NOT NULL,
  data MEDIUMTEXT,
  PRIMARY KEY (seq),
  UNIQUE KEY us (store, id)
) DEFAULT CHARSET=utf8mb4');

// ---- 기존 kv(스토어=배열) → recs 1회 이전 ----
$db->query('CREATE TABLE IF NOT EXISTS kv (k VARCHAR(32) PRIMARY KEY, v MEDIUMTEXT) DEFAULT CHARSET=utf8mb4');
$row = $db->query('SELECT COUNT(*) c FROM recs')->fetch_assoc();
if ((int)$row['c'] === 0) {
  $res = $db->query('SELECT k, v FROM kv');
  if ($res) {
    $ins = $db->prepare('INSERT IGNORE INTO recs (store, id, data) VALUES (?, ?, ?)');
    while ($kv = $res->fetch_assoc()) {
      if (!in_array($kv['k'], $STORES, true)) continue;
      $arr = json_decode($kv['v'], true);
      if (!is_array($arr)) continue;
      foreach ($arr as $el) {
        if (!is_array($el) || !isset($el['id'])) continue;
        $id = (string)$el['id'];
        $data = json_encode($el, JSON_UNESCAPED_UNICODE);
        $ins->bind_param('sss', $kv['k'], $id, $data);
        $ins->execute();
      }
    }
  }
}

// ---- 전체 조회 ----
if (isset($_GET['all'])) {
  $out = array_fill_keys($STORES, []);
  $res = $db->query('SELECT store, data FROM recs ORDER BY seq');
  while ($r = $res->fetch_assoc()) {
    if (!in_array($r['store'], $STORES, true)) continue;
    $obj = json_decode($r['data']);
    if ($obj !== null) $out[$r['store']][] = $obj; // 깨진 행은 건너뜀
  }
  echo json_encode($out, JSON_UNESCAPED_UNICODE); exit;
}

$store = $_GET['store'] ?? '';
if (!in_array($store, $STORES, true)) { http_response_code(400); echo '{"error":"bad store"}'; exit; }

$op = $_GET['op'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';

// ---- 1건 업서트 ----
if ($isPost && $op === 'put') {
  $rec = json_decode(file_get_contents('php://input'), true);
  if (!is_array($rec) || !isset($rec['id'])) { http_response_code(400); echo '{"error":"bad record"}'; exit; }
  $id = (string)$rec['id'];
  $data = json_encode($rec, JSON_UNESCAPED_UNICODE);
  $stmt = $db->prepare('INSERT INTO recs (store, id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)');
  $stmt->bind_param('sss', $store, $id, $data);
  if (!$stmt->execute()) { http_response_code(500); echo '{"error":"write"}'; exit; }
  echo '{"ok":true}'; exit;
}

// ---- 1건 삭제 ----
if ($isPost && $op === 'del') {
  $id = (string)($_GET['id'] ?? '');
  if ($id === '') { http_response_code(400); echo '{"error":"no id"}'; exit; }
  $stmt = $db->prepare('DELETE FROM recs WHERE store = ? AND id = ?');
  $stmt->bind_param('ss', $store, $id);
  if (!$stmt->execute()) { http_response_code(500); echo '{"error":"delete"}'; exit; }
  echo '{"ok":true}'; exit;
}

// ---- 일괄 업서트 (배열만 허용) ----
if ($isPost && $op === 'bulk') {
  $arr = json_decode(file_get_contents('php://input'), true);
  if (!is_array($arr) || !array_is_list($arr)) { http_response_code(400); echo '{"error":"not array"}'; exit; }
  $stmt = $db->prepare('INSERT INTO recs (store, id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)');
  foreach ($arr as $rec) {
    if (!is_array($rec) || !isset($rec['id'])) continue;
    $id = (string)$rec['id'];
    $data = json_encode($rec, JSON_UNESCAPED_UNICODE);
    $stmt->bind_param('sss', $store, $id, $data);
    if (!$stmt->execute()) { http_response_code(500); echo '{"error":"bulk"}'; exit; }
  }
  echo '{"ok":true}'; exit;
}

http_response_code(400); echo '{"error":"bad op"}';
