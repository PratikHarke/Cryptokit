// ─── CryptoKit v17 — Solver Corpus Tests ──────────────────────────────────────
import { describe, it, expect } from "vitest";
import { autoSolve } from "../crypto/autoSolver.js";
import { assessConfidenceVerdict, assessFlagConfidence, buildSuggestions } from "../crypto/assistEngine.js";

const FLAG_RE = /[a-z_]{2,20}\{[^}]{2,}\}/i;

async function solveOrEmpty(input) {
  try { const r = await autoSolve(input); return Array.isArray(r) ? r : []; }
  catch { return []; }
}

// ── Plain English — no high-confidence false positives ────────────────────────
describe("Solver corpus — plain English", () => {
  const cases = [
    "The quick brown fox jumps over the lazy dog",
    "Hello World",
    "This is a normal English sentence with common words",
    "cryptography is the practice of secure communication",
    "CTF competitions are a great way to learn security",
  ];
  for (const input of cases) {
    it(`plain: "${input.slice(0,40)}"`, async () => {
      const results = await solveOrEmpty(input);
      if (results.length === 0) return;
      const best = results[0];
      const ok = best.category === "Info" ||
        (best.label ?? "").toLowerCase().includes("plain") ||
        (best.confidence ?? 0) < 70;
      expect(ok).toBe(true);
    });
  }
});

// ── Known encodings — decodes correctly ───────────────────────────────────────
describe("Solver corpus — known encodings", () => {
  it("decodes base64 flag", async () => {
    const r = await solveOrEmpty("ZmxhZ3tiYXNlNjRfaXNfbmljZX0=");
    expect(r.some(x => (x.output ?? "").includes("flag{base64_is_nice}"))).toBe(true);
  });
  it("decodes ROT-13 flag", async () => {
    const r = await solveOrEmpty("synt{ebg_guvegrra_jbexf}");
    expect(r.some(x => (x.output ?? "").includes("flag{rot_thirteen_works}"))).toBe(true);
  });
  it("decodes hex flag", async () => {
    const r = await solveOrEmpty("666c61677b6865785f69735f636f6f6c7d");
    expect(r.some(x => (x.output ?? "").includes("flag{hex_is_cool}"))).toBe(true);
  });
  it("decodes URL flag", async () => {
    const r = await solveOrEmpty("OVRD%7Burl_decode_test%7D");
    expect(r.some(x => (x.output ?? "").includes("OVRD{url_decode_test}"))).toBe(true);
  });
  it("decodes binary to 'flag'", async () => {
    const r = await solveOrEmpty("01100110 01101100 01100001 01100111");
    expect(r.some(x => (x.output ?? "").includes("flag"))).toBe(true);
  });
  it("base64 decode has conf >= 55", async () => {
    const r = await solveOrEmpty("ZmxhZ3tiYXNlNjRfaXNfbmljZX0=");
    if (!r.length) return;
    expect(r[0].confidence ?? 0).toBeGreaterThanOrEqual(55);
  });
  it("ROT-13 decode has conf >= 55", async () => {
    const r = await solveOrEmpty("synt{ebg_guvegrra_jbexf}");
    if (!r.length) return;
    expect(r[0].confidence ?? 0).toBeGreaterThanOrEqual(55);
  });
  it("hex decode has conf >= 55", async () => {
    const r = await solveOrEmpty("666c61677b6865785f69735f636f6f6c7d");
    if (!r.length) return;
    expect(r[0].confidence ?? 0).toBeGreaterThanOrEqual(55);
  });
});

// ── Adversarial — no spurious flags ──────────────────────────────────────────
describe("Solver corpus — adversarial (no spurious flags)", () => {
  const cases = [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "1234567890123456789012345678901234567890",
    "!@#$%^&*()", "", " ", "a", "XXXXXXXXXXX",
  ];
  for (const input of cases) {
    it(`no flag in: "${input.slice(0,20) || "(empty)"}"`, async () => {
      const results = await solveOrEmpty(input);
      const bad = results.some(r => FLAG_RE.test(r.output ?? ""));
      expect(bad).toBe(false);
    });
  }
});

// ── Noise — no high-confidence non-flag results ───────────────────────────────
describe("Solver corpus — noise (no high conf)", () => {
  const cases = [
    "lkjsdhfkjsdhfkjsdhfkjhsdkfjhsd",
    "qwertyuiopasdfghjklzxcvbnm",
    "zxcvbnmqwertyuiopasdfghjkl",
    "MXRMXRMXRMXRMXRMXRMXRMXRMXR",
  ];
  for (const input of cases) {
    it(`conf<80 (non-flag): "${input.slice(0,25)}"`, async () => {
      const results = await solveOrEmpty(input);
      const bad = results.filter(r => (r.confidence ?? 0) >= 80 && !FLAG_RE.test(r.output ?? ""));
      expect(bad.length).toBe(0);
    });
  }
});

