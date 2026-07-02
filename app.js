/* app.js — wires views together: Library -> Title Page -> Editor */

let currentScript = null;
let editor = null;
let saveTimer = null;

const views = {
  library: document.getElementById("view-library"),
  titlepage: document.getElementById("view-titlepage"),
  editor: document.getElementById("view-editor")
};

function showView(name) {
  Object.values(views).forEach((v) => v.classList.remove("active"));
  views[name].classList.add("active");
}

function setSaveStatus(state) {
  const dot = document.getElementById("save-status");
  dot.className = "save-status " + state;
  dot.textContent = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Unsaved";
}

function queueSave() {
  setSaveStatus("unsaved");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    setSaveStatus("saving");
    currentScript.dirty = false;
    await ScriptDB.put(currentScript);
    setSaveStatus("saved");
  }, 600);
}

// ---------- Library ----------

async function renderLibrary() {
  const list = document.getElementById("library-list");
  const scripts = await ScriptDB.all();
  list.innerHTML = "";

  if (scripts.length === 0) {
    list.innerHTML = `<div class="empty-state">No scripts yet. Tap "New Script" to start your first page.</div>`;
    return;
  }

  scripts.forEach((s) => {
    const card = document.createElement("div");
    card.className = "script-card";
    const pages = Math.max(1, Math.round(s.blocks.length / 6));
    card.innerHTML = `
      <div class="script-card-main">
        <div class="script-card-title">${escapeHtml(s.titlePage.title || "Untitled")}</div>
        <div class="script-card-meta">${escapeHtml(s.titlePage.author || "No author set")} · ~${pages} pg · ${new Date(s.updatedAt).toLocaleDateString()}</div>
      </div>
      <button class="icon-btn delete-btn" title="Delete">✕</button>
    `;
    card.querySelector(".script-card-main").addEventListener("click", () => openScript(s.id));
    card.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${s.titlePage.title}"? This can't be undone.`)) {
        await ScriptDB.remove(s.id);
        renderLibrary();
      }
    });
    list.appendChild(card);
  });
}

document.getElementById("new-script-btn").addEventListener("click", () => {
  currentScript = blankScript();
  showView("titlepage");
  fillTitlePageForm();
});

async function openScript(id) {
  currentScript = await ScriptDB.get(id);
  showView("editor");
  mountEditor();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------- Title page ----------

function fillTitlePageForm() {
  const tp = currentScript.titlePage;
  document.getElementById("tp-title").value = tp.title;
  document.getElementById("tp-author").value = tp.author;
  document.getElementById("tp-contact").value = tp.contact;
  document.getElementById("tp-date").value = tp.draftDate;
}

document.getElementById("titlepage-continue").addEventListener("click", () => {
  currentScript.titlePage.title = document.getElementById("tp-title").value.trim() || "Untitled Screenplay";
  currentScript.titlePage.author = document.getElementById("tp-author").value.trim();
  currentScript.titlePage.contact = document.getElementById("tp-contact").value.trim();
  currentScript.titlePage.draftDate = document.getElementById("tp-date").value.trim();
  currentScript.dirty = true;
  ScriptDB.put(currentScript).then(() => {
    showView("editor");
    mountEditor();
  });
});

document.getElementById("titlepage-back").addEventListener("click", () => {
  showView("library");
  renderLibrary();
});

document.getElementById("edit-titlepage-btn").addEventListener("click", () => {
  showView("titlepage");
  fillTitlePageForm();
  document.getElementById("titlepage-continue").textContent = "Save & Return";
});

// ---------- Editor ----------

function mountEditor() {
  document.getElementById("editor-script-title").textContent = currentScript.titlePage.title;
  document.getElementById("titlepage-continue").textContent = "Continue to Editor";
  const container = document.getElementById("script-body");
  editor = new ScreenplayEditor(container, currentScript, queueSave);
  setSaveStatus("saved");
}

document.getElementById("editor-back").addEventListener("click", () => {
  showView("library");
  renderLibrary();
});

document.querySelectorAll(".el-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (editor) editor.setCurrentType(btn.dataset.type);
  });
});

// ---------- PDF export (browser print, formatted via print stylesheet) ----------

document.getElementById("export-pdf-btn").addEventListener("click", () => {
  buildPrintDocument();
  window.print();
});

function buildPrintDocument() {
  const printRoot = document.getElementById("print-root");
  printRoot.innerHTML = "";

  const tp = currentScript.titlePage;
  const titlePageEl = document.createElement("div");
  titlePageEl.className = "print-titlepage";
  titlePageEl.innerHTML = `
    <div class="tp-center">
      <div class="tp-title">${escapeHtml(tp.title.toUpperCase())}</div>
      <div class="tp-writtenby">${escapeHtml(tp.writtenBy || "Written by")}</div>
      <div class="tp-author">${escapeHtml(tp.author)}</div>
    </div>
    <div class="tp-footer">
      <div class="tp-contact">${escapeHtml(tp.contact).replace(/\n/g, "<br>")}</div>
      <div class="tp-date">${escapeHtml(tp.draftDate)}</div>
    </div>
  `;
  printRoot.appendChild(titlePageEl);

  const bodyEl = document.createElement("div");
  bodyEl.className = "print-body";
  currentScript.blocks.forEach((b) => {
    if (!b.text || !b.text.trim()) return;
    const line = document.createElement("div");
    line.className = "print-block print-" + b.type;
    line.textContent = b.text;
    bodyEl.appendChild(line);
  });
  printRoot.appendChild(bodyEl);
}

// ---------- Boot ----------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

renderLibrary();
