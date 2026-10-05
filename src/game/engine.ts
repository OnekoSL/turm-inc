import {
  newColony,
  applyEconomyAction,
  expansionComplete,
  resonanceRates,
  runRooms,
} from "./economy";
import { message, isLanguage, type LocalizedText } from "../i18n";
import {
  CONTRACT,
  DRIFT,
  MAX_LEVEL,
  MODE_LOCK,
  CONTRACT_TIERS,
  nextContractRules,
  modeLock,
  ELEMENT_BALANCE,
  EXPANSION_PRICE,
  STEP_MS,
  TOWERS,
} from "./content";
import {
  MODES,
  ROOM_IDS,
  RESEARCH_IDS,
  RESONANCE_MODES,
  SHARES,
  TOWER_IDS,
  STARTER_IDS,
  NEW_TOWER_IDS,
  ELEMENT_IDS,
  towerRecord,
  type ActionResult,
  type GameAction,
  type GameState,
  type Mode,
  type Operation,
  type TowerId,
  type Winner,
} from "./types";

const EPS = 1e-8;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const operation = (mode: Mode = "normal"): Operation => ({
  mode,
  instability: 0,
  lock: 0,
  recoveryEligible: false,
});

export function newGame(): GameState {
  return {
    schemaVersion: 4,
    elementsUnlocked: false,
    colony: newColony(),
    balanceVersion: 2,
    magic: 0,
    lifetimeMagic: 0,
    activeSeconds: 0,
    remainderMs: 0,
    towers: towerRecord(() => ({ ...operation(), level: 0 })),
    selected: "wald",
    paused: true,
    pauseReason: message("pause.waiting"),
    hasCompletedRecovery: false,
    contractsResolved: 0,
    contract: {
      rules: { ...CONTRACT_TIERS[0] },
      phase: "locked",
      number: 0,
      remaining: 0,
      allocation: 0,
      playerDelivered: 0,
      rivalDelivered: 0,
      lastResult: null,
    },
    rival: { ...operation("rest"), allocation: 0, decisionIn: 5 },
    log: [{ time: 0, text: message("log.begin") }],
  };
}

export function addLog(s: GameState, text: LocalizedText) {
  s.log.unshift({ time: s.activeSeconds, text });
  s.log = s.log.slice(0, 8);
}
export const newTowerCount = (s: GameState) =>
  NEW_TOWER_IDS.filter((id) => s.towers[id].level > 0).length;
export const activationCost = (s: GameState, id: TowerId) =>
  (STARTER_IDS as readonly string[]).includes(id)
    ? TOWERS[id].activation
    : Math.ceil(
        EXPANSION_PRICE.base * EXPANSION_PRICE.growth ** newTowerCount(s) - EPS,
      );
export function unlocked(s: GameState, id: TowerId) {
  if (!(STARTER_IDS as readonly string[]).includes(id))
    return s.elementsUnlocked || introductionComplete(s);
  return (
    s.lifetimeMagic + EPS >= TOWERS[id].threshold &&
    (id !== "blitz" || s.towers.pilz.level > 0)
  );
}
export function upgradeCost(s: GameState, id: TowerId) {
  return Math.ceil(TOWERS[id].upgrade * 1.35 ** (s.towers[id].level - 1));
}
export function nominal(s: GameState, id: TowerId) {
  const level = s.towers[id].level;
  return level === 0
    ? 0
    : TOWERS[id].base *
        1.18 ** (level - 1) *
        (id === "wald" ? 1 + 0.25 * s.towers.pilz.level : 1) *
        (TOWERS[id].element === "fire" ? ELEMENT_BALANCE.fireOutput : 1);
}
export function factor(mode: Mode, instability: number) {
  if (mode === "rest") return 0.2;
  return mode === "high" ? 1.6 - 0.015 * instability : 1 - 0.0075 * instability;
}
export function production(s: GameState, id: TowerId) {
  return nominal(s, id) * factor(s.towers[id].mode, s.towers[id].instability);
}
export function totalProduction(s: GameState) {
  return TOWER_IDS.reduce((sum, id) => sum + production(s, id), 0);
}
export function introductionComplete(s: GameState) {
  return (
    STARTER_IDS.every((id) => s.towers[id].level > 0) &&
    s.hasCompletedRecovery &&
    s.contractsResolved > 0 &&
    expansionComplete(s)
  );
}

