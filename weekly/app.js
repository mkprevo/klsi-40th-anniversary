/* 주간회의 업무관리 — 구글문서/시트 이관형
   화면: 주간일정표(사람×요일, 칸 직접 입력) · 주간회의(논의안건+행정/회원) · 사업 · 연구 · 구성원
   저장: api.php(MySQL 팀 공유) / 서버 실패 시 localStorage 자동 폴백 */

// ---------- 설정 ----------
const CONFIG = { api: 'api.php', token: '' };

// ---------- 데이터층 ----------
// 'meta'는 마이그레이션 버전 등 내부 상태 저장용(화면에는 안 쓰임)
const STORES = ['people', 'sched', 'agenda', 'adminrec', 'members', 'biz', 'bizlog', 'research', 'meta'];
let state = Object.fromEntries(STORES.map(k => [k, []]));
let serverOk = false;
const tok = () => CONFIG.token ? '&token=' + CONFIG.token : '';

function setSyncStatus(ok, msg) {
  serverOk = ok;
  let el = document.getElementById('syncStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncStatus';
    el.style.cssText = 'text-align:center;font-size:.8rem;padding:4px;color:#fff;';
    document.querySelector('header').appendChild(el);
  }
  el.style.background = ok ? '#16a085' : '#c0392b';
  el.textContent = msg;
}

const FAIL = '서버 저장 실패 — 이 브라우저에만 저장 중';
function lput(k) { localStorage.setItem('klsi_' + k, JSON.stringify(state[k])); } // 로컬 백업

// 레코드 1개 업서트 (동시 편집 시 다른 레코드를 덮어쓰지 않음)
function saveRec(store, rec) {
  lput(store);
  if (CONFIG.api && serverOk)
    fetch(`${CONFIG.api}?op=put&store=${store}${tok()}`, { method: 'POST', body: JSON.stringify(rec) })
      .then(r => { if (!r.ok) throw 0; }).catch(() => setSyncStatus(false, FAIL));
}
// 레코드 1개 삭제
function delRec(store, id) {
  lput(store);
  if (CONFIG.api && serverOk)
    fetch(`${CONFIG.api}?op=del&store=${store}&id=${encodeURIComponent(id)}${tok()}`, { method: 'POST' })
      .then(r => { if (!r.ok) throw 0; }).catch(() => setSyncStatus(false, FAIL));
}
// 스토어 전체 업서트 (시드·마이그레이션·가져오기용)
function saveBulk(store) {
  lput(store);
  if (CONFIG.api && serverOk)
    fetch(`${CONFIG.api}?op=bulk&store=${store}${tok()}`, { method: 'POST', body: JSON.stringify(state[store]) })
      .then(r => { if (!r.ok) throw 0; }).catch(() => setSyncStatus(false, FAIL));
}
function persist(k) { saveBulk(k); } // 호환용 별칭

const DB = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  add(k, rec) { rec.id = this.uid(); state[k].push(rec); saveRec(k, rec); return rec; },
  remove(k, id) { state[k] = state[k].filter(r => r.id !== id); delRec(k, id); }
};

// ---------- 주차 ----------
function mondayOf(d) { d = new Date(d); d.setDate(d.getDate() - (d.getDay() + 6) % 7); d.setHours(0, 0, 0, 0); return d; }
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const md = d => `${d.getMonth() + 1}월${d.getDate()}일`;
let curMon = mondayOf(new Date());

// ---------- 초기 데이터(처음 1회만 자동 입력) ----------
function seedDefaults() {
  if (!state.people.length) {
    ['김유선', '박혜경', '이명규', '윤효원', '이주환', '박용철', '송관철', '양은숙', '이상원']
      .forEach(n => state.people.push({ id: DB.uid(), name: n }));
    persist('people');
  }
  if (!state.biz.length) {
    [['1', '홍보', '이상원'], ['2', '노동포럼', '이주환'], ['3', '이슈페이퍼', '송관철'], ['4', '교육', '박혜경/이상원'],
     ['5', '직장괴롭힘조사센터', '박용철'], ['6', '노동이사제', '이명규/윤효원'], ['7', 'e노동사회', '윤효원']]
      .forEach(([no, name, owner]) => state.biz.push({ id: DB.uid(), no, name, owner, content: '', note: '' }));
    persist('biz');
  }
  if (!state.research.length) {
    const R = [
      ['진행', '2025', '1', '건설노조 교육원(가칭) 용역사업', '이명규', '박혜경', '최은계', '', '건설노조', '2025-05-07', '2026-06-30', '2,000', '1,000', '', '6/17 건설노조 중집회의에서 pt'],
      ['진행', '2025', '2', '초등교사 노동 특수성과 직업병 연구', '송관철', '이주환, 장안석, 이진우, 이서영', '', 'O', '초등교사노조', '2025-11-01', '2026-06-30', '4,990', '2,994', '', '최종보고서 협의 중(계속)'],
      ['진행', '2026', '1', '공공연대노동조합 조직 진단과 발전 방향', '이주환', '', '', '', '공공연대노조', '2026-01-19', '2026-04-30', '1,000', '', '', ''],
      ['진행', '2026', '2', '전국교직원노동조합 광주지부·전남지부 조직진단 및 혁신방안', '박용철', '송관철', '', '', '전교조 광주지부·전남지부', '2026-04-15', '2026-10-15', '2,000', '', '', '계약체결 협의, 설문 마무리 및 인터뷰 개시 준비'],
      ['진행', '2026', '3', '다중위기와 노동운동 3', '이주환', '김유선, 이문호, 권순미, 윤정향', '', '', '에버트재단', '', '2026-09-30', '1,950', '', '', '6월15일 2차 회의'],
      ['진행', '2026', '4', '유통산업 초기업교섭 실태조사', '송관철', '', '', '', '한국노동연구원', '2026-04-01', '2026-08-30', '500', '250', '', '실태조사 진행(계속)'],
      ['진행', '2026', '5', '서울 패션·봉제산업 실태조사 연구용역', '이명규', '이종수', '윤세정', '', '서울노사민정협의회', '', '', '약 3,600', '', '', '킥오프 회의'],
      ['진행', '2026', '1', '업종별 노사관계 사례 조사 및 평가', '이주환(행정상)', '채준호, 박성국, 박운, 조현민', '', '', '한국노동연구원', '', '', '2,750', '', '', '계약 진행 중, 오버헤드 과제'],
      ['진행', '2026', '2', '단체교섭의 사회적 기능과 방식에 관한 연구', '이명규', '이주환', '', '', '한국노동연구원', '', '', '1,750', '', '', '계약 준비 중, 오버헤드 과제'],
      ['진행', '2026', '3', '선별장 등 실태조사 및 근로여건 개선방안 마련 연구', '이주환', '장안석', '', '', '한국노동연구원', '', '', '1,800', '', '', '계약 예정, 오버헤드 과제'],
      ['진행', '2026', '4', '화학섬유노조 산별활동가 교육프로그램 설계', '이명규', '', '', '', '화섬식품노조', '', '', '1,500', '', '', ''],
      ['진행', '2026', '5', '공공기관 노동이사제 운영 실태와 이사회 작동 변화 분석', '이명규', '', '', '', '국가공공기관노동이사협의회', '', '', '1,036', '', '', '계약 체결 예정'],
      ['진행', '2026', '6', '노사상생협력교육사업 사업성과 분석 및 개선방안 연구', '박용철', '송관철', '', '', '노사발전재단', '2026-06', '2026-11', '700', '', '오버헤드 20%', '협의 및 계약 예정']
    ];
    R.forEach(([cat, year, no, title, lead, fellows, asst, contract, client, start, end, amount, paid, approve, status]) =>
      state.research.push({ id: DB.uid(), cat, year, no, title, lead, fellows, asst, contract, client, start, end, amount, paid, approve, status }));
    persist('research');
  }
}

