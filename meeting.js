/* 주간회의 관계형 업무관리 — 바닐라 JS + localStorage
   스토어(7): people, projects, members, meetings, entries, updates, schedule
   1:1 관계(재정/회원변동)는 meetings 레코드에 필드로 병합해 단순화. */

// ---------- 데이터층 ----------
const DB = {
  load: k => JSON.parse(localStorage.getItem('klsi_' + k) || '[]'),
  save: (k, v) => localStorage.setItem('klsi_' + k, JSON.stringify(v)),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  add(k, rec) { const l = this.load(k); rec.id = this.uid(); l.push(rec); this.save(k, l); return rec; },
  remove(k, id) { this.save(k, this.load(k).filter(r => r.id !== id)); }
};
const STORES = ['people', 'projects', 'members', 'meetings', 'entries', 'updates', 'schedule'];

// ---------- 선택지 상수(드롭다운 고정) ----------
const OPT = {
  role: ['소장', '연구위원', '연구원', '교육', '총무'],
  pstatus: ['상근', '3일상근', '1일상근', '비상근'],
  field: ['연구', '교육', '재정', '회원', '센터'],
  active: ['재직', '휴직', '종료'],
  projType: ['연구', '교육', '이슈페이퍼', '노동포럼', '노동이사제', '괴롭힘센터', '기타'],
  projStatus: ['예정', '진행', '검토', '완료', '보류'],
  memberRole: ['총괄', '실무', '지원', '참여'],
  updStatus: ['시작전', '진행중', '검토중', '완료', '지연'],
  risk: ['없음', '일정지연', '예산', '외부협의', '인력'],
  priority: ['낮음', '보통', '높음'],
  slot: ['오전', '오후', '종일'],
  schedType: ['회의', '출장', '집필', '강의', '면담', '행사', '행정', '휴가', '기타'],
  visibility: ['전체', '운영진']
};

// ---------- 공통 헬퍼 ----------
const esc = s => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// data-* 바인딩 입력요소
const bind = (store, id, field) => `data-store="${store}" data-id="${id}" data-field="${esc(field)}"`;
const inp = (store, id, field, val, type = 'text') =>
  `<input ${bind(store, id, field)} type="${type}" value="${esc(val)}">`;
const area = (store, id, field, val, ph = '') =>
  `<textarea ${bind(store, id, field)} rows="2" placeholder="${ph}">${esc(val)}</textarea>`;
const sel = (store, id, field, val, opts) =>
  `<select ${bind(store, id, field)}>${opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
const nameOf = (k, id) => (DB.load(k).find(r => r.id === id) || {}).name || '';

// 수정한 폼값을 스토어별 1회 load/save로 일괄 저장 (효율)
function persistForm(scope = document) {
  const buf = {};
  scope.querySelectorAll('[data-store]').forEach(el => {
    const { store, id, field } = el.dataset;
    ((buf[store] ||= {})[id] ||= {})[field] = el.value;
  });
  for (const store in buf) {
    const list = DB.load(store);
    list.forEach(r => buf[store][r.id] && Object.assign(r, buf[store][r.id]));
    DB.save(store, list);
  }
}

// ---------- 라우터 ----------
function route() {
  const tab = location.hash.slice(1) || 'input';
  document.querySelectorAll('.tabs a[data-tab]').forEach(a =>
    a.classList.toggle('active', a.dataset.tab === tab));
  ({ input: viewInput, meeting: viewMeeting, admin: viewAdmin }[tab] || viewInput)();
}
const render = html => { document.getElementById('view').innerHTML = html; };
const reload = () => route();

// ---------- 주차 선택 헬퍼 ----------
function weekPicker(selectedId, onchange) {
  const ms = DB.load('meetings').sort((a, b) => (a.week < b.week ? 1 : -1));
  return `<select onchange="${onchange}">
    <option value="">— 주차 선택 —</option>
    ${ms.map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${esc(m.week)} (${esc(m.date)})</option>`).join('')}
  </select>`;
}

// ========== 화면 1: 개인 입력 ==========
let cur = { meetingId: '', personId: '' };

