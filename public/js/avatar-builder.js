// ==========================================================================
// AVATAR BUILDER v2 - Sistema Redesenhado de Avatares SVG Polidos
// ==========================================================================

const AvatarBuilder = (() => {

  const state = {
    skinColor: '#F4C28F',
    faceShape: 'round',
    hairColor: '#3D2314',
    hairStyle: 'short',
    eyeStyle: 'normal',
    glasses: 'none',
    hat: 'none',
    facialHair: 'none',
    accessory: 'none',
    bgColor: '#46178f'
  };

  // --- CORES ---
  const skinColors = [
    '#FDEBD0', '#F5CBA7', '#F4C28F', '#E0AC69',
    '#C68642', '#8D5524', '#6B3A2A', '#4A2511'
  ];

  const hairColors = [
    '#090806', '#2C222B', '#3D2314', '#71635A',
    '#B7A69E', '#D6C4C2', '#DEBC99', '#B55239',
    '#8D4A43', '#A56B46', '#B89778', '#DCD0BA',
    '#E6CEB8', '#E5C8A8', '#FF6B6B', '#FFD93D',
    '#6BCB77', '#4D96FF', '#9B59B6', '#FF69B4'
  ];

  const bgColors = [
    '#46178f', '#E21B3C', '#1368CE', '#D89E00', '#26890C',
    '#8E44AD', '#E74C3C', '#3498DB', '#F39C12', '#27AE60',
    '#1ABC9C', '#E91E63', '#9C27B0', '#2196F3', '#FF9800',
    '#00BCD4', '#FF5722', '#607D8B', '#795548', '#000000'
  ];

  const faceShapes = [
    { id: 'round', label: 'Redondo', emoji: '😊' },
    { id: 'oval', label: 'Oval', emoji: '🙂' },
    { id: 'square', label: 'Quadrado', emoji: '😐' }
  ];

  const hairStyles = [
    { id: 'none', label: 'Careca', emoji: '👶' },
    { id: 'short', label: 'Curto', emoji: '👦' },
    { id: 'medium', label: 'Médio', emoji: '🧑' },
    { id: 'long', label: 'Longo', emoji: '👩' },
    { id: 'curly', label: 'Cacheado', emoji: '🎈' },
    { id: 'mohawk', label: 'Moicano', emoji: '🦔' },
    { id: 'ponytail', label: 'Rabo', emoji: '🎀' },
    { id: 'braids', label: 'Tranças', emoji: '🎀' },
    { id: 'afro', label: 'Afro', emoji: '☁️' },
    { id: 'bangs', label: 'Méca', emoji: '💇' }
  ];

  const eyeStyles = [
    { id: 'normal', label: 'Normal', emoji: '👀' },
    { id: 'wide', label: 'Abertos', emoji: '😮' },
    { id: 'sleepy', label: 'Sonolento', emoji: '😴' },
    { id: 'wink', label: 'Piscando', emoji: '😉' },
    { id: 'hearts', label: 'Corações', emoji: '😍' },
    { id: 'star', label: 'Estrelas', emoji: '🤩' },
    { id: 'angry', label: 'Bravo', emoji: '😠' },
    { id: 'cool', label: 'Legal', emoji: '😎' }
  ];

  const glassesOptions = [
    { id: 'none', label: 'Nenhum', emoji: '❌' },
    { id: 'round', label: 'Redondos', emoji: '👓' },
    { id: 'square', label: 'Quadrados', emoji: '🕶️' },
    { id: 'sunglasses', label: 'Sol', emoji: '😎' },
    { id: 'heart', label: 'Coração', emoji: '💗' },
    { id: 'monocle', label: 'Monóculo', emoji: '🧐' },
    { id: 'vr', label: 'VR', emoji: '🥽' },
    { id: 'swim', label: 'Natação', emoji: '🥽' }
  ];

  const hatOptions = [
    { id: 'none', label: 'Nenhum', emoji: '❌' },
    { id: 'cap', label: 'Boné', emoji: '🧢' },
    { id: 'tophat', label: 'Cartola', emoji: '🎩' },
    { id: 'crown', label: 'Coroa', emoji: '👑' },
    { id: 'beanie', label: 'Gorro', emoji: '🧶' },
    { id: 'party', label: 'Festa', emoji: '🎉' },
    { id: 'witch', label: 'Bruxa', emoji: '🧙' },
    { id: 'viking', label: 'Viking', emoji: '⛑️' },
    { id: 'police', label: 'Polícia', emoji: '👮' },
    { id: 'chef', label: 'Chef', emoji: '👨‍🍳' },
    { id: 'straw', label: 'Palha', emoji: '🌾' },
    { id: 'halo', label: 'Anjo', emoji: '😇' }
  ];

  const facialHairOptions = [
    { id: 'none', label: 'Nenhum', emoji: '❌' },
    { id: 'stache', label: 'Bigode', emoji: '🥸' },
    { id: 'beard', label: 'Barba', emoji: '🧔' },
    { id: 'goatee', label: 'Cavanhaque', emoji: '👤' },
    { id: 'stache-curl', label: 'Bigode Enrolado', emoji: '🤌' }
  ];

  const accessoryOptions = [
    { id: 'none', label: 'Nenhum', emoji: '❌' },
    { id: 'earring', label: 'Brinco', emoji: '💍' },
    { id: 'bandana', label: 'Bandana', emoji: '🏴' },
    { id: 'headband', label: 'Touca', emoji: '💪' },
    { id: 'flower', label: 'Flor', emoji: '🌸' },
    { id: 'scar', label: 'Cicatriz', emoji: '⚡' },
    { id: 'freckles', label: 'Sardas', emoji: '✨' },
    { id: 'blush', label: 'Rubor', emoji: '😊' }
  ];

  // --- UTILITÁRIOS ---
  function darken(hex, amt) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = Math.max((num >> 16) - amt, 0);
    let g = Math.max((num >> 8 & 0xff) - amt, 0);
    let b = Math.max((num & 0xff) - amt, 0);
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  function lighten(hex, amt) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = Math.min((num >> 16) + amt, 255);
    let g = Math.min((num >> 8 & 0xff) + amt, 255);
    let b = Math.min((num & 0xff) + amt, 255);
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  // --- FUNÇÕES DE DESENHO SVG REDESENHADAS ---
  function drawBackground() {
    return `<rect width="200" height="200" rx="16" fill="${state.bgColor}"/>`;
  }

  function drawEars() {
    const c = state.skinColor;
    const s = darken(c, 20);
    return `
      <ellipse cx="36" cy="105" rx="7" ry="10" fill="${c}" stroke="${s}" stroke-width="1.2"/>
      <ellipse cx="164" cy="105" rx="7" ry="10" fill="${c}" stroke="${s}" stroke-width="1.2"/>
    `;
  }

  function drawFace() {
    const c = state.skinColor;
    const s = darken(c, 20);
    const h = lighten(c, 15);

    switch (state.faceShape) {
      case 'oval':
        return `
          <ellipse cx="100" cy="108" rx="54" ry="64" fill="${c}" stroke="${s}" stroke-width="1.5"/>
          <ellipse cx="100" cy="125" rx="20" ry="8" fill="${h}" opacity="0.3"/>
        `;
      case 'square':
        return `
          <rect x="46" y="46" width="108" height="120" rx="22" fill="${c}" stroke="${s}" stroke-width="1.5"/>
          <ellipse cx="100" cy="130" rx="22" ry="8" fill="${h}" opacity="0.3"/>
        `;
      default: // round
        return `
          <circle cx="100" cy="108" r="58" fill="${c}" stroke="${s}" stroke-width="1.5"/>
          <ellipse cx="100" cy="125" rx="18" ry="7" fill="${h}" opacity="0.25"/>
        `;
    }
  }

  function drawHairBack() {
    const c = state.hairColor;
    if (state.hairStyle === 'none') return '';

    switch (state.hairStyle) {
      case 'long':
        return `
          <path d="M38 95 Q35 135 40 180 L52 178 Q48 135 46 100 Z" fill="${c}" opacity="0.9"/>
          <path d="M162 95 Q165 135 160 180 L148 178 Q152 135 154 100 Z" fill="${c}" opacity="0.9"/>
        `;
      case 'afro':
        return `<circle cx="100" cy="80" r="68" fill="${c}" opacity="0.7"/>`;
      default:
        return '';
    }
  }

  function drawHairFront() {
    const c = state.hairColor;
    const cs = darken(c, 15);
    if (state.hairStyle === 'none') return '';

    switch (state.hairStyle) {
      case 'short':
        return `
          <path d="M46 100 Q46 48 100 42 Q154 48 154 100 L154 82 Q154 36 100 30 Q46 36 46 82 Z" fill="${c}"/>
          <path d="M50 78 Q60 52 100 48 Q140 52 150 78 Q145 65 100 60 Q55 65 50 78 Z" fill="${cs}" opacity="0.4"/>
        `;
      case 'medium':
        return `
          <path d="M40 105 Q40 40 100 34 Q160 40 160 105 L160 85 Q160 28 100 22 Q40 28 40 85 Z" fill="${c}"/>
          <path d="M40 95 Q36 128 42 155 L54 152 Q50 125 46 100 Z" fill="${c}" opacity="0.85"/>
          <path d="M160 95 Q164 128 158 155 L146 152 Q150 125 154 100 Z" fill="${c}" opacity="0.85"/>
        `;
      case 'long':
        return `
          <path d="M38 100 Q38 38 100 32 Q162 38 162 100 L162 82 Q162 26 100 20 Q38 26 38 82 Z" fill="${c}"/>
          <path d="M44 72 Q56 54 100 50 Q144 54 156 72 Q148 62 100 56 Q52 62 44 72 Z" fill="${cs}" opacity="0.35"/>
        `;
      case 'curly':
        return `
          <circle cx="62" cy="52" r="20" fill="${c}"/><circle cx="100" cy="42" r="22" fill="${c}"/>
          <circle cx="138" cy="52" r="20" fill="${c}"/><circle cx="48" cy="72" r="16" fill="${c}"/>
          <circle cx="152" cy="72" r="16" fill="${c}"/><circle cx="52" cy="94" r="14" fill="${c}"/>
          <circle cx="148" cy="94" r="14" fill="${c}"/>
          <circle cx="100" cy="36" r="18" fill="${cs}" opacity="0.3"/>
        `;
      case 'mohawk':
        return `
          <path d="M90 48 Q92 4 100 2 Q108 4 110 48" fill="${c}" stroke="${cs}" stroke-width="1.5"/>
          <path d="M92 40 Q100 8 108 40" fill="${cs}" opacity="0.3"/>
        `;
      case 'ponytail':
        return `
          <path d="M46 100 Q46 48 100 42 Q154 48 154 100 L154 82 Q154 36 100 30 Q46 36 46 82 Z" fill="${c}"/>
          <ellipse cx="100" cy="34" rx="16" ry="10" fill="${c}"/>
          <path d="M100 34 Q132 28 136 78 Q138 98 126 118" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"/>
          <path d="M100 34 Q128 30 132 72 Q134 90 124 110" fill="none" stroke="${cs}" stroke-width="4" stroke-linecap="round" opacity="0.3"/>
        `;
      case 'braids':
        return `
          <path d="M46 100 Q46 48 100 42 Q154 48 154 100 L154 82 Q154 36 100 30 Q46 36 46 82 Z" fill="${c}"/>
          <path d="M54 92 Q50 128 56 168" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
          <path d="M146 92 Q150 128 144 168" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
          <circle cx="56" cy="168" r="5" fill="${c}"/><circle cx="144" cy="168" r="5" fill="${c}"/>
        `;
      case 'afro':
        return `<circle cx="100" cy="76" r="66" fill="${c}"/>`;
      case 'bangs':
        return `
          <path d="M46 100 Q46 48 100 42 Q154 48 154 100 L154 82 Q154 36 100 30 Q46 36 46 82 Z" fill="${c}"/>
          <path d="M52 68 Q62 52 84 60 Q68 72 56 82 Z" fill="${c}"/>
          <path d="M148 68 Q138 52 116 60 Q132 72 144 82 Z" fill="${c}"/>
          <path d="M56 64 Q66 56 80 62 Q70 70 58 78 Z" fill="${cs}" opacity="0.3"/>
        `;
      default:
        return '';
    }
  }

  function drawEyes() {
    const y = 98;

    switch (state.eyeStyle) {
      case 'wide':
        return `
          <ellipse cx="78" cy="${y}" rx="11" ry="12" fill="white" stroke="#333" stroke-width="1.2"/>
          <ellipse cx="122" cy="${y}" rx="11" ry="12" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="78" cy="${y + 1}" r="5.5" fill="#3D2314"/>
          <circle cx="122" cy="${y + 1}" r="5.5" fill="#3D2314"/>
          <circle cx="80" cy="${y - 2}" r="2" fill="white"/>
          <circle cx="124" cy="${y - 2}" r="2" fill="white"/>
        `;
      case 'sleepy':
        return `
          <ellipse cx="78" cy="${y + 3}" rx="10" ry="5" fill="white" stroke="#333" stroke-width="1.2"/>
          <ellipse cx="122" cy="${y + 3}" rx="10" ry="5" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="78" cy="${y + 3}" r="4.5" fill="#3D2314"/>
          <circle cx="122" cy="${y + 3}" r="4.5" fill="#3D2314"/>
          <line x1="66" y1="${y - 4}" x2="90" y2="${y - 6}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
          <line x1="110" y1="${y - 6}" x2="134" y2="${y - 4}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
        `;
      case 'wink':
        return `
          <circle cx="78" cy="${y}" r="9" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="78" cy="${y}" r="5" fill="#3D2314"/>
          <circle cx="80" cy="${y - 2}" r="1.8" fill="white"/>
          <path d="M112 ${y + 1} Q122 ${y - 6} 132 ${y + 1}" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
        `;
      case 'hearts':
        return `
          <text x="78" y="${y + 7}" text-anchor="middle" font-size="22" fill="#E74C3C">❤</text>
          <text x="122" y="${y + 7}" text-anchor="middle" font-size="22" fill="#E74C3C">❤</text>
        `;
      case 'star':
        return `
          <text x="78" y="${y + 8}" text-anchor="middle" font-size="20" fill="#FFD700">★</text>
          <text x="122" y="${y + 8}" text-anchor="middle" font-size="20" fill="#FFD700">★</text>
        `;
      case 'angry':
        return `
          <circle cx="78" cy="${y}" r="9" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="122" cy="${y}" r="9" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="78" cy="${y + 1}" r="5" fill="#3D2314"/>
          <circle cx="122" cy="${y + 1}" r="5" fill="#3D2314"/>
          <circle cx="80" cy="${y - 1}" r="1.5" fill="white"/>
          <circle cx="124" cy="${y - 1}" r="1.5" fill="white"/>
          <line x1="66" y1="${y - 14}" x2="88" y2="${y - 10}" stroke="#333" stroke-width="3" stroke-linecap="round"/>
          <line x1="134" y1="${y - 14}" x2="112" y2="${y - 10}" stroke="#333" stroke-width="3" stroke-linecap="round"/>
        `;
      case 'cool':
        return `
          <rect x="58" y="${y - 12}" width="42" height="24" rx="5" fill="#1a1a1a" stroke="#333" stroke-width="1.5"/>
          <rect x="100" y="${y - 12}" width="42" height="24" rx="5" fill="#1a1a1a" stroke="#333" stroke-width="1.5"/>
          <line x1="100" y1="${y}" x2="100" y2="${y}" stroke="#333" stroke-width="3"/>
          <rect x="62" y="${y - 8}" width="14" height="5" rx="2" fill="rgba(255,255,255,0.2)"/>
          <rect x="104" y="${y - 8}" width="14" height="5" rx="2" fill="rgba(255,255,255,0.2)"/>
        `;
      default: // normal
        return `
          <circle cx="78" cy="${y}" r="9" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="122" cy="${y}" r="9" fill="white" stroke="#333" stroke-width="1.2"/>
          <circle cx="80" cy="${y}" r="5" fill="#3D2314"/>
          <circle cx="124" cy="${y}" r="5" fill="#3D2314"/>
          <circle cx="82" cy="${y - 2}" r="1.8" fill="white"/>
          <circle cx="126" cy="${y - 2}" r="1.8" fill="white"/>
        `;
    }
  }

  function drawNose() {
    const c = darken(state.skinColor, 25);
    return `<path d="M96 110 Q100 116 104 110" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  }

  function drawMouth() {
    if (state.eyeStyle === 'angry') {
      return `<path d="M86 134 Q100 128 114 134" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    return `<path d="M86 132 Q100 146 114 132" fill="#E74C3C" stroke="#333" stroke-width="1.5"/>`;
  }

  function drawGlasses() {
    const y = 98;
    switch (state.glasses) {
      case 'round':
        return `
          <circle cx="78" cy="${y}" r="18" fill="none" stroke="#333" stroke-width="2.5"/>
          <circle cx="122" cy="${y}" r="18" fill="none" stroke="#333" stroke-width="2.5"/>
          <line x1="96" y1="${y}" x2="104" y2="${y}" stroke="#333" stroke-width="2.5"/>
          <line x1="60" y1="${y - 4}" x2="48" y2="${y - 8}" stroke="#333" stroke-width="2.5"/>
          <line x1="140" y1="${y - 4}" x2="152" y2="${y - 8}" stroke="#333" stroke-width="2.5"/>
        `;
      case 'square':
        return `
          <rect x="58" y="${y - 13}" width="40" height="26" rx="4" fill="none" stroke="#333" stroke-width="2.5"/>
          <rect x="102" y="${y - 13}" width="40" height="26" rx="4" fill="none" stroke="#333" stroke-width="2.5"/>
          <line x1="98" y1="${y}" x2="102" y2="${y}" stroke="#333" stroke-width="2.5"/>
          <line x1="58" y1="${y - 4}" x2="46" y2="${y - 8}" stroke="#333" stroke-width="2.5"/>
          <line x1="142" y1="${y - 4}" x2="154" y2="${y - 8}" stroke="#333" stroke-width="2.5"/>
        `;
      case 'sunglasses':
        return `
          <rect x="56" y="${y - 14}" width="44" height="28" rx="6" fill="#1a1a1a" stroke="#333" stroke-width="1.5"/>
          <rect x="100" y="${y - 14}" width="44" height="28" rx="6" fill="#1a1a1a" stroke="#333" stroke-width="1.5"/>
          <line x1="100" y1="${y}" x2="100" y2="${y}" stroke="#333" stroke-width="2.5"/>
          <line x1="56" y1="${y - 4}" x2="44" y2="${y - 8}" stroke="#333" stroke-width="2.5"/>
          <line x1="144" y1="${y - 4}" x2="156" y2="${y - 8}" stroke="#333" stroke-width="2.5"/>
          <rect x="60" y="${y - 10}" width="16" height="5" rx="2" fill="rgba(255,255,255,0.15)"/>
          <rect x="104" y="${y - 10}" width="16" height="5" rx="2" fill="rgba(255,255,255,0.15)"/>
        `;
      case 'heart':
        return `
          <text x="78" y="${y + 7}" text-anchor="middle" font-size="30" fill="#E91E63">♥</text>
          <text x="122" y="${y + 7}" text-anchor="middle" font-size="30" fill="#E91E63">♥</text>
        `;
      case 'monocle':
        return `
          <circle cx="122" cy="${y}" r="18" fill="none" stroke="#B8860B" stroke-width="2.5"/>
          <line x1="140" y1="${y + 4}" x2="148" y2="${y + 38}" stroke="#B8860B" stroke-width="1.5"/>
        `;
      case 'vr':
        return `
          <rect x="52" y="${y - 14}" width="48" height="28" rx="6" fill="#222" stroke="#00e5ff" stroke-width="1.5"/>
          <rect x="100" y="${y - 14}" width="48" height="28" rx="6" fill="#222" stroke="#00e5ff" stroke-width="1.5"/>
          <line x1="100" y1="${y}" x2="100" y2="${y}" stroke="#00e5ff" stroke-width="2"/>
          <circle cx="76" cy="${y}" r="6" fill="#00e5ff" opacity="0.2"/>
          <circle cx="124" cy="${y}" r="6" fill="#00e5ff" opacity="0.2"/>
        `;
      case 'swim':
        return `
          <ellipse cx="78" cy="${y}" rx="20" ry="14" fill="rgba(0,150,255,0.25)" stroke="#0066cc" stroke-width="2.5"/>
          <ellipse cx="122" cy="${y}" rx="20" ry="14" fill="rgba(0,150,255,0.25)" stroke="#0066cc" stroke-width="2.5"/>
          <line x1="98" y1="${y}" x2="102" y2="${y}" stroke="#0066cc" stroke-width="3.5"/>
        `;
      default:
        return '';
    }
  }

  function drawHat() {
    switch (state.hat) {
      case 'cap':
        return `
          <path d="M42 74 Q42 38 100 32 Q158 38 158 74 L154 70 Q154 44 100 40 Q46 44 46 70 Z" fill="#E74C3C"/>
          <rect x="32" y="70" width="136" height="10" rx="5" fill="#C0392B"/>
          <path d="M32 75 Q22 73 18 78 Q20 82 32 78 Z" fill="#C0392B"/>
        `;
      case 'tophat':
        return `
          <rect x="58" y="18" width="84" height="50" rx="4" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <ellipse cx="100" cy="66" rx="56" ry="9" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <rect x="62" y="54" width="76" height="7" rx="2" fill="#8B4513"/>
        `;
      case 'crown':
        return `
          <path d="M52 72 L56 34 L74 52 L100 22 L126 52 L144 34 L148 72 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/>
          <circle cx="74" cy="50" r="3.5" fill="#E74C3C"/>
          <circle cx="100" cy="36" r="3.5" fill="#3498DB"/>
          <circle cx="126" cy="50" r="3.5" fill="#27AE60"/>
        `;
      case 'beanie':
        return `
          <path d="M44 76 Q44 38 100 30 Q156 38 156 76" fill="#9B59B6" stroke="#8E44AD" stroke-width="1.5"/>
          <rect x="44" y="70" width="112" height="10" rx="5" fill="#8E44AD"/>
          <circle cx="100" cy="30" r="7" fill="#F1C40F"/>
        `;
      case 'party':
        return `
          <path d="M72 74 L100 12 L128 74 Z" fill="#E91E63" stroke="#C2185B" stroke-width="1.5"/>
          <circle cx="100" cy="12" r="7" fill="#FFEB3B"/>
          <circle cx="82" cy="52" r="3.5" fill="#FFEB3B"/>
          <circle cx="114" cy="46" r="3" fill="#4CAF50"/>
          <circle cx="96" cy="38" r="3" fill="#2196F3"/>
        `;
      case 'witch':
        return `
          <path d="M62 76 L100 2 L138 76 Z" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <ellipse cx="100" cy="76" rx="46" ry="7" fill="#1a1a1a"/>
          <ellipse cx="100" cy="72" rx="36" ry="5" fill="#8B4513"/>
        `;
      case 'viking':
        return `
          <path d="M56 74 Q56 42 100 36 Q144 42 144 74" fill="#8B4513" stroke="#5D4037" stroke-width="1.5"/>
          <path d="M56 56 Q38 42 34 60 Q38 68 56 64" fill="#B0BEC5" stroke="#78909C" stroke-width="1"/>
          <path d="M144 56 Q162 42 166 60 Q162 68 144 64" fill="#B0BEC5" stroke="#78909C" stroke-width="1"/>
        `;
      case 'police':
        return `
          <rect x="56" y="52" width="88" height="20" rx="3" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>
          <path d="M52 54 Q52 38 100 32 Q148 38 148 54" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>
          <rect x="86" y="44" width="28" height="12" rx="3" fill="#FFD700" stroke="#B8860B" stroke-width="0.8"/>
        `;
      case 'chef':
        return `
          <ellipse cx="100" cy="48" rx="42" ry="32" fill="white" stroke="#ddd" stroke-width="1"/>
          <ellipse cx="100" cy="66" rx="52" ry="9" fill="white" stroke="#ddd" stroke-width="1"/>
        `;
      case 'straw':
        return `
          <ellipse cx="100" cy="70" rx="62" ry="9" fill="#F4D03F" stroke="#D4AC0D" stroke-width="1.5"/>
          <path d="M52 72 Q52 42 100 36 Q148 42 148 72" fill="#F4D03F" stroke="#D4AC0D" stroke-width="1.5"/>
          <rect x="92" y="26" width="16" height="7" rx="3.5" fill="#E74C3C"/>
        `;
      case 'halo':
        return `
          <ellipse cx="100" cy="32" rx="36" ry="8" fill="none" stroke="#FFD700" stroke-width="3.5"/>
          <ellipse cx="100" cy="32" rx="36" ry="8" fill="none" stroke="rgba(255,215,0,0.3)" stroke-width="7"/>
        `;
      default:
        return '';
    }
  }

  function drawFacialHair() {
    const y = 128;
    const c = state.hairColor;
    switch (state.facialHair) {
      case 'stache':
        return `
          <path d="M86 ${y} Q93 ${y - 5} 100 ${y} Q107 ${y - 5} 114 ${y} Q111 ${y + 5} 100 ${y + 7} Q89 ${y + 5} 86 ${y}" fill="${c}"/>
        `;
      case 'beard':
        return `
          <path d="M84 ${y} Q92 ${y - 5} 100 ${y} Q108 ${y - 5} 116 ${y} Q122 ${y + 14} 100 ${y + 24} Q78 ${y + 14} 84 ${y}" fill="${c}"/>
        `;
      case 'goatee':
        return `
          <path d="M90 ${y + 4} Q100 ${y} 110 ${y + 4} Q108 ${y + 14} 100 ${y + 16} Q92 ${y + 14} 90 ${y + 4}" fill="${c}"/>
        `;
      case 'stache-curl':
        return `
          <path d="M84 ${y} Q92 ${y - 8} 100 ${y} Q108 ${y - 8} 116 ${y}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="84" cy="${y + 2}" r="2.5" fill="${c}"/>
          <circle cx="116" cy="${y + 2}" r="2.5" fill="${c}"/>
        `;
      default:
        return '';
    }
  }

  function drawAccessory() {
    switch (state.accessory) {
      case 'earring':
        return `
          <circle cx="38" cy="116" r="4" fill="#FFD700" stroke="#B8860B" stroke-width="0.8"/>
          <circle cx="38" cy="124" r="2.5" fill="#FFD700"/>
        `;
      case 'bandana':
        return `
          <path d="M42 76 Q42 62 100 56 Q158 62 158 76" fill="#E74C3C" stroke="#C0392B" stroke-width="1"/>
          <path d="M42 76 Q38 84 44 88" fill="#E74C3C"/>
          <path d="M158 76 Q162 84 156 88" fill="#E74C3C"/>
        `;
      case 'headband':
        return `
          <path d="M44 80 Q44 64 100 58 Q156 64 156 80" fill="#FF6B6B" stroke="#E74C3C" stroke-width="1.5"/>
        `;
      case 'flower':
        return `
          <circle cx="154" cy="74" r="5.5" fill="#FF69B4"/>
          <circle cx="148" cy="68" r="4.5" fill="#FF69B4"/>
          <circle cx="160" cy="68" r="4.5" fill="#FF69B4"/>
          <circle cx="148" cy="80" r="4.5" fill="#FF69B4"/>
          <circle cx="160" cy="80" r="4.5" fill="#FF69B4"/>
          <circle cx="154" cy="74" r="3.5" fill="#FFD700"/>
        `;
      case 'scar':
        return `
          <path d="M118 90 L126 104 L118 114" fill="none" stroke="#C0392B" stroke-width="2.2" stroke-linecap="round"/>
        `;
      case 'freckles':
        return `
          <circle cx="72" cy="114" r="1.8" fill="#C68642"/><circle cx="78" cy="117" r="1.8" fill="#C68642"/>
          <circle cx="68" cy="117" r="1.8" fill="#C68642"/>
          <circle cx="122" cy="114" r="1.8" fill="#C68642"/><circle cx="128" cy="117" r="1.8" fill="#C68642"/>
          <circle cx="132" cy="114" r="1.8" fill="#C68642"/>
        `;
      case 'blush':
        return `
          <ellipse cx="70" cy="118" rx="11" ry="5" fill="rgba(255,105,180,0.3)"/>
          <ellipse cx="130" cy="118" rx="11" ry="5" fill="rgba(255,105,180,0.3)"/>
        `;
      default:
        return '';
    }
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  function render(svgElement) {
    if (!svgElement) return;

    const isLongOrAfro = state.hairStyle === 'long' || state.hairStyle === 'afro';
    const isNotLongOrAfro = !isLongOrAfro;

    const layers = [
      drawBackground(),
      drawEars(),
      isLongOrAfro ? drawHairBack() : '',
      drawFace(),
      isNotLongOrAfro ? drawHairFront() : (isLongOrAfro ? drawHairFront() : ''),
      drawEyes(),
      drawNose(),
      drawMouth(),
      drawGlasses(),
      drawHat(),
      drawFacialHair(),
      drawAccessory()
    ].join('');

    svgElement.innerHTML = layers;
  }

  function renderAvatarString() {
    const isLongOrAfro = state.hairStyle === 'long' || state.hairStyle === 'afro';

    const layers = [
      drawBackground(),
      drawEars(),
      isLongOrAfro ? drawHairBack() : '',
      drawFace(),
      isLongOrAfro ? drawHairFront() : drawHairFront(),
      drawEyes(),
      drawNose(),
      drawMouth(),
      drawGlasses(),
      drawHat(),
      drawFacialHair(),
      drawAccessory()
    ].join('');

    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${layers}</svg>`;
  }

  // --- INICIALIZAÇÃO DA UI ---
  function initOptions() {
    const skinContainer = document.getElementById('skin-colors');
    if (skinContainer) {
      skinContainer.innerHTML = skinColors.map(c =>
        `<div class="color-swatch ${c === state.skinColor ? 'selected' : ''}"
              style="background: ${c}; color: ${c};"
              onclick="AvatarBuilder.setSkinColor('${c}', this)"></div>`
      ).join('');
    }

    const faceContainer = document.getElementById('face-options');
    if (faceContainer) {
      faceContainer.innerHTML = faceShapes.map(f =>
        `<button class="option-btn ${f.id === state.faceShape ? 'selected' : ''}"
                 onclick="AvatarBuilder.setFace('${f.id}', this)" title="${f.label}">${f.emoji}</button>`
      ).join('');
    }

    const hairColorContainer = document.getElementById('hair-colors');
    if (hairColorContainer) {
      hairColorContainer.innerHTML = hairColors.map(c =>
        `<div class="color-swatch ${c === state.hairColor ? 'selected' : ''}"
              style="background: ${c}; color: ${c};"
              onclick="AvatarBuilder.setHairColor('${c}', this)"></div>`
      ).join('');
    }

    const hairContainer = document.getElementById('hair-options');
    if (hairContainer) {
      hairContainer.innerHTML = hairStyles.map(h =>
        `<button class="option-btn ${h.id === state.hairStyle ? 'selected' : ''}"
                 onclick="AvatarBuilder.setHair('${h.id}', this)" title="${h.label}">${h.emoji}</button>`
      ).join('');
    }

    const eyeContainer = document.getElementById('eye-options');
    if (eyeContainer) {
      eyeContainer.innerHTML = eyeStyles.map(e =>
        `<button class="option-btn ${e.id === state.eyeStyle ? 'selected' : ''}"
                 onclick="AvatarBuilder.setEyes('${e.id}', this)" title="${e.label}">${e.emoji}</button>`
      ).join('');
    }

    const glassesContainer = document.getElementById('glasses-options');
    if (glassesContainer) {
      glassesContainer.innerHTML = glassesOptions.map(g =>
        `<button class="option-btn ${g.id === state.glasses ? 'selected' : ''}"
                 onclick="AvatarBuilder.setGlasses('${g.id}', this)" title="${g.label}">${g.emoji}</button>`
      ).join('');
    }

    const hatContainer = document.getElementById('hat-options');
    if (hatContainer) {
      hatContainer.innerHTML = hatOptions.map(h =>
        `<button class="option-btn ${h.id === state.hat ? 'selected' : ''}"
                 onclick="AvatarBuilder.setHat('${h.id}', this)" title="${h.label}">${h.emoji}</button>`
      ).join('');
    }

    const facialContainer = document.getElementById('facial-options');
    if (facialContainer) {
      facialContainer.innerHTML = facialHairOptions.map(f =>
        `<button class="option-btn ${f.id === state.facialHair ? 'selected' : ''}"
                 onclick="AvatarBuilder.setFacial('${f.id}', this)" title="${f.label}">${f.emoji}</button>`
      ).join('');
    }

    const accContainer = document.getElementById('accessory-options');
    if (accContainer) {
      accContainer.innerHTML = accessoryOptions.map(a =>
        `<button class="option-btn ${a.id === state.accessory ? 'selected' : ''}"
                 onclick="AvatarBuilder.setAccessory('${a.id}', this)" title="${a.label}">${a.emoji}</button>`
      ).join('');
    }

    const bgContainer = document.getElementById('bg-colors');
    if (bgContainer) {
      bgContainer.innerHTML = bgColors.map(c =>
        `<div class="color-swatch ${c === state.bgColor ? 'selected' : ''}"
              style="background: ${c}; color: ${c};"
              onclick="AvatarBuilder.setBgColor('${c}', this)"></div>`
      ).join('');
    }
  }

  // --- SETTERS ---
  function setSkinColor(color, el) { state.skinColor = color; updateSelection('skin-colors', el); refreshAll(); }
  function setFace(id, el) { state.faceShape = id; updateSelection('face-options', el); refreshAll(); }
  function setHairColor(color, el) { state.hairColor = color; updateSelection('hair-colors', el); refreshAll(); }
  function setHair(id, el) { state.hairStyle = id; updateSelection('hair-options', el); refreshAll(); }
  function setEyes(id, el) { state.eyeStyle = id; updateSelection('eye-options', el); refreshAll(); }
  function setGlasses(id, el) { state.glasses = id; updateSelection('glasses-options', el); refreshAll(); }
  function setHat(id, el) { state.hat = id; updateSelection('hat-options', el); refreshAll(); }
  function setFacial(id, el) { state.facialHair = id; updateSelection('facial-options', el); refreshAll(); }
  function setAccessory(id, el) { state.accessory = id; updateSelection('accessory-options', el); refreshAll(); }
  function setBgColor(color, el) { state.bgColor = color; updateSelection('bg-colors', el); refreshAll(); }

  function updateSelection(containerId, el) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
    if (el) el.classList.add('selected');
  }

  function refreshAll() {
    render(document.getElementById('avatar-preview-svg'));
    render(document.getElementById('login-avatar-svg'));
    render(document.getElementById('lobby-avatar-svg'));
  }

  function getState() { return { ...state }; }

  function setState(newState) {
    Object.assign(state, newState);
    refreshAll();
  }

  function getAvatarDataUrl(callback) {
    const svgStr = renderAvatarString();
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 200, 200);
      URL.revokeObjectURL(url);
      callback(canvas.toDataURL('image/png'));
    };
    img.src = url;
  }

  return {
    initOptions, render, getState, setState, getAvatarDataUrl, renderAvatarString,
    setSkinColor, setFace, setHairColor, setHair, setEyes, setGlasses,
    setHat, setFacial, setAccessory, setBgColor
  };
})();
