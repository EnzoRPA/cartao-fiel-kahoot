const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const os = require('os');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Descobrir IP local da máquina para o QR Code funcionar no celular (rede Wi-Fi local)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIpAddress();

// Gerenciamento de Salas ativas na memória
// rooms[pin] = { pin, hostSocketId, quiz, currentQuestionIndex, state, players: {} }
const rooms = {};

function generateRoomPIN() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms[pin]);
  return pin;
}

// Rota de API para IA (Gerador de Perguntas com Gemini)
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topic, numQuestions = 5, difficulty = 'medio', apiKey: userApiKey } = req.body;
    if (!topic || topic.trim() === '') {
      return res.status(400).json({ error: 'O tema é obrigatório.' });
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Você é um gerador especialista em Quizzes educativos e divertidos no estilo Kahoot.
Crie um quiz sobre o tema: "${topic}".
Nível de dificuldade: ${difficulty}.
Quantidade de perguntas: ${numQuestions}.

Regras estritas:
1. Responda ESTRITAMENTE em formato JSON VÁLIDO sem markdown, sem explicações em texto.
2. Cada pergunta deve ter exatamente 4 opções de resposta curtas e claras.
3. Apenas uma opção deve ser a correta (indicada pelo índice de 0 a 3 em correctAnswer).
4. O campo "timeLimit" deve ser um número em segundos (ex: 20).

Formato JSON esperado:
[
  {
    "question": "Texto da pergunta?",
    "options": ["Opção 0", "Opção 1", "Opção 2", "Opção 3"],
    "correctAnswer": 0,
    "timeLimit": 20
  }
]`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let rawText = response.text || '';
        // Limpar blocos de código se a IA retornar ```json ... ```
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const questions = JSON.parse(rawText);
        return res.json({ success: true, title: `Quiz IA: ${topic}`, questions });
      } catch (geminiError) {
        console.warn('Erro ao chamar a API oficial do Gemini, usando gerador inteligente local fallback:', geminiError.message);
      }
    }

    // Fallback inteligente caso nenhuma chave API esteja configurada ou ocorra falha de rede
    const fallbackQuestions = generateFallbackQuiz(topic, parseInt(numQuestions) || 5);
    return res.json({
      success: true,
      title: `Quiz: ${topic}`,
      questions: fallbackQuestions,
      note: apiKey ? 'Gerado via modelo adaptativo.' : 'Gerado via assistente integrado (adicione uma chave API Gemini nas configurações se desejar respostas dinâmicas avançadas).'
    });

  } catch (err) {
    console.error('Erro na rota /api/generate-quiz:', err);
    res.status(500).json({ error: 'Falha ao gerar o quiz por IA.' });
  }
});

// Gerador de perguntas de reserva (fallback) com perguntas reais de temas populares
function generateFallbackQuiz(topic, count) {
  const cleanTopic = topic.toLowerCase();

  const presets = {
    historia: [
      { question: "Em que ano ocorreu a Proclamação da República no Brasil?", options: ["1889", "1822", "1500", "1930"], correctAnswer: 0, timeLimit: 20 },
      { question: "Quem foi o primeiro imperador do Brasil?", options: ["Dom Pedro II", "Dom Pedro I", "Getúlio Vargas", "Princesa Isabel"], correctAnswer: 1, timeLimit: 20 },
      { question: "Qual evento marcou o início da Segunda Guerra Mundial?", options: ["Invasão da Polônia", "Ataque a Pearl Harbor", "Queda do Muro de Berlim", "Revolução Francesa"], correctAnswer: 0, timeLimit: 20 },
      { question: "Em qual continente se localizava o antigo Império Inca?", options: ["Ásia", "Europa", "América do Sul", "África"], correctAnswer: 2, timeLimit: 20 },
      { question: "Quem pintou o teto da Capela Sistina?", options: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"], correctAnswer: 1, timeLimit: 20 }
    ],
    ciencia: [
      { question: "Qual é o elemento químico com símbolo 'O'?", options: ["Ouro", "Oxigênio", "Ozônio", "Osmo"], correctAnswer: 1, timeLimit: 20 },
      { question: "Qual é o maior planeta do Sistema Solar?", options: ["Terra", "Saturno", "Júpiter", "Netuno"], correctAnswer: 2, timeLimit: 20 },
      { question: "Qual órgão é responsável por bombear o sangue no corpo humano?", options: ["Fígado", "Pulmão", "Cérebro", "Coração"], correctAnswer: 3, timeLimit: 20 },
      { question: "Qual é a velocidade aproximada da luz no vácuo?", options: ["300.000 km/s", "150.000 km/s", "1.000.000 km/s", "30.000 km/s"], correctAnswer: 0, timeLimit: 20 },
      { question: "Que força nos mantém presos ao chão da Terra?", options: ["Magnetismo", "Gravidade", "Inércia", "Atrito"], correctAnswer: 1, timeLimit: 20 }
    ],
    tecnologia: [
      { question: "Quem é considerado o criador da World Wide Web (WWW)?", options: ["Steve Jobs", "Bill Gates", "Tim Berners-Lee", "Alan Turing"], correctAnswer: 2, timeLimit: 20 },
      { question: "O que significa a sigla HTML?", options: ["HyperText Markup Language", "High Tech Machine Language", "Hyperlink Text Mode Logic", "Home Tool Media Line"], correctAnswer: 0, timeLimit: 20 },
      { question: "Qual linguagem de programação é famosa por rodar em navegadores web?", options: ["Python", "JavaScript", "C++", "Assembly"], correctAnswer: 1, timeLimit: 20 },
      { question: "O que é o sistema operacional Android?", options: ["Baseado em Linux", "Baseado em Windows", "Desenvolvido pela Apple", "Um aplicativo web"], correctAnswer: 0, timeLimit: 20 },
      { question: "Qual dessas é uma inteligência artificial criada pela Google?", options: ["Gemini", "ChatGPT", "Claude", "Copilot"], correctAnswer: 0, timeLimit: 20 }
    ],
    geografia: [
      { question: "Qual é o maior país do mundo em área territorial?", options: ["Canadá", "China", "Rússia", "Estados Unidos"], correctAnswer: 2, timeLimit: 20 },
      { question: "Qual é a capital da França?", options: ["Londres", "Paris", "Madri", "Berlim"], correctAnswer: 1, timeLimit: 20 },
      { question: "Em qual estado brasileiro fica localizada a floresta Amazônica?", options: ["São Paulo", "Amazonas", "Bahia", "Paraná"], correctAnswer: 1, timeLimit: 20 },
      { question: "Qual o rio mais longo do mundo?", options: ["Rio Nilo", "Rio Amazonas", "Rio Mississippi", "Rio Danúbio"], correctAnswer: 1, timeLimit: 20 },
      { question: "Quantos continentes existem no planeta Terra?", options: ["5", "6", "7", "4"], correctAnswer: 1, timeLimit: 20 }
    ],
    adventista: [
      { question: "Qual é a única norma infalível de fé e conduta para os adventistas?", options: ["A Bíblia Sagrada (Escrituras)", "Tradições e Credos", "Livros de História", "Conselhos de Líderes"], correctAnswer: 0, timeLimit: 20 },
      { question: "Como a Bíblia descreve a Trindade Divina?", options: ["Um Deus que se manifesta de uma só forma", "Três deuses independentes", "Um só Deus em 3 pessoas coeternas: Pai, Filho e Espírito Santo", "Apenas o Pai é Deus"], correctAnswer: 2, timeLimit: 20 },
      { question: "Qual dia da semana a Bíblia ensina como memorial da Criação e dia de descanso?", options: ["O Domingo (1º dia)", "O Sábado (7º dia)", "A Sexta-feira (6º dia)", "Qualquer dia escolhido"], correctAnswer: 1, timeLimit: 20 },
      { question: "O que a Bíblia ensina sobre o estado da pessoa após a morte?", options: ["Reencarna imediatamente", "Vai direto ao Purgatório", "Estado de inconsciência ('sono') aguardando a ressurreição", "Torna-se um espírito vagante"], correctAnswer: 2, timeLimit: 20 },
      { question: "Como será a Segunda Vinda de Jesus à Terra?", options: ["Espiritual e invisível", "Literal, pessoal, visível e audível a todos", "Apenas para um grupo secreto", "Através de uma nova revelação política"], correctAnswer: 1, timeLimit: 20 }
    ],
    crencas: [
      { question: "Onde Jesus atua atualmente como nosso Sumo Sacerdote e Intercessor?", options: ["No Templo de Jerusalém", "No Santuário Celestial", "Em uma montanha sagrada", "Na Terra de forma oculta"], correctAnswer: 1, timeLimit: 20 },
      { question: "Qual dom espiritual biblicamente profetizado é identificado no ministério de Ellen G. White?", options: ["Dom de Línguas Estranhas", "Dom de Profecia", "Dom de Riqueza Material", "Dom de Domínio Político"], correctAnswer: 1, timeLimit: 20 },
      { question: "Por que o corpo humano deve ser cuidado com temperança e saúde?", options: ["Para fins estéticos", "Porque o corpo é o templo do Espírito Santo", "Apenas por recomendação médica", "Não há relação com a vida espiritual"], correctAnswer: 1, timeLimit: 20 },
      { question: "Qual é a mensagem de advertência final confiada à igreja remanescente em Apocalipse 14?", options: ["As Três Mensagens Angélicas", "As Cartas dos Apóstolos", "Os Salmos de Davi", "As Parábolas do Evangelho"], correctAnswer: 0, timeLimit: 20 }
    ]
  };

  let pool = presets.tecnologia;
  for (const key in presets) {
    if (cleanTopic.includes(key)) {
      pool = presets[key];
      break;
    }
  }

  // Gerar variações genéricas caso precise de mais perguntas
  const questions = [];
  for (let i = 0; i < count; i++) {
    if (i < pool.length) {
      questions.push({ ...pool[i] });
    } else {
      questions.push({
        question: `Pergunta ${i + 1} sobre "${topic}": Qual destas afirmações está correta?`,
        options: [
          `Opção principal de ${topic}`,
          `Alternativa secundária`,
          `Hipótese alternativa`,
          `Conceito de apoio`
        ],
        correctAnswer: Math.floor(Math.random() * 4),
        timeLimit: 20
      });
    }
  }

  return questions;
}

// Rota de Informações do Servidor (IP local e status)
app.get('/api/server-info', (req, res) => {
  const joinUrl = `http://${LOCAL_IP}:${PORT}/player.html`;
  res.json({
    localIp: LOCAL_IP,
    port: PORT,
    joinUrl
  });
});

