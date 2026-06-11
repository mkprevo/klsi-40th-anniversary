/* 주간회의 업무관리 — 구글문서/시트 이관형
   화면: 주간일정표(사람×요일, 칸 직접 입력) · 주간회의(논의안건+행정/회원) · 사업 · 연구 · 구성원
   저장: api.php(MySQL 팀 공유) / 서버 실패 시 localStorage 자동 폴백 */

// ---------- 설정 ----------
const CONFIG = { api: 'api.php', token: '' };

// ---------- 데이터층 ----------
const STORES = ['people', 'sched', 'agenda', 'adminrec', 'members', 'biz', 'research'];
let state = Object.fromEntries(STORES.map(k => [k, []]));
let serverOk = false;

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

function persist(k) {
  localStorage.setItem('klsi_' + k, JSON.stringify(state[k])); // 항상 로컬 백업
  if (CONFIG.api && serverOk) {
    fetch(`${CONFIG.api}?store=${k}${CONFIG.token ? '&token=' + CONFIG.token : ''}`,
      { method: 'POST', body: JSON.stringify(state[k]) })
      .then(r => { if (!r.ok) throw 0; })
      .catch(() => setSyncStatus(false, '서버 저장 실패 — 이 브라우저에만 저장 중'));
  }
}

const DB = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  add(k, rec) { rec.id = this.uid(); state[k].push(rec); persist(k); return rec; },
  remove(k, id) { state[k] = state[k].filter(r => r.id !== id); persist(k); }
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
      ['응모', '2026', '1', '업종별 노사관계 사례 조사 및 평가', '이주환(행정상)', '채준호, 박성국, 박운, 조현민', '', '', '한국노동연구원', '', '', '2,750', '', '', '계약 진행 중, 오버헤드 과제'],
      ['응모', '2026', '2', '단체교섭의 사회적 기능과 방식에 관한 연구', '이명규', '이주환', '', '', '한국노동연구원', '', '', '1,750', '', '', '계약 준비 중, 오버헤드 과제'],
      ['응모', '2026', '3', '선별장 등 실태조사 및 근로여건 개선방안 마련 연구', '이주환', '장안석', '', '', '한국노동연구원', '', '', '1,800', '', '', '계약 예정, 오버헤드 과제'],
      ['응모', '2026', '4', '화학섬유노조 산별활동가 교육프로그램 설계', '이명규', '', '', '', '화섬식품노조', '', '', '1,500', '', '', ''],
      ['응모', '2026', '5', '공공기관 노동이사제 운영 실태와 이사회 작동 변화 분석', '이명규', '', '', '', '국가공공기관노동이사협의회', '', '', '1,036', '', '', '계약 체결 예정'],
      ['응모', '2026', '6', '노사상생협력교육사업 사업성과 분석 및 개선방안 연구', '박용철', '송관철', '', '', '노사발전재단', '2026-06', '2026-11', '700', '', '오버헤드 20%', '협의 및 계약 예정']
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