// The mode factor is linear until instability reaches a boundary, then constant.
// Integrating that piece exactly avoids frame-rate and threshold drift.
export function integratedProduction(
  op: Operation,
  base: number,
  seconds: number,
  drift = DRIFT[op.mode],
) {
  if (drift === 0) return base * factor(op.mode, op.instability) * seconds;
  const boundaryTime =
    drift > 0 ? (100 - op.instability) / drift : op.instability / -drift;
  const changing = Math.min(seconds, Math.max(0, boundaryTime));
  const endInstability = clamp(op.instability + drift * changing, 0, 100);
  return (
    base *
    ((factor(op.mode, op.instability) + factor(op.mode, endInstability)) *
      0.5 *
      changing +
      factor(op.mode, endInstability) * (seconds - changing))
  );
}
function integratedPlayer(
  s: GameState,
  seconds: number,
  drift: Record<TowerId, number>,
) {
  return TOWER_IDS.reduce(
    (sum, id) =>
      sum +
      integratedProduction(s.towers[id], nominal(s, id), seconds, drift[id]),
    0,
  );
}
function changeMode(op: Operation, mode: Mode, lock = MODE_LOCK) {
  op.mode = mode;
  op.lock = lock;
  op.recoveryEligible = mode === "rest" && op.instability >= 40 - EPS;
}

export function checkMilestones(s: GameState) {
  if (introductionComplete(s)) s.elementsUnlocked = true;
  if (
    s.contract.phase === "locked" &&
    s.towers.pilz.level > 0 &&
    s.hasCompletedRecovery
  ) {
    s.contract.phase = "preparing";
    s.contract.remaining = CONTRACT.preparation;
    s.contract.number = 1;
    addLog(s, message("log.rivalArrives"));
  }
}

export function applyAction(s: GameState, action: GameAction): ActionResult {
  if (action.type === "select") {
    s.selected = action.id;
    return { ok: true };
  }
  if (s.paused)
    return {
      ok: false,
      error: message("error.paused"),
    };
  const economyResult = applyEconomyAction(s, action);
  if (economyResult) {
    if (economyResult.ok) checkMilestones(s);
    return economyResult;
  }
  switch (action.type) {
    case "element-mode": {
      const changed: TowerId[] = [],
        skippedLocked: TowerId[] = [];
      for (const id of TOWER_IDS) {
        const t = s.towers[id];
        if (
          TOWERS[id].element !== action.element ||
          !t.level ||
          t.mode === action.mode
        )
          continue;
        if (t.lock > EPS) skippedLocked.push(id);
        else {
          changeMode(t, action.mode, modeLock(id));
          changed.push(id);
        }
      }
      checkMilestones(s);
      return { ok: true, changed, skippedLocked };
    }
    case "activate": {
      const t = s.towers[action.id];
      if (t.level > 0) return { ok: false, error: message("error.active") };
      if (!unlocked(s, action.id))
        return {
          ok: false,
          error: message("error.discovery"),
        };
      const cost = activationCost(s, action.id);
      if (s.magic + EPS < cost)
        return { ok: false, error: message("error.magic") };
      s.magic = Math.max(0, s.magic - cost);
      t.level = 1;
      addLog(s, message("log.awaken", { tower: TOWERS[action.id].name }));
      break;
    }
    case "upgrade": {
      const t = s.towers[action.id];
      if (!t.level || t.level >= MAX_LEVEL)
        return { ok: false, error: message("error.upgrade") };
      const cost = upgradeCost(s, action.id);
      if (s.magic + EPS < cost)
        return { ok: false, error: message("error.magic") };
      s.magic = Math.max(0, s.magic - cost);
      t.level++;
      addLog(
        s,
        message("log.upgrade", {
          tower: TOWERS[action.id].name,
          level: t.level,
        }),
      );
      break;
    }
    case "mode": {
      const t = s.towers[action.id];
      if (!t.level) return { ok: false, error: message("error.awaken") };
      if (t.mode === action.mode) return { ok: true };
      if (t.lock > EPS)
        return {
          ok: false,
          error: message("error.modeLock", { seconds: Math.ceil(t.lock) }),
        };
      changeMode(t, action.mode, modeLock(action.id));
      break;
    }
    case "allocation":
      if (s.contract.phase === "locked")
        return { ok: false, error: message("error.contract") };
      s.contract.allocation = action.share;
      break;
    default:
      return {
        ok: false,
        error: message("error.windowAction"),
      };
  }
  checkMilestones(s);
  return { ok: true };
}

