import { expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LEGACY_CONTRACT_TIERS,
  nextContractRules,
  rulesForRank,
} from "../src/game/content";
import {
  advanceMilliseconds,
  applyAction,
  integratedProduction,
  newGame,
  nominal,
  stepGame,
} from "../src/game/engine";
import { TOWER_IDS } from "../src/game/types";
import { SaveStore, validateGame } from "../src/persistence/store";
import { legacyFixture } from "./legacy-fixture";

function competing(rank = 0) {
  const s = newGame();
  s.paused = false;
  s.competitionRank = rank;
  s.towers.wald.level = 2;
  s.towers.pilz.level = 1;
  s.towers.blitz.level = 1;
  s.hasCompletedRecovery = true;
  s.magic = 1000;
  s.lifetimeMagic = 1000;
  s.contract = {
    ...s.contract,
    phase: "active",
    number: 1,
    remaining: 180,
    allocation: 0.5,
    rules: rulesForRank(rank),
  };
  s.rival = {
    mode: "normal",
    instability: 0,
    lock: 0,
    recoveryEligible: false,
    allocation: 0.5,
    decisionIn: 5,
  };
  return s;
}

it("uses compound ten-percent growth and moves to a new class every five ranks", () => {
  for (let rank = 0; rank < 30; rank++) {
    const current = rulesForRank(rank),
      next = rulesForRank(rank + 1);
    expect(next.rivalBase / current.rivalBase).toBeCloseTo(1.1, 12);
    expect(current.tier).toBe(1 + Math.floor(rank / 5));
    expect(current.reward).toBe(2 * current.target);
    if ((rank + 1) % 5) expect(next.target).toBe(current.target);
    else expect(next.target).toBeGreaterThan(current.target);
  }
  expect(rulesForRank(0)).toEqual({
    rank: 0,
    tier: 1,
    target: 80,
    reward: 160,
    rivalBase: 2,
  });
  expect(rulesForRank(5).target).toBe(129);
  expect(rulesForRank(10).target).toBe(208);
  expect(rulesForRank(10).rivalBase / 2).toBeCloseTo(2.5937424601);
});

for (const rank of [0, 4, 5, 9, 10, 25])
  for (const winner of ["player", "rival", "tie", "expired"] as const) {
    it(`rank ${rank}: ${winner} updates rank and reward exactly once`, () => {
      const s = competing(rank),
        rules = { ...s.contract.rules };
      const hit = 0.05;
      const p =
        TOWER_IDS.reduce(
          (n, id) =>
            n + integratedProduction(s.towers[id], nominal(s, id), hit),
          0,
        ) * 0.5;
      const r = integratedProduction(s.rival, rules.rivalBase, hit) * 0.5;
      if (winner === "player" || winner === "tie")
        s.contract.playerDelivered = rules.target - p;
      if (winner === "rival" || winner === "tie")
        s.contract.rivalDelivered = rules.target - r;
      if (winner === "expired") s.contract.remaining = hit;
      const money = s.magic,
        lifetime = s.lifetimeMagic,
        delivered = s.contract.playerDelivered;
      stepGame(s);
      expect(s.contract.lastResult?.winner).toBe(winner);
      expect(s.competitionRank).toBe(rank + (winner === "player" ? 1 : 0));
      expect(s.contract.lastResult?.rules).toEqual(rules);
      expect(s.contract.rules).toEqual(rules);
      const reward =
        winner === "player"
          ? rules.reward
          : winner === "tie"
            ? rules.reward / 2
            : 0;
      expect(s.magic - money).toBeCloseTo(
        s.lifetimeMagic -
          lifetime -
          (s.contract.playerDelivered - delivered) +
          reward,
        6,
      );
      const after = s.magic,
        produced = s.lifetimeMagic;
      stepGame(s, 1);
      expect(s.magic - after).toBeCloseTo(s.lifetimeMagic - produced, 6);
      expect(s.contractsResolved).toBe(1);
      expect(s.competitionRank).toBe(rank + (winner === "player" ? 1 : 0));
      s.contract.remaining = 0;
      stepGame(s);
      expect(s.contract.rules).toEqual(rulesForRank(s.competitionRank));
      expect(validateGame(s)).toBe(true);
    });
  }

it("neither expansion nor upgrading advances rank, and pause freezes a pending win", () => {
  const s = competing(4);
  s.elementsUnlocked = true;
  const rules = { ...s.contract.rules };
  expect(applyAction(s, { type: "activate", id: "lava" }).ok).toBe(true);
  expect(applyAction(s, { type: "upgrade", id: "wald" }).ok).toBe(true);
  expect(s.contract.rules).toEqual(rules);
  expect(nextContractRules(s)).toEqual(rules);
  s.contract.playerDelivered = rules.target - 0.001;
  s.paused = true;
  const before = structuredClone(s);
  advanceMilliseconds(s, 60000);
  expect(s).toEqual(before);
  s.paused = false;
  stepGame(s);
  expect(s.competitionRank).toBe(5);
  expect(s.contract.rules.target).toBe(80);
  expect(nextContractRules(s).target).toBe(129);
});

