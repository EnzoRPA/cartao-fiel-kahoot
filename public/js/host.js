// ==========================================================================
// HOST FRONTEND LOGIC (PAINEL DO PROFESSOR/ORGANIZADOR)
// ==========================================================================

const socket = io();

// Estado Local do Host
let currentPin = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let hostTimerInterval = null;
let currentAnswersReceived = 0;
let currentTotalPlayers = 0;

// Amostras de Quizzes Padrão Iniciais (disponíveis imediatamente!)
const defaultQuizzes = [
  {
    id: 'quiz-28-crencas-adventistas',
    title: '📖 28 Crenças Fundamentais da Igreja Adventista',
    questions: [
      {
        question: 'Qual é a única norma infalível de fé e conduta para os adventistas?',
        options: ['A Bíblia Sagrada (Escrituras)', 'Tradições e Credos', 'Livros de História', 'Conselhos de Líderes'],
        correctAnswer: 0,
        timeLimit: 20
      },
      {
        question: 'Como a Bíblia descreve a Trindade Divina?',
        options: ['Um Deus que se manifesta de uma só forma', 'Três deuses independentes', 'Um só Deus em 3 pessoas coeternas: Pai, Filho e Espírito Santo', 'Apenas o Pai é Deus'],
        correctAnswer: 2,
        timeLimit: 20
      },
      {
        question: 'Qual dia da semana a Bíblia ensina como memorial da Criação e dia de descanso?',
        options: ['O Domingo (1º dia)', 'O Sábado (7º dia)', 'A Sexta-feira (6º dia)', 'Qualquer dia escolhido'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'O que a Bíblia ensina sobre o estado da pessoa após a morte?',
        options: ['Reencarna imediatamente', 'Vai direto ao Purgatório', 'Estado de inconsciência ("sono") aguardando a ressurreição', 'Torna-se um espírito vagante'],
        correctAnswer: 2,
        timeLimit: 20
      },
      {
        question: 'Como será a Segunda Vinda de Jesus à Terra?',
        options: ['Espiritual e invisível', 'Literal, pessoal, visível e audível a todos', 'Apenas para um grupo secreto', 'Através de uma nova revelação política'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Onde Jesus atua atualmente como nosso Sumo Sacerdote e Intercessor?',
        options: ['No Templo de Jerusalém', 'No Santuário Celestial', 'Em uma montanha sagrada', 'Na Terra de forma oculta'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Qual dom espiritual biblicamente profetizado é identificado na vida e ministério de Ellen G. White?',
        options: ['Dom de Línguas Estranhas', 'Dom de Profecia', 'Dom de Riqueza Material', 'Dom de Domínio Político'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Por que o corpo humano deve ser cuidado com temperança e saúde?',
        options: ['Para fins estéticos', 'Porque o corpo é o templo do Espírito Santo', 'Apenas por recomendação médica', 'Não há relação com a vida espiritual'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Qual é a mensagem de advertência final confiada à igreja remanescente em Apocalipse 14?',
        options: ['As Três Mensagens Angélicas', 'As Cartas dos Apóstolos', 'Os Salmos de Davi', 'As Parábolas do Evangelho'],
        correctAnswer: 0,
        timeLimit: 20
      },
      {
        question: 'O que acontecerá após o fim definitivo do pecado e o milênio?',
        options: ['O planeta continuará destruído', 'Deus criará Novos Céus e uma Nova Terra onde habita a justiça', 'O universo deixará de existir', 'Os salvos viverão sem corpo espiritual'],
        correctAnswer: 1,
        timeLimit: 20
      }
    ]
  },
  {
    id: 'quiz-conhecimentos-gerais',
    title: '🧠 Conhecimentos Gerais & Curiosidades',
    questions: [
      {
        question: 'Qual é a capital da França?',
        options: ['Londres', 'Paris', 'Madri', 'Berlim'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Qual o maior planeta do Sistema Solar?',
        options: ['Terra', 'Saturno', 'Júpiter', 'Netuno'],
        correctAnswer: 2,
        timeLimit: 20
      },
      {
        question: 'Qual é o elemento químico representado pelo símbolo "O"?',
        options: ['Ouro', 'Oxigênio', 'Ozônio', 'Osmo'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Quem pintou a famosa obra "Mona Lisa"?',
        options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'],
        correctAnswer: 2,
        timeLimit: 20
      }
    ]
  },
  {
    id: 'quiz-tecnologia-ia',
    title: '🚀 Tecnologia, Programação e IA',
    questions: [
      {
        question: 'O que significa a sigla HTML?',
        options: ['HyperText Markup Language', 'High Tech Machine Language', 'Hyperlink Text Mode Logic', 'Home Tool Media Line'],
        correctAnswer: 0,
        timeLimit: 20
      },
      {
        question: 'Qual linguagem de programação é nativa nos navegadores web?',
        options: ['Python', 'JavaScript', 'C++', 'Java'],
        correctAnswer: 1,
        timeLimit: 20
      },
      {
        question: 'Qual é a plataforma oficial de inteligência artificial criada pela Google?',
        options: ['Gemini', 'ChatGPT', 'Claude', 'Copilot'],
        correctAnswer: 0,
        timeLimit: 20
      }
    ]
  }
];

// --- NAVEGAÇÃO DE TELAS ---
function showScreen(screenId) {
  document.querySelectorAll('.screen-view').forEach(sc => sc.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

// --- DASHBOARD & QUIZZES SALVOS ---
function getSavedQuizzes() {
  const stored = localStorage.getItem('kahoot_custom_quizzes');
  if (stored) {
    try {
      const custom = JSON.parse(stored);
      return [...custom, ...defaultQuizzes];
    } catch (e) {
      console.error(e);
    }
  }
  return [...defaultQuizzes];
}

function renderQuizGrid() {
  const container = document.getElementById('quiz-grid-container');
  if (!container) return;

  const quizzes = getSavedQuizzes();
  container.innerHTML = quizzes.map((q, idx) => `
    <div class="quiz-card">
      <div>
        <div class="quiz-card-title">${escapeHtml(q.title)}</div>
        <div class="quiz-card-meta">
          <span>❓ ${q.questions.length} Perguntas</span>
          <span>⏱️ ${q.questions[0]?.timeLimit || 20}s / perg.</span>
        </div>
      </div>
      <div class="quiz-card-actions">
        <button class="btn btn-success" style="width: 100%;" onclick="hostLaunchQuiz(${idx})">
          <span>🎮</span> Iniciar Jogo
        </button>
      </div>
    </div>
  `).join('');
}

// --- MODAIS ---
function openAiModal() {
  document.getElementById('ai-modal').classList.add('active');
}

function closeAiModal() {
  document.getElementById('ai-modal').classList.remove('active');
}

function openSettingsModal() {
  const savedKey = localStorage.getItem('gemini_api_key') || '';
  document.getElementById('gemini-api-key-input').value = savedKey;
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('active');
}

function saveGeminiApiKey() {
  const key = document.getElementById('gemini-api-key-input').value.trim();
  localStorage.setItem('gemini_api_key', key);
  closeSettingsModal();
  alert(key ? 'Chave API do Gemini salva com sucesso!' : 'Modo assistente inteligente ativo.');
}

function openCreateModal() {
  document.getElementById('custom-questions-wrapper').innerHTML = '';
  addQuestionFieldToForm();
  addQuestionFieldToForm();
  document.getElementById('create-modal').classList.add('active');
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('active');
}

function addQuestionFieldToForm() {
  const wrapper = document.getElementById('custom-questions-wrapper');
  const index = wrapper.children.length + 1;
  const qDiv = document.createElement('div');
  qDiv.className = 'glass-card';
  qDiv.style.padding = '1rem';
  qDiv.style.marginBottom = '1rem';
  qDiv.style.background = 'rgba(0,0,0,0.2)';

  qDiv.innerHTML = `
    <h4 style="margin-bottom: 0.5rem; color: #00e5ff;">Pergunta ${index}</h4>
    <div class="form-group">
      <input type="text" class="form-input q-text" placeholder="Texto da Pergunta" required>
    </div>
    <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <input type="text" class="form-input q-opt0" placeholder="🔺 Opção 1 (Vermelho)" required>
      <input type="text" class="form-input q-opt1" placeholder="🔷 Opção 2 (Azul)" required>
      <input type="text" class="form-input q-opt2" placeholder="🟡 Opção 3 (Amarelo)" required>
      <input type="text" class="form-input q-opt3" placeholder="🟩 Opção 4 (Verde)" required>
    </div>
    <div class="form-group" style="display: flex; gap: 10px; align-items: center;">
      <label class="form-label" style="margin: 0;">Resposta Correta:</label>
      <select class="form-select q-correct" style="width: auto;">
        <option value="0">🔺 Opção 1</option>
        <option value="1">🔷 Opção 2</option>
        <option value="2">🟡 Opção 3</option>
        <option value="3">🟩 Opção 4</option>
      </select>
    </div>
  `;
  wrapper.appendChild(qDiv);
}

function handleSaveCustomQuiz(e) {
  e.preventDefault();
  const title = document.getElementById('custom-title-input').value.trim();
  const wrapper = document.getElementById('custom-questions-wrapper');
  const cards = wrapper.querySelectorAll('.glass-card');
  const questions = [];

  cards.forEach(c => {
    const qText = c.querySelector('.q-text').value.trim();
    const opt0 = c.querySelector('.q-opt0').value.trim();
    const opt1 = c.querySelector('.q-opt1').value.trim();
    const opt2 = c.querySelector('.q-opt2').value.trim();
    const opt3 = c.querySelector('.q-opt3').value.trim();
    const correct = parseInt(c.querySelector('.q-correct').value);

    questions.push({
      question: qText,
      options: [opt0, opt1, opt2, opt3],
      correctAnswer: correct,
      timeLimit: 20
    });
  });

  const newQuiz = {
    id: 'quiz-' + Date.now(),
    title,
    questions
  };

  const stored = localStorage.getItem('kahoot_custom_quizzes');
  const custom = stored ? JSON.parse(stored) : [];
  custom.unshift(newQuiz);
  localStorage.setItem('kahoot_custom_quizzes', JSON.stringify(custom));

  closeCreateModal();
  renderQuizGrid();
}

// --- GERADOR POR IA (GEMINI API) ---
async function handleAiGenerate(e) {
  e.preventDefault();
  const topic = document.getElementById('ai-topic-input').value.trim();
  const numQuestions = document.getElementById('ai-num-select').value;
  const difficulty = document.getElementById('ai-diff-select').value;
  const apiKey = localStorage.getItem('gemini_api_key') || '';

  const loading = document.getElementById('ai-loading-indicator');
  const btnSubmit = document.getElementById('btn-submit-ai');

  loading.style.display = 'block';
  btnSubmit.disabled = true;

  try {
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, numQuestions, difficulty, apiKey })
    });

    const data = await response.json();
    if (data.success && data.questions) {
      const newQuiz = {
        id: 'ai-quiz-' + Date.now(),
        title: data.title || `Quiz IA: ${topic}`,
        questions: data.questions
      };

      const stored = localStorage.getItem('kahoot_custom_quizzes');
      const custom = stored ? JSON.parse(stored) : [];
      custom.unshift(newQuiz);
      localStorage.setItem('kahoot_custom_quizzes', JSON.stringify(custom));

      closeAiModal();
      renderQuizGrid();

      // Já inicia o jogo criado pela IA imediatamente!
      const allQuizzes = getSavedQuizzes();
      hostLaunchQuiz(0);
    } else {
      alert('Falha ao gerar o quiz por IA: ' + (data.error || 'Tente novamente.'));
    }
  } catch (err) {
    console.error(err);
    alert('Erro de conexão com o servidor de IA.');
  } finally {
    loading.style.display = 'none';
    btnSubmit.disabled = false;
  }
}

// --- FLUXO DO JOGO HOST ---
function hostLaunchQuiz(quizIndex) {
  const quizzes = getSavedQuizzes();
  currentQuiz = quizzes[quizIndex];
  if (!currentQuiz) return;

  socket.emit('create-room', { quiz: currentQuiz });
}

socket.on('room-created', ({ pin, joinUrl, qrCodeDataUrl }) => {
  currentPin = pin;
  document.getElementById('lobby-pin-code').innerText = pin;
  document.getElementById('lobby-qr-code').src = qrCodeDataUrl;
  document.getElementById('lobby-join-url').innerText = joinUrl;
  document.getElementById('lobby-players-list').innerHTML = '';
  document.getElementById('lobby-player-count').innerText = '0';

  showScreen('lobby-screen');
});

socket.on('player-joined', ({ playerCount, players }) => {
  document.getElementById('lobby-player-count').innerText = playerCount;
  currentTotalPlayers = playerCount;

  const list = document.getElementById('lobby-players-list');
  list.innerHTML = players.map(p => `
    <div class="player-tag">
      <span>${escapeHtml(p.avatar)}</span>
      <span>${escapeHtml(p.nickname)}</span>
    </div>
  `).join('');

  window.kahootAudio.playJoinSound();
});

socket.on('player-left', ({ playerCount, players }) => {
  document.getElementById('lobby-player-count').innerText = playerCount;
  currentTotalPlayers = playerCount;
  const list = document.getElementById('lobby-players-list');
  list.innerHTML = players.map(p => `
    <div class="player-tag">
      <span>${escapeHtml(p.avatar)}</span>
      <span>${escapeHtml(p.nickname)}</span>
    </div>
  `).join('');
});

function hostStartGame() {
  if (currentTotalPlayers === 0) {
    if (!confirm('Nenhum jogador entrou no lobby ainda. Deseja iniciar mesmo assim?')) return;
  }
  socket.emit('start-game', { pin: currentPin });
}

// INÍCIO DA PERGUNTA NO HOST
socket.on('question-start-host', ({ questionIndex, totalQuestions, question, options, timeLimit, totalPlayers }) => {
  currentQuestionIndex = questionIndex;
  currentAnswersReceived = 0;
  currentTotalPlayers = totalPlayers;

  document.getElementById('question-progress-tag').innerText = `Pergunta ${questionIndex + 1} de ${totalQuestions}`;
  document.getElementById('answers-counter').innerText = `0 / ${totalPlayers}`;
  document.getElementById('host-question-text').innerText = question;

  options.forEach((optText, i) => {
    document.getElementById(`opt-text-${i}`).innerText = optText;
  });

  showScreen('host-question-screen');

  // Iniciar Cronômetro
  let timeLeft = timeLimit;
  const timerDisplay = document.getElementById('host-timer-display');
  timerDisplay.innerText = timeLeft;
  timerDisplay.classList.remove('warning');

  if (hostTimerInterval) clearInterval(hostTimerInterval);

  hostTimerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.innerText = timeLeft;

    if (timeLeft <= 5 && timeLeft > 0) {
      timerDisplay.classList.add('warning');
      window.kahootAudio.playWarningTickSound();
    } else if (timeLeft > 0) {
      window.kahootAudio.playTickSound();
    }

    if (timeLeft <= 0) {
      clearInterval(hostTimerInterval);
      hostShowReveal();
    }
  }, 1000);
});

socket.on('answer-count-update', ({ answersReceived, totalPlayers }) => {
  currentAnswersReceived = answersReceived;
  currentTotalPlayers = totalPlayers;
  document.getElementById('answers-counter').innerText = `${answersReceived} / ${totalPlayers}`;

  window.kahootAudio.playTickSound();
});

function hostShowReveal() {
  if (hostTimerInterval) clearInterval(hostTimerInterval);
  socket.emit('show-reveal', { pin: currentPin });
}

// REVELAÇÃO DAS RESPOSTAS
socket.on('question-reveal-host', ({ questionText, options, correctAnswer, correctAnswerText, correctAnswerShape, optionCounts, totalPlayers }) => {
  showScreen('host-reveal-screen');
  window.kahootAudio.playCorrectSound();

  // Preencher textos explicativos
  if (questionText) {
    document.getElementById('host-reveal-question-title').innerText = questionText;
  }

  const correctBannerText = document.getElementById('host-correct-answer-text');
  if (correctBannerText) {
    correctBannerText.innerText = `${correctAnswerShape || ''} ${correctAnswerText || options[correctAnswer] || ''}`;
  }

  const maxCount = Math.max(...optionCounts, 1);

  optionCounts.forEach((count, idx) => {
    const bar = document.getElementById(`bar-fill-${idx}`);
    if (bar) {
      const percentage = Math.round((count / maxCount) * 100);
      bar.style.height = `${Math.max(percentage, 12)}%`;
      bar.innerText = count;
    }

    const card = document.getElementById(`reveal-opt-card-${idx}`);
    const textSpan = document.getElementById(`reveal-opt-text-${idx}`);
    if (textSpan && options && options[idx]) {
      textSpan.innerText = options[idx];
    }

    if (card) {
      if (idx === correctAnswer) {
        card.classList.add('is-correct-card');
        card.classList.remove('is-incorrect-card');
      } else {
        card.classList.add('is-incorrect-card');
        card.classList.remove('is-correct-card');
      }
    }
  });
});

function hostShowLeaderboard() {
  socket.emit('show-leaderboard', { pin: currentPin });
}

socket.on('leaderboard-update', ({ leaderboard }) => {
  showScreen('host-leaderboard-screen');

  const container = document.getElementById('leaderboard-items-container');
  container.innerHTML = leaderboard.slice(0, 5).map((player, index) => `
    <div class="leaderboard-item">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.4rem;">${index + 1}.</span>
        <span>${escapeHtml(player.avatar)}</span>
        <span>${escapeHtml(player.nickname)}</span>
        ${player.streak >= 2 ? `<span style="font-size: 0.9rem; background: #ff4081; padding: 2px 8px; border-radius: 12px; color: white;">🔥 ${player.streak}x</span>` : ''}
      </div>
      <div style="color: #ffea00;">${player.score} pts</div>
    </div>
  `).join('');

  const btnNext = document.getElementById('btn-next-step');
  if (currentQuestionIndex + 1 >= currentQuiz.questions.length) {
    btnNext.innerHTML = '<span>🏆</span> Ver Pódio Final';
  } else {
    btnNext.innerHTML = '<span>▶️</span> Próxima Pergunta';
  }
});

function hostNextQuestion() {
  socket.emit('next-question', { pin: currentPin });
}

// PÓDIO FINAL
socket.on('game-over-host', ({ podium }) => {
  showScreen('host-podium-screen');
  window.kahootAudio.playVictorySound();

  // Efeito Confetti!
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  }

  // Preencher Pódio
  const p1 = podium[0] || { nickname: '-', avatar: '👑', score: 0 };
  const p2 = podium[1] || { nickname: '-', avatar: '🥈', score: 0 };
  const p3 = podium[2] || { nickname: '-', avatar: '🥉', score: 0 };

  document.getElementById('podium-avatar-1').innerText = p1.avatar;
  document.getElementById('podium-name-1').innerText = p1.nickname;
  document.getElementById('podium-score-1').innerText = `${p1.score} pts`;

  document.getElementById('podium-avatar-2').innerText = p2.avatar;
  document.getElementById('podium-name-2').innerText = p2.nickname;
  document.getElementById('podium-score-2').innerText = `${p2.score} pts`;

  document.getElementById('podium-avatar-3').innerText = p3.avatar;
  document.getElementById('podium-name-3').innerText = p3.nickname;
  document.getElementById('podium-score-3').innerText = `${p3.score} pts`;
});

// Helper de escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

// Inicializar na carga da página
document.addEventListener('DOMContentLoaded', () => {
  renderQuizGrid();
});