export function isGameAction(value: unknown): value is GameAction {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (["resume", "pause", "retry-save", "new-game"].includes(String(v.type)))
    return true;
  if (v.type === "element-mode")
    return (
      ELEMENT_IDS.includes(v.element as never) &&
      MODES.includes(v.mode as never)
    );
  if (v.type === "recruit") return true;
  if (v.type === "research") return RESEARCH_IDS.includes(v.research as never);
  if (TOWER_IDS.includes(v.id as never)) {
    if (v.type === "resonance")
      return RESONANCE_MODES.includes(v.mode as never);
    if (ROOM_IDS.includes(v.room as never)) {
      if (["build-room", "upgrade-room"].includes(String(v.type))) return true;
      if (v.type === "demolish-room") return v.confirmed === true;
      if (v.type === "assign")
        return (
          typeof v.workers === "number" &&
          Number.isInteger(v.workers) &&
          v.workers >= 0 &&
          v.workers <= 3
        );
    }
  }
  if (v.type === "set-language") return isLanguage(v.language);
  if (v.type === "allocation") return SHARES.includes(v.share as never);
  if (!TOWER_IDS.includes(v.id as never)) return false;
  if (["activate", "upgrade", "select"].includes(String(v.type))) return true;
  return v.type === "mode" && MODES.includes(v.mode as never);
}

function decideRival(s: GameState) {
  const r = s.rival;
  let desired: Mode = r.mode;
  if (s.contract.phase !== "active") desired = "rest";
  else if (r.mode === "rest" && r.instability > 20 + EPS) desired = "rest";
  else if (r.instability >= 70 - EPS) desired = "rest";
  else if (r.mode === "high" && r.instability < 60 - EPS) desired = "high";
  else if (
    r.instability <= 40 + EPS &&
    s.contract.rivalDelivered < s.contract.playerDelivered - EPS
  )
    desired = "high";
  else desired = "normal";
  if (desired !== r.mode && r.lock <= EPS) {
    changeMode(r, desired);
    if (s.contract.phase === "active")
      addLog(
        s,
        desired === "high"
          ? message("log.rivalHigh")
          : desired === "rest"
            ? message("log.rivalRest")
            : message("log.rivalNormal"),
      );
  }
  r.allocation =
    s.contract.phase !== "active"
      ? 0
      : r.mode === "high"
        ? 0.75
        : r.mode === "rest"
          ? 0.25
          : 0.5;
  r.decisionIn = 5;
}

