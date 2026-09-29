# Time Calculations & Day Reset Engine

Correct time tracking requires rigorous handling of timezones, shift schedules, day reset boundaries, and server-authoritative duration computing.

---

## 1. Authoritative Timestamp Storage

- All timestamps (`startedAt`, `endedAt`, `capturedAt`, `createdAt`) are stored internally in **UTC**.
- Conversions to organization or employee timezones occur exclusively at the presentation or schedule calculation layer.

---

## 2. Day Reset Boundaries

In many organizations, a workday does not end at calendar midnight (`00:00:00`). For instance, night shifts may operate until 03:00 AM, with the official business day resetting at `04:00 AM`.

### Day Reset Logic
```
Organization Timezone: Asia/Kolkata (+05:30)
Day Reset Time: 04:00 AM

Effective Work Day (2026-09-27):
Starts: 2026-09-27 04:00:00 IST
Ends:   2026-09-28 03:59:59 IST
```
All attendance summaries, punch-in allocations, and work timelines map sessions according to this window rather than calendar midnight.

---

## 3. Duration Calculation Rules

1. **Active Work Session**:
   $$\text{Session Duration} = (\text{endedAt} - \text{startedAt}) - \sum \text{Break Durations}$$
2. **Productivity Score**:
   $$\text{Productivity \%} = \frac{\text{Active Seconds}}{\text{Active Seconds} + \text{Idle Seconds}} \times 100$$
3. **Format Options**:
   - `HH:MM:SS` (e.g. `07:45:30`)
   - Decimal Hours (e.g. `7.76 hrs`)
