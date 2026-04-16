(function () {
  var FUNCTION_URL = 'https://cpge-tutor.foreysoftware.workers.dev';
  var MAX_MESSAGES_SENT = 30;
  var MAX_PAGE_CHARS = 24000;
  var DB_NAME = 'forecasting-tutor';
  var STORE = 'conversations';

  var isRoot = document.querySelector('link[href="style.css"]') !== null;
  var prefix = isRoot ? '' : '../';
  var courseSummary = null;
  var db = null;
  var currentConv = null;
  var streaming = false;

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = prefix + 'tutor.css';
  document.head.appendChild(link);

  // --- IndexedDB ---

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          var s = d.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
      };
      req.onsuccess = function (e) { db = e.target.result; resolve(db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function dbPut(conv) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(conv);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function dbGetAll() {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readonly');
      var req = tx.objectStore(STORE).index('updatedAt').openCursor(null, 'prev');
      var results = [];
      req.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) { results.push(cursor.value); cursor.continue(); }
        else resolve(results);
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  function dbGet(id) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readonly');
      var req = tx.objectStore(STORE).get(id);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function dbDelete(id) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  // --- System prompt ---

  function getPageText() {
    var clone = document.body.cloneNode(true);
    var remove = clone.querySelectorAll('.site-sidebar, .sidebar-hamburger, .tutor-drawer');
    for (var i = 0; i < remove.length; i++) remove[i].remove();
    var text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text.substring(0, MAX_PAGE_CHARS);
  }

  function buildSystem(selection) {
    var parts = [];
    if (courseSummary) parts.push(courseSummary);
    parts.push('---');
    parts.push('The user is currently reading:\n' + document.title);
    parts.push('Page content:\n' + getPageText());
    if (selection) parts.push('The user has selected this text:\n' + selection);
    return parts.join('\n\n');
  }

  // --- Markdown (minimal) ---

  function renderMarkdown(text) {
    var html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
        return '\n<pre><code>' + code.trim() + '</code></pre>\n';
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    var lines = html.split('\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^### (.+)/.test(l)) { out.push('<h4>' + l.substring(4) + '</h4>'); }
      else if (/^## (.+)/.test(l)) { out.push('<h3>' + l.substring(3) + '</h3>'); }
      else if (/^# (.+)/.test(l)) { out.push('<h2>' + l.substring(2) + '</h2>'); }
      else if (/^- (.+)/.test(l)) { out.push('<li>' + l.substring(2) + '</li>'); }
      else if (l.trim() === '') { out.push('</p><p>'); }
      else { out.push(l + '<br>'); }
    }
    var result = '<p>' + out.join('') + '</p>';
    result = result
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[234]>)/g, '$1')
      .replace(/(<\/h[234]>)<\/p>/g, '$1')
      .replace(/<p>(<pre>)/g, '$1')
      .replace(/(<\/pre>)<\/p>/g, '$1')
      .replace(/<br><\/p>/g, '</p>')
      .replace(/<p>(<li>)/g, '<ul>$1')
      .replace(/(<\/li>)(?!<li>)/g, '$1</ul>');
    return result;
  }

  // --- UI ---

  var STORAGE_KEY = 'tutor-width';
  var MIN_WIDTH = 280;
  var MAX_WIDTH = 800;
  var drawerWidth = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 380;

  var drawer, messagesEl, textarea, sendBtn, titleEl, tokensEl, listPanel, listItems;

  function applyWidth(w) {
    drawerWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
    drawer.style.setProperty('--tutor-width', drawerWidth + 'px');
    if (drawer.classList.contains('open')) {
      document.body.style.marginRight = drawerWidth + 'px';
    }
  }

  function createDrawer() {
    drawer = document.createElement('div');
    drawer.className = 'tutor-drawer';
    drawer.style.setProperty('--tutor-width', drawerWidth + 'px');
    drawer.innerHTML =
      '<div class="tutor-resize-handle"></div>' +
      '<div class="tutor-header">' +
        '<div class="tutor-header-title" title="View conversations">Tutor</div>' +
        '<span class="tutor-tokens"></span>' +
        '<button class="tutor-btn tutor-btn-new" title="New chat">+</button>' +
        '<button class="tutor-btn tutor-btn-close" title="Close (Cmd+L)">&times;</button>' +
      '</div>' +
      '<div class="tutor-messages"></div>' +
      '<div class="tutor-input-area">' +
        '<textarea class="tutor-textarea" placeholder="Ask about this page..." rows="1"></textarea>' +
        '<button class="tutor-send">Send</button>' +
      '</div>' +
      '<div class="tutor-shortcut-hint">Cmd+L to toggle</div>' +
      '<div class="tutor-list">' +
        '<div class="tutor-list-header"><span>Conversations</span><button class="tutor-btn tutor-list-back">&larr;</button></div>' +
        '<div class="tutor-list-items"></div>' +
      '</div>';

    document.body.appendChild(drawer);

    messagesEl = drawer.querySelector('.tutor-messages');
    textarea = drawer.querySelector('.tutor-textarea');
    sendBtn = drawer.querySelector('.tutor-send');
    titleEl = drawer.querySelector('.tutor-header-title');
    tokensEl = drawer.querySelector('.tutor-tokens');
    listPanel = drawer.querySelector('.tutor-list');
    listItems = drawer.querySelector('.tutor-list-items');

    drawer.querySelector('.tutor-btn-close').addEventListener('click', toggleDrawer);
    drawer.querySelector('.tutor-btn-new').addEventListener('click', newChat);
    titleEl.addEventListener('click', toggleList);
    drawer.querySelector('.tutor-list-back').addEventListener('click', toggleList);

    sendBtn.addEventListener('click', sendMessage);
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    textarea.addEventListener('input', autoResize);

    var handle = drawer.querySelector('.tutor-resize-handle');
    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      handle.classList.add('active');
      drawer.classList.add('resizing');
      document.body.classList.add('tutor-resizing');
      var onMove = function (e) {
        applyWidth(window.innerWidth - e.clientX);
      };
      var onUp = function () {
        handle.classList.remove('active');
        drawer.classList.remove('resizing');
        document.body.classList.remove('tutor-resizing');
        localStorage.setItem(STORAGE_KEY, String(drawerWidth));
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function autoResize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  function toggleDrawer() {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      document.body.style.marginRight = drawerWidth + 'px';
      textarea.focus();
    } else {
      document.body.style.marginRight = '';
    }
  }

  function toggleList() {
    if (listPanel.classList.contains('open')) {
      listPanel.classList.remove('open');
      return;
    }
    dbGetAll().then(function (convs) {
      listItems.innerHTML = '';
      if (!convs.length) {
        listItems.innerHTML = '<div class="tutor-list-empty">No conversations yet</div>';
      }
      convs.forEach(function (c) {
        var item = document.createElement('button');
        item.className = 'tutor-list-item';
        var del = '<button class="tutor-list-delete" data-id="' + c.id + '">&times;</button>';
        item.innerHTML = del +
          '<span class="tutor-list-item-title">' + escHtml(c.title) + '</span>' +
          '<span class="tutor-list-item-meta">' + c.messages.length + ' msgs &middot; ' + new Date(c.updatedAt).toLocaleDateString() + '</span>';
        item.addEventListener('click', function (e) {
          if (e.target.classList.contains('tutor-list-delete')) {
            dbDelete(e.target.dataset.id).then(function () {
              if (currentConv && currentConv.id === e.target.dataset.id) newChat();
              item.remove();
            });
            return;
          }
          loadConversation(c.id);
          listPanel.classList.remove('open');
        });
        listItems.appendChild(item);
      });
      listPanel.classList.add('open');
    });
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function newChat() {
    currentConv = {
      id: crypto.randomUUID(),
      title: 'New chat',
      messages: [],
      tokens: { input: 0, output: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPage: document.title
    };
    renderMessages();
    updateHeader();
    listPanel.classList.remove('open');
  }

  function loadConversation(id) {
    dbGet(id).then(function (c) {
      if (c) { currentConv = c; renderMessages(); updateHeader(); }
    });
  }

  function updateHeader() {
    titleEl.textContent = currentConv.title;
    var inp = currentConv.tokens.input;
    var out = currentConv.tokens.output;
    tokensEl.textContent = fmtTokens(out) + ' / ' + fmtTokens(inp);
  }

  function fmtTokens(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function renderMessages() {
    messagesEl.innerHTML = '';
    currentConv.messages.forEach(function (m) {
      appendMessageEl(m.role, m.content);
    });
    scrollBottom();
  }

  function appendMessageEl(role, content) {
    var div = document.createElement('div');
    if (role === 'nav') {
      div.className = 'tutor-msg tutor-msg-nav';
      div.textContent = content;
    } else {
      div.className = 'tutor-msg tutor-msg-' + role;
      if (role === 'assistant') {
        div.innerHTML = renderMarkdown(content);
        renderKaTeX(div);
      } else {
        div.textContent = content;
      }
    }
    messagesEl.appendChild(div);
    return div;
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderKaTeX(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  }

  // --- Streaming ---

  function sendMessage() {
    if (streaming) return;
    var text = textarea.value.trim();
    if (!text) return;

    textarea.value = '';
    autoResize();

    if (!currentConv) newChat();

    if (currentConv.lastPage !== document.title && currentConv.messages.length > 0) {
      var navMsg = '[Navigated to: ' + document.title + ']';
      currentConv.messages.push({ role: 'nav', content: navMsg });
      appendMessageEl('nav', navMsg);
      currentConv.lastPage = document.title;
    }

    currentConv.messages.push({ role: 'user', content: text });
    if (currentConv.messages.filter(function (m) { return m.role === 'user'; }).length === 1) {
      currentConv.title = text.substring(0, 50);
      titleEl.textContent = currentConv.title;
    }
    appendMessageEl('user', text);
    scrollBottom();

    var selection = '';
    var sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      var node = sel.anchorNode;
      while (node && node !== document.body) {
        if (node.classList && node.classList.contains('tutor-drawer')) { node = null; break; }
        node = node.parentNode;
      }
      if (node) selection = sel.toString().trim();
    }

    var apiMessages = currentConv.messages
      .filter(function (m) { return m.role !== 'nav'; })
      .slice(-MAX_MESSAGES_SENT);

    streaming = true;
    sendBtn.disabled = true;

    var assistantDiv = appendMessageEl('assistant', '');
    var dot = document.createElement('span');
    dot.className = 'tutor-streaming-dot';
    assistantDiv.appendChild(dot);
    scrollBottom();

    var fullText = '';

    fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildSystem(selection),
        messages: apiMessages
      })
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      function read() {
        return reader.read().then(function (result) {
          if (result.done) return finish();
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n\n');
          buffer = lines.pop();
          lines.forEach(function (line) {
            if (!line.startsWith('data: ')) return;
            var data;
            try { data = JSON.parse(line.substring(6)); } catch (e) { return; }
            if (data.type === 'delta') {
              fullText += data.text;
              assistantDiv.innerHTML = renderMarkdown(fullText);
              scrollBottom();
            } else if (data.type === 'usage_start' && data.usage) {
              currentConv.tokens.input += data.usage.input_tokens;
            } else if (data.type === 'done' && data.usage) {
              currentConv.tokens.output += data.usage.output_tokens;
            }
          });
          return read();
        });
      }

      function finish() {
        streaming = false;
        sendBtn.disabled = false;
        assistantDiv.innerHTML = renderMarkdown(fullText);
        renderKaTeX(assistantDiv);
        scrollBottom();
        currentConv.messages.push({ role: 'assistant', content: fullText });
        currentConv.updatedAt = Date.now();
        updateHeader();
        dbPut(currentConv);
      }

      return read();
    })
    .catch(function (err) {
      streaming = false;
      sendBtn.disabled = false;
      assistantDiv.innerHTML = '<em style="color:var(--accent)">Error: ' + escHtml(err.message) + '</em>';
      scrollBottom();
    });
  }

  // --- Init ---

  function init() {
    createDrawer();
    openDB().then(function () { newChat(); });

    fetch(prefix + 'course-summary.txt')
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { courseSummary = t; })
      .catch(function () {});

    document.addEventListener('keydown', function (e) {
      var isMac = navigator.platform.indexOf('Mac') > -1;
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        toggleDrawer();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
