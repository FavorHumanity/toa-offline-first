// © 2026 Y77FAST SOFTWARE FOUNDATION. All rights reserved.
// Automated tests for Secure Toa (SI) Offline First: hash chain, Ed25519 signing, tamper detection,
// tier limits, escaping and the offline guarantee. Fake data only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPage, HTML, SCRIPT } from "./harness.mjs";

const ok = (els) => els.vres.innerHTML.includes("✔");
const brokenAt = (els) => (els.vres.innerHTML.match(/First broken block: (\d+)/) || [])[1];

test("fresh ledger: genesis plus two IDs, chained from zero hash", async () => {
  const { t } = await loadPage();
  assert.equal(t.ledger.length, 3);
  assert.equal(t.ledger[0].prev, "0".repeat(64));
  for (let i = 1; i < t.ledger.length; i++) assert.equal(t.ledger[i].prev, t.ledger[i - 1].hash);
});

test("each block hash is SHA-256 of its payload", async () => {
  const { t } = await loadPage();
  for (const b of t.ledger) {
    assert.match(b.hash, /^[0-9a-f]{64}$/);
    assert.equal(await t.sha(t.payload(b)), b.hash);
  }
});

test("signing on: every block carries a valid Ed25519 signature and verify passes", async () => {
  const { t, els } = await loadPage();
  assert.equal(t.sigMode, true);
  assert.ok(els.sigstat.innerHTML.includes("ON"));
  for (const b of t.ledger) assert.match(b.sig, /^[0-9a-f]{128}$/);
  await t.verify();
  assert.ok(ok(els), els.vres.innerHTML);
  assert.ok(els.vres.innerHTML.includes("every signature checks out"));
});

test("simulated edit is caught at block 1 (signing on and off)", async () => {
  for (const ed25519 of [true, false]) {
    const { t, els } = await loadPage({ ed25519 });
    t.tamper();
    await t.verify();
    assert.equal(brokenAt(els), "1", `ed25519=${ed25519}`);
  }
});

test("full rewrite is caught by the signature check when signing is on", async () => {
  const { t, els } = await loadPage();
  await t.rewrite();
  await t.verify();
  assert.equal(brokenAt(els), "1");
  assert.ok(els.vres.innerHTML.includes("signature does not match"));
});

test("hash-only fallback: rewrite is NOT detected, and the page says so", async () => {
  const { t, els } = await loadPage({ ed25519: false });
  assert.equal(t.sigMode, false);
  assert.ok(els.sigstat.innerHTML.includes("OFF"));
  await t.rewrite();
  await t.verify();
  assert.ok(ok(els));
  assert.ok(els.vres.innerHTML.includes("a full rewrite of the chain would not be detected"));
});

test("signature swapped between blocks is rejected", async () => {
  const { t, els } = await loadPage();
  [t.ledger[1].sig, t.ledger[2].sig] = [t.ledger[2].sig, t.ledger[1].sig];
  await t.verify();
  assert.equal(brokenAt(els), "1");
});

test("malformed signature is rejected, not crashing", async () => {
  const { t, els } = await loadPage();
  t.ledger[2].sig = "zz";
  await t.verify();
  assert.equal(brokenAt(els), "2");
});

test("deleted middle block breaks the chain", async () => {
  const { t, els } = await loadPage();
  t.ledger.splice(1, 1);
  await t.verify();
  assert.equal(brokenAt(els), "1");
});

test("transfer within limits moves demo balance and is logged", async () => {
  const { t, els } = await loadPage();
  els.fr.value = "0"; els.to.value = "1"; els.amt.value = "150";
  await t.transfer();
  assert.equal(t.wallets[0].bal, 650);
  assert.equal(t.wallets[1].bal, 3150);
  assert.ok(t.ledger.at(-1).e.startsWith("TRANSFER"));
  await t.verify();
  assert.ok(ok(els));
});

test("tier limits block over-limit, self, zero, non-whole and insufficient transfers", async () => {
  const { t, els } = await loadPage();
  const cases = [["0", "1", "301", "per-transfer"], ["0", "0", "10", "must differ"], ["0", "1", "0", "positive"],
    ["0", "1", "1.5", "whole"], ["0", "1", "NaN", "positive"]];
  for (const [f, to, a, why] of cases) {
    els.fr.value = f; els.to.value = to; els.amt.value = a;
    await t.transfer();
    assert.ok(els.msg.innerHTML.includes("Blocked"), `${a}: ${els.msg.innerHTML}`);
    assert.ok(els.msg.innerHTML.includes(why), `${a}: ${els.msg.innerHTML}`);
  }
  assert.equal(t.wallets[0].bal, 800);
});

test("Tier 0 receiver balance cap is enforced", async () => {
  const { t, els } = await loadPage();
  els.fr.value = "1"; els.to.value = "0"; els.amt.value = "250";
  await t.transfer();
  assert.ok(els.msg.innerHTML.includes("balance cap"));
});

test("created IDs are unique and HTML in the name is escaped", async () => {
  const { t, els } = await loadPage();
  els.nm.value = "<img src=x onerror=alert(1)>";
  for (let i = 0; i < 30; i++) await t.createID();
  const ids = t.wallets.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!els.wallets.innerHTML.includes("<img"));
  assert.ok(!els.led.innerHTML.includes("<img"));
  assert.ok(els.wallets.innerHTML.includes("&lt;img"));
});

test("missing fields are refused", async () => {
  const { t, els, alerts } = await loadPage();
  els.nm.value = "  ";
  const n = t.wallets.length;
  await t.createID();
  assert.equal(t.wallets.length, n);
  assert.equal(alerts.length, 1);
});

test("offline: no network APIs or outside sources in the shipped files", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["index.html", "page.html"]) {
    const s = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(s, /fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\/|src=["']\/\//, f);
  }
  assert.match(HTML, /default-src 'none'/);
  assert.ok(SCRIPT.length > 1000);
});

test("naming and protections present", () => {
  assert.ok(HTML.includes("Secure Toa (SI) Offline First"));
  assert.ok(HTML.includes("© 2026 Y77FAST SOFTWARE FOUNDATION. All rights reserved."));
  assert.match(HTML, /<meta name="author" content="Favor Figota Taueva">/);
  assert.match(HTML, /doc-id: Y77F-TOA-DEMO-/);
});
