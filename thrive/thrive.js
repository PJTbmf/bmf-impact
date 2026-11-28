/* Thrive and Freddie's Friends. Reads data/thrive-feed.json (totals only) and fills the page.
   A null value means "fewer than 5" and is never shown as a number. */
(function () {
  'use strict';
  var feedUrl = document.documentElement.getAttribute('data-feed');
  var nf = new Intl.NumberFormat('en-GB');
  var gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function longDate(iso) { var p = iso.split('-'); return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0]; }
  function monthYear(iso) { var p = iso.split('-'); return MONTHS[Number(p[1]) - 1] + ' ' + p[0]; }
  function pick(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function show(v, kind) {
    if (v === null) return 'fewer than 5';
    if (v === undefined) return '';
    return kind === 'gbp' ? gbp.format(v) : nf.format(v);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function rows(host, items, unit) {
    var max = Math.max.apply(null, [1].concat(items.map(function (r) { return r.value || 0; })));
    var wrap = el('div', 'rows');
    items.forEach(function (r) {
      var row = el('div', 'rows__row' + (r.value === null ? ' rows__row--small' : ''));
      row.appendChild(el('span', 'rows__name', r.label));
      var track = el('span', 'rows__track');
      if (r.value) { var bar = el('span', 'rows__bar'); bar.style.width = Math.max(3, r.value / max * 100) + '%'; track.appendChild(bar); }
      row.appendChild(track);
      row.appendChild(el('span', 'rows__val', r.value === null ? 'fewer than 5' : nf.format(r.value)));
      row.setAttribute('aria-label', r.label + ': ' + (r.value === null ? 'fewer than 5' : nf.format(r.value)) + ' ' + unit);
      wrap.appendChild(row);
    });
    host.replaceChildren(wrap);
  }

  function render(d) {
    var banner = document.getElementById('sample-banner');
    banner.hidden = !d.draft;
    if (d.draft && d.draft_note) document.getElementById('sample-note').textContent = d.draft_note;

    document.querySelectorAll('[data-figure]').forEach(function (n) {
      n.textContent = show(pick(d, n.getAttribute('data-figure')), n.getAttribute('data-format'));
    });
    document.querySelectorAll('[data-date]').forEach(function (n) { n.textContent = longDate(d.as_of); });
    document.querySelectorAll('[data-launched]').forEach(function (n) { n.textContent = monthYear(d.programme.launched + '-01'); });

    var goal = d.pledge.gifts_goal, sent = d.totals.gifts_sent || 0;
    var board = document.getElementById('board');
    board.setAttribute('aria-label', (d.totals.gifts_sent === null ? 'Fewer than 5' : sent) + ' of ' + goal + ' gifts sent');
    var boxes = [];
    for (var i = 0; i < Math.max(goal, sent); i++) boxes.push(el('span', 'gift' + (i < sent ? ' gift--sent' : '')));
    board.replaceChildren.apply(board, boxes);

    rows(document.getElementById('by-month'), d.by_month, 'gifts');

    var where = document.getElementById('where');
    if (Array.isArray(d.regions) && d.regions.length) {
      where.hidden = false;
      rows(document.getElementById('by-region'), d.regions, 'brothers and sisters');
    }
  }

  fetch(feedUrl, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () { document.getElementById('load-error').hidden = false; });
})();
