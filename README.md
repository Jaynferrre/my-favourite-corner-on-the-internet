# ✨ Fairytopia Library

A Barbie-Fairytopia-inspired personal PDF library with ethereal butterfly animations, glass morphism UI, and an immersive 3D-flip flipbook reader. All books are stored **offline** in your browser's IndexedDB — no server needed.

---

## 📁 File Structure

```
fairytopia-library/
├── index.html     ← Main library page (upload & browse)
├── reader.html    ← Flipbook reader
├── styles.css     ← All styles (shared)
├── db.js          ← IndexedDB helper
├── app.js         ← Library logic
├── reader.js      ← PDF.js + flipbook logic
└── README.md
```

---

## 🚀 How to Run

### Option A — VS Code Live Server (Recommended)
1. Open the `fairytopia-library/` folder in **VS Code**
2. Install the **Live Server** extension (by Ritwick Dey) if you haven't
3. Right-click `index.html` → **"Open with Live Server"**
4. Your browser opens at `http://127.0.0.1:5500/index.html`

> **Why Live Server?** PDF.js needs to load its worker script. Live Server serves files over HTTP which ensures everything works correctly.

### Option B — Any Local HTTP Server
```bash
# Python 3
cd fairytopia-library
python -m http.server 5500

# Then open: http://localhost:5500
```

### Option C — Direct File Open (may have limitations)
You can simply double-click `index.html` to open it directly in Chrome or Edge. IndexedDB works fine. PDF.js may show a warning in the console but should still work for in-memory PDF data.

---

## 📖 Features

| Feature | Details |
|---|---|
| **Upload** | Drag & drop or click to upload one or many PDFs at once |
| **Offline storage** | All PDFs stored in IndexedDB — no internet needed after upload |
| **Cover thumbnails** | First page auto-rendered as cover art |
| **Flipbook reader** | 3D CSS page-flip animation, two-page spread on desktop |
| **Navigation** | Arrow keys, click nav zones, swipe (mobile), progress bar |
| **Butterflies** | 12 animated SVG butterflies float across the screen eternally |
| **Sparkles** | 30 animated sparkle glyphs twinkle in the background |
| **Responsive** | Single-page mode on narrow screens / mobile |

---

## 🎮 Reader Controls

| Action | How |
|---|---|
| Next pages | `→` / `Space` / Click right side / Swipe left |
| Previous pages | `←` / Click left side / Swipe right |
| Jump to page | Click anywhere on the progress bar |
| Return to library | Click "← Library" button |

---

## 💾 Storage Notes

- Books are stored in **IndexedDB** which has a generous quota (hundreds of MB to several GB depending on your browser and device storage).
- Clearing your browser's site data will remove all books.
- Books are stored **per origin** (per URL), so `localhost:5500` and `localhost:3000` have separate libraries.

---

## 🌸 Tech Stack

- **PDF.js 3.11** — PDF parsing & rendering
- **IndexedDB** — offline binary storage
- **CSS3 3D Transforms** — page flip animation
- **Google Fonts** — Pinyon Script, Playfair Display, Cormorant Garamond
- Zero frameworks, zero build step ✨

---

*Made with enchantment, butterflies, and a lot of pink ✦*
