// STATE
let currentMode = 'vocab';
let allEntries = [];
let filteredEntries = [];
let currentCardIndex = 0;
let currentPage = 1;
const PAGE_SIZE = 30;
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

// LOCALSTORAGE HELPERS (namespaced by mode so vocab/kanji progress don't mix)
function getWordKey(mode, entry) {
  return mode === 'vocab' ? `word:${entry.word}` : `kanji:${entry.character}`;
}
function readMap(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch (e) { return {}; }
}
function writeMap(key, map) { localStorage.setItem(key, JSON.stringify(map)); }

function getMastered(mode) { return readMap(`${mode}_mastered`); }
function setMastered(mode, key, value) {
  const m = getMastered(mode);
  if (value) m[key] = true; else delete m[key];
  writeMap(`${mode}_mastered`, m);
}

function getFlagged(mode) { return readMap(`${mode}_flagged`); }
function setFlagged(mode, key, value) {
  const f = getFlagged(mode);
  if (value) f[key] = true; else delete f[key];
  writeMap(`${mode}_flagged`, f);
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function getDailyProgress(mode) {
  const raw = JSON.parse(localStorage.getItem(`${mode}_daily`) || 'null');
  if (!raw || raw.date !== todayStr()) return { date: todayStr(), count: 0 };
  return raw;
}
function incrementDaily(mode) {
  const d = getDailyProgress(mode);
  d.count += 1;
  localStorage.setItem(`${mode}_daily`, JSON.stringify(d));
  return d;
}
function getDailyGoal(mode) { return parseInt(localStorage.getItem(`${mode}_goal`) || '15', 10); }
function setDailyGoal(mode, value) { localStorage.setItem(`${mode}_goal`, String(value)); }

// DATA LOADING
async function loadEntries(mode) {
  const folder = mode === 'vocab' ? 'vocab' : 'kanji';
  const requests = LEVELS.map(lvl =>
    fetch(`data/${folder}/${lvl}.json`).then(r => r.ok ? r.json() : []).catch(() => [])
  );
  const results = await Promise.all(requests);
  return results.flat();
}

async function initMode(mode) {
  currentMode = mode;
  document.getElementById('nav-vocab').classList.toggle('active', mode === 'vocab');
  document.getElementById('nav-kanji').classList.toggle('active', mode === 'kanji');
  document.getElementById('list-title').textContent = mode === 'vocab' ? 'Vocab List' : 'Kanji List';
  document.getElementById('goal-title').textContent = mode === 'vocab' ? 'Daily Vocab Goal' : 'Daily Kanji Goal';
  document.getElementById('goal-studied-label').textContent = mode === 'vocab' ? 'Vocab Studied' : 'Kanji Studied';
  document.getElementById('goal-unit-label').textContent = mode === 'vocab' ? 'vocab / day' : 'kanji / day';

  allEntries = await loadEntries(mode);
  syncFiltersFromState();
  applyFilters();
  currentPage = 1;
  renderWordCount();
  renderDailyGoal();
  renderGrid();
}

// FILTERING
function getFilterValues() {
  return {
    status: document.getElementById('filter-status').value,
    level: document.getElementById('filter-level').value,
    flaggedOnly: document.getElementById('filter-flagged').checked
  };
}
function syncFiltersFromState() {
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-level').value = 'all';
  document.getElementById('filter-flagged').checked = false;
  document.getElementById('filter-status-modal').value = 'all';
  document.getElementById('filter-level-modal').value = 'all';
  document.getElementById('filter-flagged-modal').checked = false;
}

function applyFilters() {
  const { status, level, flaggedOnly } = getFilterValues();
  const search = (document.getElementById('vocab-search').value || '').toLowerCase();
  const mastered = getMastered(currentMode);
  const flagged = getFlagged(currentMode);

  filteredEntries = allEntries.filter(entry => {
    const key = getWordKey(currentMode, entry);
    const isMastered = !!mastered[key];

    if (level !== 'all' && entry.level !== level) return false;
    if (flaggedOnly && !flagged[key]) return false;
    if (status === 'mastered' && !isMastered) return false;
    if (status === 'new' && isMastered) return false;
    if (status === 'missed') return false; // no quiz/wrong-answer feature yet

    if (search) {
      const label = currentMode === 'vocab' ? entry.word : entry.character;
      const meaningMatch = (entry.meanings || []).join(' ').toLowerCase().includes(search);
      if (!label.toLowerCase().includes(search) && !meaningMatch) return false;
    }
    return true;
  });
}

function onFilterChange(fromModal) {
  if (fromModal) {
    document.getElementById('filter-status').value = document.getElementById('filter-status-modal').value;
    document.getElementById('filter-level').value = document.getElementById('filter-level-modal').value;
    document.getElementById('filter-flagged').checked = document.getElementById('filter-flagged-modal').checked;
  } else {
    document.getElementById('filter-status-modal').value = document.getElementById('filter-status').value;
    document.getElementById('filter-level-modal').value = document.getElementById('filter-level').value;
    document.getElementById('filter-flagged-modal').checked = document.getElementById('filter-flagged').checked;
  }
  applyFilters();
  currentPage = 1;
  renderGrid();
  if (document.getElementById('detail-view').style.display !== 'none') {
    currentCardIndex = Math.min(currentCardIndex, Math.max(0, filteredEntries.length - 1));
    renderFlashcard();
    renderScrollList();
  }
}

['filter-status', 'filter-level'].forEach(id =>
  document.getElementById(id).addEventListener('change', () => onFilterChange(false))
);
document.getElementById('filter-flagged').addEventListener('change', () => onFilterChange(false));
['filter-status-modal', 'filter-level-modal'].forEach(id =>
  document.getElementById(id).addEventListener('change', () => onFilterChange(true))
);
document.getElementById('filter-flagged-modal').addEventListener('change', () => onFilterChange(true));
document.getElementById('vocab-search').addEventListener('input', () => { applyFilters(); currentPage = 1; renderGrid(); });

// GRID VIEW
function renderGrid() {
  const grid = document.getElementById('word-grid');
  grid.innerHTML = '';
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredEntries.slice(start, start + PAGE_SIZE);

  pageItems.forEach((entry) => {
    const globalIndex = filteredEntries.indexOf(entry);
    const label = currentMode === 'vocab' ? entry.word : entry.character;
    const card = document.createElement('button');
    card.className = 'word-card';
    card.textContent = label;
    card.addEventListener('click', () => openDetail(globalIndex));
    grid.appendChild(card);
  });
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  document.getElementById('page-label').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;
}
document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderGrid(); }
});
document.getElementById('next-page').addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  if (currentPage < totalPages) { currentPage++; renderGrid(); }
});

