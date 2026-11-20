# Future ideas

Problems we have seen coming but that aren't worth acting on yet, each with the first idea for when it is. The tracker holds what we plan to do; this file holds what we chose to wait on.

## Conventions

- **One item per idea, a few lines at most:** the problem we foresee, why it waits, and the first idea for a fix — at product altitude.
- **Say where it came from** (the PR and review round), so the reasoning can be found.
- **An idea leaves when it is decided:** once it becomes worth doing it moves to the tracker; once it stops mattering it is deleted.

## Board

- **Undo a completion.** Completing a card takes two taps and there is no undo snackbar (PR #115, tap twice), and a task's status only moves forward, so a card completed by mistake can't go back. Two taps make the mistake rare, so it waits. First idea: undo lives in today's done list — tap today's ring, and each of today's rows can be put back into Todo; earlier days can't. What the action is called (Undo, Put it back, Mark as not done) is open. (PR #115, mockup Ideas 8, round 19)
- **A switch to turn the big celebration off.** When today's plan is done the ring spins and sparks fly; some people will tire of it. Sunsama and Todoist let you turn theirs off, and Apple's HIG says to make motion optional; with reduced motion only the colour, the ✓ and the text remain. First idea: a toggle in Settings, with Settings' next revision. (PR #115, mockup Ideas 5)
- **The big celebration once a day.** The ring celebrates every time it closes: pull a card after the day is done and the ring reopens grey, finish it and it spins again. If the second spin starts to feel cheap, play it once a day and let later closes only turn today's frame green. (PR #115, mockup Ideas 6, round 19)
- **✓ Complete for a screen reader on a phone.** A Todo card is one button with ✓ Complete inside it, and assistive tech doesn't read a button's inside as a control of its own. A keyboard's Enter finishes a selected card, but VoiceOver's or Switch Control's "activate" is a press on the card, which cancels the selection, so they can select a card and never finish it. It waits because nobody uses the board that way today. First idea: the card's face and ✓ Complete as two controls side by side, as the mockup's research asked. (PR #133, review)
- **A board left open over midnight.** The rings read the clock when the tasks change, so a board left open across the day's change keeps yesterday as Today until the next move, and that move's celebration is judged against yesterday's ring. A reload puts it right. First idea: read the day again when the page comes back to the front. (PR #133, review)
- **A completion that waits for its toss.** ✓ Complete saves once the card has landed, 0.7 s after the press. Locking the phone in that moment holds the save until the page is shown again, and if the system drops the page first the completion is lost. First idea: end the motion at once when the page is hidden. (PR #133, review)
- **Focus after finishing a card by keyboard.** The finished card leaves Todo and focus falls back to the page. First idea: move focus to the next Todo card. (PR #133, review)
