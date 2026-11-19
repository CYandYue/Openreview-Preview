// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 CYandYue. Adapted renderer behavior: see THIRD_PARTY_NOTICES.md.
/* global marked, DOMPurify, MathJax */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const source = $('source');
  const preview = $('preview');
  const limitInput = $('limit');
  const storageKey = 'openreview-public-source-draft-v1';
  const demo = String.raw`### Q1. What is the main contribution?

We thank the reviewer for the thoughtful feedback. **Our method models the contribution of each observation, allowing the system to focus on the evidence needed for the current task.**

The parameter $\\alpha$ controls the trade-off between coverage and efficiency. We clarify this design choice and add the ablation below.

### Q2. Additional experiments

We compare the complete model against two controlled variants under the same evaluation protocol.

| Setting | Accuracy ↑ | Time ↓ |
| --- | ---: | ---: |
| Baseline | 82.4 | 1.00× |
| Without weighting | 85.1 | 0.78× |
| **Full model** | **88.6** | **0.62×** |

> These are illustrative values for a fictional rebuttal, included only to demonstrate formatting.

### Q3. Objective and notation

Our objective combines prediction and regularization:

$$
\\mathcal{L}(\\theta) = \\frac{1}{N} \\sum_{i=1}^{N} \\ell_i(\\theta) + \\lambda \\lVert\\theta\\rVert_2^2.
$$

For completeness, the normalized weights are

$$
\\begin{aligned}
w_i &= \\frac{\\exp(s_i)}{\\sum_j \\exp(s_j)}, \\\\
\\sum_i w_i &= 1.
\\end{aligned}
$$

We will update the notation and include these clarifications in the revised manuscript.
`;

  // OpenReview's custom Marked renderer (client/view.js, setupMarked).
  const escapeHtml = (text) => {
    const element = document.createElement('div');
    element.textContent = text;
    return element.innerHTML;
  };
  const renderer = new marked.Renderer();
  renderer.image = ({ href, title, text }) => {
    if (href.startsWith('/images/')) {
      const titleAttr = title ? `title="${title}" ` : '';
      const classAttr = href.endsWith('_icon.svg') ? 'class="icon" ' : '';
      return `<img src="${href}" alt="${text}" ${titleAttr}${classAttr}/>`;
    }
    return escapeHtml(`<img src="${href}" alt="${text}" title="${title}">`);
  };
  renderer.checkbox = ({ checked }) => checked ? '[x]' : '[ ]';
  renderer.html = ({ text }) => escapeHtml(text);
  marked.setOptions({ breaks: false, gfm: true, langPrefix: 'language-', renderer });

  // Same allowlist and hooks as openreview-web/app/AppInit.js and lib/utils.js.
  DOMPurify.setConfig({ ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'blockquote', 'pre',
    'hr', 'section', 'article', 'header', 'footer', 'figure', 'figcaption',
    'details', 'summary', 'a', 'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'del',
    'ins', 'sub', 'sup', 'small', 'mark', 'code', 'kbd', 'samp', 'var', 'abbr',
    'cite', 'q', 'br', 'wbr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table',
    'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col', 'img',
  ] });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    for (const attribute of ['style', 'action', 'formaction']) {
      node.removeAttribute?.(attribute);
    }
  });

  let filename = 'rebuttal.md';
  let fileHandle = null;
  let lastFileVersion = '';
  let following = false;
  let pollBusy = false;
  let browserSaved = true;
  let hasEdits = false;
  let renderTimer;
  let revision = 0;
  let renderQueue = Promise.resolve();

  const notify = (message) => {
    $('notice').textContent = message;
    $('notice').hidden = false;
  };
  const setRenderStatus = (text, state) => {
    $('render-status').textContent = text;
    $('render-status').dataset.state = state;
  };
  function setView(view) {
    $('panes').dataset.view = view;
    document.querySelectorAll('[data-view][type="button"]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === view));
    });
    // Re-measure math when a hidden preview becomes visible or changes width.
    if (view !== 'write') scheduleRender(0);
  }
  function updateCounter() {
    const used = source.value.trim().length;
    const limit = Number(limitInput.value);
    const valid = Number.isInteger(limit) && limit > 0 && limit <= 1000000;
    limitInput.setAttribute('aria-invalid', String(!valid));
    $('counter').textContent = valid
      ? `Characters remaining: ${limit - used} · Used ${used} / ${limit}`
      : `${used} characters used · enter a valid limit`;
    $('counter').className = valid && used > limit ? 'danger'
      : valid && limit - used < 150 ? 'warning' : '';
  }
  function saveDraft() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        text: source.value, limit: limitInput.value, filename,
        view: $('panes').dataset.view,
      }));
      browserSaved = true;
      $('save-status').textContent = 'Draft saved in this browser';
    } catch {
      browserSaved = false;
      $('save-status').textContent = 'Browser storage unavailable · download your draft';
    }
  }
  function scheduleRender(delay = 150) {
    const currentRevision = ++revision;
    clearTimeout(renderTimer);
    setRenderStatus('Typesetting…', 'loading');
    renderTimer = setTimeout(() => {
      const text = source.value;
      renderQueue = renderQueue.then(async () => {
        if (currentRevision !== revision) return;
        if (!window.MathJax?.startup?.promise) {
          preview.innerHTML = DOMPurify.sanitize(marked.parse(text));
          throw new Error('MathJax could not load. Check that the vendor folder is present.');
        }
        await MathJax.startup.promise;
        if (currentRevision !== revision) return;
        MathJax.typesetClear([preview]);
        MathJax.texReset();
        preview.innerHTML = text.trim()
          ? DOMPurify.sanitize(marked.parse(text))
          : '<p class="empty-preview">Nothing to preview</p>';
        // MathJax needs a visible container to measure the formula's width.
        if ($('panes').dataset.view !== 'write') {
          await MathJax.typesetPromise([preview]);
        }
        if (currentRevision === revision) {
          const mathErrors = preview.querySelectorAll('[data-mjx-error], mjx-merror').length;
          setRenderStatus(mathErrors ? 'Check the formula errors in the preview' : 'Preview up to date', mathErrors ? 'error' : 'ready');
        }
      }).catch((error) => {
        if (currentRevision === revision) setRenderStatus(error.message, 'error');
      });
    }, delay);
  }
  function stopFollowing() {
    following = false;
    $('follow-file').checked = false;
  }
  function acceptFileText(text, name) {
    source.value = text;
    filename = name || 'rebuttal.md';
    $('filename').textContent = filename;
    hasEdits = false;
    updateCounter();
    saveDraft();
    scheduleRender(0);
  }
  function downloadDraft() {
    const url = URL.createObjectURL(new Blob([source.value], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.(txt|markdown)$/i, '.md');
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    hasEdits = false;
    notify('Your Markdown download is ready. Check your browser downloads.');
  }

  source.addEventListener('input', () => {
    if (following) {
      stopFollowing();
      notify('File following paused. Your edits are saved in the browser; download .md to keep a file copy.');
    }
    hasEdits = true;
    updateCounter();
    saveDraft();
    scheduleRender();
  });
  limitInput.addEventListener('input', () => { updateCounter(); saveDraft(); });
  document.querySelectorAll('[data-view][type="button"]').forEach((button) => {
    button.addEventListener('click', () => { setView(button.dataset.view); saveDraft(); });
  });
  $('download').addEventListener('click', downloadDraft);
  $('copy').addEventListener('click', async () => {
    const text = source.value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
    } catch {
      // Chrome/Safari may restrict Clipboard API on a file:// page.
      const temporary = document.createElement('textarea');
      temporary.value = text;
      temporary.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand('copy');
      temporary.remove();
      if (!copied) {
        setView('write');
        source.focus();
        source.select();
        notify('Clipboard access was blocked. The source is selected; press ⌘/Ctrl + C.');
        return;
      }
    }
    notify('Markdown copied. Paste it into the Write field on OpenReview.');
  });

  $('open-file').addEventListener('click', async () => {
    if (typeof window.showOpenFilePicker !== 'function') {
      $('file-input').click();
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Markdown / text', accept: { 'text/plain': ['.md', '.markdown', '.txt'] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      stopFollowing();
      fileHandle = handle;
      lastFileVersion = `${file.lastModified}:${file.size}`;
      acceptFileText(text, file.name);
      $('follow-control').hidden = false;
      following = true;
      $('follow-file').checked = true;
      notify('File opened. Saves from your external editor will appear here. Download edits made in this page to save a file copy.');
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Some browsers expose this API but disallow it for file:// URLs.
      $('file-input').click();
    }
  });
  $('file-input').addEventListener('change', async () => {
    const file = $('file-input').files[0];
    if (!file) return;
    try {
      const text = await file.text();
      stopFollowing();
      fileHandle = null;
      $('follow-control').hidden = true;
      acceptFileText(text, file.name);
      notify('File imported. This browser supports one-time imports; reopen the file after external changes.');
    } catch (error) {
      notify(`Could not read file: ${error.message}`);
    } finally {
      $('file-input').value = '';
    }
  });
  $('follow-file').addEventListener('change', async () => {
    following = $('follow-file').checked && Boolean(fileHandle);
    if (following) {
      // A deliberate re-enable loads the external file even if it did not change.
      lastFileVersion = '';
      await pollFile();
    }
  });
  async function pollFile() {
    if (!following || !fileHandle || pollBusy || document.hidden) return;
    pollBusy = true;
    const activeHandle = fileHandle;
    const activeRevision = revision;
    try {
      const file = await activeHandle.getFile();
      const version = `${file.lastModified}:${file.size}`;
      if (version === lastFileVersion) return;
      const text = await file.text();
      // Do not replace a draft if the user typed or opened another file while reading.
      if (!following || activeHandle !== fileHandle || activeRevision !== revision) return;
      lastFileVersion = version;
      acceptFileText(text, file.name);
    } catch (error) {
      stopFollowing();
      notify(`File following stopped: ${error.message}. Reopen the file to continue.`);
    } finally {
      pollBusy = false;
    }
  }
  setInterval(pollFile, 1200);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollFile(); });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      downloadDraft();
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (hasEdits && !browserSaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => scheduleRender(0), 200);
  });

  source.value = demo;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved.text === 'string') {
      source.value = saved.text;
      filename = typeof saved.filename === 'string' ? saved.filename : 'rebuttal.md';
      $('filename').textContent = filename;
      const savedLimit = Number(saved.limit);
      if (Number.isInteger(savedLimit) && savedLimit > 0 && savedLimit <= 1000000) {
        limitInput.value = String(savedLimit);
      }
      if (['write', 'preview', 'split'].includes(saved.view)) setView(saved.view);
    }
  } catch { /* Invalid or unavailable local storage: retain the example. */ }
  updateCounter();
  saveDraft();
  scheduleRender(0);
})();
