// ✨ Fairytopia Greenhouse Library — app.js ✨

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── Constants ───────────────────────────────────────
const BOOKS_PER_ROW  = 8;
const ROWS_PER_UNIT  = 4;
const BOOKS_PER_UNIT = BOOKS_PER_ROW * ROWS_PER_UNIT; // 32
const INITIAL_UNITS  = 3;

const PLANT_SETS = [
  '🌿 🪴 🌱', '🍃 🌿 🌺', '🪴 🌱 🌿', '🌺 🌸 🌿',
  '🍃 🪴 🌸', '🌱 🌿 🍀',
];
const UNIT_NAMES = [
  'Bookcase I', 'Bookcase II', 'Bookcase III', 'Bookcase IV',
  'Bookcase V', 'Bookcase VI', 'Bookcase VII', 'Bookcase VIII',
];

// ─── Book color palette (rich library colors) ────────
const BOOK_PALETTE = [
  '#7B2D38','#2D527B','#2D7B3F','#7B5C2D','#4A2D7B',
  '#7B2D5C','#2D3F7B','#4A7B2D','#7B3F2D','#2D7B7B',
  '#622D7B','#7B622D','#2D7B62','#7B2D62','#3F7B2D',
  '#2D2D7B','#7B4A2D','#2D7B4A','#7B2D4A','#3F2D7B',
];

function bookColor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BOOK_PALETTE[h % BOOK_PALETTE.length];
}

function bookWidth(id) {
  let h = 0;
  for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return 18 + (h % 16); // 18–33px
}

// ─── State ───────────────────────────────────────────
let allBooks      = [];
let pendingBook   = null;  // book selected on table waiting to be shelved
let isAnimating   = false;

// ─── Helpers ─────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

// ─── Toast ───────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}

// ─── Loading ──────────────────────────────────────────
function setLoading(on) {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !on);
}

// ─── Pixie Speech ─────────────────────────────────────
let speechTimer;
function pixieSay(msg, duration = 2800) {
  const el = document.getElementById('pixieSpeech');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ─── Pixie State ──────────────────────────────────────
function pixieState(state) {
  const el = document.getElementById('pixieEl');
  el.classList.remove('excited','celebrating');
  if (state) {
    void el.offsetWidth; // reflow to restart animation
    el.classList.add(state);
  }
}

// ─── Calendar + IST Clock ─────────────────────────────
function renderCalendar() {
  const now = new Date();
  const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('calMonth').textContent   = MONTHS[now.getMonth()];
  document.getElementById('calDay').textContent     = now.getDate();
  document.getElementById('calWeekday').textContent = WEEKDAYS[now.getDay()];
  document.getElementById('calYear').textContent    = now.getFullYear();
}

function updateClock() {
  const el = document.getElementById('clockTime');
  if (!el) return;
  // IST = UTC+5:30
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const h   = String(ist.getHours()).padStart(2,'0');
  const m   = String(ist.getMinutes()).padStart(2,'0');
  const s   = String(ist.getSeconds()).padStart(2,'0');
  const ampm = ist.getHours() >= 12 ? 'PM' : 'AM';
  const h12  = String(ist.getHours() % 12 || 12).padStart(2,'0');
  el.textContent = `${h12}:${m}:${s}`;
  const amEl = document.getElementById('clockAmPm');
  if (amEl) amEl.textContent = ampm;
}

// ─── Book Hover Tooltip ───────────────────────────────
let tooltipEl = null;

function initTooltip() {
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'bookTooltip';
  tooltipEl.style.cssText = `
    position:fixed;
    z-index:800;
    background:rgba(255,245,255,0.94);
    backdrop-filter:blur(12px);
    border:1.5px solid rgba(200,140,200,0.45);
    border-radius:10px;
    padding:7px 14px;
    font-family:'Cormorant Garamond',serif;
    font-size:.88rem;
    font-style:italic;
    color:#3A0A5A;
    letter-spacing:.5px;
    box-shadow:0 6px 20px rgba(150,80,180,.22);
    pointer-events:none;
    opacity:0;
    transition:opacity .18s;
    max-width:220px;
    text-align:center;
    line-height:1.5;
    white-space:nowrap;
  `;
  document.body.appendChild(tooltipEl);
}

function showTooltip(text, subtext, x, y) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = `<strong style="font-style:normal;color:#5A0080;">${text}</strong>${subtext ? `<br><span style="font-size:.75rem;color:rgba(100,50,120,.65);">${subtext}</span>` : ''}`;
  const tw = 220, th = 60;
  const left = Math.min(x + 12, window.innerWidth - tw - 12);
  const top  = y - th - 12 < 0 ? y + 14 : y - th - 6;
  tooltipEl.style.left    = left + 'px';
  tooltipEl.style.top     = top  + 'px';
  tooltipEl.style.opacity = '1';
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.opacity = '0';
}

// ─── Daily Quote ──────────────────────────────────────
const QUOTES = [
  { t: 'A reader lives a thousand lives before she dies.',          a: 'George R.R. Martin' },
  { t: 'There is no friend as loyal as a book.',                    a: 'Ernest Hemingway' },
  { t: 'Reading is dreaming with open eyes.',                       a: '' },
  { t: 'A book is a dream you hold in your hands.',                 a: 'Neil Gaiman' },
  { t: 'Books are a uniquely portable magic.',                      a: 'Stephen King' },
  { t: 'Once you learn to read, you will be forever free.',         a: 'Frederick Douglass' },
  { t: 'I do believe something very magical can happen when you read a good book.', a: 'J.K. Rowling' },
  { t: 'She is too fond of books, and it has turned her brain.',    a: 'Louisa May Alcott' },
  { t: 'Reading is an exercise in empathy.',                        a: 'Malorie Blackman' },
  { t: 'Books are the mirrors of the soul.',                        a: 'Virginia Woolf' },
  { t: 'Reading without reflecting is like eating without digesting.', a: 'Edmund Burke' },
  { t: 'To read is to voyage through time.',                        a: 'Carl Sagan' },
  { t: 'You can never get a book long enough to suit me.',          a: 'C.S. Lewis' },
  { t: 'A book must be the axe for the frozen sea inside us.',      a: 'Franz Kafka' },
  { t: 'Think before you speak. Read before you think.',            a: 'Fran Lebowitz' },
  { t: 'Today a reader, tomorrow a leader.',                        a: 'Margaret Fuller' },
  { t: 'Libraries store the energy that fuels the imagination.',    a: 'Sidney Sheldon' },
  { t: 'The world belongs to those who read.',                      a: 'Rick Holland' },
  { t: 'Literature is the art of discovering something extraordinary about ordinary people.', a: 'Boris Pasternak' },
  { t: 'Not all those who wander are lost — but all who read are found.', a: '' },
  { t: 'One must always be careful of books, for words have the power to change us.', a: 'Cassandra Clare' },
  { t: 'In the case of good books, the point is how many can get through to you.', a: 'Mortimer Adler' },
  { t: 'Reading gives us someplace to go when we have to stay where we are.', a: 'Mason Cooley' },
  { t: 'A good book has no ending.',                                a: 'R.D. Cumming' },
  { t: 'The more that you read, the more things you will know.',    a: 'Dr. Seuss' },
  { t: 'Until I feared I would lose it, I never loved to read.',    a: 'Harper Lee' },
  { t: 'A book is a garden carried in the pocket.',                 a: 'Chinese Proverb' },
  { t: 'I took a deep breath and listened to the old brag of my heart.',  a: 'Sylvia Plath' },
  { t: 'Words are, in my not-so-humble opinion, our most inexhaustible source of magic.', a: 'Albus Dumbledore' },
  { t: 'Fill your house with stacks of books, in all the crannies and all the nooks.', a: 'Dr. Seuss' },
];

