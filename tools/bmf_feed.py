#!/usr/bin/env python3
"""BeMoreFab impact figures: turns counts into the files each place needs. Counts only.

Commands
  pencil-merge  Add a Pencil Spaces read (JSON from pencil_sessions.js) to the month table.
  pencil-feed   Turn the month table into a CSV shaped like the Fabbie feed, for Power BI and Fabbie.
  public        Build data/public-feed.json for the impact dashboards from the Fabbie feed CSV
                and the Pencil Spaces month table.

Rules
  - Only totals. The script refuses any input with columns it does not expect.
  - Public file: any monthly count from 1 to 4 is written as null (shown as "<5").
  - A third of Primary Virtual School time is always wellbeing; it is rounded down.
"""
import argparse, csv, datetime as dt, io, json, sys

MONTHS_TABLE_COLS = ["Month", "Sessions", "Minutes", "Staff-only sessions left out", "Staff-only minutes left out", "Data as of"]
FEED_COLS = ["Metric", "Period", "Value", "From", "To", "Data as of"]
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def die(msg):
    print("STOP: " + msg, file=sys.stderr)
    sys.exit(2)


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def month_start(key):
    y, m = map(int, key.split("-"))
    return dt.date(y, m, 1)


def month_end(d):
    nxt = dt.date(d.year + (d.month == 12), d.month % 12 + 1, 1)
    return nxt - dt.timedelta(days=1)


def label(d):
    return MON[d.month - 1] + " " + str(d.year)


def ts(d):
    return d.strftime("%Y-%m-%d") + " 00:00:00"


# ---------------- Pencil Spaces month table ----------------
def load_months(path):
    try:
        rows = read_csv(path)
    except FileNotFoundError:
        return {}
    if rows and list(rows[0].keys()) != MONTHS_TABLE_COLS:
        die("month table has unexpected columns: %s" % list(rows[0].keys()))
    return {r["Month"]: r for r in rows}


def write_months(path, months):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=MONTHS_TABLE_COLS, lineterminator="\r\n")
        w.writeheader()
        for k in sorted(months):
            w.writerow(months[k])


def cmd_pencil_merge(a):
    months = load_months(a.months)
    scrape = json.load(open(a.scrape, encoding="utf-8"))
    if "error" in scrape:
        die("Pencil read failed: " + scrape["error"])
    if scrape.get("unreadable_dates"):
        die("%s sessions had a date the script could not read" % scrape["unreadable_dates"])
    start = dt.date.fromisoformat(a.window_start)
    end = dt.date.fromisoformat(a.window_end) if a.window_end else None
    as_of = scrape["read_at"][:19].replace("T", " ")
    replaced, kept = [], []
    for m in scrape["months"]:
        ms = month_start(m["month"])
        # only replace a month the read fully covers, so a month cut off at the window edge never shrinks
        covers_start = ms >= start
        covers_end = end is None or month_end(ms) <= end or m["month"] == dt.date.today().strftime("%Y-%m")
        if not (covers_start and covers_end):
            kept.append(m["month"])
            continue
        for k in ("sessions", "minutes", "staff_only_sessions", "staff_only_minutes"):
            if not isinstance(m[k], int) or m[k] < 0:
                die("bad number in Pencil read for %s" % m["month"])
        months[m["month"]] = {"Month": m["month"], "Sessions": str(m["sessions"]), "Minutes": str(m["minutes"]),
                              "Staff-only sessions left out": str(m["staff_only_sessions"]),
                              "Staff-only minutes left out": str(m["staff_only_minutes"]), "Data as of": as_of}
        replaced.append(m["month"])
    write_months(a.out, months)
    print(json.dumps({"replaced": replaced, "kept_from_before": kept, "months_in_table": sorted(months)}))


def sums(months, start, end):
    s = mi = 0
    for k, r in months.items():
        ms = month_start(k)
        if ms >= dt.date(start.year, start.month, 1) and ms <= end:
            s += int(r["Sessions"]); mi += int(r["Minutes"])
    return s, mi


