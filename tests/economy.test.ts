import { describe, it, expect } from "vitest";
import {
  newGame,
  applyAction,
  stepGame,
  advanceMilliseconds,
  introductionComplete,
  isGameAction,
} from "../src/game/engine";
import {
  capacities,
  beds,
  freeWorkers,
  roomRates,
  runRooms,
  resonanceRates,
  RESEARCH,
} from "../src/game/economy";
import { TOWER_IDS, type GameAction, type GameState } from "../src/game/types";
import { validateGame } from "../src/persistence/store";

function playing() {
  const s = newGame();
  s.paused = false;
  s.towers.wald.level = 2;
  s.towers.pilz.level = 1;
  s.magic = 1000;
  s.lifetimeMagic = 1000;
  return s;
}
function ok(s: GameState, a: GameAction) {
  expect(applyAction(s, a)).toEqual({ ok: true });
}
function build(
  s: GameState,
  id: "wald" | "pilz",
  room: "housing" | "kitchen" | "library" | "resonator" | "storage",
) {
  ok(s, { type: "build-room", id, room });
}
describe("Rooms, workers and research", () => {
  it("enforces discovery, unique rooms, slots and a single welcome gift", () => {
    const s = newGame();
    s.paused = false;
    expect(
      applyAction(s, { type: "build-room", id: "wald", room: "housing" }).ok,
    ).toBe(false);
    s.towers.wald.level = 2;
    s.magic = 200;
    build(s, "wald", "housing");
    expect(s.colony.minions).toBe(2);
    expect(s.colony.food).toBe(10);
    expect(
      applyAction(s, { type: "build-room", id: "wald", room: "housing" }).ok,
    ).toBe(false);
    build(s, "wald", "kitchen");
    build(s, "wald", "library");
    expect(
      applyAction(s, { type: "build-room", id: "wald", room: "storage" }).ok,
    ).toBe(false);
    ok(s, {
      type: "demolish-room",
      id: "wald",
      room: "housing",
      confirmed: true,
    });
    expect(beds(s)).toBe(0);
    expect(s.colony.minions).toBe(2);
    build(s, "wald", "housing");
    expect(s.colony.minions).toBe(2);
    expect(s.colony.food).toBe(10);
    expect(validateGame(s)).toBe(true);
  });
  it("conserves workers, applies exact upgrade costs and refunds only paid magic", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "kitchen");
    build(s, "wald", "library");
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 1 });
    ok(s, { type: "assign", id: "wald", room: "library", workers: 1 });
    expect(freeWorkers(s)).toBe(0);
    s.colony.knowledge = 100;
    const before = s.magic;
    ok(s, { type: "upgrade-room", id: "wald", room: "library" });
    expect(s.magic).toBe(before - 64);
    expect(s.colony.knowledge).toBe(95);
    expect(
      applyAction(s, {
        type: "assign",
        id: "wald",
        room: "library",
        workers: 2,
      }).ok,
    ).toBe(false);
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 0 });
    ok(s, { type: "assign", id: "wald", room: "library", workers: 2 });
    const paid = s.colony.rooms.wald.library!.investedMagic,
      treasury = s.magic;
    ok(s, {
      type: "demolish-room",
      id: "wald",
      room: "library",
      confirmed: true,
    });
    expect(s.magic).toBe(treasury + paid / 2);
    expect(s.colony.knowledge).toBe(95);
    expect(freeWorkers(s)).toBe(2);
  });
  it("requires beds and magic for recruitment; research cannot be bought twice", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "library");
    expect(applyAction(s, { type: "recruit" }).ok).toBe(false);
    build(s, "pilz", "housing");
    const before = s.magic;
    ok(s, { type: "recruit" });
    expect(s.magic).toBe(before - 20);
    s.colony.knowledge = 1000;
    for (const research of Object.keys(RESEARCH) as (keyof typeof RESEARCH)[]) {
      ok(s, { type: "research", research });
      expect(applyAction(s, { type: "research", research }).ok).toBe(false);
    }
    build(s, "wald", "storage");
    build(s, "wald", "kitchen");
    expect(capacities(s)).toEqual({ food: 125, crystals: 62.5 });
    expect(validateGame(s)).toBe(true);
  });
  it("retains over-capacity stocks and residents when passive rooms are removed", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "storage");
    s.colony.food = 100;
    s.colony.crystals = 50;
    ok(s, {
      type: "demolish-room",
      id: "wald",
      room: "storage",
      confirmed: true,
    });
    expect(capacities(s)).toEqual({ food: 40, crystals: 20 });
    expect(s.colony.food).toBe(100);
    expect(s.colony.crystals).toBe(50);
    expect(validateGame(s)).toBe(true);
  });
  it("validates IPC payloads and rejects impossible saved worker and refund values", () => {
    expect(
      isGameAction({
        type: "assign",
        id: "wald",
        room: "kitchen",
        workers: 1.5,
      }),
    ).toBe(false);
    expect(
      isGameAction({ type: "demolish-room", id: "wald", room: "housing" }),
    ).toBe(false);
    expect(isGameAction({ type: "research", research: "free" })).toBe(false);
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "kitchen");
    s.colony.rooms.wald.kitchen!.workers = 3;
    expect(validateGame(s)).toBe(false);
    s.colony.rooms.wald.kitchen!.workers = 1;
    s.colony.rooms.wald.kitchen!.investedMagic = 999;
    expect(validateGame(s)).toBe(false);
  });
});
describe("Production, food and crystal accounting", () => {
  it("applies each research production effect without changing unrelated recipe inputs", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "pilz", "housing");
    build(s, "wald", "kitchen");
    build(s, "wald", "library");
    build(s, "pilz", "resonator");
    ok(s, { type: "recruit" });
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 1 });
    ok(s, { type: "assign", id: "wald", room: "library", workers: 1 });
    ok(s, { type: "assign", id: "pilz", room: "resonator", workers: 1 });
    const before = roomRates(s);
    s.colony.knowledge = 100;
    for (const research of ["kitchen", "library", "crystals"] as const)
      ok(s, { type: "research", research });
    const after = roomRates(s);
    expect(after.food).toBe(before.food);
    expect(after.knowledge).toBeCloseTo(before.knowledge * 1.25);
    expect(after.crystals).toBeCloseTo(before.crystals * 1.25);
    expect(after.magic).toBeCloseTo(before.magic - 0.1);
  });
  it("keeps resonance choices but suspends consumption after the last chamber is removed", () => {
    const s = playing();
    build(s, "pilz", "resonator");
    s.colony.crystals = 5;
    ok(s, { type: "resonance", id: "wald", mode: "strong" });
    expect(resonanceRates(s).cost).toBe(0.05);
    ok(s, {
      type: "demolish-room",
      id: "pilz",
      room: "resonator",
      confirmed: true,
    });
    stepGame(s);
    expect(s.colony.crystals).toBe(5);
    expect(s.colony.resonance.wald).toBe("strong");
    build(s, "pilz", "resonator");
    expect(resonanceRates(s).cost).toBe(0.05);
  });
  it("scales every production request equally when magic is scarce", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "kitchen");
    build(s, "wald", "library");
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 1 });
    ok(s, { type: "assign", id: "wald", room: "library", workers: 1 });
    s.magic = 0.03;
    const r = roomRates(s, 0.1);
    expect(r.fraction).toBeCloseTo(0.5);
    expect(r.food).toBeCloseTo(0.12);
    expect(r.knowledge).toBeCloseTo(0.025);
    runRooms(s, 0.1);
    expect(s.magic).toBeCloseTo(0);
    expect(s.colony.food).toBeCloseTo(10 - 0.004 + 0.012);
    expect(s.colony.knowledge).toBeCloseTo(0.0025);
  });
  it("shares the last storage space proportionally without consuming excess input", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "kitchen");
    build(s, "pilz", "kitchen");
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 1 });
    ok(s, { type: "assign", id: "pilz", room: "kitchen", workers: 1 });
    s.colony.food = 39.99;
    const r = roomRates(s, 0.1);
    expect(r.food).toBeCloseTo(0.1);
    expect(r.magic).toBeCloseTo((0.1 / 0.24) * 0.5);
    expect(r.flows[0].output).toBeCloseTo(r.flows[1].output);
    s.colony.food = 40;
    expect(roomRates(s).magic).toBe(0);
  });
  it("keeps each recipe ratio and food use over a simulation step", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "library");
    build(s, "pilz", "resonator");
    ok(s, { type: "assign", id: "wald", room: "library", workers: 1 });
    ok(s, { type: "assign", id: "pilz", room: "resonator", workers: 1 });
    const before = structuredClone(s);
    stepGame(s);
    expect(s.colony.knowledge).toBeCloseTo(0.005);
    expect(s.colony.crystals).toBeCloseTo(0.004);
    expect(s.magic - before.magic).toBeCloseTo(
      s.lifetimeMagic - before.lifetimeMagic - 0.05,
    );
    expect(s.colony.food).toBeCloseTo(9.996);
    expect(validateGame(s)).toBe(true);
  });
  it("starves gradually, keeps everyone alive and recovers when the kitchen is staffed", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "kitchen");
    s.colony.food = 0;
    stepGame(s, 25);
    expect(s.colony.supply).toBe(0);
    expect(s.colony.minions).toBe(2);
    expect(s.magic).toBeGreaterThan(900);
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 1 });
    stepGame(s, 30);
    expect(s.colony.supply).toBe(100);
    expect(s.colony.food).toBeGreaterThan(0);
    expect(s.colony.minions).toBe(2);
  });
  it("divides scarce crystals fairly and never reverses strain or affects the rival", () => {
    const s = playing();
    build(s, "pilz", "resonator");
    s.colony.crystals = 0.00325;
    ok(s, { type: "resonance", id: "wald", mode: "strong" });
    ok(s, { type: "resonance", id: "pilz", mode: "gentle" });
    const r = resonanceRates(s);
    expect(r.fraction).toBeCloseTo(0.5);
    expect(r.drift.wald).toBeCloseTo(0.15);
    expect(r.drift.pilz).toBeCloseTo(0.3);
    stepGame(s);
    expect(s.colony.crystals).toBeCloseTo(0);
    expect(s.towers.wald.instability).toBeCloseTo(0.015);
    expect(s.towers.pilz.instability).toBeCloseTo(0.03);
    expect(s.colony.stabilizedSeconds).toBeCloseTo(0.1);
    s.colony.crystals = 10;
    s.towers.wald.instability = 30;
    stepGame(s);
    expect(s.towers.wald.instability).toBeCloseTo(30);
    s.towers.wald.mode = "high";
    expect(resonanceRates(s).drift.wald).toBeCloseTo(0.5);
    s.towers.wald.mode = "rest";
    s.towers.pilz.mode = "rest";
    const stock = s.colony.crystals;
    stepGame(s);
    expect(s.colony.crystals).toBe(stock);
    expect(s.towers.wald.instability).toBeCloseTo(29.9);
  });
  it("does not double count contract deliveries or pay its reward twice with room production", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "library");
    ok(s, { type: "assign", id: "wald", room: "library", workers: 1 });
    s.hasCompletedRecovery = true;
    s.contract = {
      ...s.contract,
      phase: "active",
      number: 1,
      remaining: 60,
      allocation: 0.75,
      playerDelivered: 79.99,
    };
    const before = structuredClone(s);
    stepGame(s);
    expect(s.contract.lastResult?.winner).toBe("player");
    expect(s.magic - before.magic).toBeCloseTo(
      s.lifetimeMagic - before.lifetimeMagic - 0.01 - 0.01 + 160,
    );
    const previous = s.magic,
      lifetime = s.lifetimeMagic;
    stepGame(s);
    expect(s.magic - previous).toBeCloseTo(s.lifetimeMagic - lifetime - 0.01);
  });
  it("keeps the new economy identical across rendering rates and completely frozen in pause", () => {
    const s = playing();
    build(s, "wald", "housing");
    build(s, "wald", "kitchen");
    build(s, "pilz", "resonator");
    ok(s, { type: "assign", id: "wald", room: "kitchen", workers: 1 });
    ok(s, { type: "assign", id: "pilz", room: "resonator", workers: 1 });
    ok(s, { type: "resonance", id: "wald", mode: "strong" });
    const other = structuredClone(s);
    for (let i = 0; i < 600; i++) advanceMilliseconds(s, 100);
    for (let i = 0; i < 240; i++) advanceMilliseconds(other, 250);
    expect(s).toEqual(other);
    s.paused = true;
    const before = structuredClone(s);
    advanceMilliseconds(s, 3600000);
    expect(applyAction(s, { type: "recruit" }).ok).toBe(false);
    expect(applyAction(s, { type: "research", research: "space" }).ok).toBe(
      false,
    );
    expect(s).toEqual(before);
  });
});

