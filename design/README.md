# UI overhaul — handoff package

Three files. Give **all three** to a fresh Claude conversation, say *"redesign this app's
interface — read all three files first"*, and bring back what it produces.

| File | Who reads it | What it's for |
|---|---|---|
| `01-BRIEF.md` | The designer | What the app is, who uses it, what it must keep doing |
| `02-CURRENT-SYSTEM.md` | The designer | The exact tokens and class names that exist today |
| `03-RESPONSE-FORMAT.md` | The designer | The shape the answer has to come back in |

## Why three files and not one prompt

The third file is the one that matters, and it's the one that's easy to skip.

A redesign described in words — "cleaner", "more premium", "more breathing room" — is a
conversation, not a change. Turning it into code means guessing at fifty numbers, and every guess
is a chance to get it wrong and a round trip to fix. A redesign returned as **a filled-in token
block plus per-class notes, using the class names this app actually has**, is a fifteen-minute
mechanical edit with almost nothing to get wrong.

So `03` is not paperwork. It's the difference between an afternoon and a week.

## What to do with the result

Paste it back here. Don't summarise or reformat it — the exact block is what makes it fast.

The whole visual system lives in one file (`src/styles.css`, 367 lines), so a change to the tokens
reaches every screen at once. That's why this is worth doing as one deliberate pass rather than
screen by screen.

## What to tell it if it asks

- It cannot see the app running. Screenshots help; the screen list in `01` is the substitute.
- It should not rewrite React components. Tokens and CSS classes only. Anything needing a
  component change should be called out in the notes section, not attempted.
- If it wants to add a token, that's fine — say so explicitly in the response so it gets defined
  rather than silently referenced.
