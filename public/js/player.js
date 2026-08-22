// ==========================================================================
// PLAYER FRONTEND LOGIC (DISPOSITIVO DO ALUNO/JOGADOR)
// ==========================================================================

const socket = io();

let selectedAvatar = '🚀';
let currentPin = null;

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

function selectAvatar(emoji) {
  selectedAvatar = emoji;
  document.querySelectorAll('.avatar-option').forEach(el => {
    if (el.innerText === emoji) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
}

function handlePlayerJoin(e) {
  e.preventDefault();
  const pin = document.getElementById('player-pin-input').value.trim();
  const nickname = document.getElementById('player-name-input').value.trim();
  const errorAlert = document.getElementById('error-alert');

  errorAlert.style.display = 'none';
  currentPin = pin;

  socket.emit('join-room', {
    pin,
    nickname,
    avatar: selectedAvatar
  });
}

socket.on('join-error', ({ message }) => {
  const errorAlert = document.getElementById('error-alert');
  errorAlert.innerText = message || 'Erro ao entrar na sala.';
  errorAlert.style.display = 'block';
});

socket.on('joined-success', ({ pin, nickname, avatar, quizTitle }) => {
  document.getElementById('player-avatar-display').innerText = avatar;
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
