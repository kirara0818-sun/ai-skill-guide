/* ==========================================================================
   왕초보 AI 가이드 — 7개 카테고리
   화면 동작 전용 파일입니다. 항목을 늘리거나 고칠 때는 data/*.json 만 고치면 됩니다.
   · data/categories.json  — 카테고리 7개 목록 (탭 순서·이름)
   · data/{카테고리}.json   — 그 카테고리의 항목·명령어
   ========================================================================== */

(function () {
  'use strict';

  var HUB_URL = 'data/categories.json';

  var els = {
    eyebrow: document.getElementById('eyebrow'),
    title: document.getElementById('hero-title'),
    lead: document.getElementById('hero-lead'),
    tabs: document.getElementById('tabs'),
    toolwrap: document.querySelector('.hero__tools'),
    share: document.getElementById('share-cat'),
    chips: document.getElementById('chips'),
    guide: document.getElementById('guide'),
    grid: document.getElementById('grid'),
    search: document.getElementById('search'),
    searchClear: document.getElementById('search-clear'),
    resultline: document.getElementById('resultline'),
    empty: document.getElementById('empty'),
    emptyReset: document.getElementById('empty-reset'),
    howto: document.getElementById('howto'),
    footTip: document.getElementById('foot-tip'),
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
    cat: 'all',
    filter: 'all',
    only: false,
    hub: null,
    items: [],
    cats: {},
    order: [],
    filters: {},
    guides: {},
    lastFocus: null
  };

  var toastTimer = null;
  var composing = false;
  var searchTimer = null;

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

  function catOf(id) {
    return state.cats[id] || { id: id, nav: id, title: id, emoji: '' };
  }

  function filterLabel(item) {
    var list = state.filters[item.cat] || [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === item.filter) return list[i].label;
    }
    return '';
  }

  function searchText(item) {
    if (item.$hay) return item.$hay;
    var parts = [item.title, item.situation, item.summary, catOf(item.cat).nav, filterLabel(item)];
    parts = parts.concat(item.keywords || []);
    parts = parts.concat(item.prepare || []);
    (item.steps || []).forEach(function (step) {
      parts.push(step.title || '');
      (step.lines || []).forEach(function (line) { parts.push(line); });
    });
    if (item.example) parts.push(item.example);
    (item.prompts || []).forEach(function (prompt) {
      parts.push(prompt.name || '');
      parts.push(prompt.text || '');
    });
    (item.trouble || []).forEach(function (row) {
      parts.push(row.q || '');
      parts.push(row.a || '');
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

  function inCategory(item) {
    return state.cat === 'all' || item.cat === state.cat;
  }

  function visibleItems() {
    return state.items.filter(function (item) {
      if (!inCategory(item)) return false;
      if (state.filter !== 'all' && item.filter !== state.filter) return false;
      return matchQuery(item);
    });
  }

  /* ------------------------------------------------------------ url */

  function readUrl() {
    var params = new URLSearchParams(location.search);
    var cat = params.get('cat');
    if (cat && state.cats[cat]) state.cat = cat;
    state.only = params.get('only') === '1' && state.cat !== 'all';
    if (state.only) document.body.classList.add('is-only');
  }

  function syncUrl(keepHash) {
    var params = new URLSearchParams(location.search);
    if (state.cat === 'all') params.delete('cat'); else params.set('cat', state.cat);
    if (state.only) params.set('only', '1'); else params.delete('only');
    var qs = params.toString();
    var hash = keepHash ? (location.hash || '') : '';
    try {
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + hash);
    } catch (err) { /* ignore */ }
  }

  function shareUrl() {
    var base = location.origin + location.pathname;
    if (state.cat === 'all') return base;
    return base + '?cat=' + encodeURIComponent(state.cat) + '&only=1';
  }

  /* ------------------------------------------------------------ header */

  function renderHeader() {
    if (state.cat === 'all') {
      els.title.textContent = state.hub.site.title || '왕초보 AI 가이드';
      els.lead.textContent = state.hub.site.lead || '';
      els.eyebrow.innerHTML = '';
      els.eyebrow.appendChild(document.createTextNode('왕초보 AI 강의'));
      els.eyebrow.appendChild(el('span', 'sep'));
      els.eyebrow.appendChild(document.createTextNode('7개 카테고리 · 이 페이지 하나만 보면 됩니다'));
      els.search.placeholder = '무엇을 하고 싶으세요? (예: 자막, 카드뉴스, 블로그)';
      document.title = (state.hub.site.title || '왕초보 AI 가이드') + ' — 7개 카테고리';
      els.footTip.innerHTML = state.hub.site.foot ? escapeHtml(state.hub.site.foot) : '';
      return;
    }
    var cat = catOf(state.cat);
    els.title.textContent = cat.emoji + ' ' + cat.title;
    els.lead.textContent = cat.lead || cat.desc || '';
    els.eyebrow.innerHTML = '';
    els.eyebrow.appendChild(document.createTextNode('왕초보 AI 강의'));
    els.eyebrow.appendChild(el('span', 'sep'));
    els.eyebrow.appendChild(document.createTextNode('이 카테고리 하나만 보면 됩니다'));
    els.search.placeholder = cat.nav + ' 안에서 검색 (예: 자막, 초안)';
    document.title = cat.emoji + ' ' + cat.title + ' — 왕초보 AI 가이드';
    els.footTip.innerHTML = '';
    var tip = el('span');
    tip.appendChild(document.createTextNode('마음에 안 들면 '));
    var strong = el('strong', null, '한 가지만 다시');
    tip.appendChild(strong);
    tip.appendChild(document.createTextNode(' 부탁해 보세요. 결과는 한 번에 완벽하게 나오지 않습니다.'));
    els.footTip.appendChild(tip);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderTabs() {
    els.tabs.textContent = '';
    if (state.only) { els.tabs.hidden = true; return; }
    els.tabs.hidden = false;

    var all = el('button', 'tab');
    all.type = 'button';
    all.dataset.cat = 'all';
    all.setAttribute('aria-pressed', state.cat === 'all' ? 'true' : 'false');
    all.appendChild(el('span', 'tab__label', '전체'));
    all.appendChild(el('span', 'tab__count', String(state.items.length)));
    all.addEventListener('click', function () { selectCategory('all'); });
    els.tabs.appendChild(all);

    state.order.forEach(function (id) {
      var cat = state.cats[id];
      var button = el('button', 'tab tab--' + id);
      button.type = 'button';
      button.dataset.cat = id;
      button.setAttribute('aria-pressed', state.cat === id ? 'true' : 'false');
      button.appendChild(el('span', 'tab__emoji', cat.emoji));
      button.appendChild(el('span', 'tab__label', cat.nav));
      button.appendChild(el('span', 'tab__count', String((cat.itemCount || 0))));
      button.addEventListener('click', function () { selectCategory(id); });
      els.tabs.appendChild(button);
    });
  }

  function selectCategory(id) {
    state.cat = id;
    state.filter = 'all';
    if (state.q) {
      state.q = '';
      els.search.value = '';
      els.searchClear.hidden = true;
    }
    renderHeader();
    renderTabs();
    renderGuide();
    renderChips();
    renderGrid();
    syncUrl(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------ guide */

  function renderGuide() {
    var guide = state.cat === 'all' ? null : state.guides[state.cat];
    els.guide.textContent = '';
    if (!guide || !guide.blocks || !guide.blocks.length) {
      els.guide.hidden = true;
      return;
    }
    els.guide.hidden = false;

    var details = el('details', 'guide__box');
    if (guide.blocks.length <= 3 && !guide.blocks.some(function (b) { return b.kind === 'table'; })) {
      details.open = true;
    }
    var summary = el('summary', 'guide__summary');
    summary.appendChild(el('span', 'guide__kicker', '읽어 두면 좋아요'));
    summary.appendChild(el('span', 'guide__title', guide.title || ''));
    details.appendChild(summary);

    var body = el('div', 'guide__body');
    guide.blocks.forEach(function (block) {
      if (block.kind === 'table' && block.rows) {
        var wrap = el('div', 'tablewrap');
        var table = el('table', 'gtable');
        if (block.head) {
          var thead = el('thead');
          var htr = el('tr');
          block.head.forEach(function (cell) { htr.appendChild(el('th', null, cell)); });
          thead.appendChild(htr);
          table.appendChild(thead);
        }
        var tbody = el('tbody');
        block.rows.forEach(function (row) {
          var tr = el('tr');
          row.forEach(function (cell) { tr.appendChild(el('td', null, cell)); });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        body.appendChild(wrap);
      } else if (block.kind === 'note') {
        var note = el('div', 'note note--info');
        note.appendChild(el('strong', 'note__title', block.title || '알아 둘 점'));
        note.appendChild(el('p', null, block.text || ''));
        body.appendChild(note);
      } else {
        body.appendChild(el('p', 'guide__text', block.text || ''));
      }
    });
    details.appendChild(body);
    els.guide.appendChild(details);
  }

  /* ------------------------------------------------------------ chips */

  function renderChips() {
    els.chips.textContent = '';
    if (state.cat === 'all') { els.chips.hidden = true; return; }
    els.chips.hidden = false;

    var list = state.filters[state.cat] || [];
    list.forEach(function (filter) {
      var count = state.items.filter(function (item) {
        if (item.cat !== state.cat) return false;
        if (filter.id !== 'all' && item.filter !== filter.id) return false;
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

  function tagEl(item) {
    if (state.cat === 'all') {
      var cat = catOf(item.cat);
      return el('span', 'tag tag--cat tag--cat-' + item.cat, cat.nav || cat.title);
    }
    return el('span', 'tag', filterLabel(item));
  }

  function cardEl(item, index) {
    var card = el('article', 'card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.id = item.id;
    card.setAttribute('aria-label', item.title + ' — ' + item.summary + ' (자세히 보기)');

    var top = el('div', 'card__top');
    top.appendChild(tagEl(item));
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

  function renderGrid() {
    var list = visibleItems();
    els.grid.textContent = '';
    list.forEach(function (item, index) {
      els.grid.appendChild(cardEl(item, index));
    });
    els.empty.hidden = list.length > 0;
    updateResultline(list.length);
  }

  function updateResultline(shown) {
    var total = state.items.filter(inCategory).length;
    var q = state.q.trim();
    els.resultline.textContent = '';
    if (q) {
      els.resultline.appendChild(document.createTextNode('“' + q + '” 검색 결과 '));
    }
    els.resultline.appendChild(el('b', null, String(shown)));
    els.resultline.appendChild(document.createTextNode('개'));
    if (shown !== total) {
      els.resultline.appendChild(document.createTextNode(' · 이 카테고리 ' + total + '개 항목'));
    } else if (!q) {
      els.resultline.appendChild(document.createTextNode(
        state.cat === 'all' ? ' 항목 · 카테고리를 고르면 상황별로 좁힐 수 있어요' : ' 항목'
      ));
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

  function copyButton(text, label) {
    var button = el('button', 'copybtn');
    button.type = 'button';
    button.innerHTML = ICON_COPY + '<span>' + (label || '복사하기') + '</span>';
    button.setAttribute('aria-label', (label || '복사하기'));
    button.addEventListener('click', function () { copyText(text, button); });
    return button;
  }

  function renderModalBody(item) {
    var body = els.modalBody;
    body.textContent = '';
    var num = 0;

    if (item.prepare && item.prepare.length) {
      num += 1;
      var prepSection = el('section', 'msec');
      prepSection.appendChild(sectionTitle(num, '준비물 — 미리 챙겨 두세요'));
      var ul = el('ul', 'checks');
      item.prepare.forEach(function (line) {
        var li = el('li');
        li.appendChild(el('span', 'checks__dot', '✓'));
        li.appendChild(el('span', null, line));
        ul.appendChild(li);
      });
      prepSection.appendChild(ul);
      body.appendChild(prepSection);
    }

    var steps = normalizeSteps(item);
    if (steps.length) {
      num += 1;
      var section = el('section', 'msec');
      section.appendChild(sectionTitle(num, '이렇게 따라 하세요'));

      var ol = el('ol', 'steps');
      steps.forEach(function (step) {
        var li = el('li', 'step');
        li.appendChild(el('span', 'step__num'));
        var inner = el('div', 'step__body');

        if (step.title) {
          inner.appendChild(el('h4', 'step__title', step.title));
          var lines = el('ul', 'step__lines');
          (step.lines || []).forEach(function (line) {
            lines.appendChild(el('li', null, line));
          });
          inner.appendChild(lines);
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

    if (item.example) {
      num += 1;
      var exSection = el('section', 'msec');
      exSection.appendChild(sectionTitle(num, '실제 입력 예시'));
      var exBox = el('div', 'sample');
      var exBar = el('div', 'sample__bar');
      exBar.appendChild(el('span', 'sample__name', '이렇게 입력하면 됩니다 (그대로 복사해도 됩니다)'));
      exBar.appendChild(copyButton(item.example, '예시 복사'));
      exBox.appendChild(exBar);
      exBox.appendChild(el('pre', 'sample__code', item.example));
      exSection.appendChild(exBox);
      body.appendChild(exSection);
    }

    if (item.prompts && item.prompts.length) {
      num += 1;
      var copySection = el('section', 'msec');
      copySection.appendChild(sectionTitle(num, '그대로 복사해서 쓰는 명령어'));

      item.prompts.forEach(function (prompt) {
        var box = el('div', 'prompt');
        var bar = el('div', 'prompt__bar');
        bar.appendChild(el('span', 'prompt__name', prompt.name || '명령어'));
        bar.appendChild(copyButton(prompt.text, '복사하기'));

        var pre = el('pre', 'prompt__code', prompt.text);
        box.appendChild(bar);
        box.appendChild(pre);
        copySection.appendChild(box);
      });

      body.appendChild(copySection);
    }

    if (item.trouble && item.trouble.length) {
      num += 1;
      var troubleSection = el('section', 'msec');
      troubleSection.appendChild(sectionTitle(num, '자주 막히는 부분'));
      var dl = el('dl', 'qa');
      item.trouble.forEach(function (row) {
        var q = el('dt', 'qa__q');
        q.appendChild(el('span', 'qa__mark', 'Q'));
        q.appendChild(el('span', null, row.q));
        dl.appendChild(q);
        var a = el('dd', 'qa__a');
        a.appendChild(el('span', 'qa__mark qa__mark--a', 'A'));
        a.appendChild(el('span', null, row.a));
        dl.appendChild(a);
      });
      troubleSection.appendChild(dl);
      body.appendChild(troubleSection);
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

  function findItem(id) {
    for (var i = 0; i < state.items.length; i += 1) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  function openItem(id, skipUrl) {
    var item = findItem(id);
    if (!item) return;

    state.lastFocus = document.activeElement;

    var cat = catOf(item.cat);
    els.modalTag.className = 'tag tag--cat tag--cat--' + item.cat;
    els.modalTag.textContent = cat.emoji + ' ' + cat.nav;
    els.modalTitle.textContent = item.title;
    els.modalSituation.textContent = item.situation || '';
    renderModalBody(item);

    els.modal.hidden = false;
    document.body.classList.add('is-locked');
    els.panel.focus();
    els.panel.scrollTop = 0;

    if (!skipUrl) {
      try { history.replaceState(null, '', location.pathname + location.search + '#' + item.id); } catch (err) { /* ignore */ }
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
    if (!button) return;
    var label = button.getAttribute('data-label') ||
      (button.querySelector('span') ? button.querySelector('span').textContent : '복사하기');
    button.setAttribute('data-label', label);
    if (success) {
      button.classList.add('is-done');
      button.innerHTML = ICON_CHECK + '<span>복사 완료!</span>';
      toast('복사 완료 — 붙여넣기 해 보세요');
    } else {
      toast('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.');
    }
    window.setTimeout(function () {
      button.classList.remove('is-done');
      button.innerHTML = ICON_COPY + '<span>' + label + '</span>';
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
    var value = els.search.value;
    els.searchClear.hidden = !value;
    if (value === state.q) return;
    state.q = value;
    renderChips();
    renderGrid();
  }

  els.search.addEventListener('compositionstart', function () { composing = true; });
  els.search.addEventListener('compositionend', function () {
    composing = false;
    applySearch();
  });
  els.search.addEventListener('input', function () {
    if (composing) return;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(applySearch, 60);
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
    renderChips();
    renderGrid();
  });

  els.share.addEventListener('click', function () {
    var url = shareUrl();
    writeClipboard(url).then(function () {
      var label = els.share.querySelector('span');
      els.share.classList.add('is-done');
      label.textContent = '링크 복사 완료!';
      toast(state.cat === 'all' ? '전체 페이지 링크를 복사했어요' : '이 카테고리만 보이는 링크를 복사했어요');
      window.setTimeout(function () {
        els.share.classList.remove('is-done');
        label.textContent = '현재 카테고리 링크 복사';
      }, 2200);
    }).catch(function () {
      toast('링크를 복사하지 못했어요. 주소창의 주소를 복사해 주세요.');
    });
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

  window.addEventListener('popstate', function () {
    var before = state.cat;
    var onlyBefore = state.only;
    state.cat = 'all';
    state.only = false;
    document.body.classList.remove('is-only');
    readUrl();
    if (state.cat !== before || state.only !== onlyBefore) {
      state.filter = 'all';
      renderHeader();
      renderTabs();
      renderGuide();
      renderChips();
      renderGrid();
    }
  });

  /* ------------------------------------------------------------ boot */

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' — ' + url);
      return response.json();
    });
  }

  function init(hub, payloads) {
    state.hub = hub;

    payloads.forEach(function (payload) {
      var cat = payload.category || {};
      var id = cat.id;
      cat.itemCount = (payload.items || []).length;
      cat.promptCount = (payload.items || []).reduce(function (sum, item) {
        return sum + (item.prompts ? item.prompts.length : 0);
      }, 0);
      state.cats[id] = cat;
      state.filters[id] = payload.filters || [{ id: 'all', label: '전체' }];
      if (payload.guide) state.guides[id] = payload.guide;
      (payload.items || []).forEach(function (item) {
        item.cat = id;
        state.items.push(item);
      });
    });

    state.order = hub.categories.map(function (c) { return c.id; });

    readUrl();
    renderHeader();
    renderTabs();
    renderGuide();
    renderChips();
    renderGrid();

    var hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (hash) {
      var found = findItem(hash);
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

  fetchJson(HUB_URL)
    .then(function (hub) {
      return Promise.all(hub.categories.map(function (cat) {
        return fetchJson(cat.file);
      })).then(function (payloads) {
        init(hub, payloads);
      });
    })
    .catch(fail);
})();
