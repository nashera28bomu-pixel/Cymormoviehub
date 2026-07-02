/* editor.js — the screenplay block engine.
   Each screenplay block is its own contenteditable line.
   data-type on the block drives its CSS formatting. */

const ELEMENT_CYCLE = ["scene_heading", "action", "character", "parenthetical", "dialogue", "transition"];

const ELEMENT_LABELS = {
  scene_heading: "Scene",
  action: "Action",
  character: "Character",
  parenthetical: "Parens",
  dialogue: "Dialogue",
  transition: "Trans"
};

// What Enter should produce next, per current type.
const NEXT_ON_ENTER = {
  scene_heading: "action",
  action: "action",
  character: "dialogue",
  parenthetical: "dialogue",
  dialogue: "action",
  transition: "scene_heading"
};

const SCENE_PREFIXES = ["INT.", "EXT.", "INT./EXT.", "EST."];

class ScreenplayEditor {
  constructor(container, script, onChange) {
    this.container = container;
    this.script = script;
    this.onChange = onChange; // called on every meaningful edit (debounced by caller)
    this.activeDropdown = null;
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    this.script.blocks.forEach((block) => {
      this.container.appendChild(this.renderBlock(block));
    });
    if (this.script.blocks.length === 0) {
      this.insertBlockAfter(null, "scene_heading");
    }
  }

  renderBlock(block) {
    const el = document.createElement("div");
    el.className = "block block-" + block.type;
    el.dataset.id = block.id;
    el.dataset.type = block.type;
    el.contentEditable = "true";
    el.spellcheck = false;
    el.textContent = block.text || "";
    el.setAttribute("data-placeholder", this.placeholderFor(block.type));

    el.addEventListener("keydown", (e) => this.handleKeydown(e, block, el));
    el.addEventListener("input", () => this.handleInput(block, el));
    el.addEventListener("focus", () => this.showToolbarState(block.type));
    el.addEventListener("blur", () => {
      this.commitCompletion(block, el);
      this.hideDropdown();
    });

    return el;
  }

  placeholderFor(type) {
    switch (type) {
      case "scene_heading": return "INT. LOCATION - DAY";
      case "character": return "CHARACTER NAME";
      case "dialogue": return "Dialogue...";
      case "parenthetical": return "(beat)";
      case "transition": return "CUT TO:";
      default: return "Describe the action...";
    }
  }

  getBlockEls() {
    return Array.from(this.container.querySelectorAll(".block"));
  }

  findModel(id) {
    return this.script.blocks.find((b) => b.id === id);
  }

  handleInput(block, el) {
    block.text = el.textContent;
    this.script.dirty = true;
    this.updateAutocomplete(block, el);
    this.onChange();
  }

