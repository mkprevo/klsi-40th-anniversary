<?php
/* cafe24 MySQL 접속정보
   cafe24 매니저 > 나의서비스관리 > MySQL 에서 DB를 신청(무료)하고 비밀번호를 설정하세요.
   cafe24 웹호스팅 기본값:
     - 호스트: localhost
     - 사용자/DB명: 호스팅 아이디와 동일 (예: myid)
     - 비밀번호: MySQL 에서 직접 설정한 값
   phpMyAdmin은 cafe24에서 제공되며 별도 설치가 필요 없습니다. */

define('DB_HOST', 'localhost');
define('DB_USER', 'prevolee94');
define('DB_PASS', '여기에_FTP비밀번호');  // FileZilla 접속에 쓰는 비밀번호와 동일 (직접 입력 후 업로드)
define('DB_NAME', 'prevolee94');

/* (선택) 간단한 공유 토큰. 값을 정하면 meeting.js 의 CONFIG.token 과 동일하게 맞추세요.
   비워두면 인증 없이 누구나 API에 접근할 수 있으니, 외부 공개 서버라면 설정을 권장합니다. */
define('API_TOKEN', '');
