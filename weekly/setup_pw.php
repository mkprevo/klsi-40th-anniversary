<?php
/* 주간회의 게시판 비밀번호(암호창) 설정 도구 — 1회용.
   사용법:
     1) 이 파일을 /40th/weekly/ 에 업로드
     2) 브라우저로 .../40th/weekly/setup_pw.php 접속
     3) 아이디·비밀번호를 정해 [설정] 클릭 → .htaccess / .htpasswd 자동 생성
     4) 게시판 재접속 시 로그인 창(암호창)이 뜨면 성공
     5) 보안을 위해 이 파일(setup_pw.php)을 FTP로 삭제
   비밀번호는 서버에만 저장되며, 화면/채팅에 남지 않습니다. */

header('Content-Type: text/html; charset=utf-8');

// Apache .htpasswd 표준 해시(APR1-MD5) 생성 — 모든 Apache에서 호환
function apr1($password) {
    $salt = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 8);
    $len = strlen($password);
    $bin = pack('H32', md5($password . $salt . $password));
    $text = $password . '$apr1$' . $salt;
    for ($i = $len; $i > 0; $i -= 16) $text .= substr($bin, 0, min(16, $i));
    for ($i = $len; $i > 0; $i >>= 1) $text .= ($i & 1) ? chr(0) : $password[0];
    $bin = pack('H32', md5($text));
    for ($i = 0; $i < 1000; $i++) {
        $new = ($i & 1) ? $password : $bin;
        if ($i % 3) $new .= $salt;
        if ($i % 7) $new .= $password;
        $new .= ($i & 1) ? $bin : $password;
        $bin = pack('H32', md5($new));
    }
    $tmp = '';
    for ($i = 0; $i < 5; $i++) {
        $k = $i + 6; $j = $i + 12; if ($j == 16) $j = 5;
        $tmp = $bin[$i] . $bin[$k] . $bin[$j] . $tmp;
    }
    $tmp = chr(0) . chr(0) . $bin[11] . $tmp;
    $tmp = strtr(strrev(substr(base64_encode($tmp), 2)),
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
        './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    return '$apr1$' . $salt . '$' . $tmp;
}

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['user'] ?? '');
    $pw   = (string)($_POST['pw'] ?? '');
    if ($user === '' || $pw === '' || !preg_match('/^[A-Za-z0-9_]+$/', $user)) {
        $msg = '<b style="color:#c0392b">아이디(영문/숫자)와 비밀번호를 모두 입력하세요.</b>';
    } else {
        $dir = __DIR__;
        $htpasswd = $user . ':' . apr1($pw) . "\n";
        $htaccess = "AuthType Basic\nAuthName \"KLSI Weekly - login\"\nAuthUserFile " . $dir . "/.htpasswd\nRequire valid-user\n";
        $ok1 = @file_put_contents($dir . '/.htpasswd', $htpasswd) !== false;
        $ok2 = @file_put_contents($dir . '/.htaccess', $htaccess) !== false;
        if ($ok1 && $ok2) {
            $msg = '<b style="color:#16a085">설정 완료!</b> 이제 게시판에 접속하면 로그인 창이 뜹니다.<br>'
                 . '아이디 <b>' . htmlspecialchars($user) . '</b> 와 방금 정한 비밀번호로 로그인하세요.<br>'
                 . '<b style="color:#c0392b">→ 보안을 위해 이 파일(setup_pw.php)을 FTP에서 삭제하세요.</b>';
        } else {
            $msg = '<b style="color:#c0392b">파일 자동 생성 실패</b> (서버 쓰기권한 문제). 아래 내용을 직접 파일로 만들어 업로드하세요.<br>'
                 . '<p>· <b>.htpasswd</b> 파일 내용:</p><pre>' . htmlspecialchars($htpasswd) . '</pre>'
                 . '<p>· <b>.htaccess</b> 파일 내용:</p><pre>' . htmlspecialchars($htaccess) . '</pre>';
        }
    }
}
?>
<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>비밀번호 설정</title>
<style>body{font-family:sans-serif;max-width:560px;margin:40px auto;padding:0 16px;line-height:1.7;color:#333}
input{font-size:1rem;padding:8px;width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:5px;margin-top:4px}
button{font-size:1rem;padding:10px 20px;margin-top:14px;background:#1abc9c;color:#fff;border:0;border-radius:6px;cursor:pointer}
pre{background:#f4f4f4;padding:10px;border-radius:5px;overflow:auto}</style></head><body>
<h2>주간회의 게시판 — 암호창 설정</h2>
<p class="hint">아이디와 비밀번호를 정하면, 게시판 접속 시 로그인 창이 뜨도록 설정합니다.</p>
<?php if ($msg) echo "<p>$msg</p>"; ?>
<form method="post">
  <label>아이디 (영문/숫자)<input name="user" value="klsi"></label>
  <label style="display:block;margin-top:10px">비밀번호<input name="pw" type="password" autocomplete="new-password"></label>
  <button type="submit">설정</button>
</form>
<p style="color:#888;font-size:.9rem;margin-top:20px">※ 설정 후 이 파일은 반드시 삭제하세요. 비밀번호를 바꾸려면 이 파일을 다시 올려 재실행하면 됩니다.</p>
</body></html>
