// ==========================================================================
// CARTEIRA DIGITAL DO ADOLESCENTE - FRONTEND LOGIC
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

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const participantId = params.get('id');

  if (!participantId) {
    document.body.innerHTML = `
      <div class="wallet-wrapper" style="text-align: center; margin-top: 5rem;">
        <span style="font-size: 5rem; display: block; margin-bottom: 1.5rem;">⚠️</span>
        <h2>Cartão Inválido</h2>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">URL de cartão incompleta. Escaneie o QR Code do seu cartão físico.</p>
      </div>
    `;
    return;
  }

  loadCardData(participantId);
  setupRandomVerse();
});

async function loadCardData(id) {
  try {
    // 1. Carregar detalhes do participante
    const res = await fetch(`/api/participants/${id}`);
    if (!res.ok) {
      document.body.innerHTML = `
        <div class="wallet-wrapper" style="text-align: center; margin-top: 5rem;">
          <span style="font-size: 5rem; display: block; margin-bottom: 1.5rem;">🔍</span>
          <h2>Adolescente não Encontrado</h2>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">Este cartão pode ter sido removido ou o ID está incorreto.</p>
        </div>
      `;
      return;
    }
    const p = await res.json();

    // Atualizar Nome
    document.getElementById('card-holder-name').innerText = p.name;
    
    // Animar contador de saldo
    animateCounter('card-credits-val', 0, p.credits, 1200);

    // 2. Carregar todos para calcular o ranking
    calculateRanking(p.id);

    // Renderizar Histórico
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
    const res = await fetch('/api/participants');
    const list = await res.json();
    
    // Ordenar participantes por pontos decrescente
    list.sort((a, b) => b.credits - a.credits);
    
    // Achar o index
    const index = list.findIndex(item => item.id === activeId);
    if (index !== -1) {
      const position = index + 1;
      document.getElementById('ranking-badge').innerText = `${position}º Lugar`;
    }
  } catch (e) {
    console.error(e);
  }
}

// Configurar Versículo randômico
function setupRandomVerse() {
  const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length);
  const verse = BIBLE_VERSES[randomIndex];
  document.getElementById('bible-verse-text').innerText = `"${verse.text}"`;
  document.getElementById('bible-verse-ref').innerText = verse.ref;
}

// Efeito de contador animado
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

// Utilitário de escape de HTML
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