function viewInput() {
  const people = DB.load('people').filter(p => p.active !== '종료');
  let html = `<h3>개인 주간입력</h3>
    <div class="row">
      <label>주차 ${weekPicker(cur.meetingId, 'app.pickWeek(this.value)')}</label>
      <button onclick="app.newWeek()">+ 새 주차</button>
      <label>내 이름
        <select onchange="app.pickPerson(this.value)">
          <option value="">— 이름 선택 —</option>
          ${people.map(p => `<option value="${p.id}" ${p.id === cur.personId ? 'selected' : ''}>${esc(p.name)} (${esc(p.role)})</option>`).join('')}
        </select>
      </label>
    </div>`;

  if (!cur.meetingId || !cur.personId) {
    return render(html + '<p class="hint">주차와 이름을 선택하면 담당 사업이 자동으로 표시됩니다.</p>');
  }

  const entry = getEntry(cur.meetingId, cur.personId);
  const myProjects = DB.load('members').filter(m => m.personId === cur.personId);

  html += `<form onsubmit="return false">
    <fieldset><legend>이번 주 동향 (짧게)</legend>
      <label>지난주 ${area('entries', entry.id, 'lastWeek', entry.lastWeek, '핵심 2~3줄')}</label>
      <label>다음주 ${area('entries', entry.id, 'nextWeek', entry.nextWeek, '핵심 2~3줄')}</label>
      <label>특이사항 ${inp('entries', entry.id, 'note', entry.note)}</label>
    </fieldset>

    <fieldset><legend>담당 사업 업데이트</legend>${
      myProjects.length ? myProjects.map(m => {
        const u = getUpdate(entry.id, m.projectId);
        return `<div class="upd">
          <strong>${esc(nameOf('projects', m.projectId))}</strong>
          <div class="grid4">
            <label>진행 ${sel('updates', u.id, 'status', u.status, OPT.updStatus)}</label>
            <label>리스크 ${sel('updates', u.id, 'risk', u.risk, OPT.risk)}</label>
            <label>중요도 ${sel('updates', u.id, 'priority', u.priority, OPT.priority)}</label>
          </div>
          <label>지난주 한 일 ${area('updates', u.id, 'did', u.did)}</label>
          <label>다음주 할 일 ${area('updates', u.id, 'todo', u.todo)}</label>
        </div>`;
      }).join('') : '<p class="hint">담당 사업이 없습니다. “사람·사업 관리”에서 연결하세요.</p>'
    }</fieldset>

    <fieldset><legend>주간 일정</legend>
      <table class="grid"><thead><tr><th>날짜</th><th>시간대</th><th>유형</th><th>관련 사업</th><th>내용</th><th>공개</th><th></th></tr></thead>
      <tbody>${DB.load('schedule').filter(s => s.entryId === entry.id).map(s => `<tr>
        <td>${inp('schedule', s.id, 'date', s.date, 'date')}</td>
        <td>${sel('schedule', s.id, 'slot', s.slot, OPT.slot)}</td>
        <td>${sel('schedule', s.id, 'type', s.type, OPT.schedType)}</td>
        <td>${projectSelect('schedule', s.id, 'projectId', s.projectId)}</td>
        <td>${inp('schedule', s.id, 'content', s.content)}</td>
        <td>${sel('schedule', s.id, 'visibility', s.visibility, OPT.visibility)}</td>
        <td><button onclick="app.delRow('schedule','${s.id}')">×</button></td>
      </tr>`).join('')}</tbody></table>
      <button onclick="app.addSchedule('${entry.id}')">+ 일정 추가</button>
    </fieldset>

    <div class="actions">
      <button class="primary" onclick="app.save('제출', '${entry.id}')">제출</button>
      <button onclick="app.save('임시저장')">임시저장</button>
      <span class="hint">제출상태: ${esc(entry.submitted || '임시저장')}</span>
    </div>
  </form>`;
  render(html);
}