// ── Reproducibility ───────────────────────────────────────────────────────────
describe("autoSolve — reproducibility", () => {
  const inputs = [
    "ZmxhZ3tiYXNlNjRfaXNfbmljZX0=",
    "synt{ebg_guvegrra_jbexf}",
    "666c61677b6865785f69735f636f6f6c7d",
  ];
  const key = (r) => `${r.label}|${r.confidence}|${(r.output ?? "").slice(0,20)}`;
  for (const input of inputs) {
    it(`deterministic: "${input.slice(0,28)}"`, async () => {
      const run1 = (await solveOrEmpty(input)).map(key);
      const run2 = (await solveOrEmpty(input)).map(key);
      expect(run1).toEqual(run2);
    });
  }
});

// ── Confidence verdict tiers ──────────────────────────────────────────────────
describe("assessConfidenceVerdict — 5-tier spec", () => {
  const cases = [
    [100, "Highly likely correct",    "high"],
    [85,  "Highly likely correct",    "high"],
    [84,  "Strong candidate",         "high"],
    [70,  "Strong candidate",         "high"],
    [69,  "Possible — verify manually","medium"],
    [55,  "Possible — verify manually","medium"],
    [54,  "Weak signal",              "low"],
    [35,  "Weak signal",              "low"],
    [34,  "Likely incorrect",         "low"],
    [0,   "Likely incorrect",         "low"],
  ];
  for (const [conf, verdict, tier] of cases) {
    it(`conf=${conf} → ${verdict}`, () => {
      const v = assessConfidenceVerdict(conf);
      expect(v.verdict).toBe(verdict);
      expect(v.tier).toBe(tier);
    });
  }
});

// ── Flag confidence ───────────────────────────────────────────────────────────
describe("assessFlagConfidence", () => {
  it("HIGH for flag{abc123}",          () => expect(assessFlagConfidence("flag{abc123}", null).level).toBe("HIGH"));
  it("HIGH for HTB{clean_flag}",       () => expect(assessFlagConfidence("HTB{clean_flag}", null).level).toBe("HIGH"));
  it("HIGH for picoctf{valid}",        () => expect(assessFlagConfidence("picoctf{valid}", null).level).toBe("HIGH"));
  it("MEDIUM for flag{with spaces!}",  () => expect(assessFlagConfidence("flag{with spaces!}", null).level).toBe("MEDIUM"));
  it("LOW for xyzctf{unknown}",        () => expect(assessFlagConfidence("xyzctf{unknown}", null).level).toBe("LOW"));
  it("no throw on empty input",        () => {
    const r = assessFlagConfidence("", null);
    expect(["HIGH","MEDIUM","LOW"]).toContain(r.level);
  });
});

// ── buildSuggestions — memory & dedup ────────────────────────────────────────
describe("buildSuggestions — memory & deduplication", () => {
  const sr = { wordScore: 5, printableRatio: 0.5, chiScore: 20, icScore: 20, entropyDelta: -1 };

  it("[] when flag present", () =>
    expect(buildSuggestions("flag{found}", sr, "Base64", FLAG_RE, new Set())).toHaveLength(0));

  it("skips triedOps opId", () => {
    const r = buildSuggestions("68656c6c6f", sr, "Base64", null, new Set(["hexdec"]));
    expect(r.every(s => s.opId !== "hexdec")).toBe(true);
  });

  it("max 2 suggestions", () =>
    expect(buildSuggestions("ZmxhZw==", sr, "rot13", null, new Set()).length).toBeLessThanOrEqual(2));

  it("no duplicate actions", () => {
    const r = buildSuggestions("test", sr, "base64", null, new Set());
    const actions = r.map(s => s.action);
    expect(actions.length).toBe(new Set(actions).size);
  });

  it("each suggestion has tier field", () => {
    const r = buildSuggestions("68656c6c6f7768617473757021", sr, "base64", null, new Set());
    r.forEach(s => expect(["High","Medium","Low"]).toContain(s.tier));
  });
});

// ── Workspace system unit tests ───────────────────────────────────────────────
import {
  createWorkspace, renameWorkspace, switchWorkspace, deleteWorkspace,
  clearWorkspaceData, listWorkspaces, readWorkspaceData, saveWorkspaceData,
  appendSolverHistory, clearAllWorkspaceData, getPrivateMode, setPrivateMode,
  ensureDefaultWorkspace,
} from "../lib/workspace.js";