// ---------- 구성원 순서·완전성 보정 (매 접속 시) ----------
const MEMBER_ORDER = ['김유선', '박혜경', '이명규', '윤효원', '이주환', '박용철', '송관철', '양은숙', '이상원'];
function migratePeople() {
  let changed = false;
  // 빠진 구성원 추가 (기존 id 보존 — 일정 기록 연결 유지)
  MEMBER_ORDER.forEach(n => {
    if (!state.people.some(p => p.name === n)) { state.people.push({ id: DB.uid(), name: n }); changed = true; }
  });
  // 지정 순서로 정렬 (목록에 없는 이름은 뒤에 등록 순서대로 유지)
  const rank = n => { const i = MEMBER_ORDER.indexOf(n); return i === -1 ? MEMBER_ORDER.length : i; };
  const sorted = [...state.people].sort((a, b) => rank(a.name) - rank(b.name));
  if (sorted.some((p, i) => p.id !== state.people[i].id)) { state.people = sorted; changed = true; }
  // 양은숙 고정 담당 1회 시드 (이후 사용자가 비우면 다시 채우지 않음)
  const yes = state.people.find(p => p.name === '양은숙');
  if (yes && yes.role === undefined) { yes.role = '재정, 회원관리, 사무총괄'; changed = true; }
  if (changed) persist('people');
}

function migrate() {
  // 사업: 노동이사제 개칭, 감사·기타 삭제, e노동사회 추가, 담당자 보정
  if (state.biz.length && !state.biz.some(b => b.name === 'e노동사회')) {
    const removed = state.biz.filter(b => b.name === '감사' || b.name === '기타');
    state.biz = state.biz.filter(b => b.name !== '감사' && b.name !== '기타');
    state.biz.forEach(b => {
      if (b.name === '노동이사 과정') b.name = '노동이사제';
      if (b.name === '홍보' && !b.owner) b.owner = '이상원';
      if (b.name === '교육' && b.owner === '박혜경') b.owner = '박혜경/이상원';
    });
    state.biz.push({ id: DB.uid(), no: '', name: 'e노동사회', owner: '윤효원', content: '', note: '' });
    state.biz.forEach((b, i) => b.no = String(i + 1));
    removed.forEach(b => delRec('biz', b.id));
    persist('biz');
  }
  // 연구: 구분(진행/완료) 없는 행에 진행으로 자동 부여
  if (state.research.some(r => !r.cat)) {
    state.research.forEach(r => { if (!r.cat) r.cat = '진행'; });
    persist('research');
  }
}

// 연구 구분 응모→진행 정리 (진행/완료 체계로 전환, 1회)
function migrateResearchCat() {
  let changed = false;
  state.research.forEach(r => { if (r.cat !== '진행' && r.cat !== '완료') { r.cat = '진행'; changed = true; } });
  if (changed) persist('research');
}

// 기존 사업의 단일 추진내용/비고를 '이번 주' 주차 기록으로 1회 이전 (사업 주차별 기록 전환)
function migrateBizLog() {
  const wk = ymd(curMon);
  let changed = false;
  state.biz.forEach(b => {
    if (b._logged) return;
    if (b.content || b.note) {
      if (!state.bizlog.some(l => l.bizId === b.id && l.week === wk))
        state.bizlog.push({ id: DB.uid(), week: wk, bizId: b.id, content: b.content || '', note: b.note || '' });
    }
    b._logged = true; // 재이전 방지
    changed = true;
  });
  if (changed) { persist('bizlog'); persist('biz'); }
}

