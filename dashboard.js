// ==========================================================================
// DAILY GOAL RING
// ==========================================================================
function setDailyGoalProgress(done, total) {
  const ring = document.getElementById('daily-goal-ring');
  const num = document.getElementById('daily-goal-num');
  const circumference = 2 * Math.PI * 42;
  const pct = Math.min(done / total, 1);
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference * (1 - pct);
  num.textContent = done;
}

// ==========================================================================
// GAME LAUNCHER — PLAY button opens level select modal
// ==========================================================================
document.getElementById('play-btn').addEventListener('click', () => {
  document.getElementById('levelSelectModal').style.display = 'flex';
});

document.getElementById('previous-games-btn').addEventListener('click', () => {
  console.log('Previous Games pressed');
});

document.getElementById('highscore-btn').addEventListener('click', () => {
  console.log('Highest Score pressed');
});

document.getElementById('streak-btn').addEventListener('click', () => {
  console.log('Streak pressed');
});

document.getElementById('achievements-btn').addEventListener('click', () => {
  console.log('Achievements pressed');
});

document.getElementById('quick-practice-btn').addEventListener('click', () => {
  console.log('Quick Practice pressed');
});

// ==========================================================================
// LEVEL SELECT → GAME UI
// ==========================================================================
function loadGame(level) {
  console.log('Selected level: ' + level);

  // Hide modal
  document.getElementById('levelSelectModal').style.display = 'none';

  // Hide only the dashboard's own sections — NOT the whole .dashboard-main,
  // since gameUI lives inside .dashboard-main and would get hidden with it
  document.querySelector('.top-row').style.display = 'none';
  document.querySelector('.game-launcher').style.display = 'none';
  document.querySelector('.right-rail').style.display = 'none';

  // Show game UI and set level
  document.getElementById('gameUI').style.display = 'block';
  document.getElementById('selectedLevel').textContent = level;

  // HERE: Call your existing fetch logic to load kanji/vocab data
  // Example:
  // fetch(`data/kanji/${level}.json`)
  //   .then(res => res.json())
  //   .then(data => renderGameCards(data));
}

function goBackToDashboard() {
  // Hide game UI, restore dashboard sections
  document.getElementById('gameUI').style.display = 'none';
  document.querySelector('.top-row').style.display = 'grid';
  document.querySelector('.game-launcher').style.display = 'block';
  document.querySelector('.right-rail').style.display = 'flex';
}