def cmd_pencil_feed(a):
    months = load_months(a.months)
    if not months:
        die("month table is empty")
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()
    as_of = max(r["Data as of"] for r in months.values())
    first = min(month_start(k) for k in months)
    ms = dt.date(today.year, today.month, 1)
    lm = month_start((ms - dt.timedelta(days=1)).strftime("%Y-%m"))
    fy = dt.date(today.year if today.month >= 4 else today.year - 1, 4, 1)
    sy = dt.date(today.year if today.month >= 9 else today.year - 1, 9, 1)
    periods = [("This month", ms, today), ("Last month", lm, ms - dt.timedelta(days=1)),
               ("This financial year", fy, today), ("Last financial year", fy.replace(year=fy.year - 1), fy - dt.timedelta(days=1)),
               ("This school year", sy, today), ("Last school year", sy.replace(year=sy.year - 1), sy - dt.timedelta(days=1)),
               ("Calendar year %d" % today.year, dt.date(today.year, 1, 1), today),
               ("Calendar year %d" % (today.year - 1), dt.date(today.year - 1, 1, 1), dt.date(today.year - 1, 12, 31)),
               ("All time", first, today)]
    for k in sorted(months):
        d = month_start(k)
        periods.append(("Month " + label(d), d, min(month_end(d), today)))
        periods.append(("Since " + label(d), d, today))
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\r\n")
    w.writerow(FEED_COLS)
    for name, p0, p1 in periods:
        if p1 < first:
            continue  # no Pencil data for this period at all: leave it out rather than show 0
        s, mi = sums(months, p0, p1)
        frm = max(p0, first)  # "From" is honest about where the data starts
        for metric, val in (("Primary Virtual School: minutes taught", mi),
                            ("Primary Virtual School: sessions with a child", s),
                            ("Primary Virtual School: wellbeing minutes (a third)", mi // 3)):
            w.writerow([metric, name, val, ts(frm), ts(p1), as_of])
    open(a.out, "w", encoding="utf-8", newline="").write(out.getvalue())
    print("wrote %d rows" % (out.getvalue().count("\n") - 1))


# ---------------- public file for the dashboards ----------------
def cmd_public(a):
    rows = read_csv(a.fabbie)
    if not rows or list(rows[0].keys()) != FEED_COLS:
        die("Fabbie feed has unexpected columns: %s" % (list(rows[0].keys()) if rows else "empty"))
    if not 20 <= len(rows) <= 1500:
        die("Fabbie feed has %d rows (expected 20 to 1,500)" % len(rows))
    vals = {}
    for r in rows:
        try:
            vals[(r["Metric"], r["Period"])] = int(round(float(r["Value"])))
        except ValueError:
            die("non-number value in the Fabbie feed: %r" % r["Value"])
    beacon_as_of = max(r["Data as of"] for r in rows)[:10]

    def g(m, p):
        if (m, p) not in vals:
            die("Fabbie feed is missing %s / %s" % (m, p))
        return vals[(m, p)]

    today = dt.date.fromisoformat(beacon_as_of)
    last12 = []
    d = dt.date(today.year, today.month, 1)
    for _ in range(12):
        last12.insert(0, d)
        d = month_start((d - dt.timedelta(days=1)).strftime("%Y-%m"))
    small = lambda v: None if 0 < v < 5 else v
    series = lambda m: [{"label": label(x), "value": small(g(m, "Month " + label(x)))} for x in last12]
    since = "Since " + label(last12[0])

    months = load_months(a.pencil_months)
    if not months:
        die("Pencil Spaces month table is empty")
    pvs_as_of = max(r["Data as of"] for r in months.values())[:10]
    pt = dt.date.fromisoformat(pvs_as_of)
    sy = dt.date(pt.year if pt.month >= 9 else pt.year - 1, 9, 1)
    sy_months = [k for k in sorted(months) if month_start(k) >= sy]
    pvs_min = sum(int(months[k]["Minutes"]) for k in sy_months)
    pvs_ses = sum(int(months[k]["Sessions"]) for k in sy_months)
    first_pvs = min(months)
    fmt = lambda s: "%d %s %d" % (int(s[8:10]), ["January", "February", "March", "April", "May", "June", "July", "August",
                                                  "September", "October", "November", "December"][int(s[5:7]) - 1], int(s[:4]))
    feed = {
        "schema": 2, "draft": True,
        "draft_note": "These are real figures: Beacon on %s and Pencil Spaces to %s. They are not signed off yet." % (fmt(beacon_as_of), fmt(pvs_as_of)),
        "as_of": beacon_as_of, "pvs_as_of": pvs_as_of,
        "school_year_label": "%d/%s" % (sy.year, str(sy.year + 1)[2:]),
        "headline": {
            "children_supported_now": g("Children supported", "Last 7 days"),
            "education_children_now": g("Education: children supported", "Last 7 days"),
            "pvs_minutes_school_year": pvs_min,
            "ff_siblings_now": g("Freddie's Friends siblings registered (total)", "Right now"),
            "children_supported_ever": g("Children supported", "All time"),
        },
        "registrations_by_month": series("Children and young people registered"),
        "education": {
            "children_past_12_months": g("Education: children supported", since),
            "journeys_started_past_12_months": g("Education: support journeys opened", since),
            "children_by_month": series("Education: children supported"),
        },
        "pvs": {
            "lessons_school_year": pvs_ses, "wellbeing_min_share": 0.3333,
            "minutes_by_month": [{"label": label(month_start(k)), "value": int(months[k]["Minutes"])} for k in sy_months],
            "minutes_since_records_began": sum(int(r["Minutes"]) for r in months.values()),
            "records_began": first_pvs,
        },
        "freddies_friends": {
            "gifts_past_12_months": g("Freddie's Friends gifts and vouchers sent", since),
            "gifts_by_month": series("Freddie's Friends gifts and vouchers sent"),
        },
        "links": {"register": a.register or "", "refer": a.refer or ""},
    }
    json.dump(feed, open(a.out, "w", encoding="utf-8"), indent=2)
    open(a.out, "a", encoding="utf-8").write("\n")
    print(json.dumps({"as_of": beacon_as_of, "pvs_as_of": pvs_as_of, "headline": feed["headline"]}))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("pencil-merge")
    m.add_argument("--months", required=True, help="existing month table CSV (may not exist yet)")
    m.add_argument("--scrape", required=True, help="JSON returned by pencil_sessions.js")
    m.add_argument("--window-start", required=True, help="first day the Pencil date range surely covers, YYYY-MM-DD")
    m.add_argument("--window-end", help="last day of a custom range, YYYY-MM-DD (leave out for 'Past N days')")
    m.add_argument("--out", required=True)
    f = sub.add_parser("pencil-feed")
    f.add_argument("--months", required=True)
    f.add_argument("--today")
    f.add_argument("--out", required=True)
    u = sub.add_parser("public")
    u.add_argument("--fabbie", required=True)
    u.add_argument("--pencil-months", required=True)
    u.add_argument("--register")
    u.add_argument("--refer")
    u.add_argument("--out", required=True)
    a = p.parse_args()
    {"pencil-merge": cmd_pencil_merge, "pencil-feed": cmd_pencil_feed, "public": cmd_public}[a.cmd](a)


if __name__ == "__main__":
    main()
