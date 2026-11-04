# Secure Toa (SI) Offline First (prototype)

An offline browser prototype of a digital ID wallet with a tiered limits table and an edit-detecting ledger. **Fake data only.**

## What it is
- A single file, `index.html`, that runs in a browser with no install and no internet.
- A demo of an offline-first idea: the wallet, the checks and the ledger all work on the device, so a weak or missing connection does not stop the basics.
- Every name, ID and balance in it is fake demo data. The "SAT" amounts are demo units only.

## What it is NOT
- Not finished software. Not audited. Not for real people, real money or real records.
- Not connected to any bank or any national system.
- Please do not type real personal data into it.

## How to run
Open `index.html` in a modern browser. No install, no build, no internet, no outside libraries. `page.html` is a short landing page that links to it.

## Tests
Run `node --test tests/*.test.mjs` (Node 22 or newer, no packages to install). The 16 tests run the page's own script with a small stand-in for the page and check: the SHA-256 hash chain, Ed25519 signatures on every block, detection of an edited block, a deleted block, a swapped or broken signature and a full rewrite (caught when signing is on; not caught in hash-only mode, and the page says so), the transfer limits, unique IDs, escaping of typed text, and that the files make no network calls. CI runs the same tests on every push.

## The offline-first idea
Build the basics so they work on the device first, and treat the network as a bonus. If the link drops, the person can still be identified, a transfer can still be checked against limits, and the record of what happened can still be checked for edits.

## Four preventive items shown in the prototype
- **Offline operation:** the page makes no network calls.
- **Hash-chained ledger:** each event is linked to the one before it with SHA-256.
- **Chain check:** "Verify" flags the first broken block. If the browser supports Ed25519, each block hash is also signed and the signature is checked.
- **Tiered limits:** transfers over the per-transfer, monthly or balance limits are blocked. These are our own proposed internal limits, not limits set by law.

## Known limits
- Everything resets when the page is reloaded.
- Removing blocks from the end of the chain is not detected, because there is no signed block count.
- Amounts must be whole demo units.
- Signing keys are made fresh for each session and live in page memory only.
- Without signing support, the chain detects edits to a block but cannot detect a full rewrite with every hash recomputed.
- The checks run in the browser only. Nothing here is a substitute for a reviewed design.

## License
All rights reserved. Viewing and evaluation only. See [LICENSE](LICENSE).

© 2026 Y77FAST SOFTWARE FOUNDATION. All rights reserved.

<!-- doc-id: Y77F-TOA-README-20261026-0cab23e8 -->
<!-- crimson reef guards three amber heron at dawn -->