// ---------- 이번 주(6/8~6/12) 일정 1회 입력 (구글 주간일정표 옮김) ----------
function seedThisWeek() {
  const WK = '2026-06-08'; // 월=6/8 화=6/9 수=6/10 목=6/11 금=6/12
  const data = {
    '김유선': ['(10:30) 주간회의', '(18:45) 노사관계이론(종강)', '(09:30) 6·10항쟁 기념식\n(14:00) 최저임금토론회(사회)', '(14:30) 영국학생', '(14:00) 노동이사 청강', '(10:00) 걷기대회(동대입구역)\n(10:00) 경노회'],
    '박혜경': ['10:30 주간회의', '18:00 9기 전문가과정', '11:00 화섬', '', '', ''],
    '이명규': ['10:30 주간회의', '14:00 봉제업 프로젝트 발표회\n16:00 단체교섭 플젝(연구원) 회의', '화섬노조 플젝 방문 계약', '', '14:00 노동이사제', ''],
    '윤효원': ['SOAS 대학원생 지원\n(이대·연대 강의: 한국의 외교정책)', 'SOAS 대학원생 방한 지원\n(한국의 대북정책, 전쟁박물관)', 'SOAS 대학원생 방한 지원\n(DMZ 방문)', 'SOAS 대학원생 방한 지원\n(이대 강의: 김유선 / 강미나 강의: 향린교회 1층 교육장)', 'SOAS 대학원생 방한 지원\n(이대 강의, 국경없는의사회)', ''],
    '이주환': ['(10:00) 연구실회의\n(10:30) 주간회의\n(14:00) 서비스연맹 콜센터 초기업 교섭 간담회', '', '', '(10:00) 한국노총 조직화 연구 회의', '', '(10:00) 경노회\n(12:30) 논문 모임'],
    '박용철': ['연구소 회의\n(14:00) 콜센터 교섭 간담회', '(15:00) 조선산업 TF 회의(금속노조)', '', '(10:30~) 속초노사민정 간담회', '삼척노사민정 자문', '(16:00) 한양대 MBA 강의'],
    '송관철': ['(오전) 연구소 회의', '', '(14:00) 도급제 최저임금 토론회\n(토론자, 장소: 국회도서관)', '', '', ''],
    '양은숙': ['10:30 주간회의\n연구계약 서류', '', '휴가', '', '', ''],
    '이상원': ['10:30 주간회의', '18:30 전문가과정', '출근', '', '오전반차', '']
  };
  const VER = 2; // 시드 버전: 시간 포함본으로 1회 덮어쓰기 (이후 사용자 편집은 보존)
  let changed = false;
  for (const name in data) {
    const p = state.people.find(x => x.name === name);
    if (!p) continue;
    const r = state.sched.find(s => s.week === WK && s.personId === p.id);
    if (r && r.seedVer === VER) continue; // 이미 최신 시드 적용됨 → 건드리지 않음
    const [d0, d1, d2, d3, d4, note] = data[name];
    if (r) Object.assign(r, { d0, d1, d2, d3, d4, note, seedVer: VER });
    else state.sched.push({ id: DB.uid(), week: WK, personId: p.id, d0, d1, d2, d3, d4, note, seedVer: VER });
    changed = true;
  }
  if (changed) persist('sched');
}
function migrate() {
  // 사업: 노동이사제 개칭, 감사·기타 삭제, e노동사회 추가, 담당자 보정
  if (state.biz.length && !state.biz.some(b => b.name === 'e노동사회')) {
    state.biz = state.biz.filter(b => b.name !== '감사' && b.name !== '기타');
    state.biz.forEach(b => {
      if (b.name === '노동이사 과정') b.name = '노동이사제';
      if (b.name === '홍보' && !b.owner) b.owner = '이상원';
      if (b.name === '교육' && b.owner === '박혜경') b.owner = '박혜경/이상원';
    });
    state.biz.push({ id: DB.uid(), no: '', name: 'e노동사회', owner: '윤효원', content: '', note: '' });
    state.biz.forEach((b, i) => b.no = String(i + 1));
    persist('biz');
  }
  // 연구: 구분(진행/응모) 없는 행에 자동 부여
  const APPLY = ['업종별 노사관계 사례 조사 및 평가', '단체교섭의 사회적 기능과 방식에 관한 연구',
    '선별장 등 실태조사 및 근로여건 개선방안 마련 연구', '화학섬유노조 산별활동가 교육프로그램 설계',
    '공공기관 노동이사제 운영 실태와 이사회 작동 변화 분석', '노사상생협력교육사업 사업성과 분석 및 개선방안 연구'];
  if (state.research.some(r => !r.cat)) {
    state.research.forEach(r => { if (!r.cat) r.cat = APPLY.includes(r.title) ? '응모' : '진행'; });
    persist('research');
  }
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
  seedDefaults();
  migrate();
  migratePeople();
  seedThisWeek();
  // 칸 수정 → 자동 저장 (blur 시점)
  document.getElementById('view').addEventListener('change', e => {
    const el = e.target.closest('[data-store]');
    if (!el) return;
    const { store, id, field } = el.dataset;
    const r = state[store].find(x => x.id === id);
    if (r) { r[field] = el.value; persist(store); }
    if (field === 'cat') route(); // 구분 변경 시 진행/응모 블록 사이로 즉시 이동
  });
  route();
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
function schedOf(pid, wk) {
  let r = state.sched.find(s => s.week === wk && s.personId === pid);
  if (!r) { r = { id: DB.uid(), week: wk, personId: pid, d0: '', d1: '', d2: '', d3: '', d4: '', note: '' }; state.sched.push(r); }
  return r;
}
function adminOf(wk) {
  let r = state.adminrec.find(s => s.week === wk);
  if (!r) { r = { id: DB.uid(), week: wk, ops: '', hr: '', income: '', donation: '' }; state.adminrec.push(r); }
  return r;
}

// ---------- 화면: 주간일정표 ----------
function vGrid() {
  const wk = ymd(curMon);
  const days = [0, 1, 2, 3, 4].map(i => addD(curMon, i));
  const head = `<tr><th style="width:90px">이름</th>${days.map((d, i) =>
    `<th>${'월화수목금'[i]}<br>${md(d)}</th>`).join('')}<th style="width:14%">비고</th></tr>`;
  const rows = state.people.map(p => {
    const r = schedOf(p.id, wk);
    return `<tr><th class="pname">${esc(p.name)}</th>` +
      [0, 1, 2, 3, 4].map(i => cell('sched', r.id, 'd' + i, r['d' + i])).join('') +
      cell('sched', r.id, 'note', r.note) + '</tr>';
  }).join('');
  return `<h3>주간일정표</h3>${weekBar()}
    <div class="scroll"><table class="sheet">${head}${rows}</table></div>
    <p class="hint">칸을 클릭해 바로 입력하세요. 다른 칸으로 이동하면 자동 저장됩니다. 예) (10:30) 주간회의</p>`;
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
  const rows = state.biz.map(r =>
    `<tr>${icel('biz', r.id, 'no', r.no, '40px')}${icel('biz', r.id, 'name', r.name)}${icel('biz', r.id, 'owner', r.owner)}${cell('biz', r.id, 'content', r.content)}${cell('biz', r.id, 'note', r.note)}${delBtn('biz', r.id)}</tr>`).join('');
  return `<h3>사업</h3>
    <div class="scroll"><table class="sheet">
      <tr><th style="width:46px">순번</th><th style="width:14%">사업명</th><th style="width:10%">담당자</th><th>주요 추진 내용</th><th style="width:22%">비고</th><th style="width:36px"></th></tr>
      ${rows}</table></div>
    <div class="actions"><button onclick="app.addBiz()">+ 사업 추가</button></div>
    <p class="hint">이 표는 주차와 무관하게 유지됩니다. 추진 내용을 그때그때 갱신하세요.</p>`;
}

// ---------- 화면: 연구 ----------
const scel = (store, id, field, val, opts) =>
  `<td><select class="cl" ${bind(store, id, field)}>${opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></td>`;

function vResearch() {
  const head = `<tr><th>구분</th><th>년도</th><th>연번</th><th style="min-width:220px">연구과제명</th><th>책임자</th><th style="min-width:140px">연구위원</th><th>연구원</th><th>계약서</th><th style="min-width:120px">발주처</th><th>시작</th><th>종료</th><th>금액</th><th>입금액</th><th>결재</th><th style="min-width:160px">진행상황</th><th></th></tr>`;
  const blocks = [['진행', '진행중 용역'], ['응모', '응모예정 과제']].map(([cat, label]) => {
    const list = state.research.filter(r => (r.cat || '진행') === cat)
      .sort((a, b) => (a.year + '').localeCompare(b.year + '') || amt(a.no) - amt(b.no));
    const rows = list.map(r =>
      `<tr>${scel('research', r.id, 'cat', r.cat || '진행', ['진행', '응모'])}${icel('research', r.id, 'year', r.year, '56px')}${icel('research', r.id, 'no', r.no, '36px')}${cell('research', r.id, 'title', r.title, 'min-height:40px')}${icel('research', r.id, 'lead', r.lead, '80px')}${cell('research', r.id, 'fellows', r.fellows, 'min-height:40px')}${icel('research', r.id, 'asst', r.asst, '70px')}${icel('research', r.id, 'contract', r.contract, '46px')}${icel('research', r.id, 'client', r.client)}${icel('research', r.id, 'start', r.start, '92px')}${icel('research', r.id, 'end', r.end, '92px')}${icel('research', r.id, 'amount', r.amount, '70px')}${icel('research', r.id, 'paid', r.paid, '70px')}${icel('research', r.id, 'approve', r.approve, '70px')}${cell('research', r.id, 'status', r.status, 'min-height:40px')}${delBtn('research', r.id)}</tr>`).join('');
    const tot = list.reduce((s, r) => s + amt(r.amount), 0);
    const totPaid = list.reduce((s, r) => s + amt(r.paid), 0);
    return `<h4>${label}</h4>
      <div class="scroll"><table class="sheet rsch">${head}${rows}</table></div>
      <p><span class="badge">${label} 금액 합계 ${fmtAmt(tot)}</span> <span class="badge">입금액 합계 ${fmtAmt(totPaid)}</span> (단위: 만원)</p>
      <div class="actions"><button onclick="app.addResearch('${cat}')">+ ${label} 추가</button></div>`;
  }).join('');
  return `<h3>연구</h3>${blocks}
    <p class="hint">구분 칸을 바꾸면 행이 진행중 용역 ↔ 응모예정 과제 사이로 이동합니다.</p>`;
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
  const rows = state.biz.map(r =>
    `<tr><td class="c">${ptext(r.no)}</td><td>${ptext(r.name)}</td><td>${ptext(r.owner)}</td><td>${ptext(r.content)}</td><td>${ptext(r.note)}</td></tr>`).join('');
  return `<h2>사업</h2>
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
  return `<h2>연구</h2>${block('진행', '진행중 용역')}${block('응모', '응모예정 과제')}`;
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
  const apply = state.research.filter(r => (r.cat || '진행') === '응모');

  // 매트릭스 열 구성 (코드 머리글 + 범례)
  const cols = [];
  state.biz.forEach((b, i) => cols.push({ g: '사업', code: 'B' + (i + 1), title: b.name, mark: n => roleInBiz(n, b) }));
  prog.forEach((r, i) => cols.push({ g: '진행 연구', code: 'P' + (i + 1), title: r.title, mark: n => roleInResearch(n, r) }));
  apply.forEach((r, i) => cols.push({ g: '응모 연구', code: 'A' + (i + 1), title: r.title, mark: n => roleInResearch(n, r) }));

  const groups = [];
  cols.forEach(c => { const last = groups[groups.length - 1]; if (last && last.g === c.g) last.n++; else groups.push({ g: c.g, n: 1 }); });
  const grpRow = `<tr><th class="nm"></th>${groups.map(g => `<th colspan="${g.n}">${g.g}</th>`).join('')}</tr>`;
  const codeRow = `<tr><th class="nm">구성원</th>${cols.map(c => `<th title="${esc(c.title)}">${c.code}</th>`).join('')}</tr>`;
  const bodyRows = state.people.map(p => {
    const cells = cols.map(c => {
      const m = c.mark(p.name);
      const mk = m === '담당' || m === '책임' ? '●' : m ? '○' : '';
      return `<td class="${m ? 'r-' + m : ''}" title="${m ? esc(c.title) + ' — ' + m : ''}">${mk}</td>`;
    }).join('');
    return `<tr><th class="nm">${esc(p.name)}</th>${cells}</tr>`;
  }).join('');
  const legend = cols.map(c => `<li><b>${c.code}</b> ${esc(c.title)}</li>`).join('');

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
    <h4>관계 매트릭스 <span class="hint">(● 담당·책임 / ○ 참여)</span></h4>
    <div class="scroll"><table class="sheet mtx">${grpRow}${codeRow}${bodyRows}</table></div>
    <details class="legend"><summary>활동 코드(B·P·A) 전체 이름 보기</summary><ul>${legend}</ul></details>
    <h4>구성원별 요약</h4>
    <div class="scroll"><table class="sheet">
      <tr><th class="nm">구성원</th><th>고정 담당</th><th>담당 사업</th><th>책임 연구</th><th>참여 연구</th><th style="width:54px">활동 수</th></tr>${sumRows}
    </table></div>
    ${orphans.length ? `<h4>담당 구성원이 인식되지 않은 활동</h4>
      <p class="hint">외부 책임자이거나 이름 표기가 다를 수 있습니다. 필요하면 사업/연구 탭에서 담당자·책임자 칸을 확인하세요.</p>
      <ul class="muted">${orphans.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
}

// ---------- 라우터 ----------
const VIEWS = { grid: vGrid, meeting: vMeeting, biz: vBiz, research: vResearch, activity: vActivity, people: vPeople };
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
  addBiz() { DB.add('biz', { no: String(state.biz.length + 1), name: '', owner: '', content: '', note: '' }); route(); },
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
  print() {
    let el = document.getElementById('printArea');
    if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
    const last = addD(curMon, -7);
    el.innerHTML =
      `<div class="phead">한국노동사회연구소 주간회의 자료 — ${md(curMon)} ~ ${md(addD(curMon, 4))}</div>` +
      pGrid(last, '지난주') + pGrid(curMon, '이번주') +
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
