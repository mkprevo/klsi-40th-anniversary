# 작업 진행 기록 (HANDOFF)

> 새 세션에서 이어서 작업하기 위한 인수인계 메모. 최종 업데이트: 2026-06-11

## 1. 프로젝트 개요

- 저장소: `mkprevo/klsi-40th-anniversary`
- 작업 브랜치: `claude/weekly-meeting-relational-db-jqnc4c`
- 한국노동사회연구소 40주년 기념 사이트 + **주간회의 업무관리 게시판** 추가 작업.

## 2. 서버/배포 환경 (실제 확인됨)

- cafe24 웹호스팅, FileZilla(FTP)로 업로드.
- 웹 루트: `/www`
- 사이트 구조: `/www/40th/` 아래에 게시판별 하위 폴더가 들어감.
  - 기존 폴더: `media_data`, `review`, `photos`, `uploads`, `vote`
  - **이번에 추가: `/www/40th/weekly/`**  ← 주간회의 게시판
- 접속 주소: **`도메인/40th/weekly/`** (폴더명은 `40th` 이며 `40th_klsi` 아님에 주의)
- 업로드 완료 + 브라우저 접속 정상 확인됨.

## 3. 현재 상태 (어디까지 했나)

- [x] 주간회의 시스템을 독립 하위 폴더 `weekly/` 로 구성 (FileZilla 드롭인 가능).
- [x] cafe24 `/www/40th/weekly/` 에 6개 파일 업로드 완료, 화면 정상 표시.
- [x] `app.js` 팀 공유 모드 켬(`CONFIG.api='api.php'`) + 서버 실패 시 localStorage 자동 폴백,
      상단 상태 배너(팀 공유/로컬), 서버 빈 경우 로컬 데이터 1회 이관 confirm 구현.
- [ ] **사용자 작업 남음**: cafe24 MySQL DB 신청 → `config.php` 접속정보 입력 →
      `app.js`+`config.php` 재업로드 → `check.php` 로 성공 확인 → `check.php` 삭제.

## 4. `weekly/` 폴더 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 3개 화면(개인 입력 / 주간회의 / 사람·사업 관리), 폴더 전용 상대경로 |
| `app.js` | 데이터층 + 화면 로직. 상단 `CONFIG = { api: '', token: '' }` 가 저장 모드 스위치 |
| `style.css` | 이 폴더 전용 스타일 (루트 의존 없음, 독립 동작) |
| `api.php` | JSON 저장 API. `kv` 테이블 첫 호출 시 자동 생성. GET `?all=1` / `?store=`, POST `?store=` |
| `config.php` | MySQL 접속정보 (현재 플레이스홀더 값) + 선택 `API_TOKEN` |
| `check.php` | 환경 진단 페이지 (PHP버전·mysqli·MySQL연결 확인) |

데이터 스토어 7종: `people, projects, members, meetings, entries, updates, schedule`
(재정·회원변동은 1:1 이라 `meetings` 레코드에 병합)

## 5. 다음 세션에서 할 일 — 팀 공유 켜기

전환 자체는 코드 한 줄이지만, **사용자가 cafe24에서 MySQL DB를 만들고 접속정보를 넣어야** 동작함.

### 단계
1. **PHP/MySQL 지원 확인** — 브라우저로 `도메인/40th/weekly/check.php` 접속.
   - "MySQL 연결: 성공" → 다음 단계 진행.
   - "mysqli 없음" 또는 "연결 실패" → cafe24 매니저에서 MySQL DB 신청 필요.
2. **cafe24 MySQL DB 신청** — cafe24 매니저 > 나의서비스관리 > MySQL 에서 DB 생성, 비밀번호 설정.
   - cafe24 기본: 호스트 `localhost`, 사용자/DB명 = 호스팅 아이디, 비밀번호 = 직접 설정값.
3. **`weekly/config.php` 채우기** — `DB_USER` / `DB_PASS` / `DB_NAME` 실제 값 입력 (현재는 플레이스홀더).
4. **스위치 켜기** — `weekly/app.js` 상단을 `const CONFIG = { api: 'api.php', token: '' };` 로 변경.
   - (외부 보안 강화 시) `config.php` 의 `API_TOKEN` 과 `app.js` 의 `CONFIG.token` 을 같은 값으로.
5. **재업로드** — 수정한 `config.php`, `app.js` 를 FileZilla로 다시 올림.
6. **확인** — 한 브라우저에서 데이터 입력 → 다른 브라우저/PC에서 동일 데이터 보이면 성공.
7. **보안** — 확인 끝나면 `check.php` 는 서버에서 삭제 권장.

### 코드 작업 시 주의/검토 포인트 (다음 세션에서 결정)
- 현재 `app.js` 의 `persist()` 는 서버 저장 실패 시 `alert`만 띄움. config가 비어있는 채로
  `CONFIG.api='api.php'` 로 켜지면 사용자가 계속 alert를 보게 됨 → **config 작성 후 켜는 순서 유지.**
- (개선 검토안) 서버 연결 실패 시 localStorage 로 자동 폴백하도록 `boot()`/`persist()` 보강 가능.
  단순함 유지 vs. 견고함 트레이드오프 — 사용자와 상의 후 결정.
- 저장 모델: 스토어별 전체 배열을 통째로 POST(REPLACE)하는 방식. 동시 편집 시 마지막 저장이
  덮어씀(last-write-wins). 소규모 팀이라 현재는 수용 가능. 동시성 이슈 생기면 레코드 단위 API로 확장.

## 6. 미해결/추가 논의 사항
- 게시판 디자인을 기존 게시판(review/vote 등)과 통일할지 — 사용자가 기존 스타일 공유 시 반영.
- 연구소 구성원·사업 목록 초기 데이터 입력 여부.
- `weekly` 폴더명(=URL) 변경 희망 시: 폴더명만 바꿔 업로드 + 루트 `index.html` 링크 한 줄 수정.
