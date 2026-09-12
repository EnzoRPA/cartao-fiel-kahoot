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

// Supabase (banco de dados externo para persistência — opcional)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const useSupabase = !!(SUPABASE_URL && SUPABASE_KEY);
let supabase = null;

if (useSupabase) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase conectado com sucesso!');
  } catch (e) {
    console.warn('⚠️ @supabase/supabase-js não instalado. Execute: npm install @supabase/supabase-js');
  }
} else {
  console.log('⚠️ Supabase não configurado. Usando JSON local.');
}

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

// BANCO DE CONHECIMENTO EMBUTIDO - Usado para enriquecer o prompt da IA
const KNOWLEDGE_BASE = {
  'crencas adventistas': {
    context: `Você está criando perguntas sobre as 28 Crenças Fundamentais da Igreja Adventista do Sétimo Dia. Cada crença é um tópico específico. Gere perguntas que testem o conhecimento REAL sobre cada crença individual, não perguntas genéricas sobre cristianismo.

Aqui estão as 28 crenças com seus tópicos principais para referência:
1. As Escrituras - A Bíblia é a Palavra infalível de Deus, VT e NT.
2. A Trindade - Um Deus em 3 pessoas: Pai, Filho e Espírito Santo.
3. Deus, o Pai - Criador de todas as coisas, onisciente, onipotente.
4. Deus, o Filho - Jesus Cristo, encarnação de Deus, morte e ressurreição.
5. O Espírito Santo - Agente divino que convence do pecado, regenera.
6. A Criação - Deus criou os céus e a terra em 6 dias, Sábado.
7. A Natureza do Ser Humano - Criados à imagem de Deus, caídos pelo pecado.
8. O Conflito Universal - Luta entre Cristo e Satanj pelo domínio do universo.
9. A Vida, Morte e Ressurreição de Cristo - Morte vicária, ressurreição literal.
10. A Experiência de Salvação - Perdão, justificação, santificação pela fé.
11. Crescimento e Perseverança - Vida cristã de crescimento contínuo.
12. A Igreja - Corpo de crentes, missão de evangelizar o mundo.
13. O Batismo - Imersão em água, símbolo de morte e ressurreição com Cristo.
14. O Banquete do Senhor - Memória da morte de Cristo, comunhão.
15. Os Dons Espirituais - Carismas dados pelo Espírito Santo à igreja.
16. A Lei de Deus - Os 10 Mandamentos, padrão de conduta, incluindo o sábado.
17. O Sábado - 7º dia da semana, dia de descanso e santidade (Levítico 20:8).
18. Profecias - Dom de profecia manifestado no ministério de Ellen G. White.
19. O Don de Profecia - Ellen G. White como mensageira do Senhor.
20. A Guarda do Sábado - O sábado é o 7º dia (sábado), memorial da Criação, santidade.
21. Cristo no Santuário Celestial - Ministério de Cristo no santuário celestial.
22. O Segundo Advento - Volta literal de Cristo, evento visível e triunfante.
23. A Morte e o Estado Morto - Os mortos dormem até a ressurreição.
24. O Milênio - 1000 anos no céu, julgamento dos ímpios na Terra.
25. A Penha Final - Satanj destruído, Terra renovada por fogo.
26. A Nova Terra - Novos céus e nova Terra, eterna morada dos salvos.
27. A Intercessão de Cristo - Cristo intercede por nós no santuário.
28. A Comunhão dos Santos - Todos os santos de todas as épocas são unidos em Cristo.`
  },
  '28 crenças': {
    context: `Você está criando perguntas sobre as 28 Crenças Fundamentais da Igreja Adventista do Sétimo Dia. Gere perguntas ESPECÍFICAS sobre cada crença individual.

Referência das 28 crenças:
1. As Escrituras - A Bíblia é a Palavra infalível de Deus.
2. A Trindade - Um Deus em 3 pessoas.
3. Deus, o Pai - Criador, onisciente, onipotente.
4. Deus, o Filho - Jesus, encarnação, morte e ressurreição.
5. O Espírito Santo - Convence do pecado, regenera.
6. A Criação - 6 dias, Sábado.
7. Natureza Humana - Imagem de Deus, caídos pelo pecado.
8. Conflito Universal - Cristo vs Satanj.
9. Vida, Morte e Ressurreição de Cristo - Morte vicária.
10. Experiência de Salvação - Fé, perdão, santificação.
11. Crescimento e Perseverança - Vida cristã.
12. A Igreja - Corpo de crentes.
13. O Batismo - Imersão em água.
14. Banquete do Senhor - Comunhão.
15. Dons Espirituais - Carismas do Espírito.
16. Lei de Deus - 10 Mandamentos.
17. O Sábado - 7º dia, descanso e santidade.
18. Profecias - Dom profético.
19. Don de Profecia - Ellen G. White.
20. Guarda do Sábado - Sábado é sagrado, 7º dia da semana.
21. Cristo no Santuário - Ministério celestial.
22. Segundo Advento - Volta literal de Cristo.
23. Morte e Estado Morto - Dormem até ressurreição.
24. O Milênio - 1000 anos no céu.
25. Pecado Final - Destruição de Satanj.
26. Nova Terra - Eternidade com Deus.
27. Intercessão de Cristo -媒體ção celestial.
28. Comunhão dos Santos - Unidade dos fiéis.`
  },
  'adventista': {
    context: `Perguntas sobre a Igreja Adventista do Sétimo Dia e suas 28 Crenças Fundamentais. Foque em temas como: sábado, santuário, segundo advento, 10 mandamentos, espírito de profecia, batismo, ceia do senhor, etc.`
  },
  'história do brasil': {
    context: `Perguntas sobre a história do Brasil desde o descobrimento até os dias atuais. Temas: colonialismo, independência, império, república, Era Vargas, redemocratização, etc.`
  },
  'biologia': {
    context: `Perguntas sobre biologia: células, genética, evolução, ecologia, anatomia, fisiologia, etc.`
  },
  'geografia': {
    context: `Perguntas sobre geografia mundial e brasileira: países, capitais, clima, relevo, população, economia.`
  },
  'programação': {
    context: `Perguntas sobre programação: JavaScript, Python, lógica, algoritmos, estruturas de dados, web.`
  },
  'ciência': {
    context: `Perguntas sobre ciências gerais: física, química, astronomia, terra, energia, etc.`
  },
  'tecnologia': {
    context: `Perguntas sobre tecnologia: computadores, internet, inteligência artificial, redes, hardware, software.`
  },
  'matemática': {
    context: `Perguntas sobre matemática: álgebra, geometria, aritmética, cálculo, estatística.`
  }
};