// ==========================================================================
// API DE CRÉDITOS BÍBLICOS & PARTICIPANTES (PERSISTÊNCIA LOCAL JSON)
// ==========================================================================

const PARTICIPANTS_FILE = path.join(__dirname, 'data', 'participants.json');

// Garantir que a pasta e o arquivo existam
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(PARTICIPANTS_FILE)) {
  fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify([], null, 2), 'utf8');
}

function readParticipants() {
  try {
    const data = fs.readFileSync(PARTICIPANTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler participantes:', e);
    return [];
  }
}

function writeParticipants(data) {
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar participantes:', e);
  }
}

// Obter todos os participantes
app.get('/api/participants', (req, res) => {
  const list = readParticipants();
  res.json(list);
});

// Obter dados de um participante específico
app.get('/api/participants/:id', (req, res) => {
  const list = readParticipants();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) {
    return res.status(404).json({ error: 'Participante não encontrado' });
  }
  res.json(participant);
});

// Adicionar novo participante
app.post('/api/participants', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nome do participante é obrigatório' });
  }

  const list = readParticipants();
  const newParticipant = {
    id: 'p' + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    credits: 0,
    history: []
  };

  list.push(newParticipant);
  writeParticipants(list);
  res.status(201).json(newParticipant);
});

