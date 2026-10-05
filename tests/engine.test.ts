import { describe, expect, it } from "vitest";
import {
  advanceMilliseconds,
  applyAction,
  factor,
  integratedProduction,
  introductionComplete,
  isGameAction,
  newGame,
  nominal,
  production,
  stepGame,
  totalProduction,
} from "../src/game/engine";
import { TOWER_IDS, type GameState } from "../src/game/types";
import { validateGame } from "../src/persistence/store";

function playing() {
  const s = newGame();
  s.paused = false;
  applyAction(s, { type: "activate", id: "wald" });
  return s;
}
function competition() {
  const s = playing();
  s.towers.pilz.level = 1;
  s.lifetimeMagic = 100;
  s.hasCompletedRecovery = true;
  s.contract = {
    phase: "active",
    number: 1,
    remaining: 180,
    allocation: 0.5,
    playerDelivered: 0,
    rivalDelivered: 0,
    lastResult: null,
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

describe("Wirtschaft und Betrieb", () => {
  it("starts safely paused with no production and rejects economic actions", () => {
    const s = newGame();
    const original = structuredClone(s);
    expect(applyAction(s, { type: "activate", id: "wald" }).ok).toBe(false);
    advanceMilliseconds(s, 3600000);
    expect(s).toEqual(original);
    expect(totalProduction(s)).toBe(0);
  });
  it("charges purchases atomically and preserves lifetime production and instability", () => {
    const s = playing();
    s.magic = 10;
    s.lifetimeMagic = 10;
    s.towers.wald.instability = 50;
    expect(applyAction(s, { type: "upgrade", id: "wald" }).ok).toBe(true);
    expect(s.magic).toBe(0);
    expect(s.lifetimeMagic).toBe(10);
    expect(s.towers.wald.instability).toBe(50);
    expect(nominal(s, "wald")).toBeCloseTo(1.18);
    expect(applyAction(s, { type: "upgrade", id: "wald" }).ok).toBe(false);
    expect(s.towers.wald.level).toBe(2);
    s.towers.wald.level = 10;
    s.magic = 100000;
    expect(applyAction(s, { type: "upgrade", id: "wald" }).ok).toBe(false);
  });
  it("requires discovery and activation money, and applies the mushroom bonus only once", () => {
    const s = playing();
    s.magic = 1000;
    expect(applyAction(s, { type: "activate", id: "pilz" }).ok).toBe(false);
    s.lifetimeMagic = 100;
    expect(applyAction(s, { type: "activate", id: "pilz" }).ok).toBe(true);
    expect(s.magic).toBe(925);
    expect(nominal(s, "wald")).toBe(1.25);
    expect(nominal(s, "pilz")).toBe(0.5);
    expect(applyAction(s, { type: "activate", id: "pilz" }).ok).toBe(false);
    expect(applyAction(s, { type: "activate", id: "blitz" }).ok).toBe(false);
  });
  it("honors the 15-second binding without a free instability reset", () => {
    const s = playing();
    s.towers.wald.instability = 55;
    expect(applyAction(s, { type: "mode", id: "wald", mode: "rest" }).ok).toBe(
      true,
    );
    expect(s.towers.wald.instability).toBe(55);
    expect(applyAction(s, { type: "mode", id: "wald", mode: "high" }).ok).toBe(
      false,
    );
    advanceMilliseconds(s, 14900);
    expect(applyAction(s, { type: "mode", id: "wald", mode: "high" }).ok).toBe(
      false,
    );
    advanceMilliseconds(s, 100);
    expect(applyAction(s, { type: "mode", id: "wald", mode: "high" }).ok).toBe(
      true,
    );
    expect(s.towers.wald.instability).toBeCloseTo(40);
  });
  it("counts only a continuous eligible recovery", () => {
    const s = playing();
    s.towers.wald.instability = 39;
    applyAction(s, { type: "mode", id: "wald", mode: "rest" });
    advanceMilliseconds(s, 30000);
    expect(s.hasCompletedRecovery).toBe(false);
    s.towers.wald.instability = 50;
    applyAction(s, { type: "mode", id: "wald", mode: "normal" });
    advanceMilliseconds(s, 15000);
    applyAction(s, { type: "mode", id: "wald", mode: "rest" });
    advanceMilliseconds(s, 36000);
    expect(s.hasCompletedRecovery).toBe(true);
  });
  it("integrates production exactly at instability boundaries", () => {
    const s = playing();
    s.towers.wald.instability = 99;
    s.towers.wald.mode = "high";
    expect(integratedProduction(s.towers.wald, 1, 2)).toBeCloseTo(0.2075);
    stepGame(s, 2);
    expect(s.magic).toBeCloseTo(0.2075);
    expect(s.towers.wald.instability).toBe(100);
    expect(production(s, "wald")).toBeCloseTo(0.1);
    s.towers.wald.mode = "rest";
    stepGame(s, 150);
    expect(s.towers.wald.instability).toBe(0);
    expect(production(s, "wald")).toBe(0.2);
  });
  it("does not apply purchased production retroactively", () => {
    const s = playing();
    s.magic = 10;
    advanceMilliseconds(s, 1000);
    const earned = s.lifetimeMagic;
    applyAction(s, { type: "upgrade", id: "wald" });
    expect(s.lifetimeMagic).toBe(earned);
    expect(s.magic).toBeCloseTo(earned);
  });
  it("has identical results at different rendering rates", () => {
    const a = playing(),
      b = playing();
    for (let i = 0; i < 6000; i++) advanceMilliseconds(a, 10);
    for (let i = 0; i < 120; i++) advanceMilliseconds(b, 500);
    expect(a).toEqual(b);
  });
  it("beats unattended normal production by at least 30% over ten minutes", () => {
    const unattended = playing(),
      managed = playing();
    applyAction(managed, { type: "mode", id: "wald", mode: "high" });
    for (let i = 0; i < 6000; i++) {
      const t = managed.towers.wald;
      if (t.mode === "high" && t.instability >= 60)
        applyAction(managed, { type: "mode", id: "wald", mode: "rest" });
      if (t.mode === "rest" && t.instability <= 20)
        applyAction(managed, { type: "mode", id: "wald", mode: "high" });
      advanceMilliseconds(managed, 100);
      advanceMilliseconds(unattended, 100);
    }
    expect(managed.lifetimeMagic / unattended.lifetimeMagic).toBeGreaterThan(
      1.3,
    );
    expect(factor("high", 100)).toBeLessThan(factor("normal", 100));
  });
  it("validates IPC actions without accepting arbitrary modes or shares", () => {
    expect(isGameAction({ type: "mode", id: "wald", mode: "free" })).toBe(
      false,
    );
    expect(isGameAction({ type: "allocation", share: 1 })).toBe(false);
    expect(isGameAction({ type: "activate", id: "imaginary" })).toBe(false);
    expect(isGameAction({ type: "mode", id: "wald", mode: "rest" })).toBe(true);
  });
});

describe("Aufträge und Rivale", () => {
  it("announces the first contract only after both milestones", () => {
    const s = playing();
    s.hasCompletedRecovery = true;
    advanceMilliseconds(s, 1000);
    expect(s.contract.phase).toBe("locked");
    s.magic = 75;
    s.lifetimeMagic = 100;
    applyAction(s, { type: "activate", id: "pilz" });
    expect(s.contract.phase).toBe("preparing");
    advanceMilliseconds(s, 30000);
    advanceMilliseconds(s, 100);
    expect(s.contract.phase).toBe("active");
    expect(s.contract.number).toBe(1);
  });
  it("conserves generated magic when allocating a share", () => {
    const s = competition();
    const initialLifetime = s.lifetimeMagic;
    advanceMilliseconds(s, 1000);
    expect(s.magic + s.contract.playerDelivered).toBeCloseTo(
      s.lifetimeMagic - initialLifetime,
    );
    expect(s.magic).toBeCloseTo(s.contract.playerDelivered);
  });
  it("resolves a win inside a tick, returns the overshoot and rewards exactly once", () => {
    const s = competition();
    s.contract.playerDelivered = 79.99;
    const before = s.lifetimeMagic;
    stepGame(s, 0.1);
    expect(s.contract.lastResult?.winner).toBe("player");
    expect(s.contractsResolved).toBe(1);
    expect(s.magic).toBeCloseTo(160 + s.lifetimeMagic - before - 0.01, 7);
    expect(s.contract.allocation).toBe(0);
    const money = s.magic;
    const life = s.lifetimeMagic;
    stepGame(s, 1);
    expect(s.magic - money).toBeCloseTo(s.lifetimeMagic - life);
    expect(s.contractsResolved).toBe(1);
  });
  it("handles losses without restricting towers", () => {
    const s = competition();
    s.contract.rivalDelivered = 79.99;
    s.contract.allocation = 0;
    stepGame(s, 0.1);
    expect(s.contract.lastResult?.winner).toBe("rival");
    expect(s.contract.lastResult?.reward).toBe(0);
    s.magic = 350;
    s.lifetimeMagic = 500;
    expect(applyAction(s, { type: "activate", id: "blitz" }).ok).toBe(true);
  });
  it("splits an exactly simultaneous result independently of evaluation order", () => {
    const s = competition();
    const hitAt = 0.05;
    s.contract.playerDelivered =
      80 -
      (integratedProduction(s.towers.wald, 1.25, hitAt) +
        integratedProduction(s.towers.pilz, 0.5, hitAt)) *
        0.5;
    s.contract.rivalDelivered =
      80 - integratedProduction(s.rival, 2, hitAt) * 0.5;
    stepGame(s, 0.1);
    expect(s.contract.lastResult?.winner).toBe("tie");
    expect(s.contract.lastResult?.reward).toBe(80);
  });
  it("expires with no reward and starts the next contract after its cooldown", () => {
    const s = competition();
    s.contract.remaining = 0.05;
    s.contract.allocation = 0;
    s.rival.allocation = 0;
    stepGame(s, 0.1);
    expect(s.contract.lastResult?.winner).toBe("expired");
    expect(s.contract.lastResult?.reward).toBe(0);
    expect(s.contract.remaining).toBeCloseTo(59.95);
    stepGame(s, 60);
    expect(s.contract.phase).toBe("active");
    expect(s.contract.number).toBe(2);
  });
  it("uses a visible reactive strategy and respects recovery hysteresis", () => {
    const s = competition();
    s.contract.playerDelivered = 10;
    s.rival.decisionIn = 0;
    stepGame(s);
    expect(s.rival.mode).toBe("high");
    expect(s.rival.allocation).toBe(0.75);
    s.rival.instability = 75;
    s.rival.lock = 0;
    s.rival.decisionIn = 0;
    stepGame(s);
    expect(s.rival.mode).toBe("rest");
    s.rival.instability = 30;
    s.rival.lock = 0;
    s.rival.decisionIn = 0;
    stepGame(s);
    expect(s.rival.mode).toBe("rest");
  });
  it("pauses both sides and resumes without processing absence", () => {
    const s = competition();
    stepGame(s, 12);
    s.paused = true;
    const before = structuredClone(s);
    advanceMilliseconds(s, 100000000);
    expect(s).toEqual(before);
    s.paused = false;
    advanceMilliseconds(s, 100);
    expect(s.activeSeconds).toBeCloseTo(before.activeSeconds + 0.1);
  });
  it("plays the complete introduction through public actions without granting money", () => {
    const s = playing();
    let finishedAt = 0;
    let modeChanges = 0;
    let longestGap = 0;
    let lastActionAt = 0;
    for (let i = 0; i < 24000; i++) {
      const before = TOWER_IDS.map((id) => ({
        mode: s.towers[id].mode,
        level: s.towers[id].level,
      }));
      const shareBefore = s.contract.allocation;
      manage(s);
      const modeDelta = TOWER_IDS.filter(
        (id, index) => s.towers[id].mode !== before[index].mode,
      ).length;
      modeChanges += modeDelta;
      if (
        modeDelta ||
        shareBefore !== s.contract.allocation ||
        TOWER_IDS.some(
          (id, index) => s.towers[id].level !== before[index].level,
        )
      ) {
        longestGap = Math.max(longestGap, s.activeSeconds - lastActionAt);
        lastActionAt = s.activeSeconds;
      }
      advanceMilliseconds(s, 100);
      if (introductionComplete(s)) {
        finishedAt = s.activeSeconds;
        break;
      }
    }
    expect(finishedAt).toBeGreaterThan(0);
    expect(finishedAt).toBeLessThan(2400);
    expect(validateGame(s)).toBe(true);
    console.log(
      `Einführung über normale Spielaktionen abgeschlossen nach ${Math.round(finishedAt)} aktiven Sekunden. Guthaben: ${s.magic.toFixed(1)}. Aufträge: ${s.contractsResolved}. Betriebswechsel: ${modeChanges}. Längster Abstand zwischen wirksamen Aktionen: ${longestGap.toFixed(1)} Sekunden.`,
    );
  });
});

export function manage(s: GameState) {
  for (const id of TOWER_IDS) {
    const t = s.towers[id];
    if (!t.level) {
      applyAction(s, { type: "activate", id });
      continue;
    }
    if (t.lock < 1e-8) {
      if (t.mode !== "rest" && t.instability >= 60)
        applyAction(s, { type: "mode", id, mode: "rest" });
      else if (
        (t.mode === "rest" && t.instability <= 20) ||
        (t.mode === "normal" && t.instability < 40)
      )
        applyAction(s, { type: "mode", id, mode: "high" });
    }
    if ((id === "wald" && t.level < 3) || (id === "pilz" && t.level < 2))
      applyAction(s, { type: "upgrade", id });
  }
  if (s.contract.phase !== "locked")
    applyAction(s, { type: "allocation", share: 0.75 });
}
