---
description: Attack the exam engine's server authority and show the failures before fixing
---

Write and run a test suite that attacks the exam engine. Every one of these must be rejected
or resumed correctly **by the server**:

1. submit an answer after `serverDeadlineAt`
2. move the system clock forward mid-attempt
3. submit the same section twice
4. attempt to reopen a submitted section through any endpoint
5. start a second concurrent attempt on the same definition
6. refresh at the 30-second mark and resume
7. start a fourth `milestone1` attempt
8. retake inside the cooldown window
9. replay a saved-answer request after the attempt was submitted
10. request `/exams/attempts/:id/review` before submission
11. snapshot **every** exam response body and assert `correctAnswer` / `correct_answer`
    is absent before submission

**Show me the failures before you fix them.** Do not fix and report green — I want to see
which of these the engine currently loses.

Then fix each failure server-side. A fix that relies on the client not sending a request is
not a fix.

$ARGUMENTS