it("finishes v0.2 through normal actions without gifted resources", () => {
  const s = newGame();
  s.paused = false;
  let changes = 0,
    waited = 0;
  function tick() {
    for (const id of TOWER_IDS) {
      const t = s.towers[id];
      if (!t.level || t.lock > 1e-8) continue;
      if (t.mode !== "rest" && t.instability >= 60) {
        ok(s, { type: "mode", id, mode: "rest" });
        changes++;
      } else if (
        (t.mode === "rest" && t.instability <= 20) ||
        (t.mode === "normal" && t.instability < 40)
      ) {
        ok(s, { type: "mode", id, mode: "high" });
        changes++;
      }
    }
    advanceMilliseconds(s, 100);
    waited++;
    if (waited > 36000) throw Error("Progress stalled");
  }
  function doWhenReady(a: GameAction) {
    while (!applyAction(s, a).ok) tick();
  }
  doWhenReady({ type: "activate", id: "wald" });
  doWhenReady({ type: "upgrade", id: "wald" });
  doWhenReady({ type: "build-room", id: "wald", room: "housing" });
  doWhenReady({ type: "build-room", id: "wald", room: "kitchen" });
  doWhenReady({ type: "assign", id: "wald", room: "kitchen", workers: 1 });
  doWhenReady({ type: "build-room", id: "wald", room: "library" });
  doWhenReady({ type: "assign", id: "wald", room: "library", workers: 1 });
  doWhenReady({ type: "activate", id: "pilz" });
  doWhenReady({ type: "build-room", id: "pilz", room: "housing" });
  doWhenReady({ type: "recruit" });
  doWhenReady({ type: "build-room", id: "pilz", room: "resonator" });
  doWhenReady({ type: "assign", id: "pilz", room: "resonator", workers: 1 });
  doWhenReady({ type: "resonance", id: "wald", mode: "gentle" });
  doWhenReady({ type: "research", research: "storage" });
  doWhenReady({ type: "activate", id: "blitz" });
  while (!introductionComplete(s)) tick();
  expect(validateGame(s)).toBe(true);
  expect(s.colony.supply).toBeGreaterThan(90);
  expect(s.colony.minions).toBe(3);
  expect(s.activeSeconds).toBeLessThan(3600);
  console.log(
    `v0.2 introduction: ${s.activeSeconds.toFixed(1)} active seconds; ${changes} mode changes; supply ${s.colony.supply.toFixed(1)}%; magic ${s.magic.toFixed(1)}; contracts ${s.contractsResolved}.`,
  );
});
