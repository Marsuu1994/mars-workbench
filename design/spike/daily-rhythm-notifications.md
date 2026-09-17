# Spike: Smart reminders & low-friction tracking — the "daily rhythm"

**Status: awaiting owner review** · 2026-09-17 · Mockup: `design/mockup/future-work/mockup-daily-rhythm.html`

## Trigger

Two owner-reported pain points, paraphrased:

1. **"I set a plan, then when things get busy I forget to check what to do — there are too many apps."** A notification feels like the obvious fix, but a notification that lands while I'm busy gets missed and does little. How should reminders be designed so they actually remind?
2. **"Tracking has no pull."** Cards don't get moved when the work happens, the board drifts from reality and the stats stop meaning anything. Ideas so far: feedback on the act of tracking, a simpler update gesture, updating straight from a notification.

This spike looks at both through behavior-science and UX-research lenses, proposes one product direction (**the daily rhythm**), lays out the real alternatives with honest tradeoffs, and ends with a phased recommendation and open questions. It is a product document — feasibility is kept to one short section at the end.

## Reframe: two different problems

| Pain | What it actually is | Why "just add push" under-delivers |
| --- | --- | --- |
| Forgetting the plan | A **prospective-memory** problem (remembering *to remember*) inside an **attention market** where the planner competes with every other app on the phone | A clock-based alert is the weakest memory cue there is: it fires regardless of what you're doing, so it is either ignored or disruptive — and every ignored alert trains you to ignore the next one |
| Not tracking | A **friction + reward** problem: the cost of logging is immediate (open the app, find the card, drag it), the payoff is abstract and delayed (stats) | A reminder to "update your board" adds a chore to a chore. The log has to get cheaper *and* pay back on the spot |

They share one requirement: **the app must earn a fixed, tiny place in the day instead of competing for random moments of it.** Everything below follows from that.

## Principles — research → design rule

Each item: the finding, then the rule it produces for this product.