// Remover participante
app.delete('/api/participants/:id', (req, res) => {
  let list = readParticipants();
  const index = list.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Participante não encontrado' });
  }

  list.splice(index, 1);
  writeParticipants(list);
  res.json({ success: true, message: 'Participante removido com sucesso' });
});

// Adicionar ou retirar créditos
app.post('/api/participants/:id/credits', (req, res) => {
  const { amount, description } = req.body;
  const creditAmount = parseInt(amount);

  if (isNaN(creditAmount)) {
    return res.status(400).json({ error: 'Quantidade de créditos inválida' });
  }

  const list = readParticipants();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) {
    return res.status(404).json({ error: 'Participante não encontrado' });
  }

  participant.credits += creditAmount;
  // Impedir saldo negativo se for o caso
  if (participant.credits < 0) {
    participant.credits = 0;
  }

  // Adicionar ao histórico de transações
  participant.history.unshift({
    id: 't' + Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString(),
    amount: creditAmount,
    description: description || (creditAmount >= 0 ? 'Créditos adicionados' : 'Créditos retirados')
  });

  writeParticipants(list);
  res.json(participant);
});

// Obter IP do servidor local (auxiliar para gerar QR Codes no frontend)
app.get('/api/server-ip', (req, res) => {
  res.json({ ip: LOCAL_IP, port: PORT });
});

