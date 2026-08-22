// ==========================================================================
// PORTAL DE CRÉDITOS BÍBLICOS & ADMIN - FRONTEND
// ==========================================================================

let html5QrcodeScanner = null;
let activeParticipantId = null;
let serverIp = 'localhost';
let serverPort = '3000';

// Ao inicializar o documento
document.addEventListener("DOMContentLoaded", () => {
  fetchServerIp();
  fetchParticipants();
});

// Buscar IP do Servidor para geração de URLs de Cartão
async function fetchServerIp() {
  try {
    const res = await fetch('/api/server-ip');
    const data = await res.json();
    serverIp = data.ip;
    serverPort = data.port;
  } catch (e) {
    console.error('Erro ao buscar IP do servidor:', e);
  }
}

// ==========================================================================
// ABA DE NAVEGAÇÃO
// ==========================================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active');
  
  // Achar o botão correspondente e ativar
  const matchingBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
    btn.getAttribute('onclick').includes(tabId)
  );
  if (matchingBtn) matchingBtn.classList.add('active');
  
  // Desligar câmera ao mudar de aba
  if (tabId !== 'tab-scan' && html5QrcodeScanner) {
    stopScanner();
  }
}

// ==========================================================================
// GERENCIAR PARTICIPANTES
// ==========================================================================
async function fetchParticipants() {
  try {
    const res = await fetch('/api/participants');
    const list = await res.json();
    
    // Atualizar contador
    document.getElementById('participants-count').innerText = `${list.length} Cadastrados`;
    
    // Renderizar tabela
    const tbody = document.getElementById('participants-table-body');
    if (!tbody) return;
    
    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            Nenhum adolescente cadastrado. Use o painel ao lado para começar!
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = list.map(p => `
      <tr>
        <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
        <td style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${p.id}</td>
        <td>
          <span class="badge-credits">
            💰 ${p.credits} pts
          </span>
        </td>
        <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button class="btn btn-secondary btn-icon" onclick="editParticipantName('${p.id}', '${escapeHtml(p.name)}')" title="Editar Nome">
            ✏️
          </button>
          <button class="btn btn-secondary btn-icon" onclick="openHistoryModal('${p.id}')" title="Ver Extrato e Gerenciar Pontos">
            📜
          </button>
          <button class="btn btn-secondary btn-icon" onclick="printSingleCard('${p.id}')" title="Imprimir Cartão">
            🎴
          </button>
          <button class="btn btn-danger btn-icon" onclick="deleteParticipant('${p.id}')" title="Remover">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao listar participantes:', e);
  }
}

async function handleAddParticipant(event) {
  event.preventDefault();
  const nameInput = document.getElementById('participant-name');
  const name = nameInput.value;
  
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (res.ok) {
      nameInput.value = '';
      fetchParticipants();
      playCoinSound();
    } else {
      const err = await res.json();
      alert(err.error || 'Erro ao adicionar participante');
    }
  } catch (e) {
    console.error(e);
  }
}

async function deleteParticipant(id) {
  if (!confirm('Tem certeza que deseja remover este participante? Todos os pontos e histórico serão excluídos permanentemente.')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/participants/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      fetchParticipants();
    }
  } catch (e) {
    console.error(e);
  }
}

// ==========================================================================
// IMPRESSÃO DE CARTÕES
// ==========================================================================
async function printAllCards() {
  try {
    const res = await fetch('/api/participants');
    const list = await res.json();
    
    if (list.length === 0) {
      alert('Nenhum participante cadastrado para imprimir cartões.');
      return;
    }
    
    renderPrintArea(list);
    window.print();
  } catch (e) {
    console.error(e);
  }
}

async function printSingleCard(id) {
  try {
    const res = await fetch(`/api/participants/${id}`);
    if (!res.ok) throw new Error('Não encontrado');
    const participant = await res.json();
    
    renderPrintArea([participant]);
    window.print();
  } catch (e) {
    console.error(e);
  }
}

function renderPrintArea(participants) {
  const printArea = document.getElementById('print-area');
  printArea.innerHTML = '';
  
  participants.forEach(p => {
    // URL que o QR code vai ler
    const origin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : `http://${serverIp}:${serverPort}`;
    const cardUrl = `${origin}/card.html?id=${p.id}`;
    // URL da nossa API interna de QR Code
    const qrImageSrc = `/api/qr?text=${encodeURIComponent(cardUrl)}`;
    
    const cardEl = document.createElement('div');
    cardEl.className = 'printable-card-item';
    cardEl.innerHTML = `
      <div class="printable-card-header">
        <span class="printable-logo">📖 CARTÃO FIEL</span>
        <span class="printable-badge">Créditos Bíblicos</span>
      </div>
      <div class="printable-card-body">
        <img class="printable-qr-code" src="${qrImageSrc}" alt="QR Code">
        <div class="printable-info">
          <span class="printable-label">Participante</span>
          <span class="printable-name">${escapeHtml(p.name)}</span>
          <span class="printable-label" style="margin-top: 4px;">ID do Cartão</span>
          <span class="printable-id">${p.id}</span>
        </div>
      </div>
      <div class="printable-card-footer">
        Escaneie para consultar seu saldo de créditos
      </div>
    `;
    printArea.appendChild(cardEl);
  });
}

