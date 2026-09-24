# Quiz format — shared by `triage` and `spec-session`

Triage and spec sessions run **in parallel**: the human keeps 4–6 terminals open and answers
whichever one is waiting. Every question must be answerable **cold**, without scrolling back and
without remembering which session this is.

## Rules

1. **Every question goes through the `AskUserQuestion` tool.** Never ask in prose.
2. **Up to 4 questions per call**, grouped by topic. Ask first what changes the shape of the task;
   details come in later rounds.
3. Each question carries its own context:
   - `header` (≤ 12 chars): ticket and topic — `#42 limits`, `new cache`.
   - `question`: three parts, in this order:
     1. **Ticket** — one line: `#42 «Daily report for sales»`.
     2. **Situation** — a concrete example that makes the choice tangible:
        _"A manager asks for the report at 23:55 UTC; the day's data is still arriving."_
     3. **Question** — one sentence, one decision.
4. **2–4 options.** Each `description` states what the option means and its **price**:
   `👍 <benefit> · 👎 <cost: time, money, complexity, risk, what we lose>`.
   The recommended option goes first with `(Recommended)` at the end of its label.
5. "Other" (free text) is always available; record free-text answers verbatim.
6. Do not ask what the code, the Wiki or the issue already answers — state it as a fact in the
   situation instead.
7. After each round, write the decisions to the issue's log section right away (the session may be
   interrupted; the issue is the memory, not the chat).

## Example

```
header:   #42 period
question: #42 «Daily report for sales».
          Situation: a manager opens the report at 09:00 Tel Aviv time; yesterday's last orders
          were booked at 23:58 UTC and synced at 00:07 UTC.
          Which day does "daily" mean?
options:
  - UTC calendar day (Recommended)
      Same boundary as billing and budgets. 👍 one definition everywhere, trivial to test
      · 👎 in Israel the day "ends" at 02:00/03:00 local time
  - Local day of the viewer
      👍 matches what the manager expects · 👎 two viewers see different numbers; needs a timezone per user
  - Rolling last 24 hours
      👍 always fresh · 👎 numbers change on every refresh; not comparable day to day
```