// ---------- 부팅 ----------
async function boot() {
  STORES.forEach(k => state[k] = JSON.parse(localStorage.getItem('klsi_' + k) || '[]'));
  if (CONFIG.api) {
    try {
      const r = await fetch(`${CONFIG.api}?all=1${CONFIG.token ? '&token=' + CONFIG.token : ''}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      setSyncStatus(true, '팀 공유 모드 — 모든 구성원이 같은 데이터를 봅니다');
      STORES.forEach(k => state[k] = Array.isArray(d[k]) ? d[k] : []);
    } catch {
      setSyncStatus(false, '서버 연결 안 됨 — 이 브라우저에만 저장 중');
    }
  }
  const wasEmpty = ['people', 'biz', 'research'].every(k => state[k].length === 0);
  seedDefaults();
  runMigrations(wasEmpty);
  // 칸 수정 → 자동 저장 (해당 레코드만)
  document.getElementById('view').addEventListener('change', e => {
    const el = e.target.closest('[data-store]');
    if (!el) return;
    const { store, id, field } = el.dataset;
    const r = state[store].find(x => x.id === id);
    if (r) { r[field] = el.value; saveRec(store, r); }
    if (field === 'cat') route(); // 구분 변경 시 진행/응모 블록 사이로 즉시 이동
  });
  route();
}

// 마이그레이션은 버전 플래그로 1회만 실행 (부팅마다 재실행/삭제 부활 방지)
const SCHEMA = 2;
function metaRec() {
  let m = state.meta.find(r => r.id === 'meta');
  if (!m) { m = { id: 'meta', schema: 0 }; state.meta.push(m); }
  return m;
}
function runMigrations(wasEmpty) {
  const m = metaRec();
  if (m.schema >= SCHEMA) return;       // 이미 보정됨
  if (!wasEmpty) {                       // 기존 데이터만 1회 보정 (신규 설치는 시드가 최신)
    migrate();
    migratePeople();
    migrateBizLog();
    migrateResearchCat();
  }
  m.schema = SCHEMA;
  saveRec('meta', m);
}

// ---------- 공통 헬퍼 ----------
const esc = s => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bind = (store, id, field) => `data-store="${store}" data-id="${id}" data-field="${field}"`;
const cell = (store, id, field, val, h = '') =>
  `<td><textarea class="cell" style="${h}" ${bind(store, id, field)}>${esc(val)}</textarea></td>`;
const icel = (store, id, field, val, w = '') =>
  `<td><input class="cl" ${w ? `style="width:${w}"` : ''} ${bind(store, id, field)} value="${esc(val)}"></td>`;
const delBtn = (store, id) => `<td class="pad"><button class="delbtn" onclick="app.del('${store}','${id}')">×</button></td>`;
const amt = s => { const n = (s ?? '').toString().replace(/[^\d]/g, ''); return n ? parseInt(n, 10) : 0; };
const fmtAmt = n => n.toLocaleString('ko-KR');

function weekBar() {
  return `<div class="wkbar">
    <button onclick="app.shiftWeek(-1)">‹ 지난주</button>
    <strong>${md(curMon)} ~ ${md(addD(curMon, 4))}</strong>
    <button onclick="app.shiftWeek(1)">다음주 ›</button>
    <button onclick="app.thisWeek()">이번 주</button>
  </div>`;
}

// 주차별 레코드 확보(없으면 메모리에 생성 — 첫 수정 때 저장됨)
// 지연 레코드는 결정적 id 사용 → 두 브라우저가 같은 칸을 같은 id로 인식(중복/충돌 방지)
function schedOf(pid, wk) {
  let r = state.sched.find(s => s.week === wk && s.personId === pid);
  if (!r) { r = { id: 'sched_' + wk + '_' + pid, week: wk, personId: pid, d0: '', d1: '', d2: '', d3: '', d4: '', note: '' }; state.sched.push(r); }
  return r;
}
function adminOf(wk) {
  let r = state.adminrec.find(s => s.week === wk);
  if (!r) { r = { id: 'admin_' + wk, week: wk, ops: '', hr: '', income: '', donation: '' }; state.adminrec.push(r); }
  return r;
}
function bizlogOf(bizId, wk) {
  let r = state.bizlog.find(l => l.bizId === bizId && l.week === wk);
  if (!r) { r = { id: 'bizlog_' + bizId + '_' + wk, week: wk, bizId, content: '', note: '' }; state.bizlog.push(r); }
  return r;
}

// ---------- 화면: 주간일정표 ----------
function vGrid() {
  const wk = ymd(curMon);
  const days = [0, 1, 2, 3, 4].map(i => addD(curMon, i));
  const head = `<tr><th class="pname" style="width:90px">이름</th>${days.map((d, i) =>
    `<th>${'월화수목금'[i]}<br>${md(d)}</th>`).join('')}<th style="width:14%">비고</th></tr>`;
  const rows = state.people.map(p => {
    const r = schedOf(p.id, wk);
    const dcells = [0, 1, 2, 3, 4].map(i =>
      `<td data-label="${'월화수목금'[i]} ${md(days[i])}"><textarea class="cell" ${bind('sched', r.id, 'd' + i)}>${esc(r['d' + i])}</textarea></td>`).join('');
    return `<tr><th class="pname">${esc(p.name)}</th>${dcells}` +
      `<td data-label="비고"><textarea class="cell" ${bind('sched', r.id, 'note')}>${esc(r.note)}</textarea></td></tr>`;
  }).join('');
  return `<h3>주간일정표</h3>${weekBar()}
    <div class="scroll"><table class="sheet grid">${head}${rows}</table></div>
    <p class="hint">칸을 눌러 바로 입력하세요. 다른 칸으로 이동하면 자동 저장됩니다. 예) (10:30) 주간회의</p>`;
}

// ---------- 화면: 주간회의 ----------
function vMeeting() {
  const wk = ymd(curMon);
  const a = adminOf(wk);
  const agendas = state.agenda.filter(r => r.week === wk);
  const joins = state.members.filter(r => r.week === wk && r.kind === '가입');
  const leaves = state.members.filter(r => r.week === wk && r.kind === '탈퇴');

  const agendaRows = agendas.map((r, i) =>
    `<tr><td class="pad">${i + 1}</td>${cell('agenda', r.id, 'text', r.text)}${cell('agenda', r.id, 'result', r.result)}${delBtn('agenda', r.id)}</tr>`).join('');

  const mHead = c => `<tr><th>회원번호</th><th>회원명</th><th>소속</th><th>회원구분</th><th>결제방식</th><th>${c[0]}</th><th>${c[1]}</th><th></th></tr>`;
  const mRow = r => `<tr>${icel('members', r.id, 'mno', r.mno, '70px')}${icel('members', r.id, 'name', r.name)}${icel('members', r.id, 'org', r.org)}${icel('members', r.id, 'grade', r.grade)}${icel('members', r.id, 'pay', r.pay)}${icel('members', r.id, 'date1', r.date1)}${icel('members', r.id, 'date2', r.date2)}${delBtn('members', r.id)}</tr>`;

  return `<h3>주간회의</h3>${weekBar()}
    <fieldset><legend>논의안건</legend>
      <div class="scroll"><table class="sheet">
        <tr><th style="width:36px">번호</th><th>안건</th><th>논의·결정</th><th style="width:36px"></th></tr>${agendaRows}
      </table></div>
      <div class="actions"><button onclick="app.addAgenda()">+ 안건 추가</button></div>
    </fieldset>
    <fieldset><legend>행정 / 회원</legend>
      <div class="grid2">
        <label>운영 및 행정<textarea class="box" ${bind('adminrec', a.id, 'ops')}>${esc(a.ops)}</textarea></label>
        <label>인사<textarea class="box" ${bind('adminrec', a.id, 'hr')}>${esc(a.hr)}</textarea></label>
        <label>수입현황 — 입금현황<textarea class="box" ${bind('adminrec', a.id, 'income')}>${esc(a.income)}</textarea></label>
        <label>수입현황 — 후원비<textarea class="box" ${bind('adminrec', a.id, 'donation')}>${esc(a.donation)}</textarea></label>
      </div>
      <h4>회원 가입 (등록방식 / 가입일)</h4>
      <div class="scroll"><table class="sheet">${mHead(['등록방식', '가입일'])}${joins.map(mRow).join('')}</table></div>
      <div class="actions"><button onclick="app.addMember('가입')">+ 가입 추가</button></div>
      <h4>회원 탈퇴 (시작일 / 해지일)</h4>
      <div class="scroll"><table class="sheet">${mHead(['시작일', '해지일'])}${leaves.map(mRow).join('')}</table></div>
      <div class="actions"><button onclick="app.addMember('탈퇴')">+ 탈퇴 추가</button></div>
    </fieldset>`;
}

// ---------- 화면: 사업 ----------
function vBiz() {
  const wk = ymd(curMon);
  const rows = state.biz.map(b => {
    const log = bizlogOf(b.id, wk);
    return `<tr>` +
      `<td data-label="순번"><input class="cl" style="width:40px" ${bind('biz', b.id, 'no')} value="${esc(b.no)}"></td>` +
      `<td data-label="사업명"><input class="cl" ${bind('biz', b.id, 'name')} value="${esc(b.name)}"></td>` +
      `<td data-label="담당자"><input class="cl" ${bind('biz', b.id, 'owner')} value="${esc(b.owner)}"></td>` +
      `<td data-label="주요 추진 내용"><textarea class="cell" ${bind('bizlog', log.id, 'content')}>${esc(log.content)}</textarea></td>` +
      `<td data-label="비고"><textarea class="cell" ${bind('bizlog', log.id, 'note')}>${esc(log.note)}</textarea></td>` +
      `<td class="pad" data-label="삭제"><button class="delbtn" onclick="app.delBiz('${b.id}')">×</button></td>` +
    `</tr>`;
  }).join('');
  return `<h3>사업 <span class="hint">(주차별 기록)</span></h3>${weekBar()}
    <div class="scroll"><table class="sheet card">
      <tr><th style="width:46px">순번</th><th style="width:14%">사업명</th><th style="width:10%">담당자</th><th>주요 추진 내용 (이번 주)</th><th style="width:22%">비고 (이번 주)</th><th style="width:36px"></th></tr>
      ${rows}</table></div>
    <div class="actions"><button onclick="app.addBiz()">+ 사업 추가</button></div>
    <p class="hint">사업명·담당자는 공통(모든 주 동일)이고, <b>추진 내용·비고는 주차별로 따로 기록</b>됩니다. 주차를 옮기면 그 주의 기록이 나옵니다. 누적 기록은 ‘조회’ 탭의 <b>사업 주차기록 CSV</b>로 내보낼 수 있습니다.</p>`;
}

// ---------- 화면: 연구 ----------
const scel = (store, id, field, val, opts) =>
  `<td><select class="cl catsel" data-v="${esc(val)}" ${bind(store, id, field)}>${opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></td>`;

function vResearch() {
  const colg = `<colgroup>${[6, 4, 3, 14, 6, 8, 6, 4, 8, 7, 7, 5, 5, 4, 10, 3].map(w => `<col style="width:${w}%">`).join('')}</colgroup>`;
  const head = `<tr><th>구분</th><th>년도</th><th>연번</th><th>연구과제명</th><th>책임자</th><th>연구위원</th><th>연구원</th><th>계약서</th><th>발주처</th><th>시작</th><th>종료</th><th>금액</th><th>입금액</th><th>결재</th><th>진행상황</th><th></th></tr>`;
  const H = 'min-height:32px';
  const blocks = [['진행', '진행중 용역'], ['완료', '완료 용역']].map(([cat, label]) => {
    const list = state.research.filter(r => (r.cat || '진행') === cat)
      .sort((a, b) => (a.year + '').localeCompare(b.year + '') || amt(a.no) - amt(b.no));
    const rows = list.map(r =>
      `<tr>${scel('research', r.id, 'cat', r.cat || '진행', ['진행', '완료'])}${icel('research', r.id, 'year', r.year)}${icel('research', r.id, 'no', r.no)}${cell('research', r.id, 'title', r.title, H)}${cell('research', r.id, 'lead', r.lead, H)}${cell('research', r.id, 'fellows', r.fellows, H)}${cell('research', r.id, 'asst', r.asst, H)}${icel('research', r.id, 'contract', r.contract)}${cell('research', r.id, 'client', r.client, H)}${icel('research', r.id, 'start', r.start)}${icel('research', r.id, 'end', r.end)}${icel('research', r.id, 'amount', r.amount)}${icel('research', r.id, 'paid', r.paid)}${icel('research', r.id, 'approve', r.approve)}${cell('research', r.id, 'status', r.status, H)}${delBtn('research', r.id)}</tr>`).join('');
    const tot = list.reduce((s, r) => s + amt(r.amount), 0);
    const totPaid = list.reduce((s, r) => s + amt(r.paid), 0);
    return `<h4>${label}</h4>
      <div class="scroll"><table class="sheet rsch">${colg}${head}${rows}</table></div>
      <p><span class="badge">${label} 금액 합계 ${fmtAmt(tot)}</span> <span class="badge">입금액 합계 ${fmtAmt(totPaid)}</span> (단위: 만원)</p>
      <div class="actions"><button onclick="app.addResearch('${cat}')">+ ${label} 추가</button></div>`;
  }).join('');
  return `<h3>연구</h3>
    <p class="hint">※ 맨 왼쪽 <b>‘구분’</b> 칸은 <b>드롭다운</b>입니다 — 눌러서 <b>진행 / 완료</b>를 선택하세요. ‘완료’로 바꾸면 아래 완료 표로 자동 이동합니다.</p>
    ${blocks}`;
}

// ---------- 화면: 구성원 ----------
function vPeople() {
  const rows = state.people.map(p =>
    `<tr>${icel('people', p.id, 'name', p.name)}${icel('people', p.id, 'role', p.role || '')}${delBtn('people', p.id)}</tr>`).join('');
  return `<h3>구성원</h3>
    <table class="sheet" style="max-width:680px"><tr><th style="width:120px">이름</th><th>고정 담당 (재정·회원·행정 등)</th><th style="width:36px"></th></tr>${rows}</table>
    <div class="actions">
      <input id="npName" placeholder="새 구성원 이름" style="width:160px">
      <button onclick="app.addPerson()">+ 추가</button>
    </div>
    <p class="hint">‘고정 담당’에는 사업·연구가 아닌 상시 역할(예: 재정, 회원관리, 사무총괄, 감사)을 적습니다. 활동 탭 요약에 함께 표시됩니다.</p>`;
}

// ---------- 인쇄용 렌더 (편집칸 대신 읽기전용 표) ----------
const ptext = s => esc(s).replace(/\n/g, '<br>');
const findSched = (pid, wk) => state.sched.find(s => s.week === wk && s.personId === pid) || {};
const findAdmin = wk => state.adminrec.find(s => s.week === wk) || {};

// 주간일정표 인쇄 — 구글 문서 양식: 한 표에 사람별 두 줄(지난주/이번주), 요일머리에 두 날짜
function pGridDual() {
  const A = addD(curMon, -7), B = curMon;
  const wkA = ymd(A), wkB = ymd(B);
  const dA = [0, 1, 2, 3, 4].map(i => addD(A, i));
  const dB = [0, 1, 2, 3, 4].map(i => addD(B, i));
  const head = `<tr><th class="nm">이름</th>${[0, 1, 2, 3, 4].map(i =>
    `<th>${'월화수목금'[i]}<br>${md(dA[i])}<br><span class="w2">${md(dB[i])}</span></th>`).join('')}<th>비고</th></tr>`;
  const rows = state.people.map(p => {
    const a = findSched(p.id, wkA), b = findSched(p.id, wkB);
    const top = `<tr><th class="nm" rowspan="2">${esc(p.name)}</th>` +
      [0, 1, 2, 3, 4].map(i => `<td>${ptext(a['d' + i])}</td>`).join('') + `<td>${ptext(a.note)}</td></tr>`;
    const bot = `<tr class="w2">` +
      [0, 1, 2, 3, 4].map(i => `<td>${ptext(b['d' + i])}</td>`).join('') + `<td>${ptext(b.note)}</td></tr>`;
    return top + bot;
  }).join('');
  return `<h2>주간일정표 — 지난주 ${md(A)}~${md(addD(A, 4))} · 이번주 ${md(B)}~${md(addD(B, 4))}
    <span class="leg">(윗줄·흰색=지난주 / 아랫줄·음영=이번주)</span></h2>
    <table class="psheet grid2wk">${head}${rows}</table>`;
}

function pGrid(mon, label) {
  const wk = ymd(mon);
  const days = [0, 1, 2, 3, 4].map(i => addD(mon, i));
  const head = `<tr><th class="nm">이름</th>${days.map((d, i) => `<th>${'월화수목금'[i]} ${md(d)}</th>`).join('')}<th>비고</th></tr>`;
  const rows = state.people.map(p => {
    const r = findSched(p.id, wk);
    return `<tr><th class="nm">${esc(p.name)}</th>` +
      [0, 1, 2, 3, 4].map(i => `<td>${ptext(r['d' + i])}</td>`).join('') +
      `<td>${ptext(r.note)}</td></tr>`;
  }).join('');
  return `<h2>${label} 주간일정표 (${md(mon)} ~ ${md(addD(mon, 4))})</h2>
    <table class="psheet grid">${head}${rows}</table>`;
}

function pMeeting(mon) {
  const wk = ymd(mon);
  const a = findAdmin(wk);
  const ag = state.agenda.filter(r => r.week === wk);
  const joins = state.members.filter(r => r.week === wk && r.kind === '가입');
  const leaves = state.members.filter(r => r.week === wk && r.kind === '탈퇴');
  const agRows = ag.length
    ? ag.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${ptext(r.text)}</td><td>${ptext(r.result)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="c muted">(안건 없음)</td></tr>';
  const mTable = (list, c) => list.length ? `<table class="psheet">
      <tr><th>회원번호</th><th>회원명</th><th>소속</th><th>회원구분</th><th>결제방식</th><th>${c[0]}</th><th>${c[1]}</th></tr>
      ${list.map(r => `<tr><td>${ptext(r.mno)}</td><td>${ptext(r.name)}</td><td>${ptext(r.org)}</td><td>${ptext(r.grade)}</td><td>${ptext(r.pay)}</td><td>${ptext(r.date1)}</td><td>${ptext(r.date2)}</td></tr>`).join('')}
    </table>` : '<p class="muted">(없음)</p>';
  return `<h2>주간회의 (${md(mon)} ~ ${md(addD(mon, 4))})</h2>
    <h3>논의안건</h3>
    <table class="psheet"><tr><th class="c" style="width:34px">번호</th><th>안건</th><th>논의·결정</th></tr>${agRows}</table>
    <h3>행정 / 회원</h3>
    <table class="psheet kv">
      <tr><th>운영 및 행정</th><td>${ptext(a.ops)}</td></tr>
      <tr><th>인사</th><td>${ptext(a.hr)}</td></tr>
      <tr><th>수입현황 — 입금현황</th><td>${ptext(a.income)}</td></tr>
      <tr><th>수입현황 — 후원비</th><td>${ptext(a.donation)}</td></tr>
    </table>
    <h4>회원 가입</h4>${mTable(joins, ['등록방식', '가입일'])}
    <h4>회원 탈퇴</h4>${mTable(leaves, ['시작일', '해지일'])}`;
}

function pBiz() {
  const wk = ymd(curMon);
  const rows = state.biz.map(b => {
    const log = state.bizlog.find(l => l.bizId === b.id && l.week === wk) || {};
    return `<tr><td class="c">${ptext(b.no)}</td><td>${ptext(b.name)}</td><td>${ptext(b.owner)}</td><td>${ptext(log.content)}</td><td>${ptext(log.note)}</td></tr>`;
  }).join('');
  return `<h2>사업 (${md(curMon)} ~ ${md(addD(curMon, 4))})</h2>
    <table class="psheet"><tr><th style="width:34px">순번</th><th>사업명</th><th>담당자</th><th>주요 추진 내용</th><th>비고</th></tr>${rows}</table>`;
}

function pResearch() {
  const head = `<tr><th>년도</th><th>연번</th><th>연구과제명</th><th>책임자</th><th>연구위원</th><th>연구원</th><th>계약서</th><th>발주처</th><th>시작</th><th>종료</th><th>금액</th><th>입금액</th><th>결재</th><th>진행상황</th></tr>`;
  const block = (cat, label) => {
    const list = state.research.filter(r => (r.cat || '진행') === cat)
      .sort((a, b) => (a.year + '').localeCompare(b.year + '') || amt(a.no) - amt(b.no));
    const rows = list.map(r =>
      `<tr><td class="c">${ptext(r.year)}</td><td class="c">${ptext(r.no)}</td><td>${ptext(r.title)}</td><td>${ptext(r.lead)}</td><td>${ptext(r.fellows)}</td><td>${ptext(r.asst)}</td><td class="c">${ptext(r.contract)}</td><td>${ptext(r.client)}</td><td>${ptext(r.start)}</td><td>${ptext(r.end)}</td><td class="r">${ptext(r.amount)}</td><td class="r">${ptext(r.paid)}</td><td>${ptext(r.approve)}</td><td>${ptext(r.status)}</td></tr>`).join('');
    const tot = fmtAmt(list.reduce((s, r) => s + amt(r.amount), 0));
    const paid = fmtAmt(list.reduce((s, r) => s + amt(r.paid), 0));
    return `<h3>${label}</h3><table class="psheet rsch">${head}${rows}</table>
      <p class="sum">금액 합계 ${tot} · 입금액 합계 ${paid} (단위: 만원)</p>`;
  };
  return `<h2>연구</h2>${block('진행', '진행중 용역')}${block('완료', '완료 용역')}`;
}

// ---------- 화면: 조회 (구성원별 내 기록) ----------
let qPerson = ''; // 선택된 구성원 이름

// 선택 구성원의 일정(일별)·연구·사업(주차기록) 모으기
function myRows(name) {
  const DOW = ['월', '화', '수', '목', '금'];
  const p = state.people.find(x => x.name === name);
  const sched = [];
  if (p) state.sched.filter(s => s.personId === p.id).forEach(s => {
    const [Y, M, D] = s.week.split('-').map(Number);
    const mon = new Date(Y, M - 1, D);
    for (let i = 0; i < 5; i++) {
      const t = (s['d' + i] || '').trim();
      if (t) sched.push({ date: ymd(addD(mon, i)), day: DOW[i], text: t });
    }
    const n = (s.note || '').trim();
    if (n) sched.push({ date: s.week, day: '비고', text: n });
  });
  sched.sort((a, b) => a.date.localeCompare(b.date));
  const research = state.research.filter(r => roleInResearch(name, r))
    .map(r => ({ ...r, role: roleInResearch(name, r) }))
    .sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || (a.year + '').localeCompare(b.year + '') || amt(a.no) - amt(b.no));
  const bizlogs = [];
  state.biz.filter(b => roleInBiz(name, b)).forEach(b => {
    const logs = state.bizlog.filter(l => l.bizId === b.id && ((l.content || '').trim() || (l.note || '').trim()))
      .sort((x, y) => x.week.localeCompare(y.week));
    if (logs.length) logs.forEach(l => bizlogs.push({ biz: b.name, week: l.week, content: l.content || '', note: l.note || '' }));
    else bizlogs.push({ biz: b.name, week: '', content: '', note: '' });
  });
  return { sched, research, bizlogs };
}

function vSearch() {
  const opts = '<option value="">— 구성원 선택 —</option>' +
    state.people.map(p => `<option ${p.name === qPerson ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  let body = '<p class="hint">위에서 구성원을 선택하면 그 사람의 일정 · 연구 · 사업 기록이 표로 나옵니다.</p>';
  if (qPerson) {
    const { sched, research, bizlogs } = myRows(qPerson);
    const br = s => esc(s).replace(/\n/g, '<br>');
    const none = n => `<tr><td colspan="${n}" class="pad">기록이 없습니다.</td></tr>`;
    const schedRows = sched.length ? sched.map(r =>
      `<tr><td class="pad" style="width:100px">${esc(r.date)}</td><td class="pad" style="width:44px">${esc(r.day)}</td><td style="padding:6px 8px">${br(r.text)}</td></tr>`).join('') : none(3);
    const resRows = research.length ? research.map(r =>
      `<tr><td class="pad">${esc(r.cat || '진행')}</td><td class="pad">${esc(r.year)}</td><td style="padding:6px 8px">${br(r.title)}</td><td class="pad">${esc(r.role)}</td><td class="pad">${esc(r.lead)}</td><td style="padding:6px 8px">${br(r.client)}</td><td class="pad">${esc(r.start)}</td><td class="pad">${esc(r.end)}</td><td class="pad" style="text-align:right">${esc(r.amount)}</td><td style="padding:6px 8px">${br(r.status)}</td></tr>`).join('') : none(10);
    const bizRows = bizlogs.length ? bizlogs.map(r =>
      `<tr><td class="pad">${esc(r.biz)}</td><td class="pad" style="width:100px">${esc(r.week)}</td><td style="padding:6px 8px">${br(r.content)}</td><td style="padding:6px 8px">${br(r.note)}</td></tr>`).join('') : none(4);
    body = `
    <h4>1. 주간일정 기록 (일별) <button onclick="app.exportMySched()">CSV 저장</button></h4>
    <div class="scroll"><table class="sheet">
      <tr><th>날짜</th><th>요일</th><th>내용</th></tr>${schedRows}</table></div>
    <h4>2. 연구 (참여 용역) <button onclick="app.exportMyResearch()">CSV 저장</button></h4>
    <div class="scroll"><table class="sheet">
      <tr><th>구분</th><th>년도</th><th>연구과제명</th><th>나의 역할</th><th>책임자</th><th>발주처</th><th>시작</th><th>종료</th><th>금액</th><th>진행상황</th></tr>${resRows}</table></div>
    <h4>3. 사업 (담당 사업 주차기록) <button onclick="app.exportMyBiz()">CSV 저장</button></h4>
    <div class="scroll"><table class="sheet">
      <tr><th>사업명</th><th>주차(월)</th><th>추진 내용</th><th>비고</th></tr>${bizRows}</table></div>`;
  }
  return `<h3>조회 — 구성원별 기록</h3>
    <div class="qrow"><label>구성원<br>
      <select onchange="app.pickPerson(this.value)" style="min-width:180px">${opts}</select></label></div>
    ${body}`;
}

// ---------- 화면: 구성원 활동 현황 (사업·연구 자동 연결) ----------
// 담당자/책임자/연구위원/연구원 칸의 이름 표기를 토큰으로 분해 (이명규/윤효원, 이주환(행정상), "김유선, 이문호" 등)
const tokens = str => (str || '').split(/[\/,，、·∙\s()（）]+/).map(s => s.trim()).filter(Boolean);
const roleInBiz = (name, b) => tokens(b.owner).includes(name) ? '담당' : '';
function roleInResearch(name, r) {
  if (tokens(r.lead).includes(name)) return '책임';
  if (tokens(r.fellows).includes(name)) return '위원';
  if (tokens(r.asst).includes(name)) return '연구원';
  return '';
}

function vActivity() {
  const prog = state.research.filter(r => (r.cat || '진행') === '진행');
  const apply = state.research.filter(r => (r.cat || '진행') === '완료');

  // 매트릭스 열 구성 (코드 머리글 + 범례)
  const cols = [];
  state.biz.forEach(b => cols.push({ g: '사업', head: b.name, title: b.name, mark: n => roleInBiz(n, b) }));
  prog.forEach((r, i) => cols.push({ g: '진행 연구', head: 'P' + (i + 1), code: 'P' + (i + 1), title: r.title, mark: n => roleInResearch(n, r) }));
  apply.forEach((r, i) => cols.push({ g: '완료 연구', head: 'C' + (i + 1), code: 'C' + (i + 1), title: r.title, mark: n => roleInResearch(n, r) }));

  const groups = [];
  cols.forEach(c => { const last = groups[groups.length - 1]; if (last && last.g === c.g) last.n++; else groups.push({ g: c.g, n: 1 }); });
  const grpRow = `<tr><th class="nm"></th>${groups.map(g => `<th colspan="${g.n}">${g.g}</th>`).join('')}</tr>`;
  const codeRow = `<tr><th class="nm">구성원</th>${cols.map(c => `<th title="${esc(c.title)}">${esc(c.head)}</th>`).join('')}</tr>`;
  const bodyRows = state.people.map(p => {
    const cells = cols.map(c => {
      const m = c.mark(p.name);
      const mk = m === '담당' || m === '책임' ? '★' : m ? '○' : '';
      return `<td class="${m ? 'r-' + m : ''}" title="${m ? esc(c.title) + ' — ' + m : ''}">${mk}</td>`;
    }).join('');
    return `<tr><th class="nm">${esc(p.name)}</th>${cells}</tr>`;
  }).join('');
  const legend = cols.filter(c => c.code).map(c => `<li><b>${c.code}</b> ${esc(c.title)}</li>`).join('');

  // 구성원별 요약 (이름으로 나열)
  const sumRows = state.people.map(p => {
    const bz = state.biz.filter(b => roleInBiz(p.name, b)).map(b => b.name);
    const lead = state.research.filter(r => tokens(r.lead).includes(p.name)).map(r => r.title);
    const part = state.research.filter(r => tokens(r.fellows).includes(p.name) || tokens(r.asst).includes(p.name)).map(r => r.title);
    const cnt = bz.length + lead.length + part.length;
    const td = arr => arr.length ? arr.map(esc).join('<br>') : '<span class="muted">-</span>';
    const role = esc(p.role) || '<span class="muted">-</span>';
    return `<tr><th class="nm">${esc(p.name)}</th><td>${role}</td><td>${td(bz)}</td><td>${td(lead)}</td><td>${td(part)}</td><td class="c"><span class="badge">${cnt}</span></td></tr>`;
  }).join('');

  // 담당 구성원이 인식되지 않은 활동
  const orphanBiz = state.biz.filter(b => !state.people.some(p => roleInBiz(p.name, b))).map(b => '[사업] ' + b.name);
  const orphanRes = state.research.filter(r => !state.people.some(p => roleInResearch(p.name, r))).map(r => '[연구] ' + r.title);
  const orphans = [...orphanBiz, ...orphanRes];

  return `<h3>구성원 활동 현황</h3>
    <p class="hint">사업의 <b>담당자</b>, 연구의 <b>책임자·연구위원·연구원</b> 칸에서 구성원 이름을 자동으로 찾아 연결합니다.
      연결을 바꾸려면 <b>사업·연구 탭</b>에서 해당 칸을 수정하세요(여기는 자동 반영).</p>
    <h4>관계 매트릭스 <span class="hint">(★ 담당·책임 / ○ 참여)</span></h4>
    <p class="hint">각 구성원이 어떤 사업·연구에 참여하는지 한눈에 보는 표입니다. 사업은 이름으로, 연구는 제목이 길어 <b>P·C 코드</b>로 적고 아래에 전체 제목을 풀어 두었습니다. (P=진행 연구, C=완료 연구)</p>
    <div class="scroll"><table class="sheet mtx">${grpRow}${codeRow}${bodyRows}</table></div>
    <div class="legend"><b>연구 코드 — 전체 제목</b><ul>${legend}</ul></div>
    <h4>구성원별 요약</h4>
    <div class="scroll"><table class="sheet">
      <tr><th class="nm">구성원</th><th>고정 담당</th><th>담당 사업</th><th>책임 연구</th><th>참여 연구</th><th style="width:54px">활동 수</th></tr>${sumRows}
    </table></div>
    ${orphans.length ? `<h4>담당 구성원이 인식되지 않은 활동</h4>
      <p class="hint">외부 책임자이거나 이름 표기가 다를 수 있습니다. 필요하면 사업/연구 탭에서 담당자·책임자 칸을 확인하세요.</p>
      <ul class="muted">${orphans.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
}

// ---------- 라우터 ----------
const VIEWS = { grid: vGrid, meeting: vMeeting, biz: vBiz, research: vResearch, activity: vActivity, search: vSearch, people: vPeople };
function route() {
  const tab = location.hash.slice(1) || 'grid';
  document.querySelectorAll('.tabs a[data-tab]').forEach(a =>
    a.classList.toggle('active', a.dataset.tab === tab));
  document.getElementById('view').innerHTML = (VIEWS[tab] || vGrid)();
}
window.addEventListener('hashchange', route);

// ---------- 동작 ----------
window.app = {
  shiftWeek(n) { curMon = addD(curMon, 7 * n); route(); },
  thisWeek() { curMon = mondayOf(new Date()); route(); },
  addAgenda() { DB.add('agenda', { week: ymd(curMon), text: '', result: '' }); route(); },
  addMember(kind) { DB.add('members', { week: ymd(curMon), kind, mno: '', name: '', org: '', grade: '', pay: '', date1: '', date2: '' }); route(); },
  addBiz() { DB.add('biz', { no: String(state.biz.length + 1), name: '', owner: '', content: '', note: '', _logged: true }); route(); },
  delBiz(id) {
    if (!confirm('이 사업을 삭제할까요? (모든 주차 기록도 함께 삭제됩니다)')) return;
    const logs = state.bizlog.filter(l => l.bizId === id);
    state.biz = state.biz.filter(b => b.id !== id);
    state.bizlog = state.bizlog.filter(l => l.bizId !== id);
    delRec('biz', id);
    logs.forEach(l => delRec('bizlog', l.id));
    route();
  },
  addResearch(cat) {
    DB.add('research', { cat, year: String(new Date().getFullYear()), no: '', title: '', lead: '', fellows: '', asst: '', contract: '', client: '', start: '', end: '', amount: '', paid: '', approve: '', status: '' });
    route();
  },
  addPerson() {
    const name = document.getElementById('npName').value.trim();
    if (!name) return;
    DB.add('people', { name, role: '' }); route();
  },
  del(store, id) { if (confirm('이 행을 삭제할까요?')) { DB.remove(store, id); route(); } },
  pickPerson(name) { qPerson = name; route(); },
  _downloadCSV(name, header, data) {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const BOM = String.fromCharCode(0xFEFF); // 엑셀 한글 깨짐 방지
    const csv = BOM + [header, ...data].map(row => row.map(q).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${name}_${ymd(new Date())}.csv`;
    a.click();
  },
  exportMySched() {
    if (!qPerson) return;
    const { sched } = myRows(qPerson);
    if (!sched.length) { alert('일정 기록이 없습니다.'); return; }
    this._downloadCSV(`${qPerson}_일정`, ['날짜', '요일', '내용'], sched.map(r => [r.date, r.day, r.text]));
  },
  exportMyResearch() {
    if (!qPerson) return;
    const { research } = myRows(qPerson);
    if (!research.length) { alert('참여 연구가 없습니다.'); return; }
    this._downloadCSV(`${qPerson}_연구`,
      ['구분', '년도', '연번', '연구과제명', '나의 역할', '책임자', '연구위원', '연구원', '발주처', '시작', '종료', '금액', '입금액', '진행상황'],
      research.map(r => [r.cat || '진행', r.year, r.no, r.title, r.role, r.lead, r.fellows, r.asst, r.client, r.start, r.end, r.amount, r.paid, r.status]));
  },
  exportMyBiz() {
    if (!qPerson) return;
    const { bizlogs } = myRows(qPerson);
    if (!bizlogs.length) { alert('담당 사업이 없습니다.'); return; }
    this._downloadCSV(`${qPerson}_사업`, ['사업명', '주차(월)', '추진내용', '비고'],
      bizlogs.map(r => [r.biz, r.week, r.content, r.note]));
  },
  print() {
    let el = document.getElementById('printArea');
    if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
    const last = addD(curMon, -7);
    el.innerHTML =
      `<div class="phead">한국노동사회연구소 주간회의 자료 — ${md(curMon)} ~ ${md(addD(curMon, 4))}</div>` +
      pGridDual() +
      `<div class="pbreak"></div>` + pResearch() +
      `<div class="pbreak"></div>` + pBiz() +
      `<div class="pbreak"></div>` + pMeeting(curMon);
    window.print();
  },
  exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `klsi_weekly_${ymd(new Date())}.json`;
    a.click();
  },
  importJSON(input) {
    const f = input.files[0];
    if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      if (!confirm('가져온 파일로 현재 데이터를 덮어씁니다. 계속할까요?')) return;
      STORES.forEach(k => { if (Array.isArray(d[k])) { state[k] = d[k]; persist(k); } });
      route();
    }).catch(() => alert('JSON 파일을 읽을 수 없습니다.'));
    input.value = '';
  }
};

boot();