let modalActiveParticipantId = null;

// Editar nome do participante (CRUD - Update)
async function editParticipantName(id, currentName) {
  const newName = prompt('Editar nome do participante:', currentName);
  if (newName === null || newName.trim() === '' || newName.trim() === currentName) return;
  
  try {
    const res = await fetch(`/api/participants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });
    if (res.ok) {
      fetchParticipants();
    } else {
      const err = await res.json();
      alert(err.error || 'Erro ao atualizar nome');
    }
  } catch (e) {
    console.error(e);
  }
}

// ==========================================================================
// MODAL DE DETALHES / HISTÓRICO & CRUD DE PONTOS
// ==========================================================================
async function openHistoryModal(id) {
  try {
    modalActiveParticipantId = id;
    const res = await fetch(`/api/participants/${id}`);
    const p = await res.json();
    
    document.getElementById('modal-name').innerText = p.name;
    document.getElementById('modal-balance').innerText = `${p.credits} pts`;
    
    const historyList = document.getElementById('modal-history-list');
    if (p.history.length === 0) {
      historyList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          Nenhuma transação registrada ainda.
        </div>
      `;
    } else {
      historyList.innerHTML = p.history.map(h => {
        const sign = h.amount >= 0 ? '+' : '';
        const amtClass = h.amount >= 0 ? 'positive' : 'negative';
        const dateStr = new Date(h.date).toLocaleString('pt-BR');
        return `
          <div class="transaction-item" style="display: flex; justify-content: space-between; align-items: center;">
            <div class="tx-info" style="flex: 1; padding-right: 8px;">
              <span class="tx-desc">${escapeHtml(h.description)}</span>
              <span class="tx-date">${dateStr}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="tx-amount ${amtClass}">${sign}${h.amount}</span>
              <button class="btn btn-secondary btn-icon" style="padding: 0.25rem 0.4rem; font-size: 0.8rem;" onclick="editTransaction('${p.id}', '${h.id}', ${h.amount}, '${escapeHtml(h.description)}')" title="Editar Transação">✏️</button>
              <button class="btn btn-danger btn-icon" style="padding: 0.25rem 0.4rem; font-size: 0.8rem;" onclick="deleteTransaction('${p.id}', '${h.id}')" title="Excluir Transação">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    document.getElementById('history-modal').style.display = 'flex';
  } catch (e) {
    console.error(e);
  }
}

function closeHistoryModal() {
  document.getElementById('history-modal').style.display = 'none';
  modalActiveParticipantId = null;
}

// Ajustar saldo direto (CRUD de pontos)
async function promptSetBalance() {
  if (!modalActiveParticipantId) return;
  const newBalStr = prompt('Digite o novo saldo exato para este participante:');
  if (newBalStr === null) return;
  const newBal = parseInt(newBalStr);
  if (isNaN(newBal) || newBal < 0) {
    alert('Saldo inválido.');
    return;
  }
  const reason = prompt('Motivo do ajuste (opcional):') || `Ajuste manual para ${newBal} pts`;
  
  try {
    const res = await fetch(`/api/participants/${modalActiveParticipantId}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: newBal, description: reason })
    });
    if (res.ok) {
      openHistoryModal(modalActiveParticipantId);
      fetchParticipants();
      playCoinSound();
    }
  } catch (e) {
    console.error(e);
  }
}

// Zerar saldo do participante
async function resetParticipantBalance() {
  if (!modalActiveParticipantId) return;
  if (!confirm('Deseja realmente zerar todos os pontos deste participante?')) return;
  
  try {
    const res = await fetch(`/api/participants/${modalActiveParticipantId}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: 0, description: 'Saldo zerado pelo líder' })
    });
    if (res.ok) {
      openHistoryModal(modalActiveParticipantId);
      fetchParticipants();
    }
  } catch (e) {
    console.error(e);
  }
}

// Editar transação específica (CRUD de transação)
async function editTransaction(participantId, txId, currentAmount, currentDesc) {
  const newAmtStr = prompt('Nova quantidade de pontos (positivo ou negativo):', currentAmount);
  if (newAmtStr === null) return;
  const newAmt = parseInt(newAmtStr);
  if (isNaN(newAmt)) {
    alert('Quantidade inválida');
    return;
  }
  const newDesc = prompt('Novo motivo:', currentDesc);
  const finalDesc = (newDesc !== null && newDesc.trim() !== '') ? newDesc.trim() : currentDesc;
  
  try {
    const res = await fetch(`/api/participants/${participantId}/history/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newAmt, description: finalDesc })
    });
    if (res.ok) {
      openHistoryModal(participantId);
      fetchParticipants();
    }
  } catch (e) {
    console.error(e);
  }
}

