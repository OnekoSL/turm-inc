import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  activationCost,
  advanceMilliseconds,
  applyAction,
  checkMilestones,
  integratedProduction,
  introductionComplete,
  isGameAction,
  newGame,
  nominal,
  stepGame,
  unlocked,
} from "../src/game/engine";
import {
  CONTRACT_TIERS,
  nextContractRules,
  roomElementFactor,
  TOWERS,
} from "../src/game/content";
import { capacities, roomRates, resonanceRates } from "../src/game/economy";
import {
  NEW_TOWER_IDS,
  STARTER_IDS,
  TOWER_IDS,
  type GameAction,
  type GameState,
  type TowerId,
} from "../src/game/types";
import { SaveStore, validateGame } from "../src/persistence/store";
import { legacyFixture } from "./legacy-fixture";

function ready() {
  const s = newGame();
  s.paused = false;
  for (const id of STARTER_IDS) s.towers[id].level = 2;
  s.magic = 30000;
  s.lifetimeMagic = 30000;
  s.hasCompletedRecovery = true;
  s.contractsResolved = 1;
  s.colony.minions = 2;
  s.colony.settled = true;
  s.colony.kitchenStaffed = true;
  s.colony.research = ["storage"];
  s.colony.stabilizedSeconds = 10;
  checkMilestones(s);
  return s;
}
const ok = (s: GameState, a: GameAction) =>
  expect(applyAction(s, a), JSON.stringify(a)).toMatchObject({ ok: true });