function renderQuote() {
  const q = QUOTES[getDayOfYear() % QUOTES.length];
  document.getElementById('quoteText').textContent   = `"${q.t}"`;
  document.getElementById('quoteAuthor').textContent = q.a ? `— ${q.a}` : '';
}

// ─── Stats ────────────────────────────────────────────
function renderStats(books) {
  const placed   = books.filter(b => b.shelfIndex !== undefined).length;
  const inProgress = books.filter(b => b.lastPage && b.lastPage > 1).length;
  document.getElementById('statCount').textContent = placed;
  document.getElementById('statRead').textContent  = inProgress;
}

// ─── Iridescent Monarch SVG ───────────────────────────
const BT_HUE_OFFSETS = [0,30,60,100,140,200,260,320,-20,50,80,160];

function makeMonarchSVG(hue) {
  const uid = Math.random().toString(36).slice(2,7);
  return `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <defs>
    <linearGradient id="wg1_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="hsl(${200+hue},80%,85%)"/>
      <stop offset="50%"  stop-color="hsl(${240+hue},72%,78%)"/>
      <stop offset="100%" stop-color="hsl(${180+hue},65%,88%)"/>
    </linearGradient>
    <linearGradient id="wg2_${uid}" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="hsl(${210+hue},78%,83%)"/>
      <stop offset="50%"  stop-color="hsl(${250+hue},70%,76%)"/>
      <stop offset="100%" stop-color="hsl(${185+hue},63%,86%)"/>
    </linearGradient>
    <linearGradient id="sh_${uid}" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.55"/>
      <stop offset="50%"  stop-color="white" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.28"/>
    </linearGradient>
  </defs>
  <path d="M80,54 C68,36 42,8 10,14 C-4,22 4,46 18,52 C34,58 56,54 80,54Z"      fill="url(#wg1_${uid})" opacity="0.92"/>
  <path d="M80,54 C92,36 118,8 150,14 C164,22 156,46 142,52 C126,58 104,54 80,54Z" fill="url(#wg2_${uid})" opacity="0.92"/>
  <path d="M80,58 C66,64 38,80 24,74 C10,64 18,46 36,50 C52,54 72,58 80,58Z"      fill="url(#wg1_${uid})" opacity="0.85"/>
  <path d="M80,58 C94,64 122,80 136,74 C150,64 142,46 124,50 C108,54 88,58 80,58Z" fill="url(#wg2_${uid})" opacity="0.85"/>
  <path d="M80,54 C68,36 42,8 10,14 C-4,22 4,46 18,52 C34,58 56,54 80,54Z"        fill="url(#sh_${uid})" opacity="0.5"/>
  <path d="M80,54 C92,36 118,8 150,14 C164,22 156,46 142,52 C126,58 104,54 80,54Z" fill="url(#sh_${uid})" opacity="0.5"/>
  <path d="M80,54 C68,36 42,8 10,14 C-4,22 4,46 18,52 C34,58 56,54 80,54Z"        fill="none" stroke="#0D0018" stroke-width="2.8" opacity="0.75"/>
  <path d="M80,54 C92,36 118,8 150,14 C164,22 156,46 142,52 C126,58 104,54 80,54Z" fill="none" stroke="#0D0018" stroke-width="2.8" opacity="0.75"/>
  <path d="M80,58 C66,64 38,80 24,74 C10,64 18,46 36,50 C52,54 72,58 80,58Z"      fill="none" stroke="#0D0018" stroke-width="2.4" opacity="0.7"/>
  <path d="M80,58 C94,64 122,80 136,74 C150,64 142,46 124,50 C108,54 88,58 80,58Z" fill="none" stroke="#0D0018" stroke-width="2.4" opacity="0.7"/>
  <path d="M80,54 C72,42 58,28 38,20" fill="none" stroke="#0D0018" stroke-width="1.6" opacity="0.6"/>
  <path d="M80,54 C88,42 102,28 122,20" fill="none" stroke="#0D0018" stroke-width="1.6" opacity="0.6"/>
  <path d="M80,58 C72,64 54,68 36,68" fill="none" stroke="#0D0018" stroke-width="1.1" opacity="0.45"/>
  <path d="M80,58 C88,64 106,68 124,68" fill="none" stroke="#0D0018" stroke-width="1.1" opacity="0.45"/>
  <g fill="white" opacity="0.9">
    <circle cx="12" cy="18" r="2.2"/><circle cx="7" cy="28" r="1.8"/><circle cx="6" cy="38" r="1.6"/><circle cx="9" cy="47" r="1.5"/>
    <circle cx="148" cy="18" r="2.2"/><circle cx="153" cy="28" r="1.8"/><circle cx="154" cy="38" r="1.6"/><circle cx="151" cy="47" r="1.5"/>
    <circle cx="26" cy="73" r="1.8"/><circle cx="37" cy="79" r="1.5"/><circle cx="134" cy="73" r="1.8"/><circle cx="123" cy="79" r="1.5"/>
  </g>
  <line x1="80" y1="50" x2="66" y2="28" stroke="#0D0018" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
  <line x1="80" y1="50" x2="94" y2="28" stroke="#0D0018" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
  <circle cx="64" cy="26" r="3" fill="#0D0018" opacity="0.75"/><circle cx="96" cy="26" r="3" fill="#0D0018" opacity="0.75"/>
  <circle cx="64" cy="26" r="1.4" fill="white" opacity="0.7"/><circle cx="96" cy="26" r="1.4" fill="white" opacity="0.7"/>
  <ellipse cx="80" cy="58" rx="3.5" ry="13" fill="#0D0018" opacity="0.8"/>
</svg>`;
}

function spawnButterflies() {
  const c = document.getElementById('butterflies-container');
  for (let i = 0; i < 10; i++) {
    const bt  = document.createElement('div');
    bt.className = 'butterfly';
    const sz  = 36 + Math.random() * 36;
    bt.style.cssText = `width:${sz}px;height:${sz*.7}px;--dur:${11+Math.random()*13}s;--delay:${Math.random()*22}s;--sx:-13vw;--sy:${Math.random()*88}vh;--sc:${.55+Math.random()*.85};filter:drop-shadow(0 2px 10px rgba(160,140,255,.55));`;
    bt.innerHTML = makeMonarchSVG(BT_HUE_OFFSETS[i % BT_HUE_OFFSETS.length]);
    c.appendChild(bt);
  }
}

