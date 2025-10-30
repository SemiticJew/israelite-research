#!/usr/bin/env python3
# scripts/ics_to_json.py
import argparse, json, re, sys, uuid
from datetime import date, datetime, timedelta, timezone

# --- Helpers ---
UTC = timezone.utc
ISO_DAY = "%Y-%m-%d"

def parse_ical_date(val: str):
    # Handles YYYYMMDD or DTSTART;VALUE=DATE:YYYYMMDD (caller strips params)
    y, m, d = int(val[0:4]), int(val[4:6]), int(val[6:8])
    return date(y, m, d)

def daterange(d0: date, d1: date):
    cur = d0
    while cur <= d1:
        yield cur
        cur += timedelta(days=1)

def map_type(summary: str):
    s = (summary or "").lower()
    if "sabbath" in s or "shabbat" in s: return "sabbath"
    if "new moon" in s or "new-month" in s or "chodesh" in s: return "newmoon"
    if "feast" in s or "passover" in s or "unleavened" in s or "pentecost" in s or "atonement" in s or "trumpet" in s or "tabernacles" in s or "booths" in s: return "feast"
    if "youtube" in s: return "youtube"
    if "discord" in s: return "discord"
    if "space" in s or "x space" in s: return "xspace"
    return "generic"

WEEKDAY_MAP = {"SU":0,"MO":1,"TU":2,"WE":3,"TH":4,"FR":5,"SA":6}

def next_weekday_on_or_after(base: date, target_wd: int) -> date:
    delta = (target_wd - base.weekday() + 7) % 7
    return base + timedelta(days=delta)

def parse_rrule(rr: str):
    # RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=14;EXDATE=...
    out = {}
    for part in rr.split(";"):
        if not part: continue
        if "=" not in part: continue
        k, v = part.split("=", 1)
        out[k.upper()] = v
    return out

def fold_lines(text: str):
    # Unfold per RFC: lines starting with space are continuations
    lines = text.replace("\r\n","\n").split("\n")
    out = []
    for line in lines:
        if not line: 
            out.append(line); 
            continue
        if line.startswith(" "):
            if out: out[-1] += line[1:]
        else:
            out.append(line)
    return out

# --- Parse ICS into raw VEVENTs ---
def load_ics(path: str):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    lines = fold_lines(raw)
    events, cur = [], None
    for ln in lines:
        if ln == "BEGIN:VEVENT":
            cur = {}
        elif ln == "END:VEVENT":
            if cur: events.append(cur)
            cur = None
        elif cur is not None and ":" in ln:
            head, val = ln.split(":", 1)
            key = head.split(";")[0].upper()
            params = head[len(key):]  # ;VALUE=DATE etc (unused here)
            cur.setdefault("_params", {})[key] = params
            cur[key] = val.strip()
    return events

def extract_date_field(rec, key):
    if key not in rec: return None
    # Remove any params like ;VALUE=DATE or ;TZID=...
    val = rec[key]
    return parse_ical_date(val)

def parse_exdates(rec):
    ex = []
    for k, v in rec.items():
        if k.startswith("EXDATE"):
            # Might be comma-separated YYYYMMDD
            for part in v.split(","):
                part = part.strip()
                if not part: continue
                ex.append(parse_ical_date(part))
    return set(ex)

# --- Expansion ---
def expand_events(raw_events, window_start: date, window_end: date):
    instances = []
    for ev in raw_events:
        summary = ev.get("SUMMARY", "(untitled)")
        start = extract_date_field(ev, "DTSTART")
        if not start: 
            continue
        end = extract_date_field(ev, "DTEND") or (start + timedelta(days=1))  # DTEND is exclusive for all-day
        exdates = parse_exdates(ev)
        rrule = ev.get("RRULE")
        uid = ev.get("UID") or str(uuid.uuid4())

        def add_span(s: date, e: date, desc, url, loc):
            # Create per-day instances (inclusive start, exclusive end)
            for d in daterange(max(s, window_start), min(e - timedelta(days=1), window_end)):
                instances.append({
                    "id": f"{uid}:{d.isoformat()}",
                    "date": d.isoformat(),
                    "title": summary,
                    "type": map_type(summary),
                    "time": "",          # all-day in ICS file
                    "desc": desc, "url": url, "loc": loc,
                    "source": "ics"
                })

        if not rrule:
            # Single / multi-day
            if end > window_start and start <= window_end:
                # skip EXDATE days
                for d in daterange(start, end - timedelta(days=1)):
                    if d in exdates: continue
                add_span(start, end, desc, url, loc)
            continue

        rule = parse_rrule(rrule)
        freq = rule.get("FREQ", "").upper()

        if freq == "WEEKLY":
            byday = [WEEKDAY_MAP[x] for x in rule.get("BYDAY","").split(",") if x]
            if not byday:
                byday = [start.weekday()]
            # Iterate weekly on each requested weekday
            for wd in byday:
                cursor = next_weekday_on_or_after(max(window_start, start), wd)
                # Respect UNTIL if present
                until = rule.get("UNTIL")
                until_date = parse_ical_date(until) if until and len(until)>=8 else None
                while cursor <= window_end:
                    if until_date and cursor > until_date: break
                    if cursor not in exdates:
                        add_span(cursor, cursor + (end - start), desc, url, loc)
                    cursor += timedelta(days=7)

        elif freq == "YEARLY":
            months = [int(x) for x in rule.get("BYMONTH","").split(",") if x]
            monthdays = [int(x) for x in rule.get("BYMONTHDAY","").split(",") if x]
            # If not specified, fall back to DTSTART month/day
            if not months: months = [start.month]
            if not monthdays: monthdays = [start.day]
            for y in range(window_start.year, window_end.year + 1):
                for m in months:
                    for md in monthdays:
                        try:
                            d = date(y, m, md)
                        except ValueError:
                            continue
                        if d < start:  # don't pre-date original DTSTART rule
                            continue
                        if d in exdates: 
                            continue
                        if window_start <= d <= window_end:
                            add_span(d, d + (end - start), desc, url, loc)

        else:
            # Fallback: treat as single event at DTSTART (no expansion)
            if start not in exdates and window_start <= start <= window_end:
                add_span(start, end, desc, url, loc)

    # Sort by date then title
    instances.sort(key=lambda x: (x["date"], x["title"]))
    return instances

def main():
    ap = argparse.ArgumentParser(description="Convert ICS to per-day JSON for events grid.")
    ap.add_argument("--input",  default="assets/cal/basic.ics")
    ap.add_argument("--output", default="assets/cal/basic.events.json")
    ap.add_argument("--start",  default=None, help="Window start YYYY-MM-DD (default: Jan 1 last year)")
    ap.add_argument("--end",    default=None, help="Window end   YYYY-MM-DD (default: Dec 31 next year)")
    args = ap.parse_args()

    today = date.today()
    window_start = date(today.year - 1, 1, 1) if not args.start else date.fromisoformat(args.start)
    window_end   = date(today.year + 1, 12, 31) if not args.end else date.fromisoformat(args.end)

    raws = load_ics(args.input)
    out = expand_events(raws, window_start, window_end)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(out)} instances → {args.output}")

if __name__ == "__main__":
    sys.exit(main())