describe("Elements and expansion", () => {
  it("unlocks after precisely the old introduction and keeps the unlock", () => {
    const s = ready();
    expect(introductionComplete(s)).toBe(true);
    expect(NEW_TOWER_IDS.every((id) => unlocked(s, id))).toBe(true);
    s.colony.minions = 0;
    expect(unlocked(s, "eis")).toBe(true);
    const fresh = newGame();
    fresh.paused = false;
    fresh.magic = 1e6;
    expect(applyAction(fresh, { type: "activate", id: "eis" }).ok).toBe(false);
    expect(activationCost(fresh, "eis")).toBe(600);
  });
  it.each([{ order: NEW_TOWER_IDS }, { order: [...NEW_TOWER_IDS].reverse() }])(
    "charges the same price sequence in every purchase order",
    ({ order }) => {
      const s = ready();
      const prices = [600, 960, 1536, 2458, 3933, 6292];
      order.forEach((id, i) => {
        expect(activationCost(s, id)).toBe(prices[i]);
        const before = s.magic;
        ok(s, { type: "activate", id });
        expect(s.magic).toBe(before - prices[i]);
        expect(applyAction(s, { type: "activate", id }).ok).toBe(false);
        expect(s.magic).toBe(before - prices[i]);
      });
      expect(nextContractRules(s).tier).toBe(4);
      expect(validateGame(s)).toBe(true);
    },
  );
  it("applies all local element bonuses without applying them to unrelated rooms or the rival", () => {
    const s = ready();
    for (const id of NEW_TOWER_IDS) ok(s, { type: "activate", id });
    expect(nominal(s, "lava")).toBeCloseTo(7.2);
    expect(nominal(s, "fels")).toBe(6);
    expect(nominal(s, "wald")).toBeCloseTo(1.18 * 1.5);
    for (const id of ["wald", "pilz", "fels"] as const)
      expect(roomElementFactor(id, "kitchen")).toBe(1.2);
    expect(roomElementFactor("eis", "kitchen")).toBe(1);
    expect(roomElementFactor("sonne", "library")).toBe(1.2);
    expect(roomElementFactor("mond", "resonator")).toBe(1.2);
    s.colony.research.push("library", "crystals");
    s.colony.food = 20;
    s.colony.rooms.sonne.library = { level: 1, workers: 1, investedMagic: 40 };
    s.colony.rooms.mond.resonator = { level: 1, workers: 1, investedMagic: 60 };
    const rates = roomRates(s);
    expect(rates.knowledge).toBeCloseTo(0.075);
    expect(rates.crystals).toBeCloseTo(0.06);
    expect(rates.magic).toBeCloseTo(0.5);
    s.towers.eis.instability = 50;
    ok(s, { type: "mode", id: "eis", mode: "rest" });
    const crystal = s.colony.crystals;
    s.colony.resonance.eis = "strong";
    expect(resonanceRates(s).drift.eis).toBe(-1.2);
    stepGame(s, 1);
    expect(s.towers.eis.instability).toBeCloseTo(48.8);
    expect(s.colony.crystals).toBeGreaterThanOrEqual(crystal);
    ok(s, { type: "mode", id: "wind", mode: "high" });
    expect(s.towers.wind.lock).toBe(12);
    ok(s, { type: "mode", id: "blitz", mode: "high" });
    expect(s.towers.blitz.lock).toBe(12);
    expect(s.rival.lock).toBeLessThanOrEqual(15);
  });
  it("changes only eligible members of an element, without queued or free mode resets", () => {
    const s = ready();
    ok(s, { type: "activate", id: "fels" });
    s.towers.pilz.lock = 8;
    s.towers.wald.instability = 62;
    const r = applyAction(s, {
      type: "element-mode",
      element: "earth",
      mode: "rest",
    });
    expect(r).toEqual({
      ok: true,
      changed: ["wald", "fels"],
      skippedLocked: ["pilz"],
    });
    expect(s.towers.wald.instability).toBe(62);
    expect(s.towers.wald.lock).toBe(15);
    expect(
      applyAction(s, { type: "element-mode", element: "earth", mode: "rest" })
        .changed,
    ).toEqual([]);
    stepGame(s, 9);
    expect(s.towers.pilz.mode).toBe("normal");
    expect(s.towers.wald.lock).toBeCloseTo(6);
    s.paused = true;
    const before = structuredClone(s);
    expect(
      applyAction(s, { type: "element-mode", element: "earth", mode: "high" })
        .ok,
    ).toBe(false);
    advanceMilliseconds(s, 100000);
    expect(s).toEqual(before);
    expect(
      isGameAction({ type: "element-mode", element: "void", mode: "rest" }),
    ).toBe(false);
    expect(
      isGameAction({ type: "element-mode", element: "air", mode: "rest" }),
    ).toBe(true);
  });
  it("balances scarce magic, full storage and crystals across nine towers, independently of record order", () => {
    const s = ready();
    s.colony.minions = 9;
    s.colony.food = 1;
    s.colony.crystals = 0.01;
    for (const id of TOWER_IDS) {
      s.towers[id].level = 1;
      s.colony.rooms[id].resonator = {
        level: 1,
        workers: 1,
        investedMagic: 60,
      };
      s.colony.resonance[id] = "strong";
    }
    s.magic = 0.18;
    const rates = roomRates(s);
    expect(rates.fraction).toBeCloseTo(0.5);
    expect(rates.magic).toBeCloseTo(1.8);
    expect(rates.crystals).toBeCloseTo((8 * 0.04 + 0.048) * 0.5);
    const resonance = resonanceRates(s);
    expect(resonance.fraction).toBeCloseTo(0.01 / 0.045);
    for (const id of TOWER_IDS)
      expect(resonance.drift[id]).toBeCloseTo(0.4 - 0.5 * resonance.fraction);
    const reversed = structuredClone(s);
    reversed.towers = Object.fromEntries(
      Object.entries(reversed.towers).reverse(),
    ) as GameState["towers"];
    expect(resonanceRates(reversed)).toEqual(resonance);
    s.colony.crystals = capacities(s).crystals + 5;
    expect(roomRates(s).magic).toBe(0);
    s.colony.minions = 54;
    expect(validateGame(s)).toBe(true);
    s.colony.minions = 55;
    expect(validateGame(s)).toBe(false);
  });
  it("is identical across rendering rates with all elements operating", () => {
    const s = ready();
    for (const id of NEW_TOWER_IDS) ok(s, { type: "activate", id });
    s.towers.eis.mode = "rest";
    s.towers.eis.instability = 40;
    s.towers.lava.mode = "high";
    const other = structuredClone(s);
    for (let i = 0; i < 600; i++) advanceMilliseconds(s, 100);
    for (let i = 0; i < 240; i++) advanceMilliseconds(other, 250);
    expect(other).toEqual(s);
  });
});

