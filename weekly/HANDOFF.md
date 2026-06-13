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
- [x] cafe24 `/www/40th/weekly/` 에 업로드 완료, `http://40th.klsi.org/40th/weekly/` 정상 작동.
- [x] `app.js` 팀 공유 모드 켬 + 서버 실패 시 localStorage 자동 폴백, 상태 배너, 1회 이관 confirm.
- [x] **팀 공유 가동 확인됨 (2026-06-11)** — check.php "MySQL 연결: 성공", 게시판 초록 배너 표시.
  - DB: localhost / prevolee94 / DB 비밀번호는 FTP와 별개 (서버의 config.php에만 존재, 저장소엔 없음)
  - 진단 과정: PHP 8.4 라 mysqli 예외로 check.php 가 중간에 죽는 문제 → mysqli_report(OFF) 로 해결
- [ ] 보안 마무리: 서버에서 `check.php` 삭제, (선택) cafe24 「보안관리 > 디렉토리 접속설정」으로
      `/40th/weekly` 에 아이디/비번 잠금 — 외부인 열람 차단용으로 권장.

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

## 7. 2026-06-13 코드 검토 반영 (레코드 단위 저장으로 전환)

에이전트 코드 검토 후 데이터 안전성 개선:
- **저장 모델 변경**: 스토어 전체 배열 덮어쓰기 → **레코드 단위 업서트/삭제**(api.php `recs` 테이블,
  `(store,id)` 유니크 + `seq` 자동증가로 정렬 보존). 여러 명이 동시에 다른 칸을 편집해도 안 지워짐.
  - api 엔드포인트: `GET ?all=1`, `POST ?op=put&store=`, `POST ?op=del&store=&id=`, `POST ?op=bulk&store=`.
  - 기존 `kv`(스토어=배열) 데이터는 `recs`가 비었을 때 1회 자동 이전(kv는 백업으로 남김).
- 클라이언트 데이터층: `saveRec`/`delRec`/`saveBulk`(=persist). 편집/추가/삭제는 레코드 단위.
- **지연 레코드 결정적 id**: `sched_<week>_<pid>`, `admin_<week>`, `bizlog_<bizId>_<week>` → 두 브라우저 충돌 방지.
- **마이그레이션 1회화**: `meta` 스토어의 `schema` 버전으로 게이트(SCHEMA=1). 부팅마다 재실행/삭제구성원 부활 없음.
  신규 설치는 시드 후 곧장 schema 설정, 기존 데이터는 1회 보정 후 잠금. `seedThisWeek` 제거됨.
- api.php 검증 강화: put=객체+id 확인, bulk=배열 확인, 저장 실패 시 500, 깨진 행은 조회 시 skip.

⚠️ 배포 시 **app.js 와 api.php 를 반드시 함께 업로드**(둘 중 하나만 올리면 구/신 프로토콜 불일치). 캐시 버전 v14.

사용자 피드백: "의도는 연구원 9명의 주간일정·주간회의 기록을 문서/시트 대신 웹에서 관리하는 것" →
기존 양식 입력형을 버리고 실제 쓰던 구글문서(주간일정표)·구글시트(주간회의) 구조를 그대로 웹으로 옮김.

확정된 설계(사용자 답변):
- 첫 화면: 일정표·회의록 동등한 탭 / 입력: 칸 직접 클릭(시트처럼) / 이관 범위: 논의안건·행정/회원·사업·연구 전부 / 재정 금액 포함.

새 화면 5개: 주간일정표(사람×월~금 표, 주차 이동) · 주간회의(논의안건 + 행정/회원 + 가입/탈퇴 명단) ·
사업(상시 표) · 연구(연도별 용역 목록, 금액/입금 합계) · 구성원(명단 관리).

새 스토어 7종: people, sched(주차×사람 일정), agenda(주차별 안건), adminrec(주차별 행정),
members(가입/탈퇴 로그), biz(상시), research(상시). api.php $STORES 동일하게 변경됨.
초기 데이터 시드: 구성원 9명, 사업 8개, 연구과제 13건(시트 캡처 기준) — 스토어가 비어있을 때 1회 자동 입력.
입력 방식: 칸 수정 후 포커스 이동 시 자동 저장(change 위임). 주차 키 = 월요일 날짜(YYYY-MM-DD).

- [ ] 사용자: 새 index.html/app.js/style.css/api.php 4개 파일 재업로드 필요.
- [ ] 보안: check.php 삭제 + cafe24 「보안관리 > 디렉토리 접속설정」 잠금 (재정 정보 포함이므로 권장).