function renderWordCount() {
  document.getElementById('total-word-count').textContent = `${allEntries.length} words`;
}

// DETAIL VIEW (Cards / Scroll)
function openDetail(index) {
  currentCardIndex = index;
  document.getElementById('grid-view').style.display = 'none';
  document.getElementById('detail-view').style.display = 'block';
  showCardsSubview();
  renderFlashcard();
}
document.getElementById('exit-detail-btn').addEventListener('click', () => {
  document.getElementById('detail-view').style.display = 'none';
  document.getElementById('grid-view').style.display = 'block';
  document.getElementById('filters-modal').classList.remove('open');
});

function showCardsSubview() {
  document.getElementById('view-cards-btn').classList.add('active');
  document.getElementById('view-scroll-btn').classList.remove('active');
  document.getElementById('flashcard-view').style.display = 'flex';
  document.getElementById('scroll-view').style.display = 'none';
}
function showScrollSubview() {
  document.getElementById('view-scroll-btn').classList.add('active');
  document.getElementById('view-cards-btn').classList.remove('active');
  document.getElementById('scroll-view').style.display = 'block';
  document.getElementById('flashcard-view').style.display = 'none';
  renderScrollList();
}
document.getElementById('view-cards-btn').addEventListener('click', showCardsSubview);
document.getElementById('view-scroll-btn').addEventListener('click', showScrollSubview);

document.getElementById('filters-btn').addEventListener('click', () => {
  document.getElementById('filters-modal').classList.toggle('open');
});

// CARDS (flashcard detail)
function renderFlashcard() {
  if (!filteredEntries.length) return;
  const entry = filteredEntries[currentCardIndex];
  const mastered = getMastered(currentMode);
  const flagged = getFlagged(currentMode);
  const key = getWordKey(currentMode, entry);

  document.getElementById('card-level-badge').textContent = entry.level;
  document.getElementById('card-position').textContent = `Word ${currentCardIndex + 1} of ${filteredEntries.length}`;

  const label = currentMode === 'vocab' ? entry.word : entry.character;
  document.getElementById('card-word').textContent = label;

  const readingEl = document.getElementById('card-reading');
  if (currentMode === 'vocab' && entry.reading) {
    readingEl.textContent = entry.reading;
    readingEl.style.display = 'block';
  } else {
    readingEl.style.display = 'none';
  }

  document.getElementById('card-meaning').textContent = (entry.meanings || []).join('; ');

  const examplesTile = document.getElementById('examples-tile');
  if (currentMode === 'vocab' && entry.examples && entry.examples.length) {
    examplesTile.style.display = 'block';
    const list = document.getElementById('examples-list');
    list.innerHTML = '';
    entry.examples.slice(0, 2).forEach(ex => {
      const div = document.createElement('div');
      div.className = 'example-item';
      div.innerHTML = `<div class="example-ja"></div><div class="example-en"></div>`;
      div.querySelector('.example-ja').textContent = ex.ja || '';
      div.querySelector('.example-en').textContent = ex.en || '';
      list.appendChild(div);
    });
  } else {
    examplesTile.style.display = 'none';
  }

  const sidePanel = document.getElementById('kanji-side-panel');
  const card = document.getElementById('flashcard-card');
  if (currentMode === 'kanji') {
    sidePanel.style.display = 'block';
    document.getElementById('side-onyomi').textContent = (entry.onyomi || []).join('、') || '—';
    document.getElementById('side-kunyomi').textContent = (entry.kunyomi || []).join('、') || '—';
    card.classList.add('shifted-left');
  } else {
    sidePanel.style.display = 'none';
    card.classList.remove('shifted-left');
  }

  document.getElementById('flag-btn').classList.toggle('active', !!flagged[key]);
  const knowBtn = document.getElementById('know-word-btn');
  const isMastered = !!mastered[key];
  knowBtn.classList.toggle('active', isMastered);
  knowBtn.textContent = isMastered ? '✓ Mastered' : '✓ I know this word';

  document.getElementById('prev-word-btn').disabled = currentCardIndex <= 0;
  document.getElementById('next-word-btn').disabled = currentCardIndex >= filteredEntries.length - 1;
}

