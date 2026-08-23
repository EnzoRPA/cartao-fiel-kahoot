// ==========================================================================
// CARTEIRA DIGITAL DO ADOLESCENTE - FRONTEND LOGIC (COM BUSCA POR NOME/ID)
// ==========================================================================

const BIBLE_VERSES = [
  { text: "Ninguém despreze a tua mocidade; mas sê o exemplo dos fiéis, na palavra, no trato, no amor, no espírito, na fé, na pureza.", ref: "1 Timóteo 4:12" },
  { text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.", ref: "Salmo 119:105" },
  { text: "Guarda o teu coração, porque dele procedem as fontes da vida.", ref: "Provérbios 4:23" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar, que maneja bem a palavra da verdade.", ref: "2 Timóteo 2:15" },
  { text: "Como purificará o jovem o seu caminho? Observando-o conforme a tua palavra.", ref: "Salmo 119:9" },
  { text: "Não to mandei eu? Esforça-te e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor, teu Deus, é contigo por onde quer que andares.", ref: "Josué 1:9" },
  { text: "Os que confiam no Senhor serão como o monte Sião, que não se abala, mas permanece para sempre.", ref: "Salmo 125:1" }
];

let cachedParticipants = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupRandomVerse();
  await loadParticipantsList();

  const params = new URLSearchParams(window.location.search);
  const participantId = params.get('id');

  if (participantId) {
    selectParticipant(participantId, false);
  } else {
    showNoParticipantScreen();
  }

  // Fechar dropdown de sugestões ao clicar fora
  document.addEventListener('click', (e) => {
    const searchWrapper = document.getElementById('participant-search-input');
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions && !suggestions.contains(e.target) && e.target !== searchWrapper) {
      suggestions.style.display = 'none';
    }
  });
});

async function loadParticipantsList() {
  try {
    const res = await fetch('/api/participants');
    cachedParticipants = await res.json();
  } catch (e) {
    console.error('Erro ao carregar participantes:', e);
  }
}

function showNoParticipantScreen() {
  document.getElementById('card-content-area').style.display = 'none';
  const noPartScreen = document.getElementById('no-participant-screen');
  noPartScreen.style.display = 'block';

  const quickList = document.getElementById('participants-quick-list');
  if (!cachedParticipants || cachedParticipants.length === 0) {
    quickList.innerHTML = `<div style="color: var(--text-muted); padding: 1rem;">Nenhum adolescente cadastrado ainda.</div>`;
    return;
  }

  quickList.innerHTML = cachedParticipants.map(p => `
    <div class="suggestion-item" onclick="selectParticipant('${p.id}', true)" style="border-radius: 8px; background: rgba(255,255,255,0.03);">
      <div style="text-align: left;">
        <span style="font-weight: 600; color: #fff;">${escapeHtml(p.name)}</span>
        <span style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted); display: block;">ID: ${p.id}</span>
      </div>
      <span class="badge-credits" style="font-size: 0.85rem;">💰 ${p.credits} pts</span>
    </div>
  `).join('');
}

function handleSearchInput(query) {
  const suggestions = document.getElementById('search-suggestions');
  const cleanQ = query.trim().toLowerCase();

  if (!cleanQ || cleanQ.length === 0) {
    suggestions.style.display = 'none';
    return;
  }

  const matches = cachedParticipants.filter(p => 
    p.name.toLowerCase().includes(cleanQ) || 
    p.id.toLowerCase().includes(cleanQ)
  );

  if (matches.length === 0) {
    suggestions.innerHTML = `<div style="padding: 0.8rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Nenhum participante encontrado</div>`;
  } else {
    suggestions.innerHTML = matches.map(p => `
      <div class="suggestion-item" onclick="selectParticipant('${p.id}', true)">
        <div style="text-align: left;">
          <span style="font-weight: 600; color: #fff;">${escapeHtml(p.name)}</span>
          <span style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted); display: block;">${p.id}</span>
        </div>
        <span class="badge-credits" style="font-size: 0.85rem;">💰 ${p.credits} pts</span>
      </div>
    `).join('');
  }

  suggestions.style.display = 'block';
}

function selectParticipant(id, updateUrl = true) {
  const suggestions = document.getElementById('search-suggestions');
  if (suggestions) suggestions.style.display = 'none';

  const searchInput = document.getElementById('participant-search-input');
  if (searchInput) searchInput.value = '';

  if (updateUrl) {
    const newUrl = `${window.location.pathname}?id=${id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }

  loadCardData(id);
}

async function loadCardData(id) {
  try {
    document.getElementById('no-participant-screen').style.display = 'none';
    document.getElementById('card-content-area').style.display = 'block';

    const res = await fetch(`/api/participants/${id}`);
    if (!res.ok) {
      showNoParticipantScreen();
      alert('Participante não encontrado');
      return;
    }
    const p = await res.json();

    document.getElementById('card-holder-name').innerText = p.name;
    animateCounter('card-credits-val', 0, p.credits, 1000);

    calculateRanking(p.id);

    const historyList = document.getElementById('card-history-list');
    document.getElementById('tx-count').innerText = `${p.history.length} transações`;

    if (p.history.length === 0) {
      historyList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.9rem;">
          Nenhuma atividade ou crédito adicionado ainda. Participe das dinâmicas! 🚀
        </div>
      `;
    } else {
      historyList.innerHTML = p.history.map(h => {
        const sign = h.amount >= 0 ? '+' : '';
        const amtClass = h.amount >= 0 ? 'positive' : 'negative';
        const dateStr = new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return `
          <div class="transaction-item">
            <div class="tx-info">
              <span class="tx-desc">${escapeHtml(h.description)}</span>
              <span class="tx-date">${dateStr}</span>
            </div>
            <span class="tx-amount ${amtClass}">${sign}${h.amount}</span>
          </div>
        `;
      }).join('');
    }

  } catch (e) {
    console.error('Erro ao ler carteira:', e);
  }
}

async function calculateRanking(activeId) {
  try {
    if (!cachedParticipants || cachedParticipants.length === 0) {
      await loadParticipantsList();
    }
    const sorted = [...cachedParticipants].sort((a, b) => b.credits - a.credits);
    const index = sorted.findIndex(item => item.id === activeId);
    if (index !== -1) {
      const position = index + 1;
      document.getElementById('ranking-badge').innerText = `${position}º Lugar`;
    }
  } catch (e) {
    console.error(e);
  }
}

function setupRandomVerse() {
  const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length);
  const verse = BIBLE_VERSES[randomIndex];
  document.getElementById('bible-verse-text').innerText = `"${verse.text}"`;
  document.getElementById('bible-verse-ref').innerText = verse.ref;
}

function animateCounter(elementId, start, end, duration) {
  const obj = document.getElementById(elementId);
  if (!obj) return;
  if (start === end) {
    obj.innerText = end;
    return;
  }
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerText = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerText = end;
    }
  };
  window.requestAnimationFrame(step);
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
