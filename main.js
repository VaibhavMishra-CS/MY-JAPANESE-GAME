const landing = document.getElementById('landing');
const levelSelect = document.getElementById('levelSelect');
const gameUI = document.getElementById('gameUI');

document.querySelectorAll('.get-started-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    landing.style.display = 'none';
    levelSelect.style.display = 'block';
    window.scrollTo(0, 0);
  });
});

function loadGame(level) {
  console.log("Selected level: " + level);
  levelSelect.style.display = 'none';
  gameUI.style.display = 'block';
  window.scrollTo(0, 0);
  // Here you would trigger your fetch logic, e.g.:
  // fetch(`data/kanji/${level}.json`).then(res => res.json()).then(renderDeck);
}

document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const item = question.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));