describe("Transparent contract tiers", () => {
  it("snapshots the tier at start, keeps a live contract unchanged and snapshots the next one", () => {
    const s = ready();
    s.contract.remaining = 0;
    stepGame(s);
    const rules = structuredClone(s.contract.rules);
    ok(s, { type: "activate", id: "fels" });
    expect(s.contract.rules).toEqual(rules);
    expect(nextContractRules(s).tier).toBe(2);
    s.contract.remaining = 0;
    stepGame(s);
    expect(s.contract.lastResult?.rules).toEqual(rules);
    s.contract.remaining = 0;
    stepGame(s);
    expect(s.contract.rules).toEqual(CONTRACT_TIERS[1]);
  });
  for (const rules of CONTRACT_TIERS)
    for (const winner of ["player", "rival", "tie", "expired"] as const) {
      it(`resolves ${winner} exactly once at tier ${rules.tier}`, () => {
        const s = ready();
        s.colony.minions = 0;
        s.contract = {
          ...s.contract,
          rules: { ...rules },
          phase: "active",
          number: 1,
          remaining: 60,
          allocation: 0.5,
        };
        s.rival = {
          mode: "normal",
          instability: 0,
          lock: 0,
          recoveryEligible: false,
          allocation: 0.5,
          decisionIn: 5,
        };
        const hit = 0.05;
        const player =
          TOWER_IDS.reduce(
            (n, id) =>
              n + integratedProduction(s.towers[id], nominal(s, id), hit),
            0,
          ) * 0.5;
        const rival = integratedProduction(s.rival, rules.rivalBase, hit) * 0.5;
        if (winner === "player" || winner === "tie")
          s.contract.playerDelivered = rules.target - player;
        if (winner === "rival" || winner === "tie")
          s.contract.rivalDelivered = rules.target - rival;
        if (winner === "expired") s.contract.remaining = 0.05;
        const money = s.magic,
          lifetime = s.lifetimeMagic,
          delivered = s.contract.playerDelivered;
        stepGame(s);
        const result = s.contract.lastResult!;
        expect(result.winner).toBe(winner);
        expect(result.rules).toEqual(rules);
        const reward =
          winner === "player"
            ? rules.reward
            : winner === "tie"
              ? rules.reward / 2
              : 0;
        expect(result.reward).toBe(reward);
        expect(s.magic - money).toBeCloseTo(
          s.lifetimeMagic -
            lifetime -
            (result.playerDelivered - delivered) +
            reward,
          7,
        );
        const before = s.magic,
          generated = s.lifetimeMagic;
        stepGame(s);
        expect(s.magic - before).toBeCloseTo(s.lifetimeMagic - generated);
        expect(s.contractsResolved).toBe(2);
        expect(validateGame(s)).toBe(true);
      });
    }
});

describe("v3 migration", () => {
  it("preserves all economic values, active contract and existing air lock; rejects damaged old room data", () => {
    const dir = mkdtempSync(join(tmpdir(), "turm-elements-test-"));
    try {
      const s = ready();
      s.towers.blitz.lock = 14.5;
      s.colony.rooms.wald.housing = { level: 1, workers: 0, investedMagic: 25 };
      s.colony.rooms.wald.kitchen = { level: 1, workers: 1, investedMagic: 25 };
      s.contract.phase = "active";
      s.contract.remaining = 93;
      s.contract.playerDelivered = 23;
      s.contract.lastResult = {
        rules: { ...CONTRACT_TIERS[0] },
        number: 1,
        winner: "tie",
        playerDelivered: 80,
        rivalDelivered: 80,
        reward: 80,
      };
      s.log = [
        { time: 0, text: { key: "log.contract", params: { number: 1 } } },
      ];
      const old = legacyFixture(s);
      const source = JSON.stringify(old);
      const store = new SaveStore(dir);
      writeFileSync(store.path, source);
      const loaded = store.load().game!;
      expect(loaded).not.toBeNull();
      expect(loaded.elementsUnlocked).toBe(true);
      expect(loaded.towers).toMatchObject(old.towers);
      expect(loaded.colony).toMatchObject(old.colony);
      expect(loaded.contract).toMatchObject(old.contract);
      expect(loaded.towers.blitz.lock).toBe(14.5);
      expect(loaded.log[0].text).toEqual({
        key: "log.contract",
        params: { number: 1, target: 80, reward: 160 },
      });
      for (const id of NEW_TOWER_IDS) {
        expect(loaded.towers[id].level).toBe(0);
        expect(loaded.colony.rooms[id]).toEqual({});
      }
      expect(readFileSync(store.path, "utf8")).toBe(source);
      store.save(loaded);
      expect(readFileSync(store.backup, "utf8")).toBe(source);
      expect(new SaveStore(dir).load().game).toEqual(loaded);
      old.colony.rooms.wald.kitchen.workers = 9;
      writeFileSync(store.path, JSON.stringify(old));
      rmSync(store.backup);
      expect(new SaveStore(dir).load().blocked).toBe(true);
    } finally {
      if (!dir.startsWith(join(tmpdir(), "turm-elements-test-")))
        throw Error("Unsafe path");
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