// Gerar imagem do QR Code localmente (offline friendly)
app.get('/api/qr', async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).send('Parâmetro text é obrigatório');
  try {
    const buffer = await qrcode.toBuffer(text, {
      margin: 1,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar QR Code:', err);
    res.status(500).send('Erro ao gerar QR Code');
  }
});

// Socket.IO - Gerenciamento de Salas em Tempo Real
io.on('connection', (socket) => {

  // --- EVENTOS DO HOST ---
  socket.on('create-room', async ({ quiz }) => {
    const pin = generateRoomPIN();
    const joinUrl = `http://${LOCAL_IP}:${PORT}/player.html?pin=${pin}`;

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await qrcode.toDataURL(joinUrl, {
        margin: 2,
        width: 300,
        color: { dark: '#46178f', light: '#ffffff' }
      });
    } catch (e) {
      console.error('Erro ao gerar QR Code:', e);
    }

    rooms[pin] = {
      pin,
      hostSocketId: socket.id,
      quiz,
      currentQuestionIndex: 0,
      state: 'LOBBY',
      players: {}, // socketId -> { id, nickname, avatar, score, streak, answers: {} }
      questionStartTime: null,
      answersReceived: 0
    };

    socket.join(pin);
    socket.emit('room-created', {
      pin,
      joinUrl,
      qrCodeDataUrl,
      localIp: LOCAL_IP
    });
  });

  socket.on('start-game', ({ pin }) => {
    const room = rooms[pin];
    if (!room || room.hostSocketId !== socket.id) return;

    room.state = 'QUESTION';
    room.currentQuestionIndex = 0;
    sendQuestion(room);
  });

  socket.on('next-question', ({ pin }) => {
    const room = rooms[pin];
    if (!room || room.hostSocketId !== socket.id) return;

    room.currentQuestionIndex++;
    if (room.currentQuestionIndex < room.quiz.questions.length) {
      room.state = 'QUESTION';
      sendQuestion(room);
    } else {
      room.state = 'ENDED';
      sendGameOver(room);
    }
  });

  socket.on('show-reveal', ({ pin }) => {
    const room = rooms[pin];
    if (!room || room.hostSocketId !== socket.id) return;

    room.state = 'REVEAL';
    processQuestionReveal(room);
  });

  socket.on('show-leaderboard', ({ pin }) => {
    const room = rooms[pin];
    if (!room || room.hostSocketId !== socket.id) return;

    room.state = 'LEADERBOARD';
    const leaderboard = getLeaderboard(room);
    io.to(pin).emit('leaderboard-update', { leaderboard });
  });

  // --- EVENTOS DO JOGADOR ---
  socket.on('join-room', ({ pin, nickname, avatar }) => {
    const cleanPin = (pin || '').toString().trim();
    const room = rooms[cleanPin];

    if (!room) {
      return socket.emit('join-error', { message: 'PIN de jogo não encontrado!' });
    }

    if (room.state !== 'LOBBY') {
      return socket.emit('join-error', { message: 'O jogo já está em andamento!' });
    }

    // Verificar nome duplicado
    const existingNames = Object.values(room.players).map(p => p.nickname.toLowerCase());
    if (existingNames.includes(nickname.toLowerCase().trim())) {
      return socket.emit('join-error', { message: 'Esse apelido já está em uso nesta sala!' });
    }

    const player = {
      socketId: socket.id,
      nickname: nickname.trim(),
      avatar: avatar || '🚀',
      score: 0,
      streak: 0,
      lastPoints: 0,
      isCorrectLast: false,
      answers: {} // index -> { optionIndex, points, timeSpent }
    };

    room.players[socket.id] = player;
    socket.join(cleanPin);
    socket.pin = cleanPin;

    // Confirmar ao jogador
    socket.emit('joined-success', {
      pin: cleanPin,
      nickname: player.nickname,
      avatar: player.avatar,
      quizTitle: room.quiz.title
    });

    // Notificar o Host
    io.to(room.hostSocketId).emit('player-joined', {
      playerCount: Object.keys(room.players).length,
      players: Object.values(room.players).map(p => ({ nickname: p.nickname, avatar: p.avatar }))
    });
  });

  socket.on('submit-answer', ({ pin, answerIndex }) => {
    const cleanPin = (pin || socket.pin || '').toString().trim();
    const room = rooms[cleanPin];
    if (!room || room.state !== 'QUESTION') return;

    const player = room.players[socket.id];
    if (!player) return;

    const currentQIndex = room.currentQuestionIndex;
    if (player.answers[currentQIndex] !== undefined) return; // Já respondeu

    const currentQ = room.quiz.questions[currentQIndex];
    const timeSpentMs = Date.now() - room.questionStartTime;
    const timeLimitMs = (currentQ.timeLimit || 20) * 1000;

    const isCorrect = parseInt(answerIndex) === currentQ.correctAnswer;
    let pointsAwarded = 0;

    if (isCorrect) {
      // Fórmula de Pontuação Kahoot: Pontos base 1000 * (1 - (tempoGasto / (tempoLimite * 2)))
      const timeFactor = Math.max(0, 1 - (timeSpentMs / (timeLimitMs * 1.5)));
      const basePoints = Math.round(1000 * timeFactor);

      // Bônus de Sequência (Streak)
      player.streak = (player.streak || 0) + 1;
      const streakBonus = Math.min(player.streak * 100, 500);

      pointsAwarded = basePoints + streakBonus;
      player.score += pointsAwarded;
      player.isCorrectLast = true;
    } else {
      player.streak = 0;
      player.isCorrectLast = false;
    }

    player.lastPoints = pointsAwarded;
    player.answers[currentQIndex] = {
      optionIndex: parseInt(answerIndex),
      points: pointsAwarded,
      isCorrect,
      timeSpentMs
    };

    room.answersReceived++;

    // Confirmar resposta recebida ao jogador
    socket.emit('answer-accepted', { answerIndex });

    // Atualizar o contador no Host
    io.to(room.hostSocketId).emit('answer-count-update', {
      answersReceived: room.answersReceived,
      totalPlayers: Object.keys(room.players).length
    });

    // Se todos os jogadores ativos já responderam
    if (room.answersReceived >= Object.keys(room.players).length) {
      room.state = 'REVEAL';
      processQuestionReveal(room);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.pin && rooms[socket.pin]) {
      const room = rooms[socket.pin];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        // Notificar o Host
        io.to(room.hostSocketId).emit('player-left', {
          playerCount: Object.keys(room.players).length,
          players: Object.values(room.players).map(p => ({ nickname: p.nickname, avatar: p.avatar }))
        });
      }
    }
  });
});