describe("Workspace — CRUD", () => {
  it("createWorkspace returns metadata with id/name/createdAt", () => {
    const ws = createWorkspace("Test WS");
    expect(ws.id).toBeTruthy();
    expect(ws.name).toBe("Test WS");
    expect(ws.createdAt).toBeGreaterThan(0);
  });

  it("listWorkspaces contains created workspace", () => {
    const ws = createWorkspace("List Test");
    const list = listWorkspaces();
    expect(list.some(w => w.id === ws.id)).toBe(true);
  });

  it("renameWorkspace updates name", () => {
    const ws = createWorkspace("Old Name");
    const updated = renameWorkspace(ws.id, "New Name");
    expect(updated?.name).toBe("New Name");
    const list = listWorkspaces();
    expect(list.find(w => w.id === ws.id)?.name).toBe("New Name");
  });

  it("renameWorkspace with non-existent id returns null", () => {
    expect(renameWorkspace("does-not-exist", "Fail")).toBeNull();
  });

  it("clearWorkspaceData empties data but keeps workspace", () => {
    const ws = createWorkspace("Clear Test");
    saveWorkspaceData(ws.id, { solverHistory:[{x:1}], pipeline:[], writeupNotes:"" }, false);
    clearWorkspaceData(ws.id);
    const data = readWorkspaceData(ws.id);
    expect(data.solverHistory).toHaveLength(0);
    // Workspace still exists
    expect(listWorkspaces().some(w => w.id === ws.id)).toBe(true);
  });

  it("deleteWorkspace removes it from list", () => {
    const ws = createWorkspace("Delete Me");
    createWorkspace("Survivor"); // ensure at least one remains
    deleteWorkspace(ws.id);
    expect(listWorkspaces().some(w => w.id === ws.id)).toBe(false);
  });

  it("deleteWorkspace on last workspace creates Default", () => {
    clearAllWorkspaceData();
    const ws = createWorkspace("Only One");
    const newActive = deleteWorkspace(ws.id);
    expect(newActive).toBeDefined();
    expect(listWorkspaces().length).toBeGreaterThanOrEqual(1);
  });

  it("ensureDefaultWorkspace creates one if none exist", () => {
    clearAllWorkspaceData();
    const ws = ensureDefaultWorkspace();
    expect(ws.id).toBeTruthy();
    expect(listWorkspaces().length).toBe(1);
  });
});

describe("Workspace — data isolation", () => {
  it("readWorkspaceData returns empty data for new workspace", () => {
    const ws = createWorkspace("Isolation A");
    const data = readWorkspaceData(ws.id);
    expect(data.solverHistory).toHaveLength(0);
    expect(data.pipeline).toHaveLength(0);
  });

  it("data written to workspace A does not appear in workspace B", () => {
    const wsA = createWorkspace("Iso A");
    const wsB = createWorkspace("Iso B");
    saveWorkspaceData(wsA.id, { solverHistory:[{secret:"a"}], pipeline:[], writeupNotes:"" }, false);
    const dataB = readWorkspaceData(wsB.id);
    expect(dataB.solverHistory).toHaveLength(0);
  });

  it("appendSolverHistory is no-op when privateMode=true", () => {
    const ws = createWorkspace("Private Test");
    appendSolverHistory(ws.id, { timestamp: new Date().toISOString(), method: "Test" }, true);
    expect(readWorkspaceData(ws.id).solverHistory).toHaveLength(0);
  });

  it("appendSolverHistory persists when privateMode=false", () => {
    const ws = createWorkspace("Persist Test");
    appendSolverHistory(ws.id, { timestamp: new Date().toISOString(), method: "Quick Scan" }, false);
    expect(readWorkspaceData(ws.id).solverHistory).toHaveLength(1);
  });

  it("saveWorkspaceData is no-op when privateMode=true", () => {
    const ws = createWorkspace("Save Private");
    saveWorkspaceData(ws.id, { solverHistory:[{x:1}], pipeline:[], writeupNotes:"" }, true);
    expect(readWorkspaceData(ws.id).solverHistory).toHaveLength(0);
  });

  it("solverHistory capped at 200 entries", () => {
    const ws = createWorkspace("Cap Test");
    for (let i = 0; i < 250; i++) {
      appendSolverHistory(ws.id, { timestamp: "", method: `run-${i}` }, false);
    }
    expect(readWorkspaceData(ws.id).solverHistory.length).toBeLessThanOrEqual(200);
  });
});

describe("Private mode — persistence", () => {
  it("getPrivateMode defaults to true", () => {
    // Clear the private mode key to test default
    try { localStorage.removeItem("ck_private_mode"); } catch {}
    expect(getPrivateMode()).toBe(true);
  });

  it("setPrivateMode false is readable back", () => {
    setPrivateMode(false);
    expect(getPrivateMode()).toBe(false);
    setPrivateMode(true); // restore
  });
});

describe("clearAllWorkspaceData — nuclear option", () => {
  it("removes all ck_ keys", () => {
    createWorkspace("Nuclear Test A");
    createWorkspace("Nuclear Test B");
    clearAllWorkspaceData();
    expect(listWorkspaces()).toHaveLength(0);
  });
});