function spawnSparkles() {
  const c = document.getElementById('sparkles-container');
  const shapes = ['✦','✧','⋆','✺','✹'];
  for (let i = 0; i < 22; i++) {
    const sp = document.createElement('div');
    sp.className = 'sparkle';
    const sz  = 8 + Math.random() * 13;
    const col = ['#FFD700','#FF85C8','#C8A8F5','#ffffff','#80FFD0'][Math.floor(Math.random()*5)];
    sp.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;font-size:${sz}px;color:${col};background:transparent;border-radius:0;--dur:${2+Math.random()*4}s;--delay:${Math.random()*8}s;display:flex;align-items:center;`;
    sp.textContent = shapes[Math.floor(Math.random()*shapes.length)];
    c.appendChild(sp);
  }
}

// ─── Pixie SVG ────────────────────────────────────────
function getPixieSVG(carrying = false, bookColor = '#7B2D38') {
  return `<svg viewBox="0 0 60 82" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <defs>
    <radialGradient id="wngG" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#E0D0FF" stop-opacity="0.9"/>
      <stop offset="60%"  stop-color="#B0D0FF" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#D0B0FF" stop-opacity="0.5"/>
    </radialGradient>
    <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#FF99CC"/>
      <stop offset="100%" stop-color="#DD55AA"/>
    </linearGradient>
  </defs>
  <!-- Wings -->
  <path class="pixie-wing-l" d="M30,34 C18,22 4,14 8,28 C12,40 24,38 30,34Z" fill="url(#wngG)" stroke="rgba(180,160,255,.5)" stroke-width="0.8"/>
  <path class="pixie-wing-l" d="M30,37 C20,44 8,52 12,46 C16,40 24,40 30,37Z" fill="url(#wngG)" stroke="rgba(180,160,255,.4)" stroke-width="0.8"/>
  <path class="pixie-wing-r" d="M30,34 C42,22 56,14 52,28 C48,40 36,38 30,34Z" fill="url(#wngG)" stroke="rgba(180,160,255,.5)" stroke-width="0.8"/>
  <path class="pixie-wing-r" d="M30,37 C40,44 52,52 48,46 C44,40 36,40 30,37Z" fill="url(#wngG)" stroke="rgba(180,160,255,.4)" stroke-width="0.8"/>
  <!-- Body/dress -->
  <ellipse cx="30" cy="46" rx="9" ry="13" fill="url(#bodyG)"/>
  <ellipse cx="30" cy="55" rx="10" ry="8" fill="#FF77BB" opacity="0.7"/>
  <!-- Belt sparkle -->
  <ellipse cx="30" cy="44" rx="5" ry="2" fill="#FFD56B" opacity="0.8"/>
  <!-- Head -->
  <circle cx="30" cy="22" r="10.5" fill="#FDDCB8"/>
  <!-- Hair -->
  <path d="M20,20 C18,8 30,4 42,8 C44,20 38,18 30,18Z" fill="#FFD700"/>
  <path d="M20,22 C14,24 16,32 20,30Z" fill="#FFD700"/>
  <path d="M40,22 C46,24 44,32 40,30Z" fill="#FFD700"/>
  <!-- Face -->
  <circle cx="27" cy="22" r="1.5" fill="#3A2050"/>
  <circle cx="33" cy="22" r="1.5" fill="#3A2050"/>
  <circle cx="27.5" cy="21.5" r=".6" fill="white" opacity=".7"/>
  <circle cx="33.5" cy="21.5" r=".6" fill="white" opacity=".7"/>
  <path d="M27.5,27 Q30,30 32.5,27" fill="none" stroke="#E08080" stroke-width="1" stroke-linecap="round"/>
  <!-- Blush -->
  <ellipse cx="24" cy="25" rx="3" ry="1.8" fill="#FFB0B0" opacity=".45"/>
  <ellipse cx="36" cy="25" rx="3" ry="1.8" fill="#FFB0B0" opacity=".45"/>
  <!-- Tiara -->
  <path d="M22,14 L24,8 L27,13 L30,6 L33,13 L36,8 L38,14Z" fill="#FFD700"/>
  <circle cx="30" cy="6" r="2.5" fill="#E0A0FF"/>
  <circle cx="24" cy="8" r="1.5" fill="#FF99CC"/>
  <circle cx="36" cy="8" r="1.5" fill="#99DDFF"/>
  <!-- Legs -->
  <line x1="26" y1="57" x2="24" y2="68" stroke="#FDDCB8" stroke-width="3" stroke-linecap="round"/>
  <line x1="34" y1="57" x2="36" y2="68" stroke="#FDDCB8" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="23" cy="69" rx="4" ry="2" fill="#FF99CC"/>
  <ellipse cx="37" cy="69" rx="4" ry="2" fill="#FF99CC"/>
  <!-- Wand -->
  <line x1="38" y1="36" x2="52" y2="22" stroke="#D0B0FF" stroke-width="1.8" stroke-linecap="round"/>
  <polygon points="52,22 55,16 58,22 52,25" fill="#FFD56B"/>
  <circle cx="54" cy="19" r="3" fill="#FFD56B" opacity=".7"/>
  <!-- Magic sparkle from wand -->
  <circle cx="56" cy="15" r="1.2" fill="#FFD56B" opacity=".9"/>
  <circle cx="59" cy="18" r=".8" fill="#FF99CC" opacity=".8"/>
  <circle cx="57" cy="22" r=".8" fill="#B0D0FF" opacity=".8"/>
  ${carrying ? `
  <!-- Tiny book she's carrying -->
  <rect x="10" y="38" width="14" height="18" rx="2" fill="${bookColor}" transform="rotate(-15,17,47)"/>
  <rect x="10" y="38" width="3" height="18" rx="1" fill="rgba(0,0,0,.2)" transform="rotate(-15,17,47)"/>
  ` : ''}
</svg>`;
}

// ─── Build Pixie ──────────────────────────────────────
function initPixie() {
  document.getElementById('pixieEl').innerHTML = getPixieSVG();
}

// ─── Fly Pixie Animation ──────────────────────────────
async function flyPixie(fromEl, toEl, carrying = false, bookCol = '#7B2D38') {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect   = toEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'pixie-flyer';
  flyer.innerHTML = getPixieSVG(carrying, bookCol);
  flyer.style.cssText = `
    position:fixed;
    left:${fromRect.left + fromRect.width/2}px;
    top:${fromRect.top + fromRect.height/2}px;
    width:58px; height:74px;
    z-index:999; pointer-events:none;
    transform:translate(-50%,-50%);
    transition:left 1.0s cubic-bezier(.4,0,.2,1),top 1.0s cubic-bezier(.4,0,.2,1);
  `;
  document.body.appendChild(flyer);

  // Trigger animation next frame
  await sleep(30);
  flyer.style.left = (toRect.left + toRect.width/2) + 'px';
  flyer.style.top  = (toRect.top + toRect.height/2) + 'px';

  await sleep(1100);
  flyer.remove();
}

// ─── Conjure Sparkle Burst ────────────────────────────
function conjureBurst(cx, cy) {
  const emojis = ['✨','🌸','⭐','✦','🦋','💫','🌺','✧','🌟'];
  emojis.forEach((em, i) => {
    const el = document.createElement('div');
    el.className = 'conjure-burst';
    const angle = (360 / emojis.length) * i * (Math.PI / 180);
    const dist  = 80 + Math.random() * 80;
    el.style.cssText = `left:${cx}px;top:${cy}px;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist - 60}px;--dur:${1.2+Math.random()*.6}s;--del:${i*.06}s;--rot:${-180+Math.random()*360}deg;`;
    el.textContent = em;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  });
}

// ─── Conjure Banner ───────────────────────────────────
async function showConjureBanner(msg) {
  const b = document.getElementById('conjureBanner');
  b.textContent = msg;
  b.classList.add('show');
  await sleep(3000);
  b.classList.remove('show');
}

// ─── Shelf Unit Builder ───────────────────────────────
function buildShelfUnit(unitIndex, animate = false) {
  const unit = document.createElement('div');
  unit.className = 'shelf-unit' + (animate ? ' conjuring' : '');
  unit.id = `shelf-unit-${unitIndex}`;
  unit.dataset.unit = unitIndex;

  // Plant top
  const plants = document.createElement('div');
  plants.className = 'shelf-plants-top';
  plants.textContent = PLANT_SETS[unitIndex % PLANT_SETS.length];
  unit.appendChild(plants);

  // Label
  const label = document.createElement('div');
  label.className = 'shelf-label';
  label.innerHTML = `<span>✦</span>${UNIT_NAMES[unitIndex] || `Bookcase ${unitIndex+1}`}<span>✦</span>`;
  unit.appendChild(label);

  // Shelf body
  const body = document.createElement('div');
  body.className = 'shelf-body';

  for (let row = 0; row < ROWS_PER_UNIT; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'shelf-row';
    rowEl.id = `shelf-${unitIndex}-${row}`;
    rowEl.dataset.unit = unitIndex;
    rowEl.dataset.row  = row;
    rowEl.addEventListener('click', () => onShelfClick(unitIndex));
    body.appendChild(rowEl);

    if (row < ROWS_PER_UNIT - 1) {
      const plank = document.createElement('div');
      plank.className = 'shelf-plank';
      body.appendChild(plank);
    }
  }

  unit.appendChild(body);

  const base = document.createElement('div');
  base.className = 'shelf-base';
  unit.appendChild(base);

  const legs = document.createElement('div');
  legs.className = 'shelf-legs';
  legs.innerHTML = '<div class="shelf-leg"></div><div class="shelf-leg"></div>';
  unit.appendChild(legs);

  // Click on whole unit to place book
  unit.addEventListener('click', (e) => {
    // Prevent double-fire (row also fires)
    if (e.target.closest('.shelf-row')) return;
    onShelfClick(unitIndex);
  });

  return unit;
}

// ─── Ensure N shelf units exist ───────────────────────
function ensureShelfUnits(n) {
  const container = document.getElementById('shelfContainer');
  const existing  = container.querySelectorAll('.shelf-unit').length;
  for (let i = existing; i < n; i++) {
    container.appendChild(buildShelfUnit(i));
  }
}

// ─── Render books onto shelves ────────────────────────
function renderShelves(books) {
  // Clear all rows
  document.querySelectorAll('.shelf-row').forEach(row => {
    row.innerHTML = '';
    row.classList.remove('has-pending');
  });

  const placed = books
    .filter(b => b.shelfIndex !== undefined)
    .sort((a, b) => a.shelfIndex - b.shelfIndex);

  // Make sure we have enough units
  if (placed.length > 0) {
    const maxUnit = Math.floor((placed[placed.length - 1].shelfIndex) / BOOKS_PER_UNIT);
    ensureShelfUnits(Math.max(INITIAL_UNITS, maxUnit + 1));
  }

  for (const book of placed) {
    const unit     = Math.floor(book.shelfIndex / BOOKS_PER_UNIT);
    const posInUnit= book.shelfIndex % BOOKS_PER_UNIT;
    const row      = Math.floor(posInUnit / BOOKS_PER_ROW);
    const rowEl    = document.getElementById(`shelf-${unit}-${row}`);
    if (!rowEl) continue;

    const spine = createBookSpine(book);
    rowEl.appendChild(spine);
  }

  // Highlight pending zone if book is selected
  if (pendingBook) {
    document.querySelectorAll('.shelf-row').forEach(r => r.classList.add('has-pending'));
    document.querySelectorAll('.shelf-unit').forEach(u => u.classList.add('drop-target'));
  }

  renderStats(books);
}

// ─── Create a book spine element ──────────────────────
function createBookSpine(book) {
  const col  = bookColor(book.id);
  const w    = bookWidth(book.id);
  const pct  = book.lastPage && book.pages ? Math.round((book.lastPage / book.pages) * 100) : 0;
  const tip  = pct > 0
    ? `${book.name} · ${pct}% read · right-click to manage`
    : `${book.name} · click to read · right-click to manage`;

  const spine = document.createElement('div');
  spine.className = 'book-spine';
  spine.dataset.bookId = book.id;
  spine.dataset.tip    = tip;
  spine.style.cssText  = `background:${col};width:${w}px;`;

  const title = document.createElement('div');
  title.className  = 'spine-title';
  title.textContent = book.name;
  spine.appendChild(title);

  const prog = document.createElement('div');
  prog.className    = 'spine-progress';
  prog.style.height = pct + '%';
  spine.appendChild(prog);

  // Hover tooltip
  spine.addEventListener('mouseenter', (e) => {
    const pct = book.lastPage && book.pages ? Math.round((book.lastPage / book.pages) * 100) : 0;
    const sub = pct > 0 ? `${pct}% read · page ${book.lastPage} of ${book.pages}` : `${book.pages} pages`;
    showTooltip(book.name, sub, e.clientX, e.clientY);
  });
  spine.addEventListener('mousemove', (e) => {
    const tw = 220, th = 60;
    const left = Math.min(e.clientX + 12, window.innerWidth - tw - 12);
    const top  = e.clientY - th - 6 < 0 ? e.clientY + 14 : e.clientY - th - 6;
    if (tooltipEl) { tooltipEl.style.left = left+'px'; tooltipEl.style.top = top+'px'; }
  });
  spine.addEventListener('mouseleave', hideTooltip);

  // Left-click → pixie fetch & open
  spine.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('bookContextMenu')?.remove();
    onShelfBookClick(book, spine);
  });

  // Right-click → context menu with Open / Delete
  spine.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showBookMenu(book, spine, e);
  });

  return spine;
}

// ─── Render pending books on table ───────────────────
function renderPending(books) {
  const zone  = document.getElementById('pendingZone');
  const label = document.getElementById('pendingLabel');
  zone.innerHTML = '';

  const pending = books.filter(b => b.shelfIndex === undefined);

  if (!pending.length) {
    label.textContent = '';
    return;
  }

  label.textContent = pending.length === 1
    ? 'tap the book, then a rack!'
    : `${pending.length} books waiting`;

  for (const book of pending) {
    const col = bookColor(book.id);
    const el  = document.createElement('div');
    el.className   = 'pending-book';
    el.title       = book.name;
    el.dataset.id  = book.id;
    el.style.background = col;
    if (pendingBook && pendingBook.id === book.id) el.classList.add('selected');

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onPendingBookClick(book, el);
    });

    zone.appendChild(el);
  }
}

// ─── Click: pending book on table ────────────────────
function onPendingBookClick(book, el) {
  if (isAnimating) return;

  if (pendingBook && pendingBook.id === book.id) {
    // Deselect
    pendingBook = null;
    pixieSay('Alright, I\'ll wait! ✦');
  } else {
    pendingBook = book;
    pixieState('excited');
    pixieSay('Click a bookcase and I\'ll fly it right over! ✦');
  }
  renderShelves(allBooks);
  renderPending(allBooks);
}

// ─── Click: shelf unit to place pending book ─────────
async function onShelfClick(unitIndex) {
  if (!pendingBook || isAnimating) return;

  // Find next open shelfIndex in this unit
  const unitStart  = unitIndex * BOOKS_PER_UNIT;
  const unitEnd    = unitStart + BOOKS_PER_UNIT;
  const usedInUnit = allBooks
    .filter(b => b.shelfIndex !== undefined && b.shelfIndex >= unitStart && b.shelfIndex < unitEnd)
    .map(b => b.shelfIndex);

  let nextIdx = unitStart;
  while (usedInUnit.includes(nextIdx) && nextIdx < unitEnd) nextIdx++;

  if (nextIdx >= unitEnd) {
    showToast('That bookcase is full! Try another ✦');
    pixieSay('No room in there… pick another bookcase!');
    return;
  }

  isAnimating = true;

  try {
    const container    = document.getElementById('shelfContainer');
    const existingUnits = container.querySelectorAll('.shelf-unit').length;

    // Clear highlights
    document.querySelectorAll('.shelf-unit').forEach(u => u.classList.remove('drop-target'));
    document.querySelectorAll('.shelf-row').forEach(r => r.classList.remove('has-pending'));

    const pixieFromEl = document.getElementById('pixieEl');
    const unitEl      = document.getElementById(`shelf-unit-${unitIndex}`);
    const bookCol     = bookColor(pendingBook.id);

    document.querySelectorAll('.pending-book').forEach(p => p.classList.remove('selected'));

    pixieSay('On my way! ✨');
    await flyPixie(pixieFromEl, unitEl, true, bookCol);

    // Commit placement
    const book = pendingBook;
    pendingBook = null;

    // Update in-memory state first (fast, synchronous)
    const idx = allBooks.findIndex(b => b.id === book.id);
    if (idx >= 0) allBooks[idx].shelfIndex = nextIdx;

    // Persist to localStorage (instant, no IDB read-write cycle)
    updateBookMeta(book.id, { shelfIndex: nextIdx });

    // Celebrate
    pixieState('celebrating');
    pixieSay('Shelved! It looks wonderful there ✦');
    const unitRect = unitEl.getBoundingClientRect();
    conjureBurst(unitRect.left + unitRect.width / 2, unitRect.top + unitRect.height / 3);

    // Auto-conjure new unit if this one is now full
    const placedCount = allBooks.filter(b => b.shelfIndex !== undefined).length;
    if (placedCount % BOOKS_PER_UNIT === 0 && placedCount > 0) {
      await sleep(600);
      const newUnit = buildShelfUnit(existingUnits, true);
      container.appendChild(newUnit);
      const newRect = newUnit.getBoundingClientRect();
      conjureBurst(newRect.left + newRect.width / 2, newRect.top + newRect.height / 3);
      showConjureBanner('✦ A new enchanted bookcase has appeared! ✦');
      pixieSay('Oh! A new magical bookcase! ✨✨');
    }

    renderShelves(allBooks);
    renderPending(allBooks);
  } catch (err) {
    console.error('Shelf placement error:', err);
    showToast('Something went wrong — please try again');
    pendingBook = null;
  } finally {
    isAnimating = false;
  }
}

// ─── Click: book on shelf → pixie retrieves & opens ──
async function onShelfBookClick(book, spineEl) {
  if (isAnimating) return;
  isAnimating = true;

  try {
    spineEl.classList.add('retrieving');

    const pixieFromEl = document.getElementById('pixieEl');
    const bookCol = bookColor(book.id);

    pixieSay('I\'ll get that for you right away! ✦');
    await sleep(250);

    // Fly table → shelf
    await flyPixie(pixieFromEl, spineEl, false);

    pixieSay('Got it! Coming right to you ✨');
    await sleep(150);

    // Fly shelf → screen centre
    const centreX = window.innerWidth  / 2;
    const centreY = window.innerHeight / 2;
    const ghost   = document.createElement('div');
    ghost.style.cssText = `position:fixed;left:${centreX}px;top:${centreY}px;width:1px;height:1px;pointer-events:none;`;
    document.body.appendChild(ghost);
    await flyPixie(spineEl, ghost, true, bookCol);
    ghost.remove();

    spineEl.classList.remove('retrieving');
    pixieState('celebrating');
    pixieSay('Here you go! Enjoy your reading 💫');

    await sleep(350);
    const startPage = book.lastPage || 1;
    window.location.href = `reader.html?id=${book.id}&page=${startPage}`;
  } catch (err) {
    console.error('Retrieve error:', err);
    spineEl.classList.remove('retrieving');
    showToast('Something went wrong — please try again');
  } finally {
    isAnimating = false;
  }
}

// ─── Cover generation ─────────────────────────────────
async function generateCover(arrayBuffer) {
  try {
    const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const page = await pdf.getPage(1);
    const vp   = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch { return null; }
}

// ─── Handle uploaded files ────────────────────────────
async function handleFiles(files) {
  const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
  if (!pdfs.length) { showToast('✦ Only PDFs, darling!'); return; }

  setLoading(true);

  for (const file of pdfs) {
    try {
      const buffer = await file.arrayBuffer();
      let pages = 0;
      try {
        const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
        pages = pdf.numPages;
      } catch {}
      const cover = await generateCover(buffer);

      const book = {
        id:      crypto.randomUUID(),
        name:    file.name.replace(/\.pdf$/i, ''),
        size:    file.size,
        pages,
        cover,
        addedAt: Date.now(),
        data:    buffer,
        // shelfIndex is NOT set → book goes to table
      };

      await saveBook(book);
      allBooks.push(book);
      showToast(`"${book.name}" arrived at the table! Tap to shelve it ✦`);
      pixieState('excited');
      pixieSay(`Oh, a new tome! "${book.name.slice(0,20)}" ✨`);
    } catch (err) {
      console.error(err);
      showToast(`Couldn't add "${file.name}" — please try again`);
    }
  }

  setLoading(false);
  renderShelves(allBooks);
  renderPending(allBooks);
}

