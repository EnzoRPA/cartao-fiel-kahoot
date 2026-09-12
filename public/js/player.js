// ==========================================================================
// PLAYER FRONTEND LOGIC (DISPOSITIVO DO ALUNO/JOGADOR)
// ==========================================================================

const socket = io();

let selectedAvatar = '🧒';
let selectedUsername = '';
let currentPin = null;
let avatarInitialized = false;

// --- NAVEGAÇÃO DE TELAS ---
function showPlayerScreen(screenId) {
  document.querySelectorAll('.screen-view').forEach(sc => sc.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

// Auto-preencher PIN vindo da URL (escaneamento de QR Code)
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const pinFromUrl = urlParams.get('pin');
  if (pinFromUrl) {
    const pinInput = document.getElementById('player-pin-input');
    if (pinInput) pinInput.value = pinFromUrl;
  }
});

// --- PERSONALIZAÇÃO DE ABAS ---
function switchCustomizeTab(tabId) {
  document.querySelectorAll('.customize-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.customize-panel').forEach(p => p.classList.remove('active'));
  
  event.target.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

// DIGITAR NOME → AVATAR
function handleSetName(e) {
  e.preventDefault();
  const nameInput = document.getElementById('player-name-input');
  const name = nameInput.value.trim();
  if (!name) return;

  selectedUsername = name;
  document.getElementById('customize-username').innerText = name;

  if (!avatarInitialized && typeof AvatarBuilder !== 'undefined') {
    AvatarBuilder.initOptions();
    avatarInitialized = true;
  }

  if (typeof AvatarBuilder !== 'undefined') {
    AvatarBuilder.render(document.getElementById('avatar-preview-svg'));
  }

  showPlayerScreen('player-customize-screen');
}

function goBackToNameInput() {
  showPlayerScreen('player-name-screen');
}

// AVATAR → ENTRAR (pula PIN se já veio da URL)
function goToPinInput() {
  if (typeof AvatarBuilder !== 'undefined') {
    AvatarBuilder.render(document.getElementById('login-avatar-svg'));
    AvatarBuilder.render(document.getElementById('lobby-avatar-svg'));
  }

  document.getElementById('login-username-display').innerText = selectedUsername;

  const urlParams = new URLSearchParams(window.location.search);
  const pinFromUrl = urlParams.get('pin');
  if (pinFromUrl) {
    currentPin = pinFromUrl;
    joinWithPin(pinFromUrl);
  } else {
    showPlayerScreen('player-login-screen');
  }
}

function goBackToCustomize() {
  showPlayerScreen('player-customize-screen');
}

function handlePlayerJoin(e) {
  e.preventDefault();
  const pin = document.getElementById('player-pin-input').value.trim();
  if (!pin) return;
  joinWithPin(pin);
}

function joinWithPin(pin) {
  const errorAlert = document.getElementById('error-alert');
  if (errorAlert) errorAlert.style.display = 'none';
  currentPin = pin;

  let avatarData = selectedAvatar;
  if (typeof AvatarBuilder !== 'undefined') {
    avatarData = AvatarBuilder.renderAvatarString();
  }

  socket.emit('join-room', {
    pin,
    nickname: selectedUsername,
    avatar: avatarData,
    userId: null
  });
}

socket.on('join-error', ({ message }) => {
  const errorAlert = document.getElementById('error-alert');
  if (errorAlert) {
    errorAlert.innerText = message || 'Erro ao entrar na sala.';
    errorAlert.style.display = 'block';
  }
  showPlayerScreen('player-login-screen');
});

socket.on('joined-success', ({ pin, nickname, avatar, quizTitle }) => {
  const lobbyAvatar = document.getElementById('lobby-avatar-svg');
  if (lobbyAvatar && avatar && (avatar.startsWith('<svg') || avatar.includes('<svg'))) {
    lobbyAvatar.outerHTML = `<svg id="lobby-avatar-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">${avatar.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}</svg>`;
  }
  
  document.getElementById('player-nickname-display').innerText = nickname;
  showPlayerScreen('player-lobby-screen');
  window.kahootAudio.playJoinSound();
});

// INÍCIO DE UMA PERGUNTA
socket.on('question-start-player', ({ questionIndex, totalQuestions, questionText }) => {
  document.getElementById('player-q-progress').innerText = `Pergunta ${questionIndex + 1} de ${totalQuestions}`;
  showPlayerScreen('player-question-screen');
  window.kahootAudio.playTickSound();
});

function submitPlayerAnswer(answerIndex) {
  window.kahootAudio.playTickSound();
  socket.emit('submit-answer', { pin: currentPin, answerIndex });
}

socket.on('answer-accepted', ({ answerIndex }) => {
  showPlayerScreen('player-waiting-screen');
});

// RESULTADO DA PERGUNTA PARA O JOGADOR
socket.on('question-reveal-player', ({ isCorrect, pointsEarned, totalScore, rank, streak, correctAnswerText, correctAnswerShape }) => {
  showPlayerScreen('player-result-screen');

  const banner = document.getElementById('result-banner');
  const icon = document.getElementById('result-icon');
  const title = document.getElementById('result-title');
  const points = document.getElementById('result-points');
  const totalScoreEl = document.getElementById('result-total-score');
  const rankEl = document.getElementById('result-rank');
  const correctTextEl = document.getElementById('result-correct-text');

  totalScoreEl.innerText = totalScore;
  rankEl.innerText = `#${rank}`;

  if (correctTextEl) {
    correctTextEl.innerText = `${correctAnswerShape || ''} ${correctAnswerText || ''}`;
  }

  if (isCorrect) {
    banner.className = 'feedback-banner correct';
    icon.innerText = '🎉';
    title.innerText = 'VOCÊ ACERTOU!';
    points.innerText = `+${pointsEarned} pts ${streak > 1 ? `🔥 (${streak}x)` : ''}`;
    window.kahootAudio.playCorrectSound();
  } else {
    banner.className = 'feedback-banner incorrect';
    icon.innerText = '❌';
    title.innerText = 'VOCÊ ERROU!';
    points.innerText = '+0 pts';
    window.kahootAudio.playWrongSound();
  }
});

// FIM DE JOGO DO JOGADOR
socket.on('game-over-player', ({ finalRank, totalScore, totalPlayers }) => {
  showPlayerScreen('player-gameover-screen');

  const medalEl = document.getElementById('player-final-medal');
  const rankEl = document.getElementById('player-final-rank');
  const scoreEl = document.getElementById('player-final-score');

  rankEl.innerText = `#${finalRank} de ${totalPlayers}`;
  scoreEl.innerText = `${totalScore} pts`;

  if (finalRank === 1) {
    medalEl.innerText = '👑';
    window.kahootAudio.playVictorySound();
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 90 });
  } else if (finalRank === 2) {
    medalEl.innerText = '🥈';
    window.kahootAudio.playVictorySound();
  } else if (finalRank === 3) {
    medalEl.innerText = '🥉';
    window.kahootAudio.playVictorySound();
  } else {
    medalEl.innerText = '👏';
  }
});

// JOGO CANCELADO PELO HOST
socket.on('game-cancelled', ({ message }) => {
  currentPin = null;
  showPlayerScreen('player-login-screen');
  const errorAlert = document.getElementById('error-alert');
  if (errorAlert) {
    errorAlert.innerText = message || 'O jogo foi cancelado pelo organizador.';
    errorAlert.style.display = 'block';
  }
});
