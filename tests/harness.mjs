// © 2026 Y77FAST SOFTWARE FOUNDATION. All rights reserved.
// Test harness: runs the inline <script> of index.html in a Node vm with a tiny DOM stub. Fake data only.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
export const SCRIPT = HTML.slice(HTML.lastIndexOf("<script>") + 8, HTML.lastIndexOf("</script>"));
export { HTML };

function el(id) {
  return { id, value: "", innerHTML: "", textContent: "", style: {}, onchange: null };
}

export async function loadPage({ ed25519 = true } = {}) {
  const ids = ["sigstat", "tierTbl", "wallets", "fr", "to", "led", "vres", "msg", "nm", "ad", "ph", "tr",
    "tierInfo", "amt"];
  const els = Object.fromEntries(ids.map((i) => [i, el(i)]));
  Object.assign(els.nm, { value: "Demo User C" });
  Object.assign(els.ad, { value: "Demo Village, Upolu" });
  Object.assign(els.ph, { value: "+685 000 0003" });
  Object.assign(els.amt, { value: "150" });
  els.tr.value = "0";
  const alerts = [];
  let subtle = webcrypto.subtle;
  if (!ed25519) {
    // A browser without Ed25519: generateKey rejects for that algorithm.
    subtle = new Proxy(webcrypto.subtle, {
      get(t, k) {
        if (k === "generateKey") return async () => { throw new Error("NotSupportedError"); };
        const v = t[k];
        return typeof v === "function" ? v.bind(t) : v;
      },
    });
  }
  const ctx = {
    document: {
      getElementById: (i) => els[i] || null,
      querySelectorAll: () => [],
    },
    crypto: { subtle, getRandomValues: (a) => webcrypto.getRandomValues(a) },
    TextEncoder, Uint8Array, Math, JSON, Number, String, Object, Date, Promise, Error,
    alert: (m) => alerts.push(m),
    ...els,
  };
  vm.createContext(ctx);
  // expose top-level let/const bindings for tests
  vm.runInContext(SCRIPT + "\n;globalThis.__t={get ledger(){return ledger},get wallets(){return wallets}," +
    "get sigMode(){return sigMode},get kp(){return kp},sha,payload,verify,tamper,rewrite,reset,transfer," +
    "createID,addBlock,esc,TIERS};", ctx);
  // wait for initSigning().then(reset)
  for (let i = 0; i < 200 && !(ctx.__t.ledger && ctx.__t.ledger.length >= 3); i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  return { t: ctx.__t, els, alerts };
}
