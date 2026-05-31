// ✨ Fairytopia Library — IndexedDB Layer ✨

const DB_NAME    = 'FairytopiaLibrary';
const DB_VERSION = 1;
const STORE      = 'books';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ({ target: { result: db } }) => {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess  = ({ target: { result } }) => resolve(result);
    req.onerror    = ({ target: { error  } }) => reject(error);
  });
}

async function saveBook(book) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(book);
    tx.oncomplete = resolve;
    tx.onerror    = ({ target: { error } }) => reject(error);
  });
}

async function getBook(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = ({ target: { result } }) => resolve(enrichBook(result));
    req.onerror   = ({ target: { error  } }) => reject(error);
  });
}

async function getAllBooks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = ({ target: { result } }) => resolve(result.map(enrichBook));
    req.onerror   = ({ target: { error  } }) => reject(error);
  });
}

async function deleteBook(id) {
  deleteMeta(id);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = ({ target: { error } }) => reject(error);
  });
}

// ─── Lightweight Metadata (localStorage) ─────────────
// Stores shelfIndex, lastPage etc. separately from the PDF blob.
// This avoids read-modify-write of the giant ArrayBuffer in IDB.

const META_PREFIX = 'ft_meta_';

function saveMeta(id, patch) {
  const key  = META_PREFIX + id;
  const prev = JSON.parse(localStorage.getItem(key) || '{}');
  localStorage.setItem(key, JSON.stringify({ ...prev, ...patch }));
}

function getMeta(id) {
  return JSON.parse(localStorage.getItem(META_PREFIX + id) || '{}');
}

function deleteMeta(id) {
  localStorage.removeItem(META_PREFIX + id);
}

// updateBookMeta now just writes to localStorage — fast, reliable, no blob churn
async function updateBookMeta(id, meta) {
  saveMeta(id, meta);
}

// Enrich a book object from IDB with its localStorage metadata
function enrichBook(book) {
  if (!book) return book;
  return { ...book, ...getMeta(book.id) };
}
