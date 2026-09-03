# Project skills

Question-bank skills, one per test and section. Each is a recipe that
names the exact scripts, acceptance rules and recorded tells, so a batch
can be replicated once its method is proven. Invoke with `/bank-...`.

| skill | what it lands | gate that decided its method |
|---|---|---|
| `bank-gate` | shared: pre-flight, no-source attack, key grade, ledger, insert, human sitting | REGISTER §0/§6 |
| `bank-sat-rw` | Digital SAT Reading & Writing | three-solver QC, bank-helper acceptance rule |
| `bank-sat-math` | Digital SAT Math (and figures) | sandbox key recomputation |
| `bank-toefl-listening` | Choose a Response, Announcement, Conversation, Talk | cr-v7 four-world method; dl-fresh atypical-fact brief |
| `bank-act-english` | ACT English forms (5 x 10) | B7 human sitting (10% blind) |
| `bank-act-reading` | ACT Reading forms (4 x 9) | B7 human sitting |
| `bank-act-science` | ACT Science forms (7 passages, graphics) | pending co-founder sitting |
| `bank-act-math` | ACT Math (four choices) | sandbox with BANK_FAMILY=act |

Rule that applies to all of them: **the structural checks are pre-flight,
the blind attack is the screen, a human sitting is the verdict on verbal
cohorts, and every finding goes into REGISTER.md §5 in the same commit.**