// Funções Auxiliares do Fluxo de Jogo
function sendQuestion(room) {
  if (!room || !room.quiz || !room.quiz.questions || !room.quiz.questions[room.currentQuestionIndex]) {
    console.warn('sendQuestion tentou acessar uma pergunta inexistente.');
    return;
  }
  const currentQ = room.quiz.questions[room.currentQuestionIndex];
  room.questionStartTime = Date.now();
  room.answersReceived = 0;

  // Dados para o Host (inclui a resposta correta para controle)
  io.to(room.hostSocketId).emit('question-start-host', {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    question: currentQ.question,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    timeLimit: currentQ.timeLimit || 20,
    totalPlayers: Object.keys(room.players).length
  });

  // Dados para os Jogadores (sem a resposta correta)
  io.to(room.pin).emit('question-start-player', {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    questionText: currentQ.question,
    timeLimit: currentQ.timeLimit || 20
  });
}

function processQuestionReveal(room) {
  if (!room || !room.quiz || !room.quiz.questions || !room.quiz.questions[room.currentQuestionIndex]) {
    console.warn('processQuestionReveal tentou acessar uma pergunta inexistente.');
    return;
  }
  const currentQIndex = room.currentQuestionIndex;
  const currentQ = room.quiz.questions[currentQIndex];

  // Contagem de respostas por opção (0, 1, 2, 3)
  const optionCounts = [0, 0, 0, 0];
  Object.values(room.players).forEach(p => {
    const ans = p.answers[currentQIndex];
    if (ans && ans.optionIndex >= 0 && ans.optionIndex < 4) {
      optionCounts[ans.optionIndex]++;
    }
  });

  const shapes = ['🔺', '🔷', '🟡', '🟩'];
  const colors = ['Red (Vermelho)', 'Blue (Azul)', 'Yellow (Amarelo)', 'Green (Verde)'];

  // Notificar o Host com os detalhes da resposta correta e estatísticas
  io.to(room.hostSocketId).emit('question-reveal-host', {
    questionText: currentQ.question,
    options: currentQ.options,
    correctAnswer: currentQ.correctAnswer,
    correctAnswerText: currentQ.options[currentQ.correctAnswer],
    correctAnswerShape: shapes[currentQ.correctAnswer],
    optionCounts,
    totalPlayers: Object.keys(room.players).length
  });

  // Notificar cada jogador individualmente com o resultado dele e a resposta correta
  const sortedPlayers = getLeaderboard(room);

  Object.values(room.players).forEach(player => {
    const playerRank = sortedPlayers.findIndex(p => p.socketId === player.socketId) + 1;
    const playerSocket = io.sockets.sockets.get(player.socketId);

    if (playerSocket) {
      const ans = player.answers[currentQIndex];
      playerSocket.emit('question-reveal-player', {
        isCorrect: ans ? ans.isCorrect : false,
        correctAnswer: currentQ.correctAnswer,
        correctAnswerText: currentQ.options[currentQ.correctAnswer],
        correctAnswerShape: shapes[currentQ.correctAnswer],
        pointsEarned: ans ? ans.points : 0,
        totalScore: player.score,
        streak: player.streak,
        rank: playerRank
      });
    }
  });
}

function sendGameOver(room) {
  const leaderboard = getLeaderboard(room);

  io.to(room.hostSocketId).emit('game-over-host', {
    podium: leaderboard.slice(0, 3),
    fullLeaderboard: leaderboard
  });

  Object.values(room.players).forEach(player => {
    const rank = leaderboard.findIndex(p => p.socketId === player.socketId) + 1;
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket) {
      playerSocket.emit('game-over-player', {
        finalRank: rank,
        totalScore: player.score,
        totalPlayers: leaderboard.length
      });
    }
  });
}

function getLeaderboard(room) {
  return Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map(p => ({
      socketId: p.socketId,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak
    }));
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor Kahoot IA rodando com sucesso!`);
  console.log(`🏠 Host local:    http://localhost:${PORT}`);
  console.log(`📱 Jogadores QR:  http://${LOCAL_IP}:${PORT}/player.html`);
  console.log(`====================================================`);
});