  handleKeydown(e, block, el) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.hideDropdown();
      const nextType = NEXT_ON_ENTER[block.type] || "action";
      this.insertBlockAfter(block.id, nextType, true);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      this.cycleType(block, el, e.shiftKey ? -1 : 1);
      return;
    }

    if (e.key === "Backspace" && el.textContent.length === 0) {
      const blocks = this.getBlockEls();
      const idx = blocks.indexOf(el);
      if (idx > 0) {
        e.preventDefault();
        const prevEl = blocks[idx - 1];
        this.removeBlock(block.id);
        this.focusEnd(prevEl);
      }
    }

    if (e.key === "Escape") {
      this.hideDropdown();
    }
  }

  cycleType(block, el, direction) {
    const i = ELEMENT_CYCLE.indexOf(block.type);
    const next = ELEMENT_CYCLE[(i + direction + ELEMENT_CYCLE.length) % ELEMENT_CYCLE.length];
    block.type = next;
    el.className = "block block-" + next;
    el.dataset.type = next;
    el.setAttribute("data-placeholder", this.placeholderFor(next));
    this.showToolbarState(next);
    this.script.dirty = true;
    this.onChange();
  }

  setCurrentType(type) {
    const active = document.activeElement;
    if (!active || !active.classList.contains("block")) return;
    const block = this.findModel(active.dataset.id);
    if (!block) return;
    block.type = type;
    active.className = "block block-" + type;
    active.dataset.type = type;
    active.setAttribute("data-placeholder", this.placeholderFor(type));
    this.showToolbarState(type);
    this.script.dirty = true;
    this.onChange();
    active.focus();
  }

  insertBlockAfter(afterId, type, focus) {
    const newBlock = { id: "b_" + Math.random().toString(36).slice(2, 10), type, text: "" };
    if (afterId === null) {
      this.script.blocks.push(newBlock);
      this.container.appendChild(this.renderBlock(newBlock));
    } else {
      const idx = this.script.blocks.findIndex((b) => b.id === afterId);
      this.script.blocks.splice(idx + 1, 0, newBlock);
      const afterEl = this.container.querySelector(`[data-id="${afterId}"]`);
      const newEl = this.renderBlock(newBlock);
      afterEl.insertAdjacentElement("afterend", newEl);
      if (focus) newEl.focus();
    }
    this.script.dirty = true;
    this.onChange();
  }

  removeBlock(id) {
    const idx = this.script.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    this.script.blocks.splice(idx, 1);
    const el = this.container.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();
    this.script.dirty = true;
    this.onChange();
  }

  focusEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  showToolbarState(type) {
    document.querySelectorAll(".el-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });
  }

  // ---- Autocomplete for CHARACTER and SCENE_HEADING blocks ----

  updateAutocomplete(block, el) {
    if (block.type === "character") {
      this.showDropdown(el, this.script.characters, el.textContent.toUpperCase());
    } else if (block.type === "scene_heading") {
      const text = el.textContent.toUpperCase();
      const hasPrefix = SCENE_PREFIXES.some((p) => text.startsWith(p));
      const options = hasPrefix ? this.script.scenes : SCENE_PREFIXES;
      this.showDropdown(el, options, text);
    } else {
      this.hideDropdown();
    }
  }

  showDropdown(el, options, query) {
    const matches = options.filter((o) => o.toUpperCase().startsWith(query) && o.toUpperCase() !== query);
    this.hideDropdown();
    if (matches.length === 0 || query.length === 0) return;

    const dropdown = document.createElement("div");
    dropdown.className = "autocomplete-dropdown";
    matches.slice(0, 5).forEach((match) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.textContent = match;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        el.textContent = match;
        const block = this.findModel(el.dataset.id);
        block.text = match;
        this.focusEnd(el);
        this.hideDropdown();
        this.onChange();
      });
      dropdown.appendChild(item);
    });

    const rect = el.getBoundingClientRect();
    dropdown.style.top = rect.bottom + window.scrollY + "px";
    dropdown.style.left = rect.left + window.scrollX + "px";
    dropdown.style.width = rect.width + "px";
    document.body.appendChild(dropdown);
    this.activeDropdown = dropdown;
  }

  hideDropdown() {
    if (this.activeDropdown) {
      this.activeDropdown.remove();
      this.activeDropdown = null;
    }
  }

  commitCompletion(block, el) {
    const text = el.textContent.trim();
    if (!text) return;
    if (block.type === "character") {
      const upper = text.toUpperCase();
      if (!this.script.characters.includes(upper)) this.script.characters.push(upper);
      if (el.textContent !== upper) el.textContent = upper;
      block.text = upper;
    } else if (block.type === "scene_heading") {
      const upper = text.toUpperCase();
      if (!this.script.scenes.includes(upper)) this.script.scenes.push(upper);
      if (el.textContent !== upper) el.textContent = upper;
      block.text = upper;
    } else if (block.type === "transition") {
      const upper = text.toUpperCase();
      if (el.textContent !== upper) el.textContent = upper;
      block.text = upper;
    }
  }
}