document.getElementById('prev-word-btn').addEventListener('click', () => {
  if (currentCardIndex > 0) { currentCardIndex--; renderFlashcard(); }
});
document.getElementById('next-word-btn').addEventListener('click', () => {
  if (currentCardIndex < filteredEntries.length - 1) { currentCardIndex++; renderFlashcard(); }
});

document.getElementById('flag-btn').addEventListener('click', () => {
  const entry = filteredEntries[currentCardIndex];
  const key = getWordKey(currentMode, entry);
  const flagged = getFlagged(currentMode);
  setFlagged(currentMode, key, !flagged[key]);
  renderFlashcard();
});

document.getElementById('know-word-btn').addEventListener('click', () => {
  const entry = filteredEntries[currentCardIndex];
  const key = getWordKey(currentMode, entry);
  const mastered = getMastered(currentMode);
  const wasMastered = !!mastered[key];
  setMastered(currentMode, key, !wasMastered);
  if (!wasMastered) {
    incrementDaily(currentMode);
    renderDailyGoal();
  }
  renderFlashcard();
});

// SCROLL (read-only list)
function renderScrollList() {
  const list = document.getElementById('scroll-list');
  list.innerHTML = '';
  document.getElementById('scroll-count').textContent = `${filteredEntries.length} of ${allEntries.length} words`;

  filteredEntries.forEach((entry, i) => {
    const label = currentMode === 'vocab' ? entry.word : entry.character;
    const meaning = (entry.meanings || [])[0] || '';
    const row = document.createElement('div');
    row.className = 'scroll-row';
    row.innerHTML = `
      <span class="scroll-index">#${i + 1}</span>
      <span class="scroll-level"></span>
      <span class="scroll-word"></span>
      <span class="scroll-dash">-</span>
      <span class="scroll-meaning"></span>
    `;
    row.querySelector('.scroll-level').textContent = entry.level;
    row.querySelector('.scroll-word').textContent = label;
    row.querySelector('.scroll-meaning').textContent = meaning;
    list.appendChild(row);
  });
}

// DAILY GOAL
function renderDailyGoal() {
  const goal = getDailyGoal(currentMode);
  const progress = getDailyProgress(currentMode);
  const circumference = 2 * Math.PI * 42;
  const pct = Math.min(progress.count / goal, 1);

  document.getElementById('goal-ring-fg').style.strokeDasharray = circumference;
  document.getElementById('goal-ring-fg').style.strokeDashoffset = circumference * (1 - pct);
  document.getElementById('goal-count').textContent = progress.count;
  document.getElementById('goal-total').textContent = `/${goal}`;
  document.getElementById('goal-remaining').textContent = `${Math.max(0, 100 - Math.round(pct * 100))}% remaining`;
  document.getElementById('goal-input').value = goal;
}

document.getElementById('goal-edit-toggle').addEventListener('click', () => {
  document.getElementById('goal-display').style.display =
    document.getElementById('goal-display').style.display === 'none' ? 'flex' : 'none';
  document.getElementById('goal-edit').classList.toggle('open');
});
document.getElementById('goal-input').addEventListener('change', (e) => {
  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
  setDailyGoal(currentMode, val);
  renderDailyGoal();
});

// TABS
document.getElementById('tab-vocab').addEventListener('click', () => {
  document.getElementById('tab-vocab').classList.add('active');
  document.getElementById('tab-kanji').classList.remove('active');
  document.getElementById('exit-detail-btn').click();
  initMode('vocab');
});
document.getElementById('tab-kanji').addEventListener('click', () => {
  document.getElementById('tab-kanji').classList.add('active');
  document.getElementById('tab-vocab').classList.remove('active');
  document.getElementById('exit-detail-btn').click();
  initMode('kanji');
});

// INIT — respects ?mode=kanji from the sidebar's Kanji link
const params = new URLSearchParams(window.location.search);
const startMode = params.get('mode') === 'kanji' ? 'kanji' : 'vocab';
document.getElementById('tab-vocab').classList.toggle('active', startMode === 'vocab');
document.getElementById('tab-kanji').classList.toggle('active', startMode === 'kanji');
initMode(startMode);