function settleContract(s: GameState, winner: Winner) {
  const c = s.contract;
  const reward =
    winner === "player"
      ? c.rules.reward
      : winner === "tie"
        ? c.rules.reward / 2
        : 0;
  s.magic += reward;
  s.contractsResolved++;
  c.lastResult = {
    number: c.number,
    rules: { ...c.rules },
    winner,
    playerDelivered: Math.min(c.rules.target, c.playerDelivered),
    rivalDelivered: Math.min(c.rules.target, c.rivalDelivered),
    reward,
  };
  c.phase = "cooldown";
  c.remaining = CONTRACT.cooldown;
  c.allocation = 0;
  addLog(
    s,
    winner === "player"
      ? message("log.win", { reward })
      : winner === "tie"
        ? message("log.tie", { reward })
        : winner === "rival"
          ? message("log.loss")
          : message("log.expired"),
  );
  decideRival(s);
}
function startContract(s: GameState) {
  const c = s.contract;
  if (c.phase === "cooldown") c.number++;
  c.rules = { ...nextContractRules(s) };
  c.phase = "active";
  c.remaining = CONTRACT.duration;
  c.playerDelivered = 0;
  c.rivalDelivered = 0;
  addLog(
    s,
    message("log.contract", {
      number: c.number,
      target: c.rules.target,
      reward: c.rules.reward,
    }),
  );
  decideRival(s);
}
function progressOperation(
  op: Operation,
  seconds: number,
  drift = DRIFT[op.mode],
) {
  op.instability = clamp(op.instability + drift * seconds, 0, 100);
  op.lock = Math.max(0, op.lock - seconds);
  if (op.lock < EPS) op.lock = 0;
}
function timeToDelivery(
  amount: number,
  seconds: number,
  delivered: (time: number) => number,
) {
  if (amount <= EPS) return 0;
  if (delivered(seconds) < amount - EPS) return Infinity;
  let lo = 0,
    hi = seconds;
  for (let i = 0; i < 45; i++) {
    const mid = (lo + hi) / 2;
    if (delivered(mid) < amount) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** One simulation step, with exact internal event boundaries. UI frame rate is irrelevant. */
export function stepGame(s: GameState, seconds = STEP_MS / 1000) {
  if (s.paused || seconds <= 0) return;
  checkMilestones(s);
  let remaining = seconds;
  while (remaining > EPS) {
    const c = s.contract;
    const hasRival = c.phase !== "locked";
    if (hasRival && rZero(s.rival.decisionIn)) decideRival(s);
    if (c.phase !== "locked" && c.remaining <= EPS) {
      if (c.phase === "active") settleContract(s, "expired");
      else startContract(s);
      continue;
    }
    let duration = Math.min(
      remaining,
      STEP_MS / 1000,
      hasRival ? s.rival.decisionIn : Infinity,
      hasRival ? c.remaining : Infinity,
    );
    const resonance = resonanceRates(s, duration);
    let playerHit = Infinity,
      rivalHit = Infinity;
    const active = c.phase === "active";
    if (active) {
      playerHit = timeToDelivery(
        c.rules.target - c.playerDelivered,
        duration,
        (t) => integratedPlayer(s, t, resonance.drift) * c.allocation,
      );
      rivalHit = timeToDelivery(
        c.rules.target - c.rivalDelivered,
        duration,
        (t) =>
          integratedProduction(s.rival, c.rules.rivalBase, t) *
          s.rival.allocation,
      );
      duration = Math.min(duration, playerHit, rivalHit);
    }
    const generated = integratedPlayer(s, duration, resonance.drift);
    const delivered = active ? generated * c.allocation : 0;
    s.magic += generated - delivered;
    s.lifetimeMagic += generated;
    if (active) {
      c.playerDelivered += delivered;
      c.rivalDelivered +=
        integratedProduction(s.rival, c.rules.rivalBase, duration) *
        s.rival.allocation;
    }
    s.colony.crystals = Math.max(
      0,
      s.colony.crystals - resonance.cost * duration,
    );
    if (resonance.cost > 0)
      s.colony.stabilizedSeconds = Math.min(
        10,
        s.colony.stabilizedSeconds + duration,
      );
    runRooms(s, duration);
    for (const id of TOWER_IDS) {
      const t = s.towers[id];
      if (!t.level) continue;
      progressOperation(t, duration, resonance.drift[id]);
      if (
        !s.hasCompletedRecovery &&
        t.mode === "rest" &&
        t.recoveryEligible &&
        t.instability <= 20 + EPS
      ) {
        s.hasCompletedRecovery = true;
        addLog(s, message("log.recovery"));
      }
    }
    if (hasRival) {
      progressOperation(s.rival, duration);
      s.rival.decisionIn = Math.max(0, s.rival.decisionIn - duration);
      c.remaining = Math.max(0, c.remaining - duration);
    }
    s.activeSeconds += duration;
    remaining -= duration;
    if (active && (playerHit <= duration + EPS || rivalHit <= duration + EPS)) {
      settleContract(
        s,
        Math.abs(playerHit - rivalHit) <= EPS
          ? "tie"
          : playerHit < rivalHit
            ? "player"
            : "rival",
      );
    } else if (c.phase === "active" && c.remaining <= EPS)
      settleContract(s, "expired");
    checkMilestones(s);
  }
}
function rZero(value: number) {
  return value <= EPS;
}

export function advanceMilliseconds(s: GameState, ms: number) {
  if (s.paused || !Number.isFinite(ms) || ms <= 0) return;
  s.remainderMs += ms;
  while (s.remainderMs >= STEP_MS - EPS) {
    s.remainderMs = Math.max(0, s.remainderMs - STEP_MS);
    stepGame(s);
  }
}

export function nextObjective(s: GameState): {
  title: LocalizedText;
  description: LocalizedText;
  progress: number;
} {
  if (s.elementsUnlocked || introductionComplete(s))
    return {
      title: message("elements.goal", { count: newTowerCount(s) }),
      description: message(
        newTowerCount(s) === 6 ? "elements.complete" : "elements.goalHint",
        { cost: activationCost(s, "fels") },
      ),
      progress: newTowerCount(s) / 6,
    };
  if (!s.towers.wald.level)
    return {
      title: message("goal.awaken"),
      description: message("goal.awakenHint"),
      progress: 0,
    };
  if (s.towers.wald.level < 2)
    return {
      title: message("goal.interior"),
      description: message("goal.interiorHint"),
      progress: 0,
    };
  if (!s.colony.settled)
    return {
      title: message("goal.residents"),
      description: message("goal.residentsHint"),
      progress: 0,
    };
  if (!s.colony.kitchenStaffed)
    return {
      title: message("goal.kitchen"),
      description: message("goal.kitchenHint"),
      progress: 0,
    };
  if (!s.towers.pilz.level)
    return {
      title: message("goal.pilz"),
      description: message("goal.pilzHint", {
        amount: Math.floor(s.lifetimeMagic),
      }),
      progress: Math.min(1, s.lifetimeMagic / 100),
    };
  if (!s.hasCompletedRecovery)
    return {
      title: message("goal.recovery"),
      description: message("goal.recoveryHint"),
      progress: 0.4,
    };
  if (!s.towers.blitz.level)
    return {
      title: message("goal.blitz"),
      description: message("goal.blitzHint", {
        amount: Math.floor(s.lifetimeMagic),
      }),
      progress: Math.min(1, s.lifetimeMagic / 500),
    };
  if (!s.contractsResolved)
    return {
      title: message("goal.contract"),
      description: message("goal.contractHint"),
      progress: 0.8,
    };
  if (!s.colony.research.length)
    return {
      title: message("goal.research"),
      description: message("goal.researchHint"),
      progress: Math.min(1, s.colony.knowledge / 10),
    };
  if (s.colony.stabilizedSeconds < 10 - 1e-8)
    return {
      title: message("goal.resonance"),
      description: message("goal.resonanceHint"),
      progress: s.colony.stabilizedSeconds / 10,
    };
  return {
    title: message("goal.done"),
    description: message("goal.doneHint"),
    progress: 1,
  };
}
