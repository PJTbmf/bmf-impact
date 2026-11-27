// BeMoreFab: Pencil Spaces session totals, by month. Counts only.
//
// How to use: open https://my.pencilapp.com/sessions (signed in as Be More Fab),
// keep the "Calls: Yes" filter, choose the date range, then run this whole file in the page.
// (In Claude in Chrome's javascript tool, the file starts with "await" so the tool waits for the answer.)
// It scrolls the list to the end and returns a JSON string. It reads no names: only each
// session's date, its length, and whether anyone other than the hosts joined.
//
// Rules (agreed with Patrick Tierney, Nov 2026):
//  - a session counts if at least one participant joined (participants are guests; staff host)
//  - sessions with hosts only (staff, no child) are left out and reported separately
//  - a session still running (no length yet) is left out
//  - Pencil shows dates without a year: a month later than this month belongs to last year
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const box = document.querySelector('.table-container');
  if (!box) return JSON.stringify({ error: 'Sessions list not found. Is this the Sessions page?' });
  let last = -1, stable = 0, loops = 0;
  while (stable < 4 && loops < 120) {
    box.scrollTop = box.scrollHeight;
    await sleep(800);
    const n = document.querySelectorAll('.session-row').length;
    if (n === last) stable++; else { stable = 0; last = n; }
    loops++;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const minutesOf = t => {
    let m = 0;
    const h = /(\d+)\s*hrs?/.exec(t), mi = /(\d+)\s*mins?/.exec(t);
    if (h) m += 60 * +h[1];
    if (mi) m += +mi[1];
    return m;
  };
  const months = {};
  let running = 0, unreadable = 0, earliest = null, latest = null;
  for (const r of document.querySelectorAll('.session-row')) {
    const sub = (r.querySelector('.session-item-subtitle') || {}).textContent || '';
    const md = /([A-Z][a-z]{2})\s+(\d{1,2})/.exec(sub.trim());
    if (!md || MONTHS.indexOf(md[1]) < 0) { unreadable++; continue; }
    const mon = MONTHS.indexOf(md[1]);
    const year = mon > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
    const iso = year + '-' + String(mon + 1).padStart(2, '0') + '-' + String(+md[2]).padStart(2, '0');
    if (!earliest || iso < earliest) earliest = iso;
    if (!latest || iso > latest) latest = iso;
    const mins = minutesOf((r.querySelector('.col-duration') || {}).textContent || '');
    if (!mins) { running++; continue; }
    const key = iso.slice(0, 7);
    const m = months[key] || (months[key] = { month: key, sessions: 0, minutes: 0, staff_only_sessions: 0, staff_only_minutes: 0 });
    const joined = r.querySelectorAll('.col-participants app-lightweight-user-avatar').length;
    if (joined > 0) { m.sessions++; m.minutes += mins; }
    else { m.staff_only_sessions++; m.staff_only_minutes += mins; }
  }
  const rangeText = (document.body.innerText.match(/Past \d+ days|Custom|Today|Yesterday/) || [''])[0];
  return JSON.stringify({
    read_at: now.toISOString(), range_shown: rangeText, rows_read: document.querySelectorAll('.session-row').length,
    earliest_session: earliest, latest_session: latest, still_running: running, unreadable_dates: unreadable,
    months: Object.values(months).sort((a, b) => a.month.localeCompare(b.month))
  });
})()
