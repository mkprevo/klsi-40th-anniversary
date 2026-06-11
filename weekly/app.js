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
    [['1', '홍보', ''], ['2', '노동포럼', '이주환'], ['3', '이슈페이퍼', '송관철'], ['4', '교육', '박혜경'],
     ['5', '직장괴롭힘조사센터', '박용철'], ['6', '노동이사 과정', '이명규/윤효원'], ['7', '감사', '윤효원'], ['8', '기타', '']]
      .forEach(([no, name, owner]) => state.biz.push({ id: DB.uid(), no, name, owner, content: '', note: '' }));
    persist('biz');
  }
  if (!state.research.length) {
    const R = [
      ['2025', '1', '건설노조 교육원(가칭) 용역사업', '이명규', '박혜경', '최은계', '', '건설노조', '2025-05-07', '2026-06-30', '2,000', '1,000', '', '6/17 건설노조 중집회의에서 pt'],
      ['2025', '2', '초등교사 노동 특수성과 직업병 연구', '송관철', '이주환, 장안석, 이진우, 이서영', '', 'O', '초등교사노조', '2025-11-01', '2026-06-30', '4,990', '2,994', '', '최종보고서 협의 중(계속)'],
      ['2026', '1', '공공연대노동조합 조직 진단과 발전 방향', '이주환', '', '', '', '공공연대노조', '2026-01-19', '2026-04-30', '1,000', '', '', ''],
      ['2026', '2', '전국교직원노동조합 광주지부·전남지부 조직진단 및 혁신방안', '박용철', '송관철', '', '', '전교조 광주지부·전남지부', '2026-04-15', '2026-10-15', '2,000', '', '', '계약체결 협의, 설문 마무리 및 인터뷰 개시 준비'],
      ['2026', '3', '다중위기와 노동운동 3', '이주환', '김유선, 이문호, 권순미, 윤정향', '', '', '에버트재단', '', '2026-09-30', '1,950', '', '', '6월15일 2차 회의'],
      ['2026', '4', '유통산업 초기업교섭 실태조사', '송관철', '', '', '', '한국노동연구원', '2026-04-01', '2026-08-30', '500', '250', '', '실태조사 진행(계속)'],
      ['2026', '5', '업종별 노사관계 사례 조사 및 평가', '이주환(행정상)', '채준호, 박성국, 박운, 조현민', '', '', '한국노동연구원', '', '', '2,750', '', '', '계약 진행 중, 오버헤드 과제'],
      ['2026', '6', '단체교섭의 사회적 기능과 방식에 관한 연구', '이명규', '이주환', '', '', '한국노동연구원', '', '', '1,750', '', '', '계약 준비 중, 오버헤드 과제'],
      ['2026', '7', '선별장 등 실태조사 및 근로여건 개선방안 마련 연구', '이주환', '장안석', '', '', '한국노동연구원', '', '', '1,800', '', '', '계약 예정, 오버헤드 과제'],
      ['2026', '8', '화학섬유노조 산별활동가 교육프로그램 설계', '이명규', '', '', '', '화섬식품노조', '', '', '1,500', '', '', ''],
      ['2026', '9', '공공기관 노동이사제 운영 실태와 이사회 작동 변화 분석', '이명규', '', '', '', '국가공공기관노동이사협의회', '', '', '1,036', '', '', '계약 체결 예정'],
      ['2026', '10', '서울 패션·봉제산업 실태조사 연구용역', '이명규', '이종수', '윤세정', '', '서울노사민정협의회', '', '', '약 3,600', '', '', '킥오프 회의'],
      ['기타', '1', '노사상생협력교육사업 사업성과 분석 및 개선방안 연구', '박용철', '송관철', '', '', '노사발전재단', '2026-06', '2026-11', '700', '', '오버헤드 20%', '협의 및 계약 예정']
    ];
    R.forEach(([year, no, title, lead, fellows, asst, contract, client, start, end, amount, paid, approve, status]) =>
      state.research.push({ id: DB.uid(), year, no, title, lead, fellows, asst, contract, client, start, end, amount, paid, approve, status }));
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
  // 칸 수정 → 자동 저장 (blur 시점)
  document.getElementById('view').addEventListener('change', e => {
    const el = e.target.closest('[data-store]');
    if (!el) return;
    const { store, id, field } = el.dataset;
    const r = state[store].find(x => x.id === id);
    if (r) { r[field] = el.value; persist(store); }
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
function vResearch() {
  const years = [...new Set(state.research.map(r => r.year))].sort();
  const head = `<tr><th>연번</th><th style="min-width:220px">연구과제명</th><th>책임자</th><th style="min-width:140px">연구위원</th><th>연구원</th><th>계약서</th><th style="min-width:120px">발주처</th><th>시작</th><th>종료</th><th>금액</th><th>입금액</th><th>결재</th><th style="min-width:160px">진행상황</th><th></th></tr>`;
  const blocks = years.map(y => {
    const rows = state.research.filter(r => r.year === y).map(r =>
      `<tr>${icel('research', r.id, 'no', r.no, '36px')}${cell('research', r.id, 'title', r.title, 'min-height:40px')}${icel('research', r.id, 'lead', r.lead, '80px')}${cell('research', r.id, 'fellows', r.fellows, 'min-height:40px')}${icel('research', r.id, 'asst', r.asst, '70px')}${icel('research', r.id, 'contract', r.contract, '46px')}${icel('research', r.id, 'client', r.client)}${icel('research', r.id, 'start', r.start, '92px')}${icel('research', r.id, 'end', r.end, '92px')}${icel('research', r.id, 'amount', r.amount, '70px')}${icel('research', r.id, 'paid', r.paid, '70px')}${icel('research', r.id, 'approve', r.approve, '70px')}${cell('research', r.id, 'status', r.status, 'min-height:40px')}${delBtn('research', r.id)}</tr>`).join('');
    return `<h4>${esc(y)}</h4><div class="scroll"><table class="sheet rsch">${head}${rows}</table></div>`;
  }).join('');
  const tot = state.research.reduce((s, r) => s + amt(r.amount), 0);
  const totPaid = state.research.reduce((s, r) => s + amt(r.paid), 0);
  return `<h3>연구 (용역 목록)</h3>${blocks}
    <p><span class="badge">금액 합계 ${fmtAmt(tot)}</span> <span class="badge">입금액 합계 ${fmtAmt(totPaid)}</span> (단위: 만원)</p>
    <div class="actions"><button onclick="app.addResearch()">+ 과제 추가</button></div>`;
}

// ---------- 화면: 구성원 ----------
function vPeople() {
  const rows = state.people.map(p =>
    `<tr>${icel('people', p.id, 'name', p.name)}${delBtn('people', p.id)}</tr>`).join('');
  return `<h3>구성원</h3>
    <table class="sheet" style="max-width:360px"><tr><th>이름</th><th style="width:36px"></th></tr>${rows}</table>
    <div class="actions">
      <input id="npName" placeholder="새 구성원 이름" style="width:160px">
      <button onclick="app.addPerson()">+ 추가</button>
    </div>
    <p class="hint">이름을 지워도 과거 일정 기록은 데이터에 남습니다. 표시 순서는 등록 순서입니다.</p>`;
}

// ---------- 라우터 ----------
const VIEWS = { grid: vGrid, meeting: vMeeting, biz: vBiz, research: vResearch, people: vPeople };
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
  addResearch() {
    const year = prompt('연도(예: 2026, 기타)', String(new Date().getFullYear()));
    if (year === null) return;
    DB.add('research', { year: year || '기타', no: '', title: '', lead: '', fellows: '', asst: '', contract: '', client: '', start: '', end: '', amount: '', paid: '', approve: '', status: '' });
    route();
  },
  addPerson() {
    const name = document.getElementById('npName').value.trim();
    if (!name) return;
    DB.add('people', { name }); route();
  },
  del(store, id) { if (confirm('이 행을 삭제할까요?')) { DB.remove(store, id); route(); } },
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
