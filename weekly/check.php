<?php
/* cafe24 환경 진단 — 업로드 후 브라우저로 이 파일에 접속하세요.
   PHP/MySQL 지원 여부와 config.php 접속정보가 맞는지 한눈에 확인합니다.
   확인이 끝나면 보안을 위해 서버에서 삭제하는 것을 권장합니다. */
require __DIR__ . '/config.php';
header('Content-Type: text/html; charset=utf-8');
echo "<meta charset='utf-8'><body style='font-family:sans-serif;line-height:1.8;padding:20px'>";
echo "<h2>cafe24 환경 진단</h2><ul>";

echo '<li>PHP 버전: <b>' . PHP_VERSION . '</b></li>';
echo '<li>mysqli 확장: <b>' . (extension_loaded('mysqli') ? 'O 사용 가능' : 'X 없음 (호스팅사 문의 필요)') . '</b></li>';

if (extension_loaded('mysqli')) {
  mysqli_report(MYSQLI_REPORT_OFF); // PHP 8.1+ 기본 예외 모드를 끄고 오류를 직접 표시
  if (DB_PASS === '여기에_FTP비밀번호') {
    echo '<li>MySQL 연결: <b style="color:#c0392b">설정 안 됨</b> — config.php 의 DB_PASS 가 아직 플레이스홀더입니다. 실제 비밀번호로 바꿔 업로드하세요.</li></ul></body>';
    exit;
  }
  $db = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
  if ($db->connect_errno) {
    echo '<li>MySQL 연결: <b style="color:#c0392b">실패</b> — ' . htmlspecialchars($db->connect_error) . '</li>';
    echo '<li>→ config.php 의 호스트/아이디/비밀번호/DB명을 확인하세요.</li>';
  } else {
    $db->set_charset('utf8mb4');
    $db->query('CREATE TABLE IF NOT EXISTS kv (k VARCHAR(32) PRIMARY KEY, v MEDIUMTEXT) DEFAULT CHARSET=utf8mb4');
    $cnt = $db->query("SELECT COUNT(*) c FROM kv")->fetch_assoc()['c'];
    echo '<li>MySQL 연결: <b style="color:#16a085">성공</b> (DB: ' . htmlspecialchars(DB_NAME) . ')</li>';
    echo '<li>kv 테이블: <b>준비됨</b> (현재 ' . $cnt . '개 스토어 저장)</li>';
    echo '<li>→ 정상입니다. 게시판을 새로고침하면 초록 배너(팀 공유 모드)가 표시됩니다.</li>';
  }
}
echo '</ul></body>';
