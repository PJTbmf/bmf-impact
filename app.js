/* BeMoreFab impact page.
   Reads one small counts-only file (data/public-feed.json) and draws the page from it.
   Nothing here talks to Beacon or to any other system. */
(function () {
  'use strict';

  // A page in a sub-folder says where the file is with <html data-feed="../data/public-feed.json">
  var FEED_URL = document.documentElement.getAttribute('data-feed') || 'data/public-feed.json';
  var SMALL = 5; // a count of children below this is never shown
  var SMALL_TEXT = 'Fewer than 5';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var nf = new Intl.NumberFormat('en-GB');
  var nfCompact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text; // feed text is data: never innerHTML
    return n;
  }

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]); }
    return n;
  }

  function pick(obj, path) {
    return path.split('.').reduce(function (o, k) { return (o === null || o === undefined) ? undefined : o[k]; }, obj);
  }

  function isNumber(v) { return typeof v === 'number' && isFinite(v); }

  // Hidden = left out of the feed (null) or, for a count of people or items, a real value under 5.
  function hidden(v, isCount) { return !isNumber(v) || (isCount && v > 0 && v < SMALL); }

  function longDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  // ---------- headline figures ----------
  function fillFigures(feed) {
    all('[data-figure]').forEach(function (node) {
      var v = pick(feed, node.getAttribute('data-figure'));
      node.textContent = isNumber(v) ? nf.format(v) : (typeof v === 'string' && v ? v : '–');
    });
    // the four tile figures share one size, chosen so the longest still fits
    var tiles = document.querySelector('.tiles');
    if (tiles) {
      var longest = all('.tile__figure', tiles).reduce(function (m, n) { return Math.max(m, n.textContent.length); }, 3);
      tiles.style.setProperty('--chars', String(longest));
    }
    var when = longDate(feed.as_of || '');
    all('[data-date]').forEach(function (node) { node.textContent = when ? 'on ' + when : 'recently'; });
  }

  // ---------- bar rows: a name, a bar and a figure per line ----------
  function drawRows(host, items, unit) {
    host.textContent = '';
    var shown = [], small = [];
    items.forEach(function (it) { (hidden(it.value, true) ? small : shown).push(it); });
    shown.sort(function (a, b) { return b.value - a.value; });
    var max = shown.reduce(function (m, it) { return Math.max(m, it.value); }, 0) || 1;

    var list = el('div', 'rows');
    list.setAttribute('role', 'table');
    list.setAttribute('aria-label', host.getAttribute('data-label') || (unit ? 'Number of ' + unit : 'Figures'));

    shown.concat(small).forEach(function (it) {
      var isSmall = hidden(it.value, true);
      var row = el('div', 'rows__row' + (isSmall ? ' rows__row--small' : ''));
      row.setAttribute('role', 'row');
      var name = el('div', 'rows__name', it.label);
      name.setAttribute('role', 'rowheader');
      var track = el('div', 'rows__track');
      track.setAttribute('aria-hidden', 'true');
      if (!isSmall && it.value > 0) {
        var bar = el('span', 'rows__bar');
        bar.style.width = Math.max(1, (it.value / max) * 100) + '%';
        track.appendChild(bar);
      }
      var val = el('div', 'rows__val', isSmall ? SMALL_TEXT : nf.format(it.value));
      val.setAttribute('role', 'cell');
      row.appendChild(name); row.appendChild(track); row.appendChild(val);
      list.appendChild(row);
    });
    host.appendChild(list);
  }

  // ---------- column charts ----------
  function niceScale(max, target) {
    if (max <= 0) return { max: 1, step: 1 };
    var rough = max / target;
    var pow = Math.pow(10, Math.floor(Math.log10(rough)));
    var n = rough / pow;
    var step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
    if (step < 1) step = 1;
    return { step: step, max: Math.ceil(max / step) * step };
  }

  function topRounded(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + ' V' + (y + r) + ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      ' H' + (x + w - r) + ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + ' V' + (y + h) + ' Z';
  }

  function drawColumns(host, items, opts) {
    var unit = opts.unit || '';
    var isCount = !!opts.isCount;
    var title = opts.title || '';
    var width = Math.max(260, Math.floor(host.clientWidth));
    // everything in the chart grows with the page's text size (bigger on wide screens)
    var k = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    host.textContent = '';

    var values = items.map(function (it) { return hidden(it.value, isCount) ? null : it.value; });
    var top = values.reduce(function (m, v) { return v === null ? m : Math.max(m, v); }, 0);
    var scale = niceScale(top, 4);
    var compact = scale.max >= 10000;
    var tick = function (v) { return compact ? nfCompact.format(v) : nf.format(v); };
    var ticks = [];
    for (var t = 0; t <= scale.max + 1e-9; t += scale.step) ticks.push(t);

    var m = { t: 26 * k, r: 14 * k, b: 30 * k, l: Math.max(26, tick(scale.max).length * 7.6 + 12) * k };
    var plotH = 200 * k, H = m.t + plotH + m.b;
    var plotW = width - m.l - m.r;
    var n = items.length;
    var band = plotW / n;
    var bw = Math.max(4, Math.min(24 * k, band - 2));
    var y = function (v) { return m.t + plotH - (v / scale.max) * plotH; };

    var root = svg('svg', { width: width, height: H, viewBox: '0 0 ' + width + ' ' + H, role: 'img', tabindex: '0' });
    var last = n - 1;
    var summary = title + '. ' + n + ' bars.';
    if (n && values[last] !== null) summary += ' Latest, ' + items[last].label + ': ' + nf.format(values[last]) + ' ' + unit + '.';
    summary += ' Use the left and right arrow keys to read each value, or open the table below.';
    root.setAttribute('aria-label', summary);

    // gridlines and y ticks (solid hairlines, recessive)
    ticks.forEach(function (tv) {
      root.appendChild(svg('line', { 'class': 'c-grid', x1: m.l, x2: width - m.r, y1: y(tv) + 0.5, y2: y(tv) + 0.5 }));
      var tx = svg('text', { x: m.l - 8 * k, y: y(tv) + 4 * k, 'text-anchor': 'end' });
      tx.textContent = tick(tv);
      root.appendChild(tx);
    });

    // x labels: skip some when they would collide
    var longest = items.reduce(function (mx, it) { return Math.max(mx, shortLabel(it.label).length); }, 0);
    var every = Math.max(1, Math.ceil((longest * 7.4 + 10) * k / band));
    items.forEach(function (it, i) {
      if ((last - i) % every !== 0) return; // always keep the latest
      var tx = svg('text', { x: m.l + band * i + band / 2, y: m.t + plotH + 20 * k, 'text-anchor': 'middle' });
      tx.textContent = shortLabel(it.label);
      root.appendChild(tx);
    });

    // bars (in one group, so a page can style or filter them together)
    var bars = [];
    var barGroup = svg('g', { 'class': 'c-bars' });
    root.appendChild(barGroup);
    var peak = values.indexOf(top);
    items.forEach(function (it, i) {
      var cx = m.l + band * i + band / 2;
      var v = values[i];
      var bar = null;
      if (v === null) {
        var s = svg('text', { 'class': 'c-small', x: cx, y: m.t + plotH - 6 * k, 'text-anchor': 'middle' });
        s.textContent = '<5';
        root.appendChild(s);
      } else if (v > 0) {
        var h = Math.max(1, m.t + plotH - y(v));
        bar = svg('path', { 'class': 'c-bar', d: topRounded(cx - bw / 2, m.t + plotH - h, bw, h, 4 * k) });
        barGroup.appendChild(bar);
      }
      bars.push({ cx: cx, top: v === null || v === 0 ? m.t + plotH : y(v), node: bar });
    });

    // direct labels: the latest bar, and the tallest if it is somewhere else and has room
    function label(i) {
      if (i < 0 || values[i] === null) return;
      var tx = svg('text', { 'class': 'c-val', x: bars[i].cx, y: bars[i].top - 7 * k, 'text-anchor': 'middle' });
      tx.textContent = nf.format(values[i]);
      root.appendChild(tx);
    }
    label(last);
    var room = (nf.format(top).length * 8 + 8) * k;
    if (peak !== last && values[peak] !== values[last] && (last - peak) * band > room) label(peak);

    // hit areas: the whole slot, top to bottom, so nobody has to land on a thin bar
    items.forEach(function (it, i) {
      var hit = svg('rect', { 'class': 'c-hit', x: m.l + band * i, y: m.t - 20 * k, width: band, height: plotH + 20 * k });
      hit.addEventListener('pointerenter', function () { show(i); });
      hit.addEventListener('pointerdown', function () { show(i); });
      root.appendChild(hit);
    });

    var tip = el('div', 'chart__tip');
    tip.hidden = true;
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    var tipValue = el('strong');
    var tipLabel = el('span');
    tip.appendChild(tipValue); tip.appendChild(tipLabel);

    var active = -1;
    function show(i) {
      if (active >= 0 && bars[active].node) bars[active].node.classList.remove('is-active');
      active = i;
      if (bars[i].node) bars[i].node.classList.add('is-active');
      tipValue.textContent = values[i] === null ? SMALL_TEXT : nf.format(values[i]) + (unit ? ' ' + unit : '');
      tipLabel.textContent = items[i].label;
      tip.hidden = false;
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = Math.min(Math.max(0, bars[i].cx - tw / 2), width - tw);
      var topPx = Math.max(0, bars[i].top - th - 26 * k);
      tip.style.left = left + 'px';
      tip.style.top = topPx + 'px';
    }
    function hide() {
      if (active >= 0 && bars[active].node) bars[active].node.classList.remove('is-active');
      active = -1;
      tip.hidden = true;
    }
    host.addEventListener('pointerleave', hide);
    root.addEventListener('focus', function () { if (active < 0 && n) show(last); });
    root.addEventListener('blur', hide);
    root.addEventListener('keydown', function (e) {
      if (!n) return;
      var i = active < 0 ? last : active;
      if (e.key === 'ArrowRight') i = Math.min(last, i + 1);
      else if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = last;
      else if (e.key === 'Escape') { hide(); return; }
      else return;
      e.preventDefault();
      show(i);
    });

    host.appendChild(root);
    host.appendChild(tip);
  }

  // "Dec 2025" -> "Dec" on the axis; the year stays in the tooltip and the table
  function shortLabel(label) {
    var mth = /^([A-Z][a-z]{2}) \d{4}$/.exec(label);
    return mth ? mth[1] : label.replace(/ so far$/, '');
  }

  function tableView(items, opts) {
    var details = el('details', 'table-view');
    details.appendChild(el('summary', null, 'Show these numbers as a table'));
    var table = el('table');
    var cap = el('caption', 'vh', opts.title || 'Figures');
    table.appendChild(cap);
    var body = el('tbody');
    items.forEach(function (it) {
      var tr = el('tr');
      var th = el('th', null, it.label);
      th.setAttribute('scope', 'row');
      tr.appendChild(th);
      tr.appendChild(el('td', null, hidden(it.value, opts.isCount) ? SMALL_TEXT : nf.format(it.value)));
      body.appendChild(tr);
    });
    table.appendChild(body);
    details.appendChild(table);
    details.addEventListener('toggle', postHeight);
    return details;
  }

  function setUpColumns(feed) {
    all('[data-columns]').forEach(function (host) {
      var items = pick(feed, host.getAttribute('data-columns'));
      if (!Array.isArray(items) || !items.length) { host.textContent = ''; return; }
      var heading = host.parentNode.querySelector('h3');
      var opts = {
        unit: host.getAttribute('data-unit') || '',
        isCount: host.getAttribute('data-count') === 'true',
        title: heading ? heading.textContent : ''
      };
      var canvas = el('div', 'chart__canvas');
      host.textContent = '';
      host.appendChild(canvas);
      canvas.style.position = 'relative';
      host.parentNode.insertBefore(tableView(items, opts), host.nextSibling);

      var lastWidth = 0, queued = false;
      function render() {
        queued = false;
        var w = Math.floor(canvas.clientWidth);
        if (!w || w === lastWidth) return;
        lastWidth = w;
        drawColumns(canvas, items, opts);
        postHeight();
      }
      render();
      if ('ResizeObserver' in window) {
        new ResizeObserver(function () { if (!queued) { queued = true; requestAnimationFrame(render); } }).observe(canvas);
      } else {
        window.addEventListener('resize', render);
      }
    });
  }

  function setUpRows(feed) {
    all('[data-rows]').forEach(function (host) {
      var items = pick(feed, host.getAttribute('data-rows'));
      if (!Array.isArray(items) || !items.length) { host.textContent = ''; return; }
      var heading = host.parentNode.querySelector('h3');
      if (heading) host.setAttribute('data-label', heading.textContent);
      drawRows(host, items, host.getAttribute('data-unit') || '');
    });
  }

  // ---------- register / refer buttons ----------
  function safeLink(url) { return typeof url === 'string' && /^https:\/\//i.test(url) ? url : ''; }

  function setUpButtons(feed) {
    var section = document.getElementById('act');
    var box = document.getElementById('act-buttons');
    if (!section || !box) return;
    var links = feed.links || {};
    var wanted = [['register', 'Register a child'], ['refer', 'Refer a family']];
    var made = 0;
    wanted.forEach(function (w) {
      var url = safeLink(links[w[0]]);
      if (url) {
        var a = el('a', 'act__btn', w[1]);
        a.href = url;
        a.target = '_top'; // leave the frame and open in the main site
        box.appendChild(a);
        made += 1;
      } else if (feed.draft) {
        box.appendChild(el('span', 'act__btn act__btn--todo', w[1]));
      }
    });
    if (made || feed.draft) section.hidden = false;
    if (!made && feed.draft) box.appendChild(el('p', 'act__note', 'Draft: these buttons need their links adding.'));
  }

  // ---------- let the host page (WordPress) size the frame ----------
  function postHeight() {
    if (window.parent === window) return;
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    window.parent.postMessage({ type: 'bmf-impact-height', height: h }, '*'); // carries a height only
  }

  function start(feed) {
    var mins = pick(feed, 'headline.pvs_minutes_school_year');
    var share = pick(feed, 'pvs.wellbeing_min_share');
    // minutes shown as hours and minutes, e.g. 7253 -> "120h 53m" and "120 hours 53 minutes"
    function hm(m, long) {
      if (!isNumber(m)) return null;
      m = Math.floor(m);
      var h = Math.floor(m / 60), r = m % 60;
      return long ? nf.format(h) + (h === 1 ? ' hour ' : ' hours ') + r + (r === 1 ? ' minute' : ' minutes') : nf.format(h) + 'h ' + r + 'm';
    }
    // a third of Primary Virtual School time is always wellbeing; rounded down so the claim holds
    var well = isNumber(mins) && isNumber(share) ? Math.floor(mins * share) : null;
    feed.computed = {
      pvs_time: hm(mins, false), pvs_time_long: hm(mins, true),
      pvs_wellbeing_time: hm(well, false), pvs_wellbeing_time_long: hm(well, true)
    };
    feed.draft = !!(feed.draft || feed.sample);
    if (feed.draft) {
      var note = document.getElementById('sample-note');
      var words = feed.draft_note || feed.sample_note;
      if (note && typeof words === 'string' && words) note.textContent = words;
      document.getElementById('sample-banner').hidden = false;
    }
    // a section that names the figures it needs is left out until the file has them
    all('[data-needs]').forEach(function (node) {
      var v = pick(feed, node.getAttribute('data-needs'));
      if (v === undefined || v === null || (Array.isArray(v) && !v.length)) node.hidden = true;
    });
    fillFigures(feed);
    setUpRows(feed);
    setUpColumns(feed);
    setUpButtons(feed);
    postHeight();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(postHeight);
    window.addEventListener('resize', postHeight);
    window.addEventListener('load', postHeight);
  }

  // The date in the address means each day's visitors fetch that day's file, not an old copy.
  fetch(FEED_URL + '?d=' + new Date().toISOString().slice(0, 10), { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('feed ' + r.status); return r.json(); })
    .then(start)
    .catch(function () {
      document.getElementById('load-error').hidden = false;
      postHeight();
    });
})();