// ─── Illustrated Greenhouse Background ───────────────
function buildGreenhouseBg() {
  // Remove any old bg
  document.getElementById('gh-bg')?.remove();

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id = 'gh-bg';
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox','0 0 1440 900');
  svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  svg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';

  svg.innerHTML = `
  <defs>
    <linearGradient id="ghSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#B8D898"/>
      <stop offset="18%"  stop-color="#D4E8A8"/>
      <stop offset="40%"  stop-color="#EAE0B0"/>
      <stop offset="70%"  stop-color="#F0D4A0"/>
      <stop offset="100%" stop-color="#D4B880"/>
    </linearGradient>
    <!-- Leaf gradients -->
    <linearGradient id="lf1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#6BBF40"/>
      <stop offset="100%" stop-color="#3A8020"/>
    </linearGradient>
    <linearGradient id="lf2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#8AD050"/>
      <stop offset="100%" stop-color="#4A9828"/>
    </linearGradient>
    <linearGradient id="lf3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#4A9828"/>
      <stop offset="100%" stop-color="#2A6010"/>
    </linearGradient>
    <linearGradient id="flPink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#FFB8D8"/>
      <stop offset="100%" stop-color="#FF78A8"/>
    </linearGradient>
    <linearGradient id="flPurp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#D8A8F8"/>
      <stop offset="100%" stop-color="#A868D8"/>
    </linearGradient>
    <linearGradient id="flYell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#FFE880"/>
      <stop offset="100%" stop-color="#F0B820"/>
    </linearGradient>
    <linearGradient id="flPeach" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#FFD0A8"/>
      <stop offset="100%" stop-color="#F09060"/>
    </linearGradient>
    <radialGradient id="flCent" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#FFF8A0"/>
      <stop offset="100%" stop-color="#F0C830"/>
    </radialGradient>
    <filter id="softBlur"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="leafBlur"><feGaussianBlur stdDeviation="0.8"/></filter>
  </defs>

  <!-- Sky fill -->
  <rect width="1440" height="900" fill="url(#ghSky)"/>

  <!-- Glass ceiling panels (radiating from top centre) -->
  <g opacity="0.18" stroke="#5A4010" stroke-width="2" fill="none">
    <line x1="720" y1="0" x2="0"    y2="300"/>
    <line x1="720" y1="0" x2="180"  y2="320"/>
    <line x1="720" y1="0" x2="360"  y2="340"/>
    <line x1="720" y1="0" x2="540"  y2="360"/>
    <line x1="720" y1="0" x2="720"  y2="380"/>
    <line x1="720" y1="0" x2="900"  y2="360"/>
    <line x1="720" y1="0" x2="1080" y2="340"/>
    <line x1="720" y1="0" x2="1260" y2="320"/>
    <line x1="720" y1="0" x2="1440" y2="300"/>
    <!-- Horizontal cross braces -->
    <line x1="0" y1="120" x2="1440" y2="120" opacity="0.5"/>
    <line x1="0" y1="200" x2="1440" y2="200" opacity="0.4"/>
    <line x1="0" y1="300" x2="1440" y2="300" opacity="0.3"/>
  </g>

  <!-- ═══ LEFT WALL — cascading ivy + hanging vine ═══ -->

  <!-- Main thick hanging vine from top-left -->
  <path d="M-10,0 C20,80 -20,160 10,240 C40,320 0,400 20,480 C40,560 10,640 30,720 C50,800 20,860 0,900"
        fill="none" stroke="#3A7018" stroke-width="10" stroke-linecap="round" opacity="0.75"/>
  <path d="M-10,0 C20,80 -20,160 10,240 C40,320 0,400 20,480 C40,560 10,640 30,720 C50,800 20,860 0,900"
        fill="none" stroke="#5A9828" stroke-width="6" stroke-linecap="round" opacity="0.5"/>

  <!-- Left ivy leaves along vine -->
  ${ivyLeafSet(15, 55, 22, 'lf1', -25)}
  ${ivyLeafSet(8, 130, 18, 'lf2', 15)}
  ${ivyLeafSet(18, 205, 20, 'lf1', -20)}
  ${ivyLeafSet(5, 280, 16, 'lf3', 20)}
  ${ivyLeafSet(22, 355, 22, 'lf2', -15)}
  ${ivyLeafSet(12, 430, 18, 'lf1', 18)}
  ${ivyLeafSet(25, 505, 20, 'lf3', -22)}
  ${ivyLeafSet(8,  580, 16, 'lf2', 15)}
  ${ivyLeafSet(28, 650, 22, 'lf1', -18)}
  ${ivyLeafSet(15, 720, 18, 'lf2', 20)}

  <!-- Left secondary hanging vine -->
  <path d="M80,0 C100,60 70,140 90,220 C110,300 80,380 100,460 C120,540 90,620 110,700 C130,780 100,860 80,900"
        fill="none" stroke="#4A8820" stroke-width="7" stroke-linecap="round" opacity="0.6"/>
  ${ivyLeafSet(88, 80,  16, 'lf2', 25)}
  ${ivyLeafSet(75, 190, 14, 'lf1', -18)}
  ${ivyLeafSet(95, 310, 18, 'lf3', 22)}
  ${ivyLeafSet(82, 430, 14, 'lf2', -16)}
  ${ivyLeafSet(105,560, 16, 'lf1', 20)}
  ${ivyLeafSet(88, 680, 14, 'lf3', -18)}

  <!-- Left third thin vine -->
  <path d="M155,0 C170,50 145,120 160,190 C175,260 150,340 165,420 C180,500 155,580 170,660"
        fill="none" stroke="#5A9020" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
  ${ivyLeafSet(158,60,  13, 'lf1', -20)}
  ${ivyLeafSet(162,180, 11, 'lf2', 22)}
  ${ivyLeafSet(160,310, 13, 'lf3', -18)}
  ${ivyLeafSet(167,440, 11, 'lf1', 20)}
  ${ivyLeafSet(163,560, 13, 'lf2', -16)}

  <!-- ═══ RIGHT WALL — cascading ivy + hanging vine ═══ -->

  <!-- Main right vine -->
  <path d="M1450,0 C1420,80 1460,160 1430,240 C1400,320 1440,400 1420,480 C1400,560 1430,640 1410,720 C1390,800 1420,860 1440,900"
        fill="none" stroke="#3A7018" stroke-width="10" stroke-linecap="round" opacity="0.75"/>
  <path d="M1450,0 C1420,80 1460,160 1430,240 C1400,320 1440,400 1420,480 C1400,560 1430,640 1410,720 C1390,800 1420,860 1440,900"
        fill="none" stroke="#5A9828" stroke-width="6" stroke-linecap="round" opacity="0.5"/>

  ${ivyLeafSet(1425,55,  22, 'lf1', 25)}
  ${ivyLeafSet(1432,130, 18, 'lf2', -15)}
  ${ivyLeafSet(1422,205, 20, 'lf1', 20)}
  ${ivyLeafSet(1435,280, 16, 'lf3', -20)}
  ${ivyLeafSet(1418,355, 22, 'lf2', 15)}
  ${ivyLeafSet(1428,430, 18, 'lf1', -18)}
  ${ivyLeafSet(1415,505, 20, 'lf3', 22)}
  ${ivyLeafSet(1432,580, 16, 'lf2', -15)}
  ${ivyLeafSet(1422,650, 22, 'lf1', 18)}
  ${ivyLeafSet(1425,720, 18, 'lf2', -20)}

  <!-- Right secondary vine -->
  <path d="M1360,0 C1340,60 1370,140 1350,220 C1330,300 1360,380 1340,460 C1320,540 1350,620 1330,700 C1310,780 1340,860 1360,900"
        fill="none" stroke="#4A8820" stroke-width="7" stroke-linecap="round" opacity="0.6"/>
  ${ivyLeafSet(1352,80,  16, 'lf2', -25)}
  ${ivyLeafSet(1365,190, 14, 'lf1', 18)}
  ${ivyLeafSet(1345,310, 18, 'lf3', -22)}
  ${ivyLeafSet(1358,430, 14, 'lf2', 16)}
  ${ivyLeafSet(1335,560, 16, 'lf1', -20)}
  ${ivyLeafSet(1352,680, 14, 'lf3', 18)}

  <!-- Right third vine -->
  <path d="M1285,0 C1270,50 1295,120 1280,190 C1265,260 1290,340 1275,420 C1260,500 1285,580 1270,660"
        fill="none" stroke="#5A9020" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
  ${ivyLeafSet(1282,60,  13, 'lf1', 20)}
  ${ivyLeafSet(1278,180, 11, 'lf2', -22)}
  ${ivyLeafSet(1280,310, 13, 'lf3', 18)}
  ${ivyLeafSet(1273,440, 11, 'lf1', -20)}
  ${ivyLeafSet(1277,560, 13, 'lf2', 16)}

  <!-- ═══ TOP CENTRE hanging vines ═══ -->
  <path d="M400,0 C390,60 410,110 395,160 C380,210 400,260 385,310 C370,360 390,400 375,440"
        fill="none" stroke="#4A8820" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
  ${ivyLeafSet(392,70,  14, 'lf2', -18)}
  ${ivyLeafSet(388,180, 12, 'lf1', 20)}
  ${ivyLeafSet(380,300, 14, 'lf3', -16)}
  ${ivyLeafSet(376,400, 12, 'lf2', 18)}

  <path d="M1040,0 C1050,55 1030,110 1045,165 C1060,220 1038,270 1052,320 C1066,370 1045,415 1058,460"
        fill="none" stroke="#4A8820" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
  ${ivyLeafSet(1048,65,  14, 'lf1', 20)}
  ${ivyLeafSet(1052,175, 12, 'lf2', -18)}
  ${ivyLeafSet(1050,295, 14, 'lf3', 16)}
  ${ivyLeafSet(1055,410, 12, 'lf1', -20)}

  <!-- ═══ FLOOR PLANTS ═══ -->

  <!-- Left big potted fern -->
  ${fern(60, 820, 1.4)}
  <!-- Left flower cluster -->
  ${flowerCluster(170, 840, 1.1)}
  <!-- Left tall grass/reed -->
  ${tallGrass(280, 880, 1.2)}

  <!-- Right big potted fern -->
  ${fern(1380, 820, 1.4, true)}
  <!-- Right flower cluster -->
  ${flowerCluster(1270, 840, 1.1, true)}
  <!-- Right tall grass -->
  ${tallGrass(1160, 880, 1.2, true)}

  <!-- Centre bottom flowers -->
  ${flowerCluster(680, 870, 0.85)}
  ${flowerCluster(760, 875, 0.75)}

  <!-- ═══ WINDOW SILL PLANTS (left + right edges) ═══ -->
  <!-- Left sill pots -->
  ${pot(30, 760)}
  ${pot(110, 745)}
  <!-- Right sill pots -->
  ${pot(1360, 760, true)}
  ${pot(1280, 745, true)}

  <!-- ═══ SCATTERED FLOOR WILDFLOWERS ═══ -->
  ${wildflower(340, 878, 'flPink',  0.9)}
  ${wildflower(390, 882, 'flPurp',  0.8)}
  ${wildflower(460, 876, 'flYell',  0.85)}
  ${wildflower(520, 880, 'flPink',  0.75)}
  ${wildflower(600, 878, 'flPeach', 0.9)}
  ${wildflower(640, 884, 'flPurp',  0.8)}

  ${wildflower(900,  882, 'flYell',  0.85)}
  ${wildflower(960,  878, 'flPink',  0.9)}
  ${wildflower(1020, 880, 'flPurp',  0.75)}
  ${wildflower(1080, 876, 'flPeach', 0.85)}
  ${wildflower(1120, 882, 'flYell',  0.8)}

  <!-- ═══ Ambient light shafts ═══ -->
  <g opacity="0.07" fill="white">
    <polygon points="620,0 680,0 760,900 700,900"/>
    <polygon points="760,0 800,0 870,900 830,900"/>
    <polygon points="900,0 930,0 990,900 960,900"/>
  </g>

  <!-- Floor shadow strip -->
  <rect x="0" y="860" width="1440" height="40"
        fill="rgba(80,50,20,0.15)" rx="0"/>
  `;

  document.body.insertBefore(svg, document.body.firstChild);
}

