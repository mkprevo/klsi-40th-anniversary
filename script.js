// D-day 카운트다운 + 오늘의 카드뉴스 (posts.json)
const targetDate = new Date('2026-04-23T00:00:00+09:00');

function renderCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;
  const today = new Date();
  const days = Math.ceil((targetDate - today) / 86400000);
  el.textContent = days > 0 ? `기념일까지 D-${days}`
    : days === 0 ? '오늘은 기념일입니다!' : '기념일이 지났습니다.';
}

async function renderCards() {
  const box = document.getElementById('cards');
  if (!box) return;
  try {
    const { posts } = await (await fetch('posts.json')).json();
    const today = new Date().toISOString().slice(0, 10);
    const list = posts.filter(p => p.date === today);
    box.innerHTML = list.length ? list.map(p => `
      <div class="card">
        <img src="${p.image}" alt="${p.title}">
        <div class="card-content">
          <div class="card-title">${p.title}</div>
          <div class="card-date">${p.date}</div>
          <p>${p.content}</p>
        </div>
      </div>`).join('') : '<p>오늘 게시된 카드뉴스가 없습니다.</p>';
  } catch {
    box.innerHTML = '<p>카드뉴스를 불러오지 못했습니다.</p>';
  }
}

renderCountdown();
renderCards();