it("stays deterministic through promotions at different rendering rates", () => {
  const a = competing(4);
  a.contract.playerDelivered = 79.99;
  const b = structuredClone(a);
  for (let i = 0; i < 1000; i++) advanceMilliseconds(a, 100);
  for (let i = 0; i < 400; i++) advanceMilliseconds(b, 250);
  expect(b).toEqual(a);
  expect(a.competitionRank).toBeGreaterThanOrEqual(5);
});

it.each(LEGACY_CONTRACT_TIERS)(
  "migrates old class $tier without changing the live contract",
  (rules) => {
    const d = mkdtempSync(join(tmpdir(), "turm-rank-test-"));
    try {
      const s = competing();
      s.contract.rules = { ...rules };
      s.contract.remaining = 93;
      s.contract.playerDelivered = 21;
      s.contract.lastResult = {
        rules: { ...rules },
        number: 0,
        winner: "player",
        playerDelivered: rules.target,
        rivalDelivered: 0,
        reward: rules.reward,
      };
      const old = legacyFixture(s, 4);
      const source = JSON.stringify(old),
        store = new SaveStore(d);
      writeFileSync(store.path, source);
      const loaded = store.load().game!;
      expect(loaded).not.toBeNull();
      expect(loaded.schemaVersion).toBe(5);
      expect(loaded.balanceVersion).toBe(3);
      expect(loaded.competitionRank).toBe([0, 12, 19, 25][rules.tier - 1]);
      expect(loaded.contract).toMatchObject(old.contract);
      expect(loaded.magic).toBe(s.magic);
      expect(loaded.contract.rules.rank).toBeNull();
      expect(nextContractRules(loaded).rivalBase).toBeGreaterThanOrEqual(
        rules.rivalBase,
      );
      expect(readFileSync(store.path, "utf8")).toBe(source);
      loaded.contract.playerDelivered = rules.target - 0.001;
      stepGame(loaded);
      const rank = loaded.competitionRank;
      store.save(loaded);
      expect(readFileSync(store.backup, "utf8")).toBe(source);
      const reopened = store.load().game!;
      stepGame(reopened);
      expect(reopened.competitionRank).toBe(rank);
      expect(reopened.contractsResolved).toBe(1);
      const bad = legacyFixture(s, 4);
      bad.contract.rules.rivalBase = 999;
      writeFileSync(store.path, JSON.stringify(bad));
      rmSync(store.backup);
      expect(new SaveStore(d).load().blocked).toBe(true);
    } finally {
      if (!d.startsWith(join(tmpdir(), "turm-rank-test-")))
        throw Error("Unsafe test path");
      rmSync(d, { recursive: true, force: true });
    }
  },
);

it("rejects invalid ranks and tampered snapshotted rules", () => {
  for (const rank of [-1, 1.5, NaN, Infinity, 100000]) {
    const s = competing();
    s.competitionRank = rank;
    expect(validateGame(s)).toBe(false);
  }
  const s = competing(5);
  s.contract.rules.rivalBase += 1;
  expect(validateGame(s)).toBe(false);
});

it("eventually challenges a fixed three-tower network instead of staying a guaranteed income", () => {
  const s = competing();
  let wins = 0,
    losses = 0;
  while (s.contractsResolved < 40 && s.activeSeconds < 12000) {
    for (const id of TOWER_IDS) {
      const t = s.towers[id];
      if (!t.level || t.lock > 1e-8) continue;
      if (t.mode !== "rest" && t.instability >= 60)
        applyAction(s, { type: "mode", id, mode: "rest" });
      else if (t.instability <= 20 && t.mode !== "high")
        applyAction(s, { type: "mode", id, mode: "high" });
    }
    applyAction(s, { type: "allocation", share: 0.75 });
    const count = s.contractsResolved;
    advanceMilliseconds(s, 100);
    if (s.contractsResolved > count) {
      if (s.contract.lastResult?.winner === "player") wins++;
      if (s.contract.lastResult?.winner === "rival") losses++;
    }
  }
  expect(s.contractsResolved).toBe(40);
  expect(wins).toBeGreaterThan(0);
  expect(losses).toBeGreaterThan(0);
  expect(s.competitionRank).toBe(wins);
  console.log(
    `Fixed network, 40 contests: ${wins} wins, ${losses} defeats; rank ${s.competitionRank}; next rival ${nextContractRules(s).rivalBase.toFixed(3)}/s; active time ${s.activeSeconds.toFixed(1)}s.`,
  );
}, 30000);
