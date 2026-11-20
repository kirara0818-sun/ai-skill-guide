/* ==========================================================================
   🎬 영상 만들기 — 왕초보 AI 가이드
   화면 동작 전용 파일입니다. 항목을 늘리거나 고칠 때는 data/video.json 만
   수정하면 됩니다.
   ========================================================================== */

(function () {
  'use strict';

  var DATA_URL = 'data/video.json';

  var els = {
    chips: document.getElementById('chips'),
    grid: document.getElementById('grid'),
    search: document.getElementById('search'),
    searchClear: document.getElementById('search-clear'),
    resultline: document.getElementById('resultline'),
    empty: document.getElementById('empty'),
    emptyReset: document.getElementById('empty-reset'),
    lead: document.getElementById('hero-lead'),
    modal: document.getElementById('modal'),
    panel: document.getElementById('modal-panel'),
    modalTag: document.getElementById('modal-tag'),
    modalTitle: document.getElementById('modal-title'),
    modalSituation: document.getElementById('modal-situation'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close'),
    toast: document.getElementById('toast')
  };

  var state = {
    q: '',
    filter: 'all',
    data: null,
    labelById: {},
    lastFocus: null
  };

  var toastTimer = null;
  var composing = false;

  var ICON_DOC = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M4 1.8h5.2L12.8 5.4V14a.8.8 0 0 1-.8.8H4a.8.8 0 0 1-.8-.8V2.6A.8.8 0 0 1 4 1.8Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path d="M9 2v3.6h3.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  var ICON_ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var ICON_COPY = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<rect x="5.4" y="5.4" width="8" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M10.6 3.9V3.2A1.2 1.2 0 0 0 9.4 2H3.2A1.2 1.2 0 0 0 2 3.2v6.2A1.2 1.2 0 0 0 3.2 10.6h.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

  var ICON_CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M3.2 8.4 6.2 11.4 12.8 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------ helpers */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function norm(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function searchText(item) {
    if (item.$hay) return item.$hay;
    var parts = [item.title, item.situation, item.summary, state.labelById[item.category] || ''];
    parts = parts.concat(item.keywords || []);
    (item.steps || []).forEach(function (step) {
      parts.push(step.title || '');
      (step.lines || []).forEach(function (line) { parts.push(line); });
    });
    (item.prompts || []).forEach(function (prompt) {
      parts.push(prompt.name || '');
      parts.push(prompt.text || '');
    });
    item.$hay = norm(parts.join(' '));
    return item.$hay;
  }

  function matchQuery(item) {
    var q = norm(state.q);
    if (!q) return true;
    var hay = searchText(item);
    return q.split(' ').every(function (token) { return hay.indexOf(token) !== -1; });
  }

  function matches(item) {
    if (state.filter !== 'all' && item.category !== state.filter) return false;
    return matchQuery(item);
  }

  /* ------------------------------------------------------------ chips */

  function renderChips() {
    els.chips.textContent = '';
    state.data.filters.forEach(function (filter) {
      var count = state.data.items.filter(function (item) {
        if (filter.id !== 'all' && item.category !== filter.id) return false;
        return matchQuery(item);
      }).length;

      var button = el('button', 'chip');
      button.type = 'button';
      button.dataset.filter = filter.id;
      button.setAttribute('aria-pressed', state.filter === filter.id ? 'true' : 'false');
      button.appendChild(document.createTextNode(filter.label));
      button.appendChild(el('span', 'chip__count', String(count)));
      if (filter.id === 'all') button.setAttribute('aria-label', '전체 ' + count + '개 보기');
      button.addEventListener('click', function () {
        state.filter = filter.id;
        renderChips();
        renderGrid();
      });
      els.chips.appendChild(button);
    });
  }

  /* ------------------------------------------------------------ cards */

  function cardEl(item, index) {
    var card = el('article', 'card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.id = item.id;
    card.setAttribute('aria-label', item.title + ' — ' + item.summary + ' (자세히 보기)');

    var top = el('div', 'card__top');
    top.appendChild(tagEl(item.category));
    top.appendChild(el('span', 'card__num', pad2(index + 1)));

    var foot = el('div', 'card__foot');
    var badge = el('span', 'badge');
    badge.innerHTML = ICON_DOC + '<span>명령어 ' + item.prompts.length + '개</span>';
    var more = el('span', 'card__more');
    more.innerHTML = '<span>펼쳐 보기</span>' + ICON_ARROW;

    foot.appendChild(badge);
    foot.appendChild(more);

    card.appendChild(top);
    card.appendChild(el('h3', 'card__title', item.title));
    card.appendChild(el('p', 'card__summary', item.summary));
    card.appendChild(foot);

    card.addEventListener('click', function () { openItem(item.id); });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        openItem(item.id);
      }
    });
    return card;
  }

  function tagEl(categoryId) {
    return el('span', 'tag tag--' + categoryId, state.labelById[categoryId] || '');
  }

  function renderGrid() {
    var list = state.data.items.filter(matches);
    els.grid.textContent = '';
    list.forEach(function (item) {
      els.grid.appendChild(cardEl(item, state.data.items.indexOf(item)));
    });
    els.empty.hidden = list.length > 0;
    updateResultline(list.length);
  }

  function updateResultline(shown) {
    var total = state.data.items.length;
    var q = state.q.trim();
    els.resultline.textContent = '';
    if (q) {
      els.resultline.appendChild(document.createTextNode('“' + q + '” 검색 결과 '));
    }
    els.resultline.appendChild(el('b', null, String(shown)));
    els.resultline.appendChild(document.createTextNode('개'));
    if (shown !== total) {
      els.resultline.appendChild(document.createTextNode(' · 전체 ' + total + '개 항목'));
    } else if (!q) {
      els.resultline.appendChild(document.createTextNode(' 항목'));
    }
  }

  /* ------------------------------------------------------------ modal */

  function normalizeSteps(item) {
    var steps = item.steps || [];
    if (steps.length === 1 && !steps[0].title) {
      return (steps[0].lines || []).map(function (line) {
        return { title: '', lines: [line] };
      });
    }
    return steps;
  }

  function sectionTitle(num, text) {
    var h = el('h3', 'msec__title');
    h.appendChild(el('span', null, num + '.'));
    h.appendChild(document.createTextNode(text));
    return h;
  }

  function renderModalBody(item) {
    var body = els.modalBody;
    body.textContent = '';

    var steps = normalizeSteps(item);
    if (steps.length) {
      var section = el('section', 'msec');
      section.appendChild(sectionTitle('1', '이렇게 따라 하세요'));

      var ol = el('ol', 'steps');
      steps.forEach(function (step) {
        var li = el('li', 'step');
        li.appendChild(el('span', 'step__num')); // CSS counter
        var inner = el('div', 'step__body');

        if (step.title) {
          inner.appendChild(el('h4', 'step__title', step.title));
          var ul = el('ul', 'step__lines');
          (step.lines || []).forEach(function (line) {
            ul.appendChild(el('li', null, line));
          });
          inner.appendChild(ul);
        } else {
          (step.lines || []).forEach(function (line) {
            inner.appendChild(el('p', 'step__text', line));
          });
        }

        li.appendChild(inner);
        ol.appendChild(li);
      });

      section.appendChild(ol);
      body.appendChild(section);
    }

    if (item.prompts && item.prompts.length) {
      var copySection = el('section', 'msec');
      copySection.appendChild(sectionTitle('2', '그대로 복사해서 쓰는 명령어'));

      item.prompts.forEach(function (prompt) {
        var box = el('div', 'prompt');
        var bar = el('div', 'prompt__bar');
        bar.appendChild(el('span', 'prompt__name', prompt.name || '명령어'));

        var button = el('button', 'copybtn');
        button.type = 'button';
        button.innerHTML = ICON_COPY + '<span>복사하기</span>';
        button.setAttribute('aria-label', (prompt.name || '명령어') + ' 복사하기');
        button.addEventListener('click', function () { copyText(prompt.text, button); });
        bar.appendChild(button);

        var pre = el('pre', 'prompt__code', prompt.text);
        box.appendChild(bar);
        box.appendChild(pre);
        copySection.appendChild(box);
      });

      body.appendChild(copySection);
    }

    if (item.note && item.note.text) {
      var type = item.note.type === 'warning' || item.note.type === 'tip' ? item.note.type : 'info';
      var note = el('div', 'note note--' + type);
      note.appendChild(el('strong', 'note__title', item.note.title || '알아 둘 점'));
      note.appendChild(el('p', null, item.note.text));
      body.appendChild(note);
    }

    els.modalBody.scrollTop = 0;
  }

  function openItem(id, skipHistory) {
    var item = null;
    state.data.items.forEach(function (candidate) {
      if (candidate.id === id) item = candidate;
    });
    if (!item) return;

    state.lastFocus = document.activeElement;

    els.modalTag.className = 'tag tag--' + item.category;
    els.modalTag.textContent = state.labelById[item.category] || '';
    els.modalTitle.textContent = item.title;
    els.modalSituation.textContent = item.situation || '';
    renderModalBody(item);

    els.modal.hidden = false;
    document.body.classList.add('is-locked');
    els.panel.focus();

    if (!skipHistory) {
      try { history.replaceState(null, '', '#' + item.id); } catch (err) { /* ignore */ }
    }
  }

  function closeModal() {
    if (els.modal.hidden) return;
    els.modal.hidden = true;
    document.body.classList.remove('is-locked');
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      state.lastFocus.focus();
    }
    state.lastFocus = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* ignore */ }
  }

  /* ------------------------------------------------------------ copy */

  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(area);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function copyText(text, button) {
    writeClipboard(text).then(function () {
      notifyCopied(button, true);
    }).catch(function () {
      notifyCopied(button, false);
    });
  }

  function notifyCopied(button, success) {
    var label = button.querySelector('span');
    button.classList.toggle('is-done', success);
    if (success) {
      button.innerHTML = ICON_CHECK + '<span>복사 완료!</span>';
      toast('복사 완료!');
    } else {
      toast('복사하지 못했어요. 명령어를 길게 눌러 직접 복사해 주세요.');
    }
    window.setTimeout(function () {
      button.classList.remove('is-done');
      button.innerHTML = ICON_COPY + '<span>복사하기</span>';
      if (label) label.textContent = '복사하기';
    }, 1900);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-show');
    }, 1900);
  }

  /* ------------------------------------------------------------ events */

  function applySearch() {
    state.q = els.search.value;
    els.searchClear.hidden = !state.q;
    renderChips();
    renderGrid();
  }

  els.search.addEventListener('compositionstart', function () { composing = true; });
  els.search.addEventListener('compositionend', function () {
    composing = false;
    applySearch();
  });
  els.search.addEventListener('input', function () {
    if (!composing) applySearch();
  });
  els.search.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && els.search.value) {
      event.stopPropagation();
      els.search.value = '';
      applySearch();
    }
  });

  els.searchClear.addEventListener('click', function () {
    els.search.value = '';
    els.search.focus();
    applySearch();
  });

  els.emptyReset.addEventListener('click', function () {
    els.search.value = '';
    state.filter = 'all';
    applySearch();
  });

  els.modalClose.addEventListener('click', closeModal);
  els.modal.addEventListener('click', function (event) {
    if (event.target && event.target.getAttribute && event.target.getAttribute('data-close')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (els.modal.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    var focusables = Array.prototype.filter.call(
      els.panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (node) { return node.offsetParent !== null || node === document.activeElement; }
    );
    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === els.panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ------------------------------------------------------------ boot */

  function init(data) {
    state.data = data;
    (data.filters || []).forEach(function (filter) {
      if (filter.id !== 'all') state.labelById[filter.id] = filter.label;
    });

    if (data.category && data.category.lead) {
      els.lead.textContent = data.category.lead;
    }
    if (data.category && data.category.title && data.category.emoji) {
      document.title = data.category.emoji + ' ' + data.category.title + ' — 왕초보 AI 가이드';
    }

    if (!Array.isArray(data.items) || !data.items.length) {
      els.resultline.textContent = '아직 등록된 항목이 없습니다.';
      els.empty.hidden = false;
      return;
    }

    renderChips();
    renderGrid();

    var hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (hash) {
      var found = data.items.some(function (item) { return item.id === hash; });
      if (found) openItem(hash, true);
    }
  }

  function fail(error) {
    els.resultline.textContent = '내용을 불러오지 못했습니다. 새로 고침해 주세요.';
    els.empty.hidden = false;
    els.empty.querySelector('.empty__title').textContent = '내용을 불러오지 못했습니다';
    els.empty.querySelector('.empty__desc').textContent = '인터넷 연결을 확인한 뒤 새로 고침해 주세요.';
    if (window.console && console.error) console.error(error);
  }

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(init)
    .catch(fail);
})();
