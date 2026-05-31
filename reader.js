// ✨ Fairytopia Library — reader.js ✨

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── State ────────────────────────────────────────────
let pdfDoc      = null;
let currentLeft = 1;
let totalPages  = 0;
let isFlipping  = false;
let isSingle    = false;
let pageCache   = new Map();
let bookId      = null;  // for progress saving

// Book dimensions (computed from first page)
let PAGE_W = 0;
let PAGE_H = 0;

// Zoom (re-render at higher resolution — never CSS-scale bitmaps)
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 2.1;
let zoomLevel = ZOOM_DEFAULT;
let previewZoom = ZOOM_DEFAULT;
let pinchStartDist = 0;
let pinchStartZoom = 1;
let zoomCommitTimer = null;
let isZoomCommitting = false;

// ─── Iridescent Monarch Butterflies (reader) ─────────
const READER_HUES = [0, 40, 90, 150, 210, 270, 320];

function makeReaderMonarch(hue) {
  const uid = Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
  <defs>
    <linearGradient id="rg1_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="hsl(${200+hue},80%,85%)"/>
      <stop offset="50%"  stop-color="hsl(${240+hue},72%,78%)"/>
      <stop offset="100%" stop-color="hsl(${180+hue},65%,88%)"/>
    </linearGradient>
    <linearGradient id="rg2_${uid}" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="hsl(${210+hue},78%,83%)"/>
      <stop offset="50%"  stop-color="hsl(${250+hue},70%,76%)"/>
      <stop offset="100%" stop-color="hsl(${185+hue},63%,86%)"/>
    </linearGradient>
    <linearGradient id="rs_${uid}" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.55"/>
      <stop offset="50%"  stop-color="white" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.28"/>
    </linearGradient>
  </defs>
  <path d="M80,54 C68,36 42,8 10,14 C-4,22 4,46 18,52 C34,58 56,54 80,54Z"      fill="url(#rg1_${uid})" opacity="0.92"/>
  <path d="M80,54 C92,36 118,8 150,14 C164,22 156,46 142,52 C126,58 104,54 80,54Z" fill="url(#rg2_${uid})" opacity="0.92"/>
  <path d="M80,58 C66,64 38,80 24,74 C10,64 18,46 36,50 C52,54 72,58 80,58Z"      fill="url(#rg1_${uid})" opacity="0.85"/>
  <path d="M80,58 C94,64 122,80 136,74 C150,64 142,46 124,50 C108,54 88,58 80,58Z" fill="url(#rg2_${uid})" opacity="0.85"/>
  <path d="M80,54 C68,36 42,8 10,14 C-4,22 4,46 18,52 C34,58 56,54 80,54Z"        fill="url(#rs_${uid})" opacity="0.5"/>
  <path d="M80,54 C92,36 118,8 150,14 C164,22 156,46 142,52 C126,58 104,54 80,54Z" fill="url(#rs_${uid})" opacity="0.5"/>
  <path d="M80,54 C68,36 42,8 10,14 C-4,22 4,46 18,52 C34,58 56,54 80,54Z"      fill="none" stroke="#0D0018" stroke-width="2.8" opacity="0.75"/>
  <path d="M80,54 C92,36 118,8 150,14 C164,22 156,46 142,52 C126,58 104,54 80,54Z" fill="none" stroke="#0D0018" stroke-width="2.8" opacity="0.75"/>
  <path d="M80,58 C66,64 38,80 24,74 C10,64 18,46 36,50 C52,54 72,58 80,58Z"      fill="none" stroke="#0D0018" stroke-width="2.4" opacity="0.7"/>
  <path d="M80,58 C94,64 122,80 136,74 C150,64 142,46 124,50 C108,54 88,58 80,58Z" fill="none" stroke="#0D0018" stroke-width="2.4" opacity="0.7"/>
  <path d="M80,54 C72,42 58,28 38,20" fill="none" stroke="#0D0018" stroke-width="1.6" opacity="0.6"/>
  <path d="M80,54 C88,42 102,28 122,20" fill="none" stroke="#0D0018" stroke-width="1.6" opacity="0.6"/>
  <path d="M80,58 C72,64 54,68 36,68" fill="none" stroke="#0D0018" stroke-width="1.1" opacity="0.45"/>
  <path d="M80,58 C88,64 106,68 124,68" fill="none" stroke="#0D0018" stroke-width="1.1" opacity="0.45"/>
  <g fill="white" opacity="0.88">
    <circle cx="12" cy="18" r="2.2"/><circle cx="7"  cy="28" r="1.8"/><circle cx="6"  cy="38" r="1.6"/><circle cx="9"  cy="47" r="1.5"/>
    <circle cx="148" cy="18" r="2.2"/><circle cx="153" cy="28" r="1.8"/><circle cx="154" cy="38" r="1.6"/><circle cx="151" cy="47" r="1.5"/>
    <circle cx="26" cy="73" r="1.8"/><circle cx="37" cy="79" r="1.5"/><circle cx="134" cy="73" r="1.8"/><circle cx="123" cy="79" r="1.5"/>
  </g>
  <line x1="80" y1="50" x2="66" y2="28" stroke="#0D0018" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
  <line x1="80" y1="50" x2="94" y2="28" stroke="#0D0018" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
  <circle cx="64" cy="26" r="3"   fill="#0D0018" opacity="0.75"/>
  <circle cx="96" cy="26" r="3"   fill="#0D0018" opacity="0.75"/>
  <circle cx="64" cy="26" r="1.4" fill="white"   opacity="0.7"/>
  <circle cx="96" cy="26" r="1.4" fill="white"   opacity="0.7"/>
  <ellipse cx="80" cy="58" rx="3.5" ry="13" fill="#0D0018" opacity="0.8"/>
</svg>`;
}

function spawnReaderButterflies() {
  const c = document.getElementById('butterflies-container');
  for (let i = 0; i < 8; i++) {
    const bt = document.createElement('div');
    bt.className = 'butterfly';
    const sz  = 32 + Math.random() * 30;
    bt.style.cssText = `
      width:${sz}px; height:${sz * 0.7}px;
      --dur:${12 + Math.random() * 12}s;
      --delay:${Math.random() * 18}s;
      --sx:-13vw; --sy:${Math.random() * 90}vh; --sc:${0.5 + Math.random() * 0.8};
      filter: drop-shadow(0 2px 10px rgba(160,140,255,0.55));
    `;
    bt.innerHTML = makeReaderMonarch(READER_HUES[i % READER_HUES.length]);
    c.appendChild(bt);
  }
}

// ─── Helpers ──────────────────────────────────────────
function getBookId() {
  return new URLSearchParams(window.location.search).get('id');
}

function getStartPage() {
  const p = parseInt(new URLSearchParams(window.location.search).get('page'));
  return (!isNaN(p) && p >= 1) ? p : 1;
}

function setLoading(show, progress = 0) {
  const el = document.getElementById('readerLoading');
  const pf = document.getElementById('loadProgress');
  el.classList.toggle('hidden', !show);
  pf.style.width = progress + '%';
}

function getDisplaySize() {
  return {
    w: Math.round(PAGE_W * zoomLevel),
    h: Math.round(PAGE_H * zoomLevel),
  };
}

function getRenderDpr() {
  return Math.min(window.devicePixelRatio || 1, 3);
}

function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function formatZoomLabel() {
  return Math.round(previewZoom * 100) + '%';
}

function cacheKey(pageNum) {
  return `${pageNum}@${Math.round(zoomLevel * 100)}`;
}

function announcePage() {
  const announcer = document.getElementById('pageAnnouncer');
  const indicator = document.getElementById('pageIndicator');
  if (announcer && indicator) {
    announcer.textContent = `Now viewing ${indicator.textContent}, zoom ${formatZoomLabel()}`;
  }
}

async function getPageAccessibleText(pageNum) {
  if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return '';
  try {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    return content.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

async function updatePageAccessibility(leftPageNum) {
  const rightPageNum = leftPageNum + 1;
  const showRight = rightPageNum <= totalPages && !isSingle;

  const canvasLeft  = document.getElementById('canvasLeft');
  const canvasRight = document.getElementById('canvasRight');
  const textLeft    = document.getElementById('pageTextLeft');
  const textRight   = document.getElementById('pageTextRight');
  const labelLeft   = document.getElementById('pageLeftLabel');
  const labelRight  = document.getElementById('pageRightLabel');

  const leftLabel = `Page ${leftPageNum} of ${totalPages}`;
  canvasLeft.setAttribute('aria-label', leftLabel);
  labelLeft.textContent = leftLabel;

  if (showRight) {
    const rightLabel = `Page ${rightPageNum} of ${totalPages}`;
    canvasRight.setAttribute('aria-label', rightLabel);
    labelRight.textContent = rightLabel;
    document.getElementById('pageRight').removeAttribute('aria-hidden');
  } else {
    canvasRight.setAttribute('aria-label', 'Empty page');
    labelRight.textContent = 'Empty page';
    document.getElementById('pageRight').setAttribute('aria-hidden', 'true');
  }

  const [leftText, rightText] = await Promise.all([
    getPageAccessibleText(leftPageNum),
    showRight ? getPageAccessibleText(rightPageNum) : Promise.resolve(''),
  ]);

  textLeft.textContent = leftText || `Page ${leftPageNum} has no extractable text.`;
  if (showRight) {
    textRight.textContent = rightText || `Page ${rightPageNum} has no extractable text.`;
  } else {
    textRight.textContent = '';
  }

  announcePage();
}

function updateUI() {
  const indicator = document.getElementById('pageIndicator');
  const fill      = document.getElementById('progressFill');
  const btnPrev   = document.getElementById('btnPrev');
  const btnNext   = document.getElementById('btnNext');
  const progressBar = document.getElementById('progressBar');
  const pageJump  = document.getElementById('pageJumpInput');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomIn  = document.getElementById('btnZoomIn');
  const zoomInput  = document.getElementById('zoomLevelInput');

  const rightPage = currentLeft + 1;
  const showRight = rightPage <= totalPages && !isSingle;

  if (isSingle) {
    indicator.textContent = `${currentLeft} / ${totalPages}`;
  } else {
    const rightStr = showRight ? `–${Math.min(rightPage, totalPages)}` : '';
    indicator.textContent = `${currentLeft}${rightStr} / ${totalPages}`;
  }

  const pct = ((currentLeft - 1) / Math.max(totalPages - 1, 1)) * 100;
  fill.style.width = pct + '%';

  if (progressBar) {
    progressBar.setAttribute('aria-valuemin', '1');
    progressBar.setAttribute('aria-valuemax', String(totalPages));
    progressBar.setAttribute('aria-valuenow', String(currentLeft));
    progressBar.setAttribute('aria-valuetext', indicator.textContent);
  }

  if (pageJump) {
    pageJump.max = String(totalPages);
    pageJump.placeholder = String(currentLeft);
  }

  btnPrev.disabled = currentLeft <= 1;
  btnNext.disabled = isSingle
    ? currentLeft >= totalPages
    : currentLeft + (isSingle ? 0 : 1) >= totalPages;

  if (btnZoomOut) btnZoomOut.disabled = previewZoom <= ZOOM_MIN || isZoomCommitting;
  if (btnZoomIn)  btnZoomIn.disabled  = previewZoom >= ZOOM_MAX || isZoomCommitting;
  if (zoomInput && document.activeElement !== zoomInput) {
    zoomInput.value = String(Math.round(previewZoom * 100));
  }

  // Auto-save reading progress (now instant localStorage write — no IDB roundtrip)
  if (bookId) {
    try { updateBookMeta(bookId, { lastPage: currentLeft }); } catch (_) {}
  }
}

// ─── Page Rendering ───────────────────────────────────
async function renderPageToCanvas(pageNum, canvas) {
  const display = getDisplaySize();

  if (!pdfDoc || pageNum < 1 || pageNum > totalPages) {
    const ctx = canvas.getContext('2d');
    const dpr = getRenderDpr();
    canvas.width  = Math.round(display.w * dpr) || 400;
    canvas.height = Math.round(display.h * dpr) || 566;
    canvas.style.width  = display.w + 'px';
    canvas.style.height = display.h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f8f0f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const page = await pdfDoc.getPage(pageNum);
  const naturalVP = page.getViewport({ scale: 1 });

  // Render at display size × device pixel ratio × zoom — keeps text sharp when zoomed
  const renderScale = (display.w / naturalVP.width) * Math.min(window.devicePixelRatio || 1, 3);
  const vp = page.getViewport({ scale: renderScale });

  canvas.width  = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  canvas.style.width  = display.w + 'px';
  canvas.style.height = display.h + 'px';

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  try {
    const bmp = await createImageBitmap(canvas);
    pageCache.set(cacheKey(pageNum), {
      bmp,
      pixelW: canvas.width,
      pixelH: canvas.height,
      cssW: display.w,
      cssH: display.h,
    });
  } catch {
    // Fallback: no cache on this page
  }
}

// Draw a cached page (ImageBitmap → canvas, 1:1 pixels — no upscaling blur)
function drawCachedPage(pageNum, canvas) {
  const cached = pageCache.get(cacheKey(pageNum));
  if (!cached || !cached.bmp) return false;

  canvas.width  = cached.pixelW;
  canvas.height = cached.pixelH;
  canvas.style.width  = cached.cssW + 'px';
  canvas.style.height = cached.cssH + 'px';

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cached.bmp, 0, 0);
  return true;
}

// Pre-render nearby pages in background using a scratch canvas
async function preloadAround(n) {
  const toLoad = [n - 2, n - 1, n, n + 1, n + 2, n + 3]
    .filter(p => p >= 1 && p <= totalPages && !pageCache.has(cacheKey(p)));
  for (const p of toLoad) {
    try {
      const scratch = document.createElement('canvas');
      await renderPageToCanvas(p, scratch);
    } catch { /* ignore */ }
  }
}

// ─── Spread Display ───────────────────────────────────
async function renderPage(pageNum, canvas) {
  if (pageCache.has(cacheKey(pageNum)) && pageCache.get(cacheKey(pageNum)).bmp) {
    drawCachedPage(pageNum, canvas);
  } else {
    await renderPageToCanvas(pageNum, canvas);
  }
}

async function displaySpread(leftPageNum) {
  const canvasLeft  = document.getElementById('canvasLeft');
  const canvasRight = document.getElementById('canvasRight');
  const pageLeft    = document.getElementById('pageLeft');
  const pageRight   = document.getElementById('pageRight');
  const spineEl     = document.querySelector('.book-spine');

  if (isSingle) {
    pageLeft.style.display  = 'block';
    pageRight.style.display = 'none';
    if (spineEl) spineEl.style.display = 'none';
    await renderPage(leftPageNum, canvasLeft);
  } else {
    pageLeft.style.display  = 'block';
    pageRight.style.display = 'block';
    if (spineEl) spineEl.style.display = 'block';
    await renderPage(leftPageNum, canvasLeft);
    await renderPage(leftPageNum + 1, canvasRight);
  }

  updateUI();
  preloadAround(leftPageNum);
  updatePageAccessibility(leftPageNum);
  updateScrollAreaSize();
}

// ─── Flip Animation ───────────────────────────────────
async function flipForward() {
  if (isFlipping) return;
  const step = isSingle ? 1 : 2;
  const next = currentLeft + step;
  if (next > totalPages) return;

  if (isSingle) {
    isFlipping = true;
    await animateSingleFlip('fwd', currentLeft, next);
    currentLeft = next;
    await displaySpread(currentLeft);
    isFlipping = false;
    return;
  }

  // Two-page flip: right page folds over to left
  isFlipping = true;

  const flipCard  = document.getElementById('flipCard');
  const flipFront = document.getElementById('flipFront');
  const flipBack  = document.getElementById('flipBack');
  const canvasRight = document.getElementById('canvasRight');

  // Render front (current right page) and back (next left page)
  await renderPage(currentLeft + 1, flipFront);
  await renderPage(currentLeft + 2, flipBack);

  // Show next right page underneath
  await renderPage(currentLeft + 2, canvasLeft);
  await renderPage(currentLeft + 3, canvasRight);

  // Position and show flip card on right side
  flipCard.classList.remove('left-flip', 'right-flip', 'flipping-fwd', 'flipping-bwd');
  flipCard.classList.add('right-flip', 'active');

  // Start flip animation
  requestAnimationFrame(() => {
    flipCard.classList.add('flipping-fwd');
  });

  await sleep(750);

  // Commit
  currentLeft += 2;
  flipCard.classList.remove('active', 'flipping-fwd');
  await displaySpread(currentLeft);
  isFlipping = false;
}

async function flipBackward() {
  if (isFlipping) return;
  const step = isSingle ? 1 : 2;
  const prev = currentLeft - step;
  if (prev < 1) return;

  if (isSingle) {
    isFlipping = true;
    await animateSingleFlip('bwd', currentLeft, prev);
    currentLeft = prev;
    await displaySpread(currentLeft);
    isFlipping = false;
    return;
  }

  // Two-page flip: left page folds back to right
  isFlipping = true;

  const flipCard  = document.getElementById('flipCard');
  const flipFront = document.getElementById('flipFront');
  const flipBack  = document.getElementById('flipBack');
  const canvasLeft  = document.getElementById('canvasLeft');
  const canvasRight = document.getElementById('canvasRight');

  // Front: current left page; Back: previous right page
  await renderPage(currentLeft,     flipFront);
  await renderPage(currentLeft - 1, flipBack);

  // Prep pages underneath
  await renderPage(currentLeft - 2, canvasLeft);
  await renderPage(currentLeft - 1, canvasRight);

  flipCard.classList.remove('left-flip', 'right-flip', 'flipping-fwd', 'flipping-bwd');
  flipCard.classList.add('left-flip', 'active');

  requestAnimationFrame(() => {
    flipCard.classList.add('flipping-bwd');
  });

  await sleep(750);

  currentLeft -= 2;
  flipCard.classList.remove('active', 'flipping-bwd');
  await displaySpread(currentLeft);
  isFlipping = false;
}

// ─── Single-page Flip ─────────────────────────────────
async function animateSingleFlip(dir, fromPage, toPage) {
  const canvasLeft = document.getElementById('canvasLeft');
  const flipCard   = document.getElementById('flipCard');
  const flipFront  = document.getElementById('flipFront');
  const flipBack   = document.getElementById('flipBack');

  await renderPage(fromPage, flipFront);
  await renderPage(toPage,   flipBack);
  await renderPage(toPage,   canvasLeft);

  flipCard.classList.remove('left-flip', 'right-flip', 'flipping-fwd', 'flipping-bwd', 'active');
  flipCard.style.width = '100%';
  flipCard.style.left  = '0';

  flipCard.classList.add(dir === 'fwd' ? 'right-flip' : 'left-flip', 'active');
  requestAnimationFrame(() => {
    flipCard.classList.add(dir === 'fwd' ? 'flipping-fwd' : 'flipping-bwd');
  });
  await sleep(750);
  flipCard.classList.remove('active', 'flipping-fwd', 'flipping-bwd');
  flipCard.style.width = '';
  flipCard.style.left  = '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function applyBookLayout() {
  const display = getDisplaySize();
  const book      = document.getElementById('book');
  const pageLeft  = document.getElementById('pageLeft');
  const pageRight = document.getElementById('pageRight');

  pageLeft.style.width  = display.w + 'px';
  pageLeft.style.height = display.h + 'px';

  if (isSingle) {
    pageRight.style.display = 'none';
    const sp = document.querySelector('.book-spine');
    if (sp) sp.style.display = 'none';
    book.style.width  = display.w + 'px';
    book.style.height = display.h + 'px';
  } else {
    pageRight.style.width   = display.w + 'px';
    pageRight.style.height  = display.h + 'px';
    book.style.width  = (display.w * 2 + 12) + 'px';
    book.style.height = display.h + 'px';
  }

  updateScrollAreaSize();
}

function updateScrollAreaSize(z = previewZoom) {
  const content  = document.getElementById('bookScrollContent');
  const scene    = document.getElementById('bookScene');
  const viewport = document.getElementById('bookViewport');
  if (!content || !scene || !viewport || !PAGE_W) return;

  const w = Math.round(PAGE_W * z);
  const h = Math.round(PAGE_H * z);
  const bookW = isSingle ? w : w * 2 + 12;

  const layoutW = Math.round(PAGE_W * zoomLevel);
  const layoutH = Math.round(PAGE_H * zoomLevel);
  const layoutBookW = isSingle ? layoutW : layoutW * 2 + 12;

  content.style.width = bookW + 'px';
  content.style.height = h + 'px';
  content.style.minWidth = bookW + 'px';
  content.style.minHeight = h + 'px';

  const ratio = z / zoomLevel;
  if (Math.abs(ratio - 1) < 0.001) {
    scene.style.transform = '';
    scene.style.transformOrigin = '';
    scene.style.width = '';
    scene.style.height = '';
  } else {
    scene.style.width = layoutBookW + 'px';
    scene.style.height = layoutH + 'px';
    scene.style.transform = `scale(${ratio})`;
    scene.style.transformOrigin = 'top left';
  }

  const viewW = viewport.clientWidth;
  const viewH = viewport.clientHeight;
  const canScroll = bookW > viewW + 2 || h > viewH + 2;

  viewport.classList.toggle('can-scroll', canScroll);

  if (canScroll) {
    content.style.marginTop = '0';
    content.style.marginLeft = '0';
  } else {
    content.style.marginTop = Math.max(0, Math.floor((viewH - h) / 2)) + 'px';
    content.style.marginLeft = Math.max(0, Math.floor((viewW - bookW) / 2)) + 'px';
  }
}

function initScrollViewport() {
  const viewport = document.getElementById('bookViewport');
  if (!viewport || typeof ResizeObserver === 'undefined') return;

  const observer = new ResizeObserver(() => updateScrollAreaSize());
  observer.observe(viewport);
}

function setPreviewZoom(targetZoom) {
  previewZoom = clampZoom(targetZoom);
  updateScrollAreaSize();
  updateUI();
}

function scheduleZoomCommit() {
  clearTimeout(zoomCommitTimer);
  zoomCommitTimer = setTimeout(() => commitZoom(previewZoom), 320);
}

async function commitZoom(targetZoom) {
  clearTimeout(zoomCommitTimer);
  const clamped = clampZoom(targetZoom);
  if (Math.abs(clamped - zoomLevel) < 0.001) {
    previewZoom = zoomLevel;
    updateScrollAreaSize();
    updateUI();
    return;
  }

  const viewport = document.getElementById('bookViewport');
  let ratioX = 0.5;
  let ratioY = 0.5;
  if (viewport && viewport.scrollWidth > viewport.clientWidth) {
    ratioX = (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
    ratioY = (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight;
  }

  isZoomCommitting = true;
  updateUI();

  zoomLevel = clamped;
  previewZoom = clamped;
  pageCache.clear();
  applyBookLayout();
  updateUI();

  if (pdfDoc) await displaySpread(currentLeft);

  if (viewport) {
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, ratioX * viewport.scrollWidth - viewport.clientWidth / 2);
      viewport.scrollTop  = Math.max(0, ratioY * viewport.scrollHeight - viewport.clientHeight / 2);
      updateScrollAreaSize();
    });
  }

  isZoomCommitting = false;
  updateUI();
}

// ─── Book Sizing ──────────────────────────────────────
function computeBookSize() {
  const main  = document.querySelector('.reader-main');
  const mainH = main.clientHeight - 40;
  const mainW = main.clientWidth  - 80;
  isSingle    = mainW < 520;

  if (isSingle) {
    PAGE_W = Math.min(mainW, 520);
    PAGE_H = Math.min(Math.round(PAGE_W * 1.414), mainH);
    PAGE_W = Math.floor(PAGE_H / 1.414);
  } else {
    const maxPairW = Math.min(mainW, 1400);
    PAGE_W = Math.floor(maxPairW / 2) - 8;
    PAGE_H = Math.min(Math.round(PAGE_W * 1.414), mainH);
    PAGE_W = Math.floor(PAGE_H / 1.414);
  }

  applyBookLayout();
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// ─── Touch / Swipe ────────────────────────────────────
let touchStartX = 0;
let touchMode = 'nav'; // 'nav' | 'pinch'

function initTouch() {
  const book = document.getElementById('book');

  book.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      touchMode = 'pinch';
      pinchStartDist = getTouchDistance(e.touches);
      pinchStartZoom = previewZoom;
      return;
    }
    touchMode = 'nav';
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  book.addEventListener('touchmove', (e) => {
    if (touchMode !== 'pinch' || e.touches.length !== 2) return;
    const dist = getTouchDistance(e.touches);
    if (!pinchStartDist) return;
    setPreviewZoom(pinchStartZoom * (dist / pinchStartDist));
  }, { passive: true });

  book.addEventListener('touchend', (e) => {
    if (touchMode === 'pinch') {
      if (e.touches.length < 2) {
        clearTimeout(zoomCommitTimer);
        commitZoom(previewZoom);
        touchMode = 'nav';
      }
      return;
    }
    if (e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? flipForward() : flipBackward();
  });
}

// ─── Keyboard ─────────────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    const inInput = e.target.matches('input, textarea, select');

    if (!inInput && (e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commitZoom(zoomLevel + ZOOM_STEP);
      return;
    }
    if (!inInput && e.key === '-' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commitZoom(zoomLevel - ZOOM_STEP);
      return;
    }
    if (!inInput && e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commitZoom(ZOOM_DEFAULT);
      return;
    }

    if (inInput) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      flipForward();
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      flipBackward();
    }
    if (e.key === 'Home') {
      e.preventDefault();
      goToPage(1);
    }
    if (e.key === 'End') {
      e.preventDefault();
      goToPage(totalPages);
    }
  });
}

// ─── Progress Bar Click ───────────────────────────────
function initProgressBar() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;

  const jumpFromClientX = async (clientX) => {
    if (isFlipping || !totalPages) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    let target = Math.max(1, Math.round(pct * totalPages));
    if (!isSingle && target % 2 === 0) target = Math.max(1, target - 1);
    await goToPage(target);
  };

  bar.addEventListener('click', (e) => jumpFromClientX(e.clientX));

  bar.addEventListener('keydown', async (e) => {
    if (isFlipping) return;
    let target = currentLeft;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target += isSingle ? 1 : 2;
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') target -= isSingle ? 1 : 2;
    if (e.key === 'Home') target = 1;
    if (e.key === 'End') target = totalPages;
    if (target !== currentLeft) {
      e.preventDefault();
      await goToPage(target);
    }
  });
}

async function goToPage(target) {
  if (isFlipping || !totalPages) return;
  let page = Math.max(1, Math.min(totalPages, Math.round(target)));
  if (!isSingle && page % 2 === 0) page = Math.max(1, page - 1);
  currentLeft = page;
  await displaySpread(currentLeft);
}

function initPageJump() {
  const input = document.getElementById('pageJumpInput');
  const btn   = document.getElementById('btnPageJump');
  if (!input || !btn) return;

  const submit = async () => {
    const value = parseInt(input.value, 10);
    if (isNaN(value)) return;
    input.value = '';
    await goToPage(value);
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
}

function applyZoomFromInput() {
  const input = document.getElementById('zoomLevelInput');
  if (!input) return;

  const value = parseFloat(input.value);
  if (isNaN(value)) {
    input.value = String(Math.round(previewZoom * 100));
    return;
  }

  commitZoom(value / 100);
}

function initZoomControls() {
  const viewport = document.getElementById('bookViewport');
  const zoomInput = document.getElementById('zoomLevelInput');

  document.getElementById('btnZoomIn')?.addEventListener('click', () => commitZoom(zoomLevel + ZOOM_STEP));
  document.getElementById('btnZoomOut')?.addEventListener('click', () => commitZoom(zoomLevel - ZOOM_STEP));

  if (zoomInput) {
    zoomInput.value = String(Math.round(ZOOM_DEFAULT * 100));
    zoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyZoomFromInput();
        zoomInput.blur();
      }
      if (e.key === 'Escape') {
        zoomInput.value = String(Math.round(previewZoom * 100));
        zoomInput.blur();
      }
    });
    zoomInput.addEventListener('blur', applyZoomFromInput);
  }

  viewport?.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.002);
    setPreviewZoom(previewZoom * factor);
    scheduleZoomCommit();
  }, { passive: false });
}

// ─── Nav zones ────────────────────────────────────────
function initNavZones() {
  document.getElementById('navNext').addEventListener('click', flipForward);
  document.getElementById('navPrev').addEventListener('click', flipBackward);
  document.getElementById('btnNext').addEventListener('click', flipForward);
  document.getElementById('btnPrev').addEventListener('click', flipBackward);

  // Keyboard on nav zones
  ['navNext','navPrev'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        id === 'navNext' ? flipForward() : flipBackward();
      }
    });
  });
}

// ─── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  spawnReaderButterflies();

  bookId = getBookId();
  if (!bookId) { window.location.href = 'index.html'; return; }

  setLoading(true, 10);

  let book;
  try {
    book = await getBook(bookId);
  } catch (e) {
    alert('Could not load book from library. Returning home.');
    window.location.href = 'index.html';
    return;
  }

  if (!book) {
    alert('Book not found. Returning home.');
    window.location.href = 'index.html';
    return;
  }

  document.title             = `✨ ${book.name}`;
  document.getElementById('readerTitle').textContent = book.name;

  setLoading(true, 30);
  computeBookSize();

  try {
    // Slice to give PDF.js its own copy — prevents "detached ArrayBuffer" errors
    pdfDoc     = await pdfjsLib.getDocument({ data: new Uint8Array(book.data.slice(0)) }).promise;
    totalPages = pdfDoc.numPages;
  } catch (e) {
    console.error('PDF parse error:', e);
    alert('Could not open PDF — it may be corrupted or too large for the browser to handle.');
    window.location.href = 'index.html';
    return;
  }

  setLoading(true, 60);

  // Resume from saved page or URL param
  currentLeft = getStartPage();
  if (!isSingle && currentLeft % 2 === 0) currentLeft = Math.max(1, currentLeft - 1);
  await displaySpread(currentLeft);

  setLoading(true, 100);

  initTouch();
  initKeyboard();
  initProgressBar();
  initPageJump();
  initZoomControls();
  initScrollViewport();
  initNavZones();

  // Fade out loader
  setTimeout(() => setLoading(false), 400);

  // Recompute on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      clearTimeout(zoomCommitTimer);
      previewZoom = zoomLevel;
      pageCache.clear();
      computeBookSize();
      await displaySpread(currentLeft);
      updateScrollAreaSize();
    }, 300);
  });
});
