# Clock Manipulation Hardening

This project does not defend the tick loop against system clock manipulation, for example by switching `Date.now()` to `performance.now()` or by persisting cooldowns as trusted absolute end times.

## Why this is out of scope

Toornyei is a single-player, client-only game with no server to validate against. Every client-side defense (a monotonic clock, a stored end time, an obfuscated timestamp) runs on the player's machine and can be bypassed by the same player, so the effort buys no real protection. Cheating in a single-player game only affects the cheater.

The only timer that exists today is the short pause between won rounds, and skipping it gains the player nothing. The motivating case, a post-loss regen cooldown, was closed as `wontfix` in #9, and a loss currently ends the Run with no cooldown.

If a future mechanic makes timers economically meaningful, that is a new design question and should be raised as a new issue with that mechanic as context.

## Prior requests

- #10: "Harden tick timing against clock manipulation"
