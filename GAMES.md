# E77 GAMES — Game roadmap

## Interaction contract

- Prefix entry: `+العاب`.
- The bot posts an embed and a select menu.
- Each game opens a channel-scoped lobby with join/leave/start controls.
- No Slash Commands.
- Game eliminations affect the current game only; they never kick members from Discord servers.

## Available in MVP

1. Roulette — 2 to 10 players; random chooser selects one active player to leave the round; last player wins.

## Planned game catalog

2. Quiz battle
3. Number guessing
4. Riddles
5. Rock-paper-scissors
6. Memory challenge
7. Letter race
8. Virtual auction using non-cash points
9. Who am I?
10. Secret word
11. Picture challenge
12. Server tournament

Each game must have isolated session state, input validation, timeouts, replay protection, and unit tests before being marked available.
