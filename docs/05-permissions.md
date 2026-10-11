# 05 — Permission model


| Action | Owner | Admin | Member | Activity creator | LB creator | LB editor (selected/everyone) |
|---|---|---|---|---|---|---|
| View group, activities, availability, leaderboards | ✔ | ✔ | ✔ | — | — | — |
| Edit group settings, regenerate link | ✔ | ✔ | ✘ | | | |
| Invite / add members | ✔ | ✔ | ✘ | | | |
| Remove member | ✔ (anyone) | ✔ (members only) | ✘ | | | |
| Promote/demote admin | ✔ | ✘ | ✘ | | | |
| Transfer ownership, delete group | ✔ | ✘ | ✘ | | | |
| Leave group | ✘ (transfer first) | ✔ | ✔ | | | |
| Create activity / leaderboard | ✔ | ✔ | ✔ | | | |
| Edit/delete activity | ✔ | ✔ | ✘ | ✔ | | |
| Mark self in/out | ✔ | ✔ | ✔ | | | |
| Mark others in/out | ✔ | ✔ | ✘ | ✘ | | |
| Plan / re-date / cancel / done occurrence | ✔ | ✔ | ✘ | ✔ | | |
| Edit own availability, calendar, ignore rules | self only | | | | | |
| Edit/delete leaderboard settings | ✔ | ✔ | ✘ | | ✔ | ✘ |
| Add leaderboard member | ✔ | ✔ | ✔ | | ✔ | ✔ |
| Remove leaderboard member | ✔ | ✔ | only if edit_mode=everyone | | ✔ | ✔ |
| Set / clear score | ✔ | ✔ | only if edit_mode=everyone | | ✔ | ✔ |
| View score history | ✔ | ✔ | ✔ | | | |
| View the dashboard | ✔ | ✔ | ✔ | | | |
| Add, configure, reorder, remove dashboard widgets | ✔ | ✔ | ✘ | | | |
| Edit past months | ✘ | ✘ | ✘ | | ✘ | ✘ |
| Create a tournament | ✔ | ✔ | ✔ | | | |
| Tournament settings, entries, draw, start, advance, finish, delete (organiser = creator) | ✔ | ✔ | ✘ | organiser ✔ | | |
| Enter a result | ✔ | ✔ | own match only, while it has none | organiser ✔ | | |
| Correct or clear a result | ✔ | ✔ | ✘ | organiser ✔ | | |

Implementation: `requireGroupRole(minRole)` middleware loads `group_members` row for `req.user` + `:groupId` → `req.membership`; 404 if not a member (hides existence) except for public groups (403 `NOT_A_MEMBER`). Resource-level checks that the caller and the row decide alone (creator or organiser, admin, leaderboard edit mode) are route middleware after the row is loaded (`includeTournament`, then `requireTournamentManager`), with the rule as an entity method. Rules that need more (a player entering their own match result, actions on another member) stay in services returning `{ ok:false, problem:'FORBIDDEN' }`.