const projectSelect = (store, id, field, val) => `<select ${bind(store, id, field)}>
  <option value="">—</option>
  ${DB.load('projects').map(p => `<option value="${p.id}" ${p.id === val ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
</select>`;

function getEntry(meetingId, personId) {
  return DB.load('entries').find(e => e.meetingId === meetingId && e.personId === personId)
    || DB.add('entries', { meetingId, personId, lastWeek: '', nextWeek: '', note: '', submitted: '임시저장' });
}
function getUpdate(entryId, projectId) {
  return DB.load('updates').find(u => u.entryId === entryId && u.projectId === projectId)
    || DB.add('updates', { entryId, projectId, status: '진행중', did: '', todo: '', risk: '없음', priority: '보통' });
}

// ========== 화면 2: 주간회의 종합 ==========
function viewMeeting() {
  let html = `<h3>주간회의 종합</h3>
    <div class="row"><label>주차 ${weekPicker(cur.meetingId, 'app.pickWeek(this.value, true)')}</label></div>`;
  if (!cur.meetingId) return render(html + '<p class="hint">주차를 선택하세요.</p>');

  const m = DB.load('meetings').find(x => x.id === cur.meetingId);
  const entries = DB.load('entries').filter(e => e.meetingId === cur.meetingId);
  const updates = DB.load('updates');
  const entryIds = entries.map(e => e.id);
  const myUpdates = updates.filter(u => entryIds.includes(u.entryId));

  // 상단: 회원변동 + 재정
  html += `<form onsubmit="return false"><div class="grid2">
    <fieldset><legend>회원 변동</legend>
      <label>신규 ${inp('meetings', m.id, 'memJoined', m.memJoined, 'number')}</label>
      <label>탈퇴 ${inp('meetings', m.id, 'memLeft', m.memLeft, 'number')}</label>
      <label>메모 ${inp('meetings', m.id, 'memNote', m.memNote)}</label>
    </fieldset>
    <fieldset><legend>주간 재정</legend>
      <label>수입 ${inp('meetings', m.id, 'finIncome', m.finIncome, 'number')}</label>
      <label>지출 ${inp('meetings', m.id, 'finExpense', m.finExpense, 'number')}</label>
      <label>특기 ${inp('meetings', m.id, 'finNote', m.finNote)}</label>
    </fieldset></div>
    <div class="actions"><button class="primary" onclick="app.save('마감')">재정·회원 저장</button></div></form>`;

  // 중간: 사람별 동향
  html += `<fieldset><legend>사람별 동향</legend>${
    entries.length ? `<table class="grid"><thead><tr><th>이름</th><th>지난주</th><th>다음주</th><th>상태</th></tr></thead><tbody>${
      entries.map(e => `<tr><td>${esc(nameOf('people', e.personId))}</td>
        <td>${esc(e.lastWeek)}</td><td>${esc(e.nextWeek)}</td>
        <td><span class="badge">${esc(e.submitted || '임시저장')}</span></td></tr>`).join('')
    }</tbody></table>` : '<p class="hint">입력된 내용이 없습니다.</p>'
  }</fieldset>`;

  // 하단: 사업유형별 진행상황
  html += '<fieldset><legend>사업별 진행상황</legend>';
  OPT.projType.forEach(type => {
    const rows = myUpdates.filter(u => {
      const p = DB.load('projects').find(x => x.id === u.projectId);
      return p && p.type === type;
    });
    if (!rows.length) return;
    html += `<h4>${type}</h4><table class="grid"><thead><tr><th>사업</th><th>담당</th><th>진행</th><th>다음주 할 일</th><th>리스크</th><th>중요도</th></tr></thead><tbody>${
      rows.map(u => {
        const e = entries.find(x => x.id === u.entryId);
        return `<tr><td>${esc(nameOf('projects', u.projectId))}</td>
          <td>${esc(e ? nameOf('people', e.personId) : '')}</td>
          <td><span class="badge">${esc(u.status)}</span></td>
          <td>${esc(u.todo)}</td>
          <td>${u.risk !== '없음' ? `<span class="risk">${esc(u.risk)}</span>` : '-'}</td>
          <td>${esc(u.priority)}</td></tr>`;
      }).join('')
    }</tbody></table>`;
  });
  html += '</fieldset>';
  render(html);
}

// ========== 화면 3: 사람·사업 관리 ==========
function viewAdmin() {
  render(`<h3>사람 · 사업 관리</h3>
    ${crudTable('people', '사람', [
      { k: 'name', label: '이름' },
      { k: 'role', label: '역할', opts: OPT.role },
      { k: 'pstatus', label: '근무', opts: OPT.pstatus },
      { k: 'field', label: '담당분야', opts: OPT.field },
      { k: 'active', label: '상태', opts: OPT.active }
    ])}
    ${crudTable('projects', '사업', [
      { k: 'name', label: '사업명' },
      { k: 'type', label: '유형', opts: OPT.projType },
      { k: 'status', label: '상태', opts: OPT.projStatus },
      { k: 'start', label: '시작', type: 'date' },
      { k: 'end', label: '종료', type: 'date' },
      { k: 'note', label: '비고' }
    ])}
    ${membersTable()}`);
}

// 사람/사업 공용 CRUD 테이블
function crudTable(store, title, fields) {
  const rows = DB.load(store);
  return `<fieldset><legend>${title} (${rows.length})</legend>
    <table class="grid"><thead><tr>${fields.map(f => `<th>${f.label}</th>`).join('')}<th></th></tr></thead>
    <tbody>${rows.map(r => `<tr>${fields.map(f =>
      `<td>${f.opts ? sel(store, r.id, f.k, r[f.k], f.opts) : inp(store, r.id, f.k, r[f.k], f.type || 'text')}</td>`).join('')
      }<td><button onclick="app.delRow('${store}','${r.id}')">×</button></td></tr>`).join('')}</tbody></table>
    <div class="actions"><button onclick="app.addRow('${store}')">+ 추가</button>
      <button class="primary" onclick="app.save()">저장</button></div></fieldset>`;
}

// 사람-사업 연결(N:M)
function membersTable() {
  const people = DB.load('people'), projects = DB.load('projects'), members = DB.load('members');
  const pick = (store, id, field, val, list) => `<select ${bind(store, id, field)}>
    <option value="">—</option>${list.map(x => `<option value="${x.id}" ${x.id === val ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
  return `<fieldset><legend>사람–사업 연결 (${members.length})</legend>
    <table class="grid"><thead><tr><th>사람</th><th>사업</th><th>역할</th><th>주담당</th><th></th></tr></thead>
    <tbody>${members.map(m => `<tr>
      <td>${pick('members', m.id, 'personId', m.personId, people)}</td>
      <td>${pick('members', m.id, 'projectId', m.projectId, projects)}</td>
      <td>${sel('members', m.id, 'role', m.role, OPT.memberRole)}</td>
      <td style="text-align:center">${sel('members', m.id, 'primary', m.primary, ['예', '아니오'])}</td>
      <td><button onclick="app.delRow('members','${m.id}')">×</button></td></tr>`).join('')}</tbody></table>
    <div class="actions"><button onclick="app.addRow('members')">+ 연결 추가</button>
      <button class="primary" onclick="app.save()">저장</button></div></fieldset>`;
}

// ---------- 액션(전역 app) ----------
const app = {
  pickWeek(id) { persistForm(); cur.meetingId = id; reload(); },
  pickPerson(id) { persistForm(); cur.personId = id; reload(); },
  newWeek() {
    const week = prompt('주차 (예: 2026-06-2주)');
    if (!week) return;
    const m = DB.add('meetings', { week, date: new Date().toISOString().slice(0, 10), status: '작성중' });
    cur.meetingId = m.id; reload();
  },
  addSchedule(entryId) {
    persistForm();
    DB.add('schedule', { entryId, personId: cur.personId, projectId: '', date: '', slot: '오전', type: '회의', content: '', visibility: '전체' });
    reload();
  },
  addRow(store) { persistForm(); DB.add(store, { name: '', active: '재직', status: '진행' }); reload(); },
  delRow(store, id) { persistForm(); DB.remove(store, id); reload(); },
  save(state, entryId) {
    persistForm();
    if (state && entryId) {
      const l = DB.load('entries'); const e = l.find(x => x.id === entryId);
      if (e) { e.submitted = state; DB.save('entries', l); }
    }
    reload();
    alert(state ? state + ' 완료' : '저장되었습니다.');
  },
  exportJSON() {
    const data = Object.fromEntries(STORES.map(k => [k, DB.load(k)]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `klsi-주간회의-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  },
  importJSON(input) {
    const file = input.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!confirm('현재 데이터를 덮어씁니다. 진행할까요?')) return;
        STORES.forEach(k => Array.isArray(data[k]) && DB.save(k, data[k]));
        reload(); alert('가져오기 완료');
      } catch { alert('잘못된 파일입니다.'); }
    };
    r.readAsText(file); input.value = '';
  }
};

window.addEventListener('hashchange', route);
route();
