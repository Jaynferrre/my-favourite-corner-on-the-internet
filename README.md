# Library

## 📁 File Structure

```
├── index.html     ← Main library page (upload & browse)
├── reader.html    ← Flipbook reader
├── styles.css     ← All styles (shared)
├── db.js          ← IndexedDB helper
├── app.js         ← Library logic
├── reader.js      ← PDF.js + flipbook logic
└── README.md
```

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

---

## 🌸 Tech Stack

- **PDF.js 3.11** — PDF parsing & rendering
- **IndexedDB** — offline binary storage
- **CSS3 3D Transforms** — page flip animation
- **Google Fonts** — Pinyon Script, Playfair Display, Cormorant Garamond