// ── SVG helper: cluster of ivy leaves at (cx,cy) ─────
function ivyLeafSet(cx, cy, r, grad, rot) {
  const g = `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <ellipse rx="${r}" ry="${r*0.65}" fill="url(#${grad})" opacity="0.85"/>
    <ellipse rx="${r*0.6}" ry="${r*0.4}" fill="url(#${grad})" opacity="0.5" transform="translate(${r*0.5},${-r*0.3}) rotate(35)"/>
    <ellipse rx="${r*0.5}" ry="${r*0.35}" fill="url(#${grad})" opacity="0.5" transform="translate(${-r*0.4},${-r*0.35}) rotate(-30)"/>
    <line x1="0" y1="0" x2="${r*0.9}" y2="${-r*0.4}" stroke="#2A6010" stroke-width="0.8" opacity="0.5"/>
  </g>`;
  return g;
}

// ── SVG helper: fern plant ────────────────────────────
function fern(x, y, sc, flip=false) {
  const f = flip ? -1 : 1;
  return `<g transform="translate(${x},${y}) scale(${f*sc},${sc})">
    <!-- Pot -->
    <path d="M-22,0 L-28,28 L28,28 L22,0Z" fill="#C87840" opacity="0.9"/>
    <ellipse cx="0" cy="0" rx="22" ry="7" fill="#D89050"/>
    <rect x="-24" y="25" width="48" height="5" rx="2" fill="#B06030"/>
    <!-- Soil -->
    <ellipse cx="0" cy="0" rx="19" ry="5" fill="#6B4020" opacity="0.7"/>
    <!-- Fronds -->
    <path d="M0,-5 C-8,-40 -38,-55 -45,-48" fill="none" stroke="#3A8020" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M0,-5 C-5,-38 -20,-60 -18,-65" fill="none" stroke="#3A8020" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M0,-5 C2,-42 8,-62 5,-70"      fill="none" stroke="#4A9028" stroke-width="3"   stroke-linecap="round"/>
    <path d="M0,-5 C8,-36 22,-55 24,-60"    fill="none" stroke="#3A8020" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M0,-5 C12,-32 38,-40 42,-38"   fill="none" stroke="#3A8020" stroke-width="2"   stroke-linecap="round"/>
    <!-- Frond leaves (pinnate) -->
    ${fernLeaves(-10,-30, -40, 3.5, '#5A9828')}
    ${fernLeaves(-8,-50,  -20, 3,   '#4A8820')}
    ${fernLeaves(2,-58,   10,  3.5, '#5A9828')}
    ${fernLeaves(10,-48,  30,  3,   '#4A8820')}
    ${fernLeaves(16,-30,  50,  2.5, '#5A9828')}
  </g>`;
}