function findKnowledgeContext(topic) {
  const lower = topic.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, value] of Object.entries(KNOWLEDGE_BASE)) {
    const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(normalizedKey)) {
      return value.context;
    }
  }
  return '';
}

// Rota de API para IA (Gerador de Perguntas com Gemini)
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topic, numQuestions = 5, difficulty = 'medio', apiKey: userApiKey } = req.body;
    if (!topic || topic.trim() === '') {
      return res.status(400).json({ error: 'O tema é obrigatório.' });
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    const knowledgeContext = findKnowledgeContext(topic);

    const difficultyMap = {
      facil: { label: 'Fácil', time: 30, desc: 'Conceitos básicos e fundamentais. Perguntas diretas e objetivas.' },
      medio: { label: 'Médio', time: 25, desc: 'Conhecimento intermediário, detalhes específicos, comparações.' },
      dificil: { label: 'Desafiador', time: 20, desc: 'Perguntas avançadas, nuances, exceções, fatos pouco conhecidos.' },
      expert: { label: 'Expert', time: 15, desc: 'Perguntas extremamente técnicas, detalhes obscuros, dados específicos.' }
    };
    const diff = difficultyMap[difficulty] || difficultyMap.medio;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Você é um especialista em criar quizzes. Suas perguntas devem ser EXTREMAMENTE ESPECÍFICAS ao tema.

${knowledgeContext ? `=== REFERÊNCIA OBRIGATÓRIA (use APENAS informações daqui) ===\n${knowledgeContext}\n` : ''}=== TEMA ===
"${topic}"

=== DIFICULDADE: ${diff.label} (${diff.desc}) ===

=== REGRAS ESTRITAS ===
1. Formato: APENAS JSON válido. Sem markdown, sem explicações.
2. EXATAMENTE 4 alternativas por pergunta.
3. APENAS 1 alternativa correta (índice 0-3).
4. Cada pergunta deve ser sobre um ASPECTO DIFERENTE do tema.
5. NUNCA gere perguntas genéricas ou que sirvam para qualquer tema.

=== O QUE NÃO FAZER ===
- NÃO pergunte "O que significa a sigla X?" (isso é genérico demais)
- NÃO pergunte conceitos básicos que qualquer pessoa sabe
- NÃO repita o mesmo assunto em perguntas diferentes
- NÃO gere perguntas que NÃO estejam diretamente relacionadas ao tema "${topic}"

=== COMO GERAR BOAS PERGUNTAS ===
- Para "28 crenças adventistas": cada pergunta sobre UMA CRENÇA ESPECÍFICA (ex: "Qual é a 7ª Crença?"; "Segundo a 20ª Crença, como devemos guardar o sábado?")
- Para "história do Brasil": use DATAS, NOMES e EVENTOS específicos
- Para "ciência": use NOMES TÉCNICOS e PROCESSOS específicos
- Para qualquer tema: pergunte sobre DETALHES, não sobre conceitos gerais

=== FORMATO JSON ===
[
  {
    "question": "Pergunta MUITO específica sobre ${topic}?",
    "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
    "correctAnswer": 0,
    "timeLimit": ${diff.time}
  }
]

Gere ${numQuestions} perguntas. Cada uma sobre um aspecto DIFERENTE de "${topic}".`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let rawText = response.text || '';
        // Limpar blocos de código se a IA retornar ```json ... ```
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const questions = JSON.parse(rawText);
        const title = knowledgeContext ? `Quiz: ${topic}` : `Quiz IA: ${topic}`;
        return res.json({ success: true, title, questions });
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
      { question: "Em que ano foi assinada a Independência do Brasil?", options: ["1822", "1889", "1500", "1930"], correctAnswer: 0, timeLimit: 25 },
      { question: "Quem proclamou a República no Brasil em 1889?", options: ["Deodoro da Fonseca", "Getúlio Vargas", "Dom Pedro II", "Juscelino Kubitschek"], correctAnswer: 0, timeLimit: 25 },
      { question: "Em que ano começou a Segunda Guerra Mundial?", options: ["1939", "1914", "1945", "1929"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual civilização construiu as pirâmides de Gizé?", options: ["Egípcios", "Romanos", "Gregos", "Astecas"], correctAnswer: 0, timeLimit: 25 },
      { question: "Quem foi o primeiro presidente do Brasil?", options: ["Deodoro da Fonseca", "Floriano Peixoto", "Prudente de Morais", "Getúlio Vargas"], correctAnswer: 0, timeLimit: 25 }
    ],
    ciencia: [
      { question: "Qual elemento químico tem símbolo 'O'?", options: ["Oxigênio", "Ouro", "Osmio", "Ozônio"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é o maior planeta do Sistema Solar?", options: ["Júpiter", "Saturno", "Netuno", "Terra"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual organela é responsável pela respiração celular?", options: ["Mitocôndria", "Ribossomo", "Lisossomo", "Complexo de Golgi"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é a velocidade da luz no vácuo?", options: ["300.000 km/s", "150.000 km/s", "500.000 km/s", "1.000.000 km/s"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual força mantém os planetas em órbita ao redor do Sol?", options: ["Gravidade", "Magnetismo", "Atrito", "Inércia"], correctAnswer: 0, timeLimit: 25 }
    ],
    tecnologia: [
      { question: "O que significa a sigla HTML?", options: ["HyperText Markup Language", "High Tech Machine Language", "Home Tool Media Line", "Hyperlink Text Mode Logic"], correctAnswer: 0, timeLimit: 25 },
      { question: "Quem criou a World Wide Web (WWW)?", options: ["Tim Berners-Lee", "Steve Jobs", "Bill Gates", "Alan Turing"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual linguagem é nativa dos navegadores web?", options: ["JavaScript", "Python", "C++", "Java"], correctAnswer: 0, timeLimit: 25 },
      { question: "O que significa a sigla CPU?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual empresa desenvolveu o sistema operacional Windows?", options: ["Microsoft", "Apple", "Google", "Linux"], correctAnswer: 0, timeLimit: 25 }
    ],
    geografia: [
      { question: "Qual é o maior país do mundo em área territorial?", options: ["Rússia", "Canadá", "China", "Estados Unidos"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é a capital da França?", options: ["Paris", "Londres", "Madri", "Berlim"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é o rio mais longo do mundo?", options: ["Rio Nilo", "Rio Amazonas", "Rio Mississippi", "Rio Yangtze"], correctAnswer: 0, timeLimit: 25 },
      { question: "Quantos continentes existem?", options: ["7", "5", "6", "4"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é o maior oceano do planeta?", options: ["Pacífico", "Atlântico", "Índico", "Ártico"], correctAnswer: 0, timeLimit: 25 }
    ],
    adventista: [
      { question: "Qual é o 4º mandamento dos 10 Mandamentos?", options: ["Lembra-te do sábado para santificá-lo", "Não terás outros deuses", "Não matarás", "Honrar pai e mãe"], correctAnswer: 0, timeLimit: 25 },
      { question: "Em que livro da Bíblia encontramos a história da criação?", options: ["Gênesis", "Apocalipse", "Êxodo", "Salmos"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é o significance do batismo por imersão?", options: ["Morte e ressurreição com Cristo", "Purificação do pecado original", "Ingresso na igreja", "Dom do Espírito Santo"], correctAnswer: 0, timeLimit: 25 },
      { question: "O que a Igreja Adventista crê sobre o estado dos mortos?", options: ["Dormem até a ressurreição", "Vão imediatamente ao céu", "Reencarnam", "Ficam no purgatório"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é a mensagem de Apocalipse 14:6-12?", options: ["As Três Mensagens Angélicas", "As Sete Cartas", "As Sete Trombetas", "O Juízo Final"], correctAnswer: 0, timeLimit: 25 }
    ],
    crencas: [
      { question: "Qual é a 1ª Crença Fundamental adventista?", options: ["As Escrituras - Bíblia é Palavra infalível", "A Trindade", "A Criação", "O Batismo"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual crença fala sobre o sábado como dia de descanso?", options: ["17ª Crença - O Sábado", "16ª Crença - Lei de Deus", "20ª Crença - Guarda do Sábado", "Ambas as anteriores estão corretas"], correctAnswer: 0, timeLimit: 25 },
      { question: "O que é a 22ª Crença Fundamental?", options: ["O Segundo Advento de Cristo", "O Milênio", "A Nova Terra", "A Penha Final"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual crença fala sobre o ministério de Cristo no céu?", options: ["21ª Crença - Cristo no Santuário", "9ª Crença - Vida e Morte de Cristo", "10ª Crença - Experiência de Salvação", "27ª Crença - Intercessão"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é o objeto de adoração dos adventistas?", options: ["Deus - Pai, Filho e Espírito Santo", "A Bíblia", "Ellen G. White", "O sábado"], correctAnswer: 0, timeLimit: 25 }
    ],
    '28 crenças': [
      { question: "Qual crença fala sobre a inspiração da Bíblia?", options: ["1ª Crença - As Escrituras", "2ª Crença - A Trindade", "3ª Crença - Deus, o Pai", "16ª Crença - Lei de Deus"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual é a 7ª Crença Fundamental?", options: ["A Natureza do Ser Humano", "A Criação", "O Conflito Universal", "A Experiência de Salvação"], correctAnswer: 0, timeLimit: 25 },
      { question: "Sobre o que trata a 13ª Crença?", options: ["O Batismo", "A Igreja", "O Banquete do Senhor", "Os Dons Espirituais"], correctAnswer: 0, timeLimit: 25 },
      { question: "Qual crença fala sobre a volta literal de Cristo?", options: ["22ª Crença - Segundo Advento", "24ª Crença - O Milênio", "25ª Crença - Pecado Final", "26ª Crença - Nova Terra"], correctAnswer: 0, timeLimit: 25 },
      { question: "O que é a 28ª Crença Fundamental?", options: ["A Comunhão dos Santos", "A Intercessão de Cristo", "A Guarda do Sábado", "O Don de Profecia"], correctAnswer: 0, timeLimit: 25 }
    ],
    matematica: [
      { question: "Quanto é 12 x 12?", options: ["144", "124", "142", "132"], correctAnswer: 0, timeLimit: 20 },
      { question: "Qual é a raiz quadrada de 144?", options: ["12", "14", "11", "13"], correctAnswer: 0, timeLimit: 20 },
      { question: "Quanto é 2³ (2 ao cubo)?", options: ["8", "6", "9", "4"], correctAnswer: 0, timeLimit: 20 },
      { question: "Qual é o valor de π (pi) arredondado para 2 casas decimais?", options: ["3.14", "3.41", "3.12", "3.16"], correctAnswer: 0, timeLimit: 20 },
      { question: "Se x + 5 = 15, quanto vale x?", options: ["10", "5", "15", "20"], correctAnswer: 0, timeLimit: 20 }
    ]
  };

  let pool = presets.tecnologia;
  for (const key in presets) {
    if (cleanTopic.includes(key)) {
      pool = presets[key];
      break;
    }
  }

  const questions = [];
  for (let i = 0; i < count; i++) {
    if (i < pool.length) {
      questions.push({ ...pool[i] });
    } else {
      questions.push({
        question: `Pergunta ${i + 1} sobre "${topic}": Qual destas afirmações está correta?`,
        options: [
          `Resposta correta sobre ${topic}`,
          `Alternativa plausível`,
          `Opção incorreta`,
          `Falso positivo`
        ],
        correctAnswer: 0,
        timeLimit: 25
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
// API DE CRÉDITOS BÍBLICOS & PARTICIPANTES
// ==========================================================================

const PARTICIPANTS_FILE = path.join(__dirname, 'data', 'participants.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(PARTICIPANTS_FILE)) {
  fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify([], null, 2), 'utf8');
}

function readParticipantsLocal() {
  try {
    const data = fs.readFileSync(PARTICIPANTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler participantes:', e);
    return [];
  }
}

function writeParticipantsLocal(data) {
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar participantes:', e);
  }
}

async function readParticipants() {
  if (useSupabase) {
    const { data, error } = await supabase.from('participants').select('*');
    if (error) { console.error('Erro Supabase readParticipants:', error); return []; }
    return data.map(p => ({ ...p, history: p.history || [] }));
  }
  return readParticipantsLocal();
}

async function writeParticipants(data) {
  if (useSupabase) return;
  writeParticipantsLocal(data);
}

async function upsertParticipant(participant) {
  if (useSupabase) {
    const { error } = await supabase.from('participants').upsert(participant, { onConflict: 'id' });
    if (error) console.error('Erro Supabase upsert:', error);
  }
}

async function deleteParticipantDb(id) {
  if (useSupabase) {
    const { error } = await supabase.from('participants').delete().eq('id', id);
    if (error) console.error('Erro Supabase delete:', error);
  }
}

// Obter todos os participantes
app.get('/api/participants', async (req, res) => {
  const list = await readParticipants();
  res.json(list);
});

// Obter dados de um participante específico
app.get('/api/participants/:id', async (req, res) => {
  if (useSupabase) {
    const { data, error } = await supabase.from('participants').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Participante não encontrado' });
    return res.json({ ...data, history: data.history || [] });
  }
  const list = readParticipantsLocal();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
  res.json(participant);
});

// Adicionar novo participante
app.post('/api/participants', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nome do participante é obrigatório' });
  }

  const newParticipant = {
    id: 'p' + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    credits: 0,
    history: []
  };

  if (useSupabase) {
    await upsertParticipant(newParticipant);
  } else {
    const list = readParticipantsLocal();
    list.push(newParticipant);
    writeParticipantsLocal(list);
  }
  res.status(201).json(newParticipant);
});

// Remover participante
app.delete('/api/participants/:id', async (req, res) => {
  if (useSupabase) {
    const { error } = await supabase.from('participants').delete().eq('id', req.params.id);
    if (error) return res.status(404).json({ error: 'Participante não encontrado' });
    return res.json({ success: true, message: 'Participante removido com sucesso' });
  }
  let list = readParticipantsLocal();
  const index = list.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Participante não encontrado' });
  list.splice(index, 1);
  writeParticipantsLocal(list);
  res.json({ success: true, message: 'Participante removido com sucesso' });
});

// Atualizar nome do participante
app.put('/api/participants/:id', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nome do participante é obrigatório' });
  }

  if (useSupabase) {
    const { data, error } = await supabase.from('participants').update({ name: name.trim() }).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Participante não encontrado' });
    return res.json(data);
  }

  const list = readParticipantsLocal();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
  participant.name = name.trim();
  writeParticipantsLocal(list);
  res.json(participant);
});

// Definir saldo absoluto
app.put('/api/participants/:id/balance', async (req, res) => {
  const { balance, description } = req.body;
  const newBalance = parseInt(balance);
  if (isNaN(newBalance) || newBalance < 0) {
    return res.status(400).json({ error: 'Saldo inválido' });
  }

  if (useSupabase) {
    const { data: participant, error } = await supabase.from('participants').select('*').eq('id', req.params.id).single();
    if (error || !participant) return res.status(404).json({ error: 'Participante não encontrado' });

    const diff = newBalance - participant.credits;
    const history = participant.history || [];
    history.unshift({
      id: 't' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      amount: diff,
      description: description || `Ajuste manual de saldo para ${newBalance} pts`
    });

    const { error: upErr } = await supabase.from('participants').update({ credits: newBalance, history }).eq('id', req.params.id);
    if (upErr) console.error(upErr);
    return res.json({ ...participant, credits: newBalance, history });
  }

  const list = readParticipantsLocal();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
  const diff = newBalance - participant.credits;
  participant.credits = newBalance;
  participant.history.unshift({
    id: 't' + Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString(),
    amount: diff,
    description: description || `Ajuste manual de saldo para ${newBalance} pts`
  });
  writeParticipantsLocal(list);
  res.json(participant);
});

// Atualizar uma transação específica
app.put('/api/participants/:id/history/:txId', async (req, res) => {
  const { amount, description } = req.body;
  const newAmount = parseInt(amount);
  if (isNaN(newAmount)) return res.status(400).json({ error: 'Quantidade de créditos inválida' });

  if (useSupabase) {
    const { data: participant, error } = await supabase.from('participants').select('*').eq('id', req.params.id).single();
    if (error || !participant) return res.status(404).json({ error: 'Participante não encontrado' });
    const history = participant.history || [];
    const tx = history.find(t => t.id === req.params.txId);
    if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
    const diff = newAmount - tx.amount;
    tx.amount = newAmount;
    if (description) tx.description = description.trim();
    let credits = participant.credits + diff;
    if (credits < 0) credits = 0;
    await supabase.from('participants').update({ credits, history }).eq('id', req.params.id);
    return res.json({ ...participant, credits, history });
  }

  const list = readParticipantsLocal();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
  const tx = participant.history.find(t => t.id === req.params.txId);
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
  const diff = newAmount - tx.amount;
  tx.amount = newAmount;
  if (description) tx.description = description.trim();
  participant.credits += diff;
  if (participant.credits < 0) participant.credits = 0;
  writeParticipantsLocal(list);
  res.json(participant);
});

// Excluir uma transação específica e estornar os pontos
app.delete('/api/participants/:id/history/:txId', async (req, res) => {
  if (useSupabase) {
    const { data: participant, error } = await supabase.from('participants').select('*').eq('id', req.params.id).single();
    if (error || !participant) return res.status(404).json({ error: 'Participante não encontrado' });
    const history = participant.history || [];
    const txIndex = history.findIndex(t => t.id === req.params.txId);
    if (txIndex === -1) return res.status(404).json({ error: 'Transação não encontrada' });
    const tx = history[txIndex];
    let credits = participant.credits - tx.amount;
    if (credits < 0) credits = 0;
    history.splice(txIndex, 1);
    await supabase.from('participants').update({ credits, history }).eq('id', req.params.id);
    return res.json({ ...participant, credits, history });
  }

  const list = readParticipantsLocal();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
  const txIndex = participant.history.findIndex(t => t.id === req.params.txId);
  if (txIndex === -1) return res.status(404).json({ error: 'Transação não encontrada' });
  const tx = participant.history[txIndex];
  participant.credits -= tx.amount;
  if (participant.credits < 0) participant.credits = 0;
  participant.history.splice(txIndex, 1);
  writeParticipantsLocal(list);
  res.json(participant);
});

// Adicionar ou retirar créditos
app.post('/api/participants/:id/credits', async (req, res) => {
  const { amount, description } = req.body;
  const creditAmount = parseInt(amount);
  if (isNaN(creditAmount)) return res.status(400).json({ error: 'Quantidade de créditos inválida' });

  if (useSupabase) {
    const { data: participant, error } = await supabase.from('participants').select('*').eq('id', req.params.id).single();
    if (error || !participant) return res.status(404).json({ error: 'Participante não encontrado' });
    let credits = participant.credits + creditAmount;
    if (credits < 0) credits = 0;
    const history = participant.history || [];
    history.unshift({
      id: 't' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      amount: creditAmount,
      description: description || (creditAmount >= 0 ? 'Créditos adicionados' : 'Créditos retirados')
    });
    await supabase.from('participants').update({ credits, history }).eq('id', req.params.id);
    return res.json({ ...participant, credits, history });
  }

  const list = readParticipantsLocal();
  const participant = list.find(p => p.id === req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participante não encontrado' });
  participant.credits += creditAmount;
  if (participant.credits < 0) participant.credits = 0;
  participant.history.unshift({
    id: 't' + Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString(),
    amount: creditAmount,
    description: description || (creditAmount >= 0 ? 'Créditos adicionados' : 'Créditos retirados')
  });
  writeParticipantsLocal(list);
  res.json(participant);
});

// Obter IP do servidor local (auxiliar para gerar QR Codes no frontend)
app.get('/api/server-ip', (req, res) => {
  res.json({ ip: LOCAL_IP, port: PORT });
});

// API de Ranking
app.get('/api/ranking', async (req, res) => {
  const list = await readParticipants();
  const ranking = list
    .map(p => ({
      id: p.id,
      name: p.name,
      credits: p.credits
    }))
    .sort((a, b) => b.credits - a.credits);
  res.json(ranking);
});

// ==========================================================================
// API DE QUIZZES (CRUD)
// ==========================================================================

const QUIZZES_FILE = path.join(__dirname, 'data', 'quizzes.json');
if (!fs.existsSync(QUIZZES_FILE)) {
  fs.writeFileSync(QUIZZES_FILE, JSON.stringify([], null, 2), 'utf8');
}

function readQuizzesLocal() {
  try {
    const data = fs.readFileSync(QUIZZES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler quizzes:', e);
    return [];
  }
}

function writeQuizzesLocal(data) {
  try {
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar quizzes:', e);
  }
}

async function readQuizzes() {
  if (useSupabase) {
    const { data, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Erro Supabase readQuizzes:', error); return []; }
    return data.map(q => ({ id: q.id, title: q.title, questions: q.questions || [] }));
  }
  return readQuizzesLocal();
}

app.get('/api/quizzes', async (req, res) => {
  res.json(await readQuizzes());
});

app.get('/api/quizzes/:id', async (req, res) => {
  if (useSupabase) {
    const { data, error } = await supabase.from('quizzes').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Quiz não encontrado' });
    return res.json({ id: data.id, title: data.title, questions: data.questions || [] });
  }
  const quizzes = readQuizzesLocal();
  const quiz = quizzes.find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });
  res.json(quiz);
});

app.post('/api/quizzes', async (req, res) => {
  const { title, questions } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Título é obrigatório' });
  if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'Quiz deve ter pelo menos 1 pergunta' });

  const newQuiz = { id: 'quiz-' + Date.now(), title: title.trim(), questions };

  if (useSupabase) {
    const { error } = await supabase.from('quizzes').insert({ id: newQuiz.id, title: newQuiz.title, questions: newQuiz.questions });
    if (error) console.error('Erro Supabase insert quiz:', error);
  } else {
    const quizzes = readQuizzesLocal();
    quizzes.unshift(newQuiz);
    writeQuizzesLocal(quizzes);
  }
  res.status(201).json(newQuiz);
});

app.put('/api/quizzes/:id', async (req, res) => {
  const { title, questions } = req.body;

  if (useSupabase) {
    const updates = {};
    if (title) updates.title = title.trim();
    if (Array.isArray(questions) && questions.length > 0) updates.questions = questions;
    const { data, error } = await supabase.from('quizzes').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Quiz não encontrado' });
    return res.json({ id: data.id, title: data.title, questions: data.questions });
  }

  const quizzes = readQuizzesLocal();
  const quiz = quizzes.find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });
  if (title) quiz.title = title.trim();
  if (Array.isArray(questions) && questions.length > 0) quiz.questions = questions;
  writeQuizzesLocal(quizzes);
  res.json(quiz);
});

app.delete('/api/quizzes/:id', async (req, res) => {
  if (useSupabase) {
    const { error } = await supabase.from('quizzes').delete().eq('id', req.params.id);
    if (error) return res.status(404).json({ error: 'Quiz não encontrado' });
    return res.json({ success: true, message: 'Quiz excluído com sucesso' });
  }

  let quizzes = readQuizzesLocal();
  const index = quizzes.findIndex(q => q.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Quiz não encontrado' });
  quizzes.splice(index, 1);
  writeQuizzesLocal(quizzes);
  res.json({ success: true, message: 'Quiz excluído com sucesso' });
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
  socket.on('create-room', async ({ quiz, baseUrl }) => {
    const pin = generateRoomPIN();
    let hostBase = (baseUrl && baseUrl !== 'null') ? baseUrl : `http://${LOCAL_IP}:${PORT}`;
    if (!hostBase.startsWith('http://') && !hostBase.startsWith('https://')) {
      hostBase = `http://${hostBase}`;
    }
    const joinUrl = `${hostBase}/player.html?pin=${pin}`;

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

  socket.on('cancel-game', ({ pin }) => {
    const room = rooms[pin];
    if (!room || room.hostSocketId !== socket.id) return;

    io.to(pin).emit('game-cancelled', { message: 'O jogo foi cancelado pelo host.' });
    
    // Remover todos os jogadores da sala
    Object.values(room.players).forEach(player => {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.leave(pin);
        delete playerSocket.pin;
      }
    });

    socket.leave(pin);
    delete rooms[pin];
  });

  // --- EVENTOS DO JOGADOR ---
  socket.on('join-room', ({ pin, nickname, avatar, userId }) => {
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
      userId: userId || null,
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

async function sendGameOver(room) {
  const leaderboard = getLeaderboard(room);

  // Salvar pontos dos jogadores nos participantes
  await saveGamePointsToUsers(room);

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

async function saveGamePointsToUsers(room) {
  if (useSupabase) {
    const userScores = {};
    Object.values(room.players).forEach(player => {
      if (player.userId) {
        if (!userScores[player.userId]) {
          userScores[player.userId] = { nickname: player.nickname, totalScore: 0 };
        }
        userScores[player.userId].totalScore += player.score;
      }
    });

    for (const [userId, data] of Object.entries(userScores)) {
      const { data: participant } = await supabase.from('participants').select('*').eq('id', userId).single();
      if (participant) {
        const credits = participant.credits + data.totalScore;
        const history = participant.history || [];
        history.unshift({
          id: 't' + Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          amount: data.totalScore,
          description: `Pontos do Kahoot (${room.quiz.title || 'Quiz'})`
        });
        await supabase.from('participants').update({ credits, history }).eq('id', userId);
      }
    }
    return;
  }

  const userScores = {};
  Object.values(room.players).forEach(player => {
    if (player.userId) {
      if (!userScores[player.userId]) {
        userScores[player.userId] = { nickname: player.nickname, totalScore: 0 };
      }
      userScores[player.userId].totalScore += player.score;
    }
  });

  const list = readParticipantsLocal();
  for (const [userId, data] of Object.entries(userScores)) {
    const participant = list.find(p => p.id === userId);
    if (participant) {
      participant.credits += data.totalScore;
      participant.history.unshift({
        id: 't' + Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amount: data.totalScore,
        description: `Pontos do Kahoot (${room.quiz.title || 'Quiz'})`
      });
    }
  }
  writeParticipantsLocal(list);
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

  // ============================================================
  // SELF-PING: Mantém o servidor Render acordado (plano free)
  // Dispara a cada 14 minutos (Render hiberna após 15 min)
  // ============================================================
  const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutos

  const selfUrl = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/api/server-info`
    : `http://localhost:${PORT}/api/server-info`;

  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`⏰ Self-ping ativo a cada 14 min → ${selfUrl}`);
    setInterval(() => {
      const http = selfUrl.startsWith('https') ? require('https') : require('http');
      const req = http.get(selfUrl, (res) => {
        console.log(`🏓 Self-ping OK [${new Date().toLocaleTimeString('pt-BR')}] - Status: ${res.statusCode}`);
      });
      req.on('error', (e) => console.warn(`⚠️ Self-ping falhou: ${e.message}`));
      req.end();
    }, PING_INTERVAL_MS);
  }
});

