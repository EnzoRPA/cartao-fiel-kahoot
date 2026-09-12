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
let serverQuizzes = [];

async function getSavedQuizzes() {
  try {
    const res = await fetch('/api/quizzes');
    serverQuizzes = await res.json();
  } catch (e) {
    console.error('Erro ao carregar quizzes do servidor:', e);
    serverQuizzes = [];
  }
  return [...serverQuizzes, ...defaultQuizzes];
}

async function renderQuizGrid() {
  const container = document.getElementById('quiz-grid-container');
  if (!container) return;

  const quizzes = await getSavedQuizzes();
  container.innerHTML = quizzes.map((q, idx) => {
    const isDefault = defaultQuizzes.some(dq => dq.id === q.id);
    return `
      <div class="quiz-card">
        <div>
          <div class="quiz-card-title">${escapeHtml(q.title)}</div>
          <div class="quiz-card-meta">
            <span>❓ ${q.questions.length} Perguntas</span>
            <span>⏱️ ${q.questions[0]?.timeLimit || 20}s / perg.</span>
            ${isDefault ? '<span style="color: #00e5ff;">📌 Padrão</span>' : '<span style="color: #a78bfa;">💾 Salvo</span>'}
          </div>
        </div>
        <div class="quiz-card-actions">
          <button class="btn btn-success" style="width: 100%;" onclick="hostLaunchQuiz(${idx})">
            <span>🎮</span> Iniciar Jogo
          </button>
          ${!isDefault ? `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-secondary" style="flex: 1;" onclick="editQuiz('${q.id}')">
                <span>✏️</span> Editar
              </button>
              <button class="btn btn-danger" style="flex: 1;" onclick="deleteQuiz('${q.id}')">
                <span>🗑️</span> Excluir
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function editQuiz(quizId) {
  const quiz = serverQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  document.getElementById('custom-title-input').value = quiz.title;
  const wrapper = document.getElementById('custom-questions-wrapper');
  wrapper.innerHTML = '';

  quiz.questions.forEach(q => {
    addQuestionFieldToForm();
    const lastCard = wrapper.lastElementChild;
    lastCard.querySelector('.q-text').value = q.question;
    lastCard.querySelector('.q-opt0').value = q.options[0] || '';
    lastCard.querySelector('.q-opt1').value = q.options[1] || '';
    lastCard.querySelector('.q-opt2').value = q.options[2] || '';
    lastCard.querySelector('.q-opt3').value = q.options[3] || '';
    lastCard.querySelector('.q-correct').value = q.correctAnswer;
  });

  document.getElementById('create-modal').classList.add('active');
  window._editingQuizId = quizId;
}

async function deleteQuiz(quizId) {
  if (!confirm('Tem certeza que deseja excluir este quiz?')) return;

  try {
    await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
    renderQuizGrid();
  } catch (e) {
    console.error('Erro ao excluir quiz:', e);
    alert('Erro ao excluir quiz.');
  }
}

// --- MODAIS ---
function openAiModal() {
  document.getElementById('ai-modal').classList.add('active');
  switchAiTab('ai');
}

function closeAiModal() {
  document.getElementById('ai-modal').classList.remove('active');
}

// --- ABAS DO MODAL IA ---
function switchAiTab(tab) {
  document.getElementById('ai-tab-ai').style.display = tab === 'ai' ? 'block' : 'none';
  document.getElementById('ai-tab-paste').style.display = tab === 'paste' ? 'block' : 'none';
  
  const btnAi = document.getElementById('tab-btn-ai');
  const btnPaste = document.getElementById('tab-btn-paste');
  
  if (tab === 'ai') {
    btnAi.style.background = 'rgba(0, 229, 255, 0.2)';
    btnAi.style.borderColor = '#00e5ff';
    btnAi.style.color = '#00e5ff';
    btnPaste.style.background = 'rgba(255,255,255,0.12)';
    btnPaste.style.borderColor = 'var(--glass-border)';
    btnPaste.style.color = 'white';
  } else {
    btnPaste.style.background = 'rgba(0, 229, 255, 0.2)';
    btnPaste.style.borderColor = '#00e5ff';
    btnPaste.style.color = '#00e5ff';
    btnAi.style.background = 'rgba(255,255,255,0.12)';
    btnAi.style.borderColor = 'var(--glass-border)';
    btnAi.style.color = 'white';
  }
}

// --- COLAR PERGUNTAS DO CHATGPT ---
async function handlePasteQuiz(e) {
  e.preventDefault();
  const title = document.getElementById('paste-quiz-title').value.trim();
  const rawText = document.getElementById('paste-quiz-json').value.trim();
  const errorDiv = document.getElementById('paste-error-msg');
  
  errorDiv.style.display = 'none';
  
  let questions;
  try {
    // Tentar JSON primeiro
    let parsed = null;
    try {
      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parsed = null;
    }
    
    if (parsed) {
      // Formato JSON
      if (parsed.questions && Array.isArray(parsed.questions)) {
        parsed = parsed.questions;
      }
      if (!Array.isArray(parsed)) {
        throw new Error('O JSON deve ser um array de perguntas.');
      }
      questions = parsed.map((q, i) => {
        if (!q.question) throw new Error(`Pergunta ${i + 1}: campo "question" obrigatório.`);
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Pergunta ${i + 1}: "options" deve ter pelo menos 2 itens.`);
        }
        // Completar até 4 opções se necessário
        const opts = [...q.options];
        while (opts.length < 4) opts.push('');

        // --- Resolver correctAnswer ---
        // Aceita: número (0,1,2,3), string numérica ("0","1"), ou TEXTO da opção ("Sábado")
        let ca = -1;
        const raw = q.correctAnswer;

        if (typeof raw === 'number') {
          // Número direto: 0, 1, 2, 3
          ca = raw;
        } else if (typeof raw === 'string') {
          // Tentar como número primeiro ("0", "1", "2", "3")
          const asNum = parseInt(raw);
          if (!isNaN(asNum) && asNum >= 0 && asNum < q.options.length) {
            ca = asNum;
          } else {
            // Buscar o texto exato dentro de options (case-insensitive, ignorando acentos)
            const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const target = normalize(raw);
            ca = q.options.findIndex(opt => normalize(opt) === target);

            // Se não achou exato, busca parcial (a opção que CONTÉM o texto ou vice-versa)
            if (ca === -1) {
              ca = q.options.findIndex(opt => {
                const n = normalize(opt);
                return n.includes(target) || target.includes(n);
              });
            }
          }
        }

        if (ca < 0 || ca >= q.options.length) {
          throw new Error(`Pergunta ${i + 1}: não foi possível encontrar a resposta correta "${raw}" nas opções fornecidas.`);
        }

        return {
          question: q.question,
          options: opts.slice(0, 4),
          correctAnswer: ca,
          timeLimit: parseInt(q.timeLimit) || 25
        };
      });

    } else {
      // Formato texto simples
      questions = parseTextFormat(rawText);
      if (questions.length === 0) {
        throw new Error('Não foi possível identificar perguntas no texto.\n\nFormatos aceitos:\n• 1. Pergunta?\nA) Opção\n✅ Resposta: A\n\n• JSON: [{question, options[4], correctAnswer, timeLimit}]');
      }
    }

    // Validação final: verificar se alguma questão tem opções vazias
    const invalid = questions.findIndex(q => q.options.some(o => !o || !o.trim()));
    if (invalid >= 0) {
      throw new Error(`Pergunta ${invalid + 1} tem alternativas em branco. Verifique o formato colado.`);
    }

  } catch (err) {
    errorDiv.style.whiteSpace = 'pre-line';
    errorDiv.innerText = '❌ ' + err.message;
    errorDiv.style.display = 'block';
    return;
  }
  
  // Mostrar preview antes de salvar
  const previewHtml = questions.map((q, i) => `
    <div style="background:rgba(0,0,0,0.3);padding:0.8rem;border-radius:8px;margin-bottom:0.5rem;border-left:3px solid #00e5ff;">
      <div style="font-weight:600;margin-bottom:0.4rem;font-size:0.9rem;">${i+1}. ${escapeHtml(q.question)}</div>
      ${q.options.map((opt, oi) => `
        <div style="font-size:0.82rem;padding:2px 0;color:${oi === q.correctAnswer ? '#4ade80' : 'rgba(255,255,255,0.6)'};">
          ${oi === q.correctAnswer ? '✅' : '◻'} ${['A','B','C','D'][oi]}) ${escapeHtml(opt)}
        </div>
      `).join('')}
    </div>
  `).join('');

  const confirmMsg = `${questions.length} pergunta(s) detectada(s). Verifique as respostas corretas (em verde) e confirme.`;
  
  // Criar modal de preview inline no errorDiv como aviso positivo
  errorDiv.style.whiteSpace = 'normal';
  errorDiv.style.background = 'rgba(0,100,0,0.3)';
  errorDiv.style.borderColor = '#4ade80';
  errorDiv.style.color = '#bbf7d0';
  errorDiv.innerHTML = `
    <div style="font-weight:700;margin-bottom:0.8rem;">✅ ${confirmMsg}</div>
    <div style="max-height:200px;overflow-y:auto;margin-bottom:0.8rem;">${previewHtml}</div>
    <div style="display:flex;gap:0.5rem;">
      <button onclick="confirmSaveQuiz(${JSON.stringify(title).replace(/"/g,'&quot;')}, window._pendingQuestions)" 
        style="flex:1;padding:0.5rem;background:#4ade80;color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
        💾 Confirmar e Salvar
      </button>
      <button onclick="document.getElementById('paste-error-msg').style.display='none'" 
        style="padding:0.5rem 1rem;background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);border-radius:8px;cursor:pointer;">
        ✏️ Corrigir
      </button>
    </div>
  `;
  errorDiv.style.display = 'block';
  window._pendingQuestions = questions;
}

async function confirmSaveQuiz(title, questions) {
  if (!title || !questions || !questions.length) return;
  window._pendingQuestions = null;
  
  try {
    await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, questions })
    });
  } catch (e) {
    console.error('Erro ao salvar quiz:', e);
  }
  
  closeAiModal();
  renderQuizGrid();
  document.getElementById('paste-quiz-title').value = '';
  document.getElementById('paste-quiz-json').value = '';
  document.getElementById('paste-error-msg').style.display = 'none';
}

// Parser ROBUSTO para formato texto simples — suporta dezenas de variações
function parseTextFormat(text) {
  const questions = [];

  // Normalizar: remover \r, trimmar linhas
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Dividir em blocos por linha vazia OU por nova pergunta numerada
  // Suporta blocos separados por linha em branco
  const rawBlocks = normalized.split(/\n\s*\n/).filter(b => b.trim());

  // Se só tem 1 bloco mas tem múltiplas perguntas numeradas, dividir por número
  let blocks = rawBlocks;
  if (rawBlocks.length === 1) {
    const multiQ = rawBlocks[0].split(/(?=^\d+[\.\)]\s)/m).filter(b => b.trim());
    if (multiQ.length > 1) blocks = multiQ;
  }

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) continue;

    // ── 1. Extrair texto da pergunta ──
    let questionText = '';
    let startLine = 0;

    // Tenta: "1. Pergunta?" ou "1) Pergunta?" ou "Q1: Pergunta?"
    const qMatch = lines[0].match(/^(?:\d+[\.\)]\s*|Q\d+[\.:]\s*|Pergunta\s*\d+[\.:]\s*)(.+)/i);
    if (qMatch) {
      questionText = qMatch[1].trim();
      startLine = 1;
    } else if (lines[0].match(/^\d+$/)) {
      // Linha só com número, pergunta na próxima
      questionText = lines[1] || '';
      startLine = 2;
    } else {
      questionText = lines[0];
      startLine = 1;
    }

    if (!questionText) continue;

    // ── 2. Extrair opções e resposta correta ──
    const options = [];
    let correctIndex = -1; // -1 = não encontrado ainda
    let correctLetter = ''; // letra identificada (A/B/C/D)

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      // ── Detectar linha de resposta correta (vários formatos) ──

      // "✅ Resposta: B" / "Resposta: B" / "Resposta correta: B"
      const ansLineMatch = line.match(/(?:✅\s*)?(?:resposta\s*(?:correta)?|gabarito|answer|correct)[\s:]*([A-Da-d\d])/i);
      if (ansLineMatch) {
        const val = ansLineMatch[1].toUpperCase();
        if ('ABCD'.includes(val)) {
          correctLetter = val;
        } else {
          const num = parseInt(val);
          if (!isNaN(num) && num >= 1 && num <= 4) correctLetter = 'ABCD'[num - 1];
        }
        continue;
      }

      // "✅ B" ou "☑ B" (apenas emoji/marcador + letra)
      const emojiAnsMatch = line.match(/^(?:✅|☑|✓|✔|→|>)\s*([A-Da-d])[\.\)]?\s*(.*)$/);
      if (emojiAnsMatch && !emojiAnsMatch[2].trim()) {
        correctLetter = emojiAnsMatch[1].toUpperCase();
        continue;
      }

      // ── Detectar opção de resposta ──

      // Formato: "A) Texto" / "A. Texto" / "a) Texto" / "(A) Texto"
      const optMatch = line.match(/^(?:\(([A-Da-d])\)|([A-Da-d])[\.\)])\s*(.+)/);
      if (optMatch) {
        const letter = (optMatch[1] || optMatch[2]).toUpperCase();
        let optText = optMatch[3].trim();

        // Verificar se a opção tem marcação inline de correta
        const inlineCorrect = optText.match(/^(.+?)\s*(?:✅|☑|✓|✔|\*\*correct\*\*|\(correta?\)|\(correct\))$/i);
        if (inlineCorrect) {
          optText = inlineCorrect[1].trim();
          correctLetter = letter;
        }

        // Verificar se a linha começa com ✅ antes da letra: "✅ A) Texto"
        if (line.match(/^✅\s+[A-Da-d][\.\)]/)) {
          correctLetter = letter;
        }

        if (options.length < 4) {
          options.push(optText);
        }
        continue;
      }

      // Formato numérico: "1. Texto" / "1) Texto" como opções
      if (options.length < 4) {
        const numOptMatch = line.match(/^([1-4])[\.\)]\s*(.+)/);
        if (numOptMatch && lines.some(l => l.match(/^[2-4][\.\)]/))) {
          options.push(numOptMatch[2].trim());
          continue;
        }
      }
    }

    // Resolver correctLetter → correctIndex
    if (correctLetter) {
      correctIndex = 'ABCD'.indexOf(correctLetter);
    }

    // Fallback: se não achou resposta, assume 0 mas marca como suspeito
    if (correctIndex === -1) correctIndex = 0;

    // Precisa ter pelo menos 2 opções
    if (options.length >= 2) {
      // Completar até 4 opções se necessário (não deve, mas por segurança)
      while (options.length < 4) options.push(`Opção ${options.length + 1}`);

      // Garantir que correctIndex não está fora do range
      if (correctIndex >= options.length) correctIndex = 0;

      questions.push({
        question: questionText,
        options: options.slice(0, 4),
        correctAnswer: correctIndex,
        timeLimit: 25
      });
    }
  }
  
  return questions;
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
  window._editingQuizId = null;
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

  const editingId = window._editingQuizId;
  window._editingQuizId = null;

  fetch(editingId ? `/api/quizzes/${editingId}` : '/api/quizzes', {
    method: editingId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, questions })
  })
    .then(() => {
      closeCreateModal();
      renderQuizGrid();
    })
    .catch(e => {
      console.error('Erro ao salvar quiz:', e);
    });
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
      // Salvar via API
      try {
        await fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title || `Quiz IA: ${topic}`,
            questions: data.questions
          })
        });
      } catch (e) {
        console.error('Erro ao salvar quiz gerado:', e);
      }

      closeAiModal();
      renderQuizGrid();

      // Já inicia o jogo criado pela IA imediatamente!
      const allQuizzes = await getSavedQuizzes();
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
async function hostLaunchQuiz(quizIndex) {
  const quizzes = await getSavedQuizzes();
  currentQuiz = quizzes[quizIndex];
  if (!currentQuiz) return;

  socket.emit('create-room', { quiz: currentQuiz, baseUrl: window.location.origin });
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

// Helper para renderizar avatar (SVG ou emoji)
function renderAvatarHtml(avatar, size = 28) {
  if (!avatar) return '❓';
  if (avatar.startsWith('<svg') || avatar.includes('<svg')) {
    return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">${avatar}</div>`;
  }
  return `<span style="font-size: ${size * 0.7}px;">${avatar}</span>`;
}

socket.on('player-joined', ({ playerCount, players }) => {
  document.getElementById('lobby-player-count').innerText = playerCount;
  currentTotalPlayers = playerCount;

  const list = document.getElementById('lobby-players-list');
  list.innerHTML = players.map(p => `
    <div class="player-tag">
      ${renderAvatarHtml(p.avatar)}
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
      ${renderAvatarHtml(p.avatar)}
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
        ${renderAvatarHtml(player.avatar, 36)}
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

function hostCancelGame() {
  if (!currentPin) return;
  if (!confirm('Tem certeza que deseja cancelar o jogo? Todos os jogadores serão desconectados.')) return;
  
  socket.emit('cancel-game', { pin: currentPin });
  currentPin = null;
  currentQuiz = null;
  if (hostTimerInterval) clearInterval(hostTimerInterval);
  showScreen('dashboard-screen');
}

socket.on('game-cancelled', ({ message }) => {
  currentPin = null;
  currentQuiz = null;
  if (hostTimerInterval) clearInterval(hostTimerInterval);
  showScreen('dashboard-screen');
  alert(message || 'O jogo foi cancelado.');
});

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

  // Renderizar avatares no pódio (SVG ou emoji)
  const avatar1El = document.getElementById('podium-avatar-1');
  const avatar2El = document.getElementById('podium-avatar-2');
  const avatar3El = document.getElementById('podium-avatar-3');

  function setPodiumAvatar(el, avatar) {
    if (avatar && (avatar.startsWith('<svg') || avatar.includes('<svg'))) {
      el.innerHTML = avatar;
      el.style.fontSize = '0';
    } else {
      el.innerText = avatar;
    }
  }

  setPodiumAvatar(avatar1El, p1.avatar);
  document.getElementById('podium-name-1').innerText = p1.nickname;
  document.getElementById('podium-score-1').innerText = `${p1.score} pts`;

  setPodiumAvatar(avatar2El, p2.avatar);
  document.getElementById('podium-name-2').innerText = p2.nickname;
  document.getElementById('podium-score-2').innerText = `${p2.score} pts`;

  setPodiumAvatar(avatar3El, p3.avatar);
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