1. **A prompt only converts when motivation and ability are both present at that instant (Fogg, B = MAP).** A prompt hitting a busy person fails, and every failed prompt lowers the odds for the next one (habituation — the notification analog of banner blindness). → Fire few prompts, at predictable transition moments, each answerable in under ten seconds. Never send what can't be acted on in one tap.
2. **Event-based cues beat time-based cues (prospective-memory research, Einstein & McDaniel).** "After X" is remembered almost for free; "at 3 pm" needs self-initiated monitoring. → Anchor the two daily rituals to routines the user already has (start of the workday, wind-down), and let anything in between ride on *state* events — a task reaching its slot, a rollover about to expire — not on the clock.
3. **A glance must already deliver the value.** People see well over 60 notifications a day and attend to most within minutes, whether or not they act (Pielot et al. 2014). → Put the plan itself in the notification body ("3 waiting: A · B · ↩ C"). Seeing it *is* the reminder; tapping is optional. This directly answers "if I'm busy and miss it, it did nothing" — a glanceable body did its job even when ignored.
4. **Interrupt at breakpoints (Iqbal & Bailey 2008; Mehrotra et al. 2015).** Deferring alerts to task boundaries lowers disruption cost and raises response rates. → The rituals sit at day boundaries; a missed one gets exactly *one* follow-up at the next natural boundary (lunch), then silence until the next ritual.
5. **Making a plan quiets the unfinished-task itch (Zeigarnik; Masicampo & Baumeister 2011), and if-then plans raise follow-through (implementation intentions — Gollwitzer & Sheeran 2006 meta-analysis, d ≈ .65).** → The morning ritual is a real plan: pick today's few, optionally give the one that matters a slot ("afternoon"). The evening ritual gives every open task an explicit fate (done / still on it / not today) so nothing stays ambiguously open overnight.
6. **Recognition beats recall (Nielsen's heuristics).** Remembering to move a card *while working* is recall at the worst possible moment; ticking a list at night is recognition. → Once-a-day batch reconciliation is the *primary* tracking path; in-the-moment moves become a bonus, not a duty.
7. **Visible progress is the strongest everyday motivator (Amabile & Kramer, the progress principle); effort accelerates near a goal (goal-gradient, Kivetz et al. 2006); a head start helps (endowed progress, Nunes & Drèze 2006).** → Every status change must visibly move a progress indicator *right then*, and the week is shown as how close it is, not how much is left.
8. **Endings color how an experience is remembered (peak-end rule, Kahneman et al. 1993).** → The day closes on a summary card that leads with what got done. The evening ritual is the product's emotional signature, not the morning one.
9. **Temporal landmarks reset motivation (fresh-start effect, Dai, Milkman & Riis 2014).** → Mornings and Mondays are when to ask for commitment; evenings and Fridays are for reflection, never for asks.
10. **Extrinsic rewards can crowd out intrinsic motivation, and controlling feedback breeds reactance (Deci, Koestner & Ryan 1999; Brehm).** → Feedback is *informational* ("2 of 3 · 5 pts · above your Tuesday usual"), phrased as offers not orders; no confetti on every tap, no red overdue counters. Streaks reward the *ritual* (closing the day), not the outcome, and forgive a miss.
11. **Lapses in self-tracking are normal; guilt is what turns a lapse into abandonment (Epstein et al. 2015 "lived informatics"; Consolvo et al. 2009 — positive, controllable, unobtrusive, glanceable).** → Coming back after a gap is greeted with "welcome back, here's today", never a backlog of shame. Every notification type has its own off switch.
12. **People over-plan (planning fallacy, Buehler et al. 1994).** → The morning pick shows a capacity hint from the user's *own* history and a soft cap, so plans stay finishable and the evening card stays honest and positive.

## Proposal: the daily rhythm

Two scheduled rituals bracket the day. At most one state-driven nudge sits between them. A persistent surface catches whatever a notification missed.

```
07   08   09   10   11   12   13   14   15   16   17   18   19   20   21   22
     ▲ Open the day          ▲ lunch follow-up          ▲ nudge           ▲ Close the day
       ritual · glanceable     (only if still unplanned)  ≤ 1 / day,        ritual · summary
                                                          state-driven
```

### 1. Open the day — morning ritual

- **Notification** (default 08:30 on plan days): title "Open the day"; body lists what is waiting — today's dailies, remaining weekly instances, anything rolled over, the top *Do First* priority. Glanceable on the lock screen.
- **Today sheet** (in app; also auto-opens once when the app is launched on a not-yet-planned day): candidates grouped as *Rolled over* · *Daily* · *Weekly (n left)* · *From Priorities*. Tap to pick; "Start the day" moves the picks `BACKLOG → TODO` in one batch (rollovers are already on the board and just stay). A **capacity hint** from history ("your usual Tuesday: ~6 pts · picked: 7") and an optional **focus** star on one task, with an optional slot chip (morning / afternoon / evening) that forms the implementation intention and arms the midday nudge.
- **Quiet rules:** no notification if tasks were already pulled today; one follow-up at 12:30 if still unplanned; nothing on weekend days in `NORMAL` mode (`EXTREME` keeps the rhythm).

### 2. Midday nudge — state-driven, ≤ 1 per day (V2)

Not on a schedule. It fires only when a signal from the existing risk engine or the morning plan justifies it, picks the single most severe, and skips entirely if the app was opened in the last two hours (the user has already seen the board):

- the focus task's slot begins → "Afternoon: *Write report* is up." [Start] [Later]
- a rolled-over daily is still open at 15:00 (the engine's *danger* line) → "*Read 20 pages* rolled over from yesterday and expires tonight." [Done] [Let it go]
- a task has sat in *In Progress* since yesterday → "*Draft outline* — done, or still going?" [Done] [Still going]

One task, two answers. On Android the answers are notification buttons; on iOS the tap opens a **quick-update sheet** with the same two buttons (see feasibility). "Later" never re-fires the same day.

### 3. Close the day — evening ritual

- **Notification** (default 21:00): "Close the day · 2 of 3 done · 5 pts. One left: *Read 20 pages*." If everything is already done, the notification *is* the reward — "Day closed · 3 of 3 · 8 pts — best Tuesday in three weeks. Tomorrow: 2 dailies + Weekly #2 waiting." — delivered silently and opening nothing.
- **Close sheet:** every open board task with a three-way answer — **Done** · **Still on it** (→ In Progress) · **Not today** (an explicit deferral; no status change, a choice rather than a failure). A rolled-over task marked done offers "did this yesterday" so `doneAt` stays honest. "Close the day" commits everything as one batch.
- **Day card** (after the commit): ring + points with an informational comparison against the user's own history (positive framing at every completion level — "2 of 4, that's a day; tomorrow has 2 dailies waiting"), the **process streak** ("closed 5 days in a row · shield ready" — one free miss per week; or the sturdier "11 of the last 14 days" ratio), the week bar ("18 / 34 pts"), a **tomorrow preview** (pre-commitment, which makes the next morning cheaper), and an "anything on your mind? → Dump" link (the mind-clearing that lets an open loop go for the night).

### 4. Cheaper updates everywhere

- **Tap-to-advance** on mobile cards: a visible trailing control (*→ In Progress* / *✓ Done*) as a one-tap alternative to drag. Desktop keeps drag and gets the same control always visible (the hidden-pencil lesson already in the tracker: hover-only affordances don't get found).
- **Batch commit** in both sheets; the **quick-update sheet** behind every nudge; Android **notification actions**.

### 5. Persistent surfaces — what catches a missed notification

- **App badge** on the home-screen icon: open board tasks today (or `1` while a ritual is pending). Ambient, silent, survives the missed alert.
- **Re-entry:** the board carries a pending-ritual strip ("Open the day →" / "Close the day →") and each sheet auto-opens once per ritual per day. Opening the app for *any* reason completes the loop, which is what makes a missed push harmless.
- Optional, later: a morning **email digest** and a **calendar "Today's plan" event** for people who live in those surfaces (see Options A).

### 6. Weekly bookends — mostly exists already

A Sunday-evening / Monday-morning "New week ahead" prompt (fresh start) when no plan exists for the coming week, reusing the last-period recap the plan chat already computes. The end-of-period recap on the empty board stays the weekly close.

## Notification policy — the rules that keep it trusted

1. **Budget:** ≤ 3 per day (open · close · ≤ 1 nudge); zero when there is nothing to say.
2. **Quiet when done:** never remind about something already done or already planned.
3. **No escalation:** a missed ritual gets one follow-up at the next breakpoint, then silence until the next ritual.
4. **Glanceable body:** the notification contains the tasks, not "you have tasks".
5. **Tone:** invitations and information; count done before left ("2 done, 1 to go", never "1 overdue"); no commands, no shame.
6. **One tap or it doesn't ship** as a notification.
7. **User control:** two time pickers, a nudge toggle, weekends follow plan mode, per-type off switches; permission asked in context after the two rituals are explained, and only once.
8. **Adaptive timing (V3):** shift each ritual toward the user's observed response time; never fire at hours with zero historical engagement.

## Options with tradeoffs

### A. Where the reminder lives (channel)

| Option | Pros | Cons |
| --- | --- | --- |
| **A1 Web Push (PWA)** | Native-feeling and timely; deep-links into the sheet; Android quick actions; app badge | iOS needs iOS 16.4+ and the app installed to the home screen (already the case); iOS has no action buttons; a badly-timed permission prompt is hard to recover from; needs a scheduler + subscription storage |
| **A2 Email digest** | No permission prompt; reaches people who live in email; trivial to ship; signed one-tap "done" links work on every platform | Low salience; useless for the evening ritual; one more inbox item — "too many apps" cuts both ways |
| **A3 Calendar event ("Today's plan")** | Visible where many people already look all day; persistent | Calendar OAuth scope + refresh-token plumbing; effectively read-only; no evening use |
| **A4 Native wrapper (widgets / Live Activities)** | The only route to a truly always-visible surface | A second platform to maintain, far outside the stack; not recommended now |

**Recommendation:** A1 as the prompt channel, with the in-app rituals as the surface that works with *no* channel at all; A2 as an opt-in later; A3/A4 parked.

### B. What the morning ritual asks for

| Option | Pros | Cons |
| --- | --- | --- |
| **B1 Pick today's tasks (pull from backlog), soft cap of ~3 focus picks** | Real commitment + implementation intention; matches the existing backlog model exactly; the capacity hint fights over-planning | A few taps every morning; needs a "skip today" that never nags |
| **B2 Auto-pull everything, just show it** | Zero friction | No commitment effect; the board fills with everything; rollover/expire churn gets noisier |
| **B3 Ask only "when will you do your focus task?"** | The single strongest question in the literature | Alone it puts nothing on the board |

**Recommendation:** B1, with B3 as an optional slot chip on the focus task.

### C. How tracking gets cheaper

| Option | Pros | Cons |
| --- | --- | --- |
| **C1 Evening batch reconciliation (Close sheet)** | Recognition, not recall; one predictable moment; every task gets an explicit fate | `doneAt` gets coarser (evening) unless retro-dated; the Today ring only fills at night for people who never tap during the day |
| **C2 Tap-to-advance on cards** | One tap instead of a drag on mobile; always available | Doesn't solve *remembering* to update |
| **C3 Update from the notification** | Zero navigation | Buttons are Android-only; on iOS it becomes tap → quick sheet; only ever covers the one task in the nudge |
| **C4 Auto-inference (calendar, timers)** | Removes logging | Wrong guesses cost trust; needs integrations; overkill for a personal planner |

**Recommendation:** C1 + C2 as the base, C3 layered on the nudge; C4 not pursued.

### D. What the feedback looks like

| Option | Pros | Cons |
| --- | --- | --- |
| **D1 Informational progress (ring / points / comparison against own history) + day card** | Aligned with the progress principle and self-determination theory; already half-built (dashboard, recap stats) | Subtle — may feel "quiet" to someone wanting a hit |
| **D2 Process streak (days closed), forgiving** | Rewards the ritual we actually need; forgiveness avoids the streak-break cliff (the reason Duolingo sells streak freezes) | A streak can still become the goal; the shield / ratio design has to stay honest |
| **D3 Outcome gamification (badges, confetti, levels)** | Immediate hits | Habituates fast, crowds out intrinsic motivation, turns misses into failures |
| **D4 LLM-written motivational copy** (existing tracker item) | Variety fights habituation | Hollow unless grounded in data; latency and cost per notification; cheap to add later on top of the day card |

**Recommendation:** D1 + D2; D3 no; D4 maybe later, on the day card only.

## How we'd know it works — a research plan for an n = 1 product

Leading indicators, all derivable from a small `notification_event` log plus existing tables:

- Ritual completion: % of plan days with a morning pick; % of plan days closed.
- Notification → open latency; % dismissed without opening (the habituation signal).
- % of days with ≥ 1 status change, split by path (close sheet / tap-advance / drag / notification action).
- Rollover and expire rates (should fall); per-plan completion rate (already computed for the AI recap).

Guardrails: any notification type switched off; days since last open; "Not now" reasons — three chips on the lunch follow-up (*busy* / *not relevant* / *already done*) — the cheapest diary study there is.

Method: two weeks with the rituals only (Phase 0), two weeks with push added, compare the same indicators. A personal product allows a personal ABA.

## Feasibility notes — kept short

- **Push plumbing:** `web-push` + VAPID keys, a `PushSubscription` table, a real service worker (today's is a no-op) handling `push` and `notificationclick` (deep-link to `/kanban?ritual=open|close`), and a scheduler. This is the same cron the tracker already wants for daily sync — one job: sync, then decide what to send. Vercel Hobby cron is daily-granularity only (verify current plan limits); per-user times need Pro, or Supabase `pg_cron` / Edge Functions, or a queue such as QStash.
- **iOS:** Web Push and the Badging API need iOS 16.4+ with the app installed to the home screen; Safari ignores notification `actions`, so quick actions are Android-only and the quick-update sheet is the canonical path.
- **Permission:** request only from a user gesture inside a "Daily rhythm" settings card, after the value is shown; a denied prompt is nearly unrecoverable in the browser.
- **Time settings:** two `TIME` columns + a nudge toggle on a new `UserSettings` row — also the natural home for the tracker's user-timezone item.
- **Sheets:** the Today sheet is a batch of `BACKLOG → TODO`; the Close sheet is a batch status update plus an optional `doneAt` override — small extensions of existing actions.
- **Capacity hint:** average done points per weekday over the last few plans — one aggregate on `Task.doneAt`.
- **Adaptive timing / metrics:** need the `notification_event` log; V3.
- **Not possible as a PWA:** home-screen widgets, Live Activities, non-dismissable persistent notifications on iOS.

## Recommendation and phasing

- **Phase 0 — rituals without notifications** (highest value per effort, and the foundation every channel needs): Today sheet + Close sheet + day card + tap-to-advance + app badge + pending-ritual strip. This fully addresses the tracking pain and half of the forgetting pain ("when I open the app, it tells me what's next").
- **Phase 1 — push for the two rituals:** open / close notifications with the quiet rules, the lunch follow-up, the settings card, the permission flow, and the cron (doubling as the sync cron).
- **Phase 2 — the smart middle:** the state-driven nudge (≤ 1 / day), Android actions + iOS quick sheet, the process streak with its shield, the weekly "New week ahead" prompt.
- **Phase 3 — adaptive and optional channels:** response-time-based send shifting, email digest opt-in, LLM copy on the day card if still wanted.

## Open questions for the owner

1. Focus cap: "up to 3 focus picks", a points-based cap from the capacity hint, or no cap and hint only?
2. Defaults: 08:30 / 21:00 in `KANBAN_TZ`? Or should the evening default follow the risk engine's 20:00 daily cutoff?
3. Streak style: a forgiving chain with one shield per week, or the "n of the last 14 days" ratio (nothing to break)?
4. Should "Not today" on a daily task be a real state (expire it now, a new backwards-free transition) or stay a no-op that lets rollover run its course?
5. Is Android-first for one-tap notification actions acceptable, with iOS on the quick sheet?
6. Is the morning email digest wanted at all, given "too many apps" cuts both ways?