function fernLeaves(cx, cy, rot, r, col) {
  return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <ellipse rx="${r*2.2}" ry="${r*0.7}" fill="${col}" opacity="0.85" transform="translate(${r*1.5},0)"/>
    <ellipse rx="${r*2.2}" ry="${r*0.7}" fill="${col}" opacity="0.85" transform="translate(${-r*1.5},0) scale(-1,1)"/>
  </g>`;
}

// ── SVG helper: flower cluster ────────────────────────
function flowerCluster(x, y, sc, flip=false) {
  const f = flip ? -1 : 1;
  return `<g transform="translate(${x},${y}) scale(${f*sc},${sc})">
    <!-- Stems -->
    <line x1="0"   y1="0" x2="-18" y2="-55" stroke="#4A8820" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="0"   y1="0" x2="5"   y2="-62" stroke="#4A8820" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="0"   y1="0" x2="22"  y2="-50" stroke="#4A8820" stroke-width="2"   stroke-linecap="round"/>
    <line x1="0"   y1="0" x2="-6"  y2="-38" stroke="#4A8820" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Small leaves on stems -->
    <ellipse cx="-12" cy="-32" rx="8" ry="4" fill="#5A9828" opacity="0.8" transform="rotate(-35,-12,-32)"/>
    <ellipse cx="14"  cy="-28" rx="7" ry="3.5" fill="#5A9828" opacity="0.8" transform="rotate(30,14,-28)"/>
    <!-- Flowers -->
    ${daisy(-18,-58, 11, 'flPink')}
    ${daisy(5,  -65, 13, 'flPurp')}
    ${daisy(22, -53, 10, 'flYell')}
    ${daisy(-6, -40,  8, 'flPeach')}
    <!-- Ground leaves -->
    <ellipse cx="-24" cy="-5" rx="16" ry="7" fill="#5A9828" opacity="0.7" transform="rotate(-20,-24,-5)"/>
    <ellipse cx="26"  cy="-4" rx="14" ry="6" fill="#4A8820" opacity="0.7" transform="rotate(25,26,-4)"/>
    <ellipse cx="4"   cy="-2" rx="18" ry="6" fill="#6AAA30" opacity="0.6"/>
  </g>`;
}

// ── SVG helper: daisy flower ──────────────────────────
function daisy(cx, cy, r, grad) {
  const petals = 7;
  let p = '';
  for (let i = 0; i < petals; i++) {
    const a = (360 / petals) * i;
    p += `<ellipse cx="${cx}" cy="${cy}" rx="${r*0.45}" ry="${r}"
           fill="url(#${grad})" opacity="0.9"
           transform="rotate(${a},${cx},${cy}) translate(0,${-r*0.55})"/>`;
  }
  return `${p}<circle cx="${cx}" cy="${cy}" r="${r*0.45}" fill="url(#flCent)"/>`;
}

// ── SVG helper: tall grass / reed ─────────────────────
function tallGrass(x, y, sc, flip=false) {
  const f = flip ? -1 : 1;
  return `<g transform="translate(${x},${y}) scale(${f*sc},${sc})">
    <path d="M0,0 C-5,-30 -12,-80 -8,-120 C-4,-160 2,-180 0,-210" fill="none" stroke="#6AB030" stroke-width="3" stroke-linecap="round"/>
    <path d="M8,0 C12,-28 18,-75 14,-115 C10,-155 6,-175 10,-200"  fill="none" stroke="#5A9828" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M-8,0 C-14,-25 -22,-65 -18,-100 C-14,-135 -8,-155 -12,-185" fill="none" stroke="#4A8820" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M16,0 C22,-20 30,-55 26,-85 C22,-115 16,-130 20,-155" fill="none" stroke="#5A9020" stroke-width="2" stroke-linecap="round"/>
    <!-- Seed heads -->
    <ellipse cx="-8"  cy="-210" rx="3" ry="10" fill="#8A9040" opacity="0.8"/>
    <ellipse cx="10"  cy="-200" rx="3" ry="9"  fill="#9AAA40" opacity="0.8"/>
    <ellipse cx="-12" cy="-185" rx="2.5" ry="8" fill="#8A9040" opacity="0.75"/>
    <ellipse cx="20"  cy="-155" rx="2.5" ry="7" fill="#9AAA40" opacity="0.75"/>
    <!-- Grass blades at base -->
    <path d="M-18,0 C-22,-18 -28,-40 -24,-52" fill="none" stroke="#6AB030" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M18,0 C24,-16 30,-36 26,-48"     fill="none" stroke="#6AB030" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M-30,0 C-34,-14 -38,-30 -35,-40" fill="none" stroke="#5A9020" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M30,0 C35,-12 40,-28 36,-38"     fill="none" stroke="#5A9020" stroke-width="1.5" stroke-linecap="round"/>
  </g>`;
}

// ── SVG helper: small wildflower ─────────────────────
function wildflower(x, y, grad, sc) {
  return `<g transform="translate(${x},${y}) scale(${sc})">
    <line x1="0" y1="0" x2="0" y2="-28" stroke="#4A8820" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="-6" cy="-16" rx="6" ry="3" fill="#5A9828" opacity="0.75" transform="rotate(-35,-6,-16)"/>
    ${daisy(0, -30, 8, grad)}
  </g>`;
}

// ── SVG helper: terracotta pot ────────────────────────
function pot(x, y, flip=false) {
  const f = flip ? -1 : 1;
  return `<g transform="translate(${x},${y}) scale(${f},1)">
    <path d="M-15,0 L-19,24 L19,24 L15,0Z" fill="#C87840" opacity="0.9"/>
    <ellipse cx="0" cy="0" rx="15" ry="5" fill="#D89050"/>
    <rect x="-17" y="21" width="34" height="4" rx="2" fill="#B06030"/>
    <ellipse cx="0" cy="0" rx="12" ry="4" fill="#6B4020" opacity="0.6"/>
    <!-- Mini plant -->
    <path d="M0,-2 C-6,-20 -14,-30 -12,-36" fill="none" stroke="#3A8020" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M0,-2 C2,-22 4,-34 2,-40"      fill="none" stroke="#4A9028" stroke-width="2"   stroke-linecap="round"/>
    <path d="M0,-2 C8,-18 16,-26 14,-32"    fill="none" stroke="#3A8020" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="-10" cy="-26" rx="8" ry="4" fill="#5A9828" opacity="0.8" transform="rotate(-30,-10,-26)"/>
    <ellipse cx="10"  cy="-24" rx="7" ry="3.5" fill="#5A9828" opacity="0.8" transform="rotate(25,10,-24)"/>
    ${daisy(-12,-38, 9, 'flPink')}
    ${daisy(2,  -42, 11, 'flPurp')}
    ${daisy(14, -34, 8, 'flYell')}
  </g>`;
}

// ─── Book spine context menu (Delete) ────────────────
function showBookMenu(book, spineEl, event) {
  // Remove any existing menu
  document.getElementById('bookContextMenu')?.remove();

  const menu = document.createElement('div');
  menu.id = 'bookContextMenu';
  menu.style.cssText = `
    position:fixed;
    left:${Math.min(event.clientX, window.innerWidth - 160)}px;
    top:${Math.min(event.clientY, window.innerHeight - 120)}px;
    background:linear-gradient(135deg,rgba(255,242,255,.98),rgba(255,225,245,.96));
    border:1.5px solid rgba(255,150,210,.55);
    border-radius:14px;
    box-shadow:0 8px 28px rgba(180,80,160,.28);
    z-index:900;
    overflow:hidden;
    font-family:'Cormorant Garamond',serif;
    min-width:150px;
    animation:menuPop .18s cubic-bezier(.4,0,.2,1);
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes menuPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
  .book-menu-item{padding:10px 16px;cursor:pointer;font-size:.9rem;letter-spacing:.5px;display:flex;align-items:center;gap:8px;color:#3A0A5A;transition:background .15s;}
  .book-menu-item:hover{background:rgba(255,150,210,.2);}
  .book-menu-item.danger{color:#C0003A;}
  .book-menu-item.danger:hover{background:rgba(255,80,80,.12);}
  .book-menu-sep{height:1px;background:rgba(200,130,180,.25);margin:2px 0;}`;
  menu.appendChild(style);

  const title = document.createElement('div');
  title.style.cssText = 'padding:10px 16px 6px;font-size:.7rem;color:rgba(120,60,120,.6);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid rgba(200,130,180,.2);';
  title.textContent = book.name.slice(0, 22) + (book.name.length > 22 ? '…' : '');
  menu.appendChild(title);

  const readBtn = document.createElement('div');
  readBtn.className = 'book-menu-item';
  readBtn.innerHTML = '📖 &nbsp;Open & Read';
  readBtn.onclick = () => { menu.remove(); onShelfBookClick(book, spineEl); };
  menu.appendChild(readBtn);

  const sep = document.createElement('div');
  sep.className = 'book-menu-sep';
  menu.appendChild(sep);

  const pct = book.lastPage && book.pages ? Math.round((book.lastPage / book.pages) * 100) : 0;
  if (pct > 0) {
    const prog = document.createElement('div');
    prog.className = 'book-menu-item';
    prog.style.cssText += 'cursor:default;color:rgba(100,50,100,.7);font-size:.82rem;';
    prog.innerHTML = `✦ &nbsp;${pct}% read · page ${book.lastPage}`;
    menu.appendChild(prog);
    menu.appendChild(sep.cloneNode());
  }

  const delBtn = document.createElement('div');
  delBtn.className = 'book-menu-item danger';
  delBtn.innerHTML = '🗑 &nbsp;Remove from library';
  delBtn.onclick = async () => {
    menu.remove();
    if (!confirm(`Remove "${book.name}" forever? This cannot be undone.`)) return;
    await deleteBook(book.id);
    allBooks = allBooks.filter(b => b.id !== book.id);
    showToast(`"${book.name}" removed ✦`);
    pixieSay("Poof! It's gone ✦");
    renderShelves(allBooks);
    renderPending(allBooks);
  };
  menu.appendChild(delBtn);

  document.body.appendChild(menu);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 10);
}

// ─── Init upload ──────────────────────────────────────
function initUpload() {
  const input = document.getElementById('fileInput');
  input.addEventListener('change', () => {
    if (input.files.length) handleFiles(input.files);
    input.value = '';
  });
}

// ─── Main init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  buildGreenhouseBg();
  renderCalendar();
  renderQuote();
  updateClock();
  setInterval(updateClock, 1000);
  spawnButterflies();
  spawnSparkles();
  initPixie();
  initUpload();
  initTooltip();

  // Build initial shelf units
  ensureShelfUnits(INITIAL_UNITS);

  // Load all books
  allBooks = await getAllBooks();
  allBooks.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));

  renderShelves(allBooks);
  renderPending(allBooks);

  // Welcome message
  const placed = allBooks.filter(b => b.shelfIndex !== undefined);
  await sleep(800);
  if (placed.length === 0) {
    pixieSay('Welcome! Add a PDF and I\'ll help you shelve it ✦');
  } else {
    pixieSay(`Hello again! ${placed.length} tome${placed.length > 1 ? 's' : ''} in your library ✦`);
  }
});
