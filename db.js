/* db.js — local-first storage. Every script lives in IndexedDB.
   Nothing here needs a network connection. */

const DB_NAME = "cymor-script-writer";
const DB_VERSION = 1;
const STORE = "scripts";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const ScriptDB = {
  async all() {
    const store = await tx(STORE, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async get(id) {
    const store = await tx(STORE, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async put(script) {
    script.updatedAt = Date.now();
    const store = await tx(STORE, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(script);
      req.onsuccess = () => resolve(script);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(id) {
    const store = await tx(STORE, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};

function newId() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function blockId() {
  return "b_" + Math.random().toString(36).slice(2, 10);
}

function blankScript() {
  return {
    id: newId(),
    updatedAt: Date.now(),
    dirty: true,
    titlePage: {
      title: "Untitled Screenplay",
      writtenBy: "Written by",
      author: "",
      contact: "",
      draftDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    },
    characters: [],
    scenes: [],
    blocks: [
      { id: blockId(), type: "scene_heading", text: "" }
    ]
  };
}