// Deletar transação específica e recalcular pontos
async function deleteTransaction(participantId, txId) {
  if (!confirm('Deseja excluir esta transação do extrato e recalcular o saldo?')) return;
  try {
    const res = await fetch(`/api/participants/${participantId}/history/${txId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      openHistoryModal(participantId);
      fetchParticipants();
    }
  } catch (e) {
    console.error(e);
  }
}

// ==========================================================================
// LEITOR DE QR CODE / SCANNER
// ==========================================================================
function startScanner() {
  document.getElementById('btn-start-camera').style.display = 'none';
  document.getElementById('btn-stop-camera').style.display = 'inline-flex';
  
  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    },
    (decodedText, decodedResult) => {
      handleQrScanned(decodedText);
    },
    (errorMessage) => {
      // Falhas de frames silenciosas
    }
  ).catch(err => {
    console.error('Erro ao acessar câmera:', err);
    alert('Erro ao ligar câmera. Certifique-se de dar as permissões necessárias.');
    stopScanner();
  });
}

function stopScanner() {
  document.getElementById('btn-start-camera').style.display = 'inline-flex';
  document.getElementById('btn-stop-camera').style.display = 'none';
  
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      html5QrcodeScanner = null;
    }).catch(err => console.error(err));
  }
}

function handleQrScanned(text) {
  playBeepSound();
  
  try {
    // Tenta ler o ID da URL: card.html?id=pXYZ
    const url = new URL(text);
    const id = url.searchParams.get('id');
    
    if (id) {
      loadParticipantDetailsForScan(id);
    } else {
      alert('QR Code escaneado não contém um ID de participante válido.');
    }
  } catch (e) {
    // Se não for uma URL válida, assume que o texto escaneado seja o próprio ID
    if (text.startsWith('p') && text.length > 5) {
      loadParticipantDetailsForScan(text);
    } else {
      console.warn('Scan inválido:', text);
    }
  }
}

async function loadParticipantDetailsForScan(id) {
  try {
    const res = await fetch(`/api/participants/${id}`);
    if (!res.ok) {
      alert('Participante não cadastrado no sistema.');
      return;
    }
    const p = await res.json();
    
    activeParticipantId = p.id;
    
    // Atualizar interface de scan
    document.getElementById('scan-placeholder').style.display = 'none';
    document.getElementById('scan-details').style.display = 'flex';
    
    document.getElementById('scan-name').innerText = p.name;
    document.getElementById('scan-id').innerText = p.id;
    document.getElementById('scan-credits-balance').innerText = p.credits;
    
    // Renderizar histórico no painel do scan
    const historyDiv = document.getElementById('scan-history');
    if (p.history.length === 0) {
      historyDiv.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">Sem movimentações</div>`;
    } else {
      historyDiv.innerHTML = p.history.map(h => {
        const sign = h.amount >= 0 ? '+' : '';
        const amtClass = h.amount >= 0 ? 'positive' : 'negative';
        return `
          <div class="transaction-item" style="padding: 0.6rem; border-radius: 8px;">
            <div class="tx-info">
              <span class="tx-desc" style="font-size: 0.85rem;">${escapeHtml(h.description)}</span>
            </div>
            <span class="tx-amount ${amtClass}" style="font-size: 0.9rem;">${sign}${h.amount}</span>
          </div>
        `;
      }).join('');
    }
    
  } catch (e) {
    console.error(e);
  }
}

// Créditos rápidos (+5, +10, etc)
async function addCreditsDirectly(amount, description) {
  if (!activeParticipantId) return;
  await makeTransaction(activeParticipantId, amount, description);
}

// Transação manual formulário
async function handleManualTransaction(event) {
  event.preventDefault();
  if (!activeParticipantId) return;
  
  const amountInput = document.getElementById('tx-amount');
  const descInput = document.getElementById('tx-desc');
  
  const amount = parseInt(amountInput.value);
  const rawDesc = descInput.value.trim();
  const description = rawDesc !== '' ? rawDesc : (amount >= 0 ? 'Créditos adicionados' : 'Créditos retirados');
  
  if (isNaN(amount) || amount === 0) {
    alert('Insira uma quantidade de créditos válida (positiva ou negativa).');
    return;
  }
  
  const success = await makeTransaction(activeParticipantId, amount, description);
  if (success) {
    amountInput.value = '';
    descInput.value = '';
  }
}

async function makeTransaction(id, amount, description) {
  try {
    const res = await fetch(`/api/participants/${id}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description })
    });
    
    if (res.ok) {
      playCoinSound();
      // Recarregar painel do scan
      loadParticipantDetailsForScan(id);
      // Recarregar a lista geral caso o admin volte pra aba de participantes
      fetchParticipants();
      return true;
    } else {
      const err = await res.json();
      alert(err.error || 'Erro ao realizar transação');
      return false;
    }
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ==========================================================================
// EFEITOS SONOROS (WEB AUDIO API - OFFLINE FRIENDLY)
// ==========================================================================
function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // Hz
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.error('AudioContext fail', e);
  }
}

function playCoinSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    
    // Primeiro tom do som de moeda
    const osc1 = audioCtx.createOscillator();
    osc1.connect(gain);
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.08);
    
    // Segundo tom
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      osc2.connect(gain);
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.25);
    }, 85);
  } catch (e) {
    console.error('AudioContext fail', e);
  }
}

// ==========================================================================
// UTILITÁRIOS
// ==========================================================================
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
