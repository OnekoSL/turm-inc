import { expect, it } from "vitest";
import {
  activationCost,
  advanceMilliseconds,
  applyAction,
  introductionComplete,
  newGame,
  newTowerCount,
} from "../src/game/engine";
import { TOWER_IDS, type GameAction, type TowerId } from "../src/game/types";
import { validateGame } from "../src/persistence/store";

const routes: {
  name: string;
  order: TowerId[];
  kitchen: TowerId;
  library: TowerId;
  resonator: TowerId;
}[] = [
  {
    name: "production-first-specialized",
    order: ["lava", "sonne", "mond", "eis", "wind", "fels"],
    kitchen: "fels",
    library: "sonne",
    resonator: "mond",
  },
  {
    name: "earth-first-specialized",
    order: ["fels", "eis", "wind", "mond", "sonne", "lava"],
    kitchen: "fels",
    library: "sonne",
    resonator: "mond",
  },
  {
    name: "reverse-order-mixed-rooms",
    order: ["mond", "sonne", "wind", "lava", "eis", "fels"],
    kitchen: "lava",
    library: "eis",
    resonator: "wind",
  },
];

it.each(routes)(
  "completes nine towers without gifts: $name",
  (route) => {
    const s = newGame();
    s.paused = false;
    let modeChanges = 0,
      longestWait = 0,
      orderStarted: number | null = null;
    const contractDurations: number[] = [],
      awakenings: { id: TowerId; time: number; cost: number }[] = [];
    function tick() {
      for (const id of TOWER_IDS) {
        const t = s.towers[id];
        if (!t.level || t.lock > 1e-8) continue;
        const mode =
          t.mode !== "rest" && t.instability >= 60
            ? "rest"
            : (t.mode === "rest" && t.instability <= 20) ||
                (t.mode === "normal" && t.instability < 40)
              ? "high"
              : null;
        if (mode) {
          expect(applyAction(s, { type: "mode", id, mode }).ok).toBe(true);
          modeChanges++;
        }
      }
      const phase = s.contract.phase,
        resolved = s.contractsResolved;
      advanceMilliseconds(s, 100);
      if (phase !== "active" && s.contract.phase === "active")
        orderStarted = s.activeSeconds;
      if (resolved !== s.contractsResolved && orderStarted !== null) {
        contractDurations.push(s.activeSeconds - orderStarted);
        orderStarted = null;
      }
      if (s.activeSeconds > 10000) throw Error(`Stalled: ${route.name}`);
    }
    let longestWaitAction: GameAction | null = null;
    function action(a: GameAction) {
      const started = s.activeSeconds;
      while (!applyAction(s, a).ok) tick();
      if (s.activeSeconds - started > longestWait) {longestWait = s.activeSeconds - started; longestWaitAction = a;}
    }
    action({ type: "activate", id: "wald" });
    action({ type: "upgrade", id: "wald" });
    action({ type: "build-room", id: "wald", room: "housing" });
    action({ type: "build-room", id: "wald", room: "kitchen" });
    action({ type: "assign", id: "wald", room: "kitchen", workers: 1 });
    action({ type: "build-room", id: "wald", room: "library" });
    action({ type: "assign", id: "wald", room: "library", workers: 1 });
    action({ type: "activate", id: "pilz" });
    action({ type: "build-room", id: "pilz", room: "housing" });
    action({ type: "recruit" });
    action({ type: "build-room", id: "pilz", room: "resonator" });
    action({ type: "assign", id: "pilz", room: "resonator", workers: 1 });
    action({ type: "resonance", id: "wald", mode: "gentle" });
    action({ type: "research", research: "storage" });
    action({ type: "activate", id: "blitz" });
    while (!introductionComplete(s)) tick();
    const intro = s.activeSeconds;
    for (const id of route.order) {
      const cost = activationCost(s, id);
      action({ type: "activate", id });
      awakenings.push({ id, time: Number(s.activeSeconds.toFixed(1)), cost });
    }
    const allTowersAt = s.activeSeconds;
    for (const [room, oldId, id] of [
      ["kitchen", "wald", route.kitchen],
      ["library", "wald", route.library],
      ["resonator", "pilz", route.resonator],
    ] as const) {
      action({ type: "build-room", id, room });
      action({ type: "assign", id: oldId, room, workers: 0 });
      action({ type: "assign", id, room, workers: 1 });
      action({ type: "demolish-room", id: oldId, room, confirmed: true });
    }
    action({ type: "research", research: "library" });
    action({ type: "research", research: "crystals" });
    const knowledge = s.colony.knowledge;
    // Same 10-minute comparison window and production workforce for each layout.
    const start = s.activeSeconds;
    const observationModeChanges = modeChanges;
    while (s.activeSeconds < start + 600 - 1e-8) tick();
    expect(newTowerCount(s)).toBe(6);
    expect(s.colony.supply).toBe(100);
    expect(validateGame(s)).toBe(true);
    expect(s.competitionRank).toBe(0);
    expect(s.contract.rules.rank).toBe(0);
    expect(s.colony.knowledge - knowledge).toBeCloseTo(
      route.library === "sonne" ? 45 : 37.5,
      5,
    );
    console.log(
      JSON.stringify({
        route: route.name,
        intro: Number(intro.toFixed(1)),
        allTowersAt: Number(allTowersAt.toFixed(1)),
        modeChanges,
        modeChangesIn600s: modeChanges - observationModeChanges,
        longestWaitAction,
        longestPurchaseWait: Number(longestWait.toFixed(1)),
        contracts: s.contractsResolved,
        meanContractSeconds: Number(
          (
            contractDurations.reduce((a, b) => a + b, 0) /
            contractDurations.length
          ).toFixed(1),
        ),
        knowledgeIn600s: Number((s.colony.knowledge - knowledge).toFixed(2)),
        supply: s.colony.supply,
        awakenings,
      }),
    );
  },
  30000,
);
