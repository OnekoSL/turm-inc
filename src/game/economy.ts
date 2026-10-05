import { message } from "../i18n";
import { DRIFT, towerDrift, roomElementFactor } from "./content";
import {
  TOWER_IDS,
  towerRecord,
  ROOM_IDS,
  type Colony,
  type RoomId,
  type ResearchId,
  type GameState,
  type GameAction,
  type ActionResult,
  type TowerId,
} from "./types";

export const ROOMS = {
  housing: { cost: 25, input: 0, output: 0, resource: null },
  kitchen: { cost: 25, input: 0.5, output: 0.2, resource: "food" },
  library: { cost: 40, input: 0.1, output: 0.05, resource: "knowledge" },
  resonator: { cost: 60, input: 0.4, output: 0.04, resource: "crystals" },
  storage: { cost: 30, input: 0, output: 0, resource: null },
} as const;
export const RESEARCH: Record<
  ResearchId,
  { magic: number; knowledge: number }
> = {
  storage: { knowledge: 10, magic: 30 },
  kitchen: { knowledge: 20, magic: 60 },
  library: { knowledge: 25, magic: 75 },
  crystals: { knowledge: 30, magic: 90 },
  space: { knowledge: 40, magic: 120 },
};
export const RESONANCE = {
  off: { cost: 0, reduction: 0 },
  gentle: { cost: 0.015, reduction: 0.2 },
  strong: { cost: 0.05, reduction: 0.5 },
};
export const FOOD_PER_MINION = 0.02;
export const RECRUIT_COST = 20;
const EPS = 1e-8;
export const newColony = (): Colony => ({
  food: 0,
  crystals: 0,
  knowledge: 0,
  minions: 0,
  supply: 100,
  settled: false,
  kitchenStaffed: false,
  stabilizedSeconds: 0,
  rooms: towerRecord(() => ({})),
  research: [],
  resonance: towerRecord(() => "off"),
});
export const hasResearch = (s: GameState, id: ResearchId) =>
  s.colony.research.includes(id);
export const roomSlots = (s: GameState) => (hasResearch(s, "space") ? 4 : 3);
export const roomLevel = (s: GameState, room: RoomId) =>
  TOWER_IDS.reduce((n, id) => n + (s.colony.rooms[id][room]?.level ?? 0), 0);
export const beds = (s: GameState) => roomLevel(s, "housing") * 2;
export const assignedWorkers = (s: GameState) =>
  TOWER_IDS.reduce(
    (n, id) =>
      n + Object.values(s.colony.rooms[id]).reduce((m, r) => m + r.workers, 0),
    0,
  );
export const freeWorkers = (s: GameState) =>
  s.colony.minions - assignedWorkers(s);
export const efficiency = (s: GameState) => 0.25 + 0.0075 * s.colony.supply;
export const capacities = (s: GameState) => {
  const level = roomLevel(s, "storage"),
    factor = hasResearch(s, "storage") ? 1.25 : 1;
  return {
    food: (40 + 60 * level) * factor,
    crystals: (20 + 30 * level) * factor,
  };
};
export function roomUnlocked(s: GameState, room: RoomId) {
  return (
    s.towers.wald.level >= 2 &&
    (room !== "library" || s.colony.settled) &&
    (room !== "resonator" || s.towers.pilz.level > 0)
  );
}
export function roomUpgradeCost(room: RoomId, level: number) {
  return {
    magic: Math.ceil(ROOMS[room].cost * (level === 1 ? 1.6 : 2.56)),
    knowledge: level === 1 ? 5 : 10,
  };
}
export function expansionComplete(s: GameState) {
  return (
    s.colony.minions >= 2 &&
    s.colony.kitchenStaffed &&
    s.colony.research.length > 0 &&
    s.colony.stabilizedSeconds >= 10 - EPS
  );
}
export function applyEconomyAction(
  s: GameState,
  a: GameAction,
): ActionResult | null {
  const fail = (
    key:
      | "economy.locked"
      | "economy.space"
      | "economy.cost"
      | "economy.workers"
      | "economy.invalid",
  ) => ({ ok: false, error: message(key) });
  const c = s.colony;
  const pay = (cost: { magic: number; knowledge: number }) => {
    if (s.magic + EPS < cost.magic || c.knowledge + EPS < cost.knowledge)
      return false;
    s.magic = Math.max(0, s.magic - cost.magic);
    c.knowledge = Math.max(0, c.knowledge - cost.knowledge);
    return true;
  };
  if (a.type === "recruit") {
    if (!c.settled || c.minions >= beds(s)) return fail("economy.space");
    if (!pay({ magic: RECRUIT_COST, knowledge: 0 }))
      return fail("economy.cost");
    c.minions++;
    return { ok: true };
  }
  if (a.type === "research") {
    if (!roomLevel(s, "library") || hasResearch(s, a.research))
      return fail("economy.locked");
    if (!pay(RESEARCH[a.research])) return fail("economy.cost");
    c.research.push(a.research);
    return { ok: true };
  }
  if (a.type === "resonance") {
    if (
      !s.towers[a.id].level ||
      (!roomLevel(s, "resonator") && a.mode !== "off")
    )
      return fail("economy.locked");
    c.resonance[a.id] = a.mode;
    return { ok: true };
  }
  if (
    !["build-room", "upgrade-room", "demolish-room", "assign"].includes(a.type)
  )
    return null;
  if (!("room" in a)) return fail("economy.invalid");
  if (!s.towers[a.id].level || !roomUnlocked(s, a.room))
    return fail("economy.locked");
  const rooms = c.rooms[a.id],
    room = rooms[a.room];
  if (a.type === "build-room") {
    if (room || Object.keys(rooms).length >= roomSlots(s))
      return fail("economy.space");
    if (!pay({ magic: ROOMS[a.room].cost, knowledge: 0 }))
      return fail("economy.cost");
    rooms[a.room] = { level: 1, workers: 0, investedMagic: ROOMS[a.room].cost };
    if (a.room === "housing" && !c.settled) {
      c.settled = true;
      c.minions = 2;
      c.food += 10;
    }
  } else {
    if (!room) return fail("economy.invalid");
    if (a.type === "upgrade-room") {
      if (room.level >= 3) return fail("economy.invalid");
      const cost = roomUpgradeCost(a.room, room.level);
      if (!pay(cost)) return fail("economy.cost");
      room.level++;
      room.investedMagic += cost.magic;
    } else if (a.type === "demolish-room") {
      if (a.confirmed !== true) return fail("economy.invalid");
      s.magic += room.investedMagic / 2;
      delete rooms[a.room];
    } else if (a.type === "assign") {
      if (
        !ROOMS[a.room].resource ||
        !Number.isInteger(a.workers) ||
        a.workers < 0 ||
        a.workers > room.level ||
        a.workers > room.workers + freeWorkers(s)
      )
        return fail("economy.workers");
      room.workers = a.workers;
      if (a.room === "kitchen" && a.workers > 0) c.kitchenStaffed = true;
    }
  }
  return { ok: true };
}

/** The same proportional budget is applied to every active tower, independent of iteration order. */
export function resonanceRates(s: GameState, seconds = 0.1) {
  const hasChamber = roomLevel(s, "resonator") > 0;
  const enabled = (id: TowerId) =>
    hasChamber && s.towers[id].level > 0 && s.towers[id].mode !== "rest";
  const requested = TOWER_IDS.reduce(
    (n, id) => n + (enabled(id) ? RESONANCE[s.colony.resonance[id]].cost : 0),
    0,
  );
  const fraction = requested
    ? Math.min(1, s.colony.crystals / (requested * seconds))
    : 0;
  const drift = Object.fromEntries(
    TOWER_IDS.map((id) => [
      id,
      s.towers[id].mode === "rest"
        ? towerDrift(id, "rest")
        : Math.max(
            0,
            DRIFT[s.towers[id].mode] -
              (enabled(id)
                ? RESONANCE[s.colony.resonance[id]].reduction * fraction
                : 0),
          ),
    ]),
  ) as Record<TowerId, number>;
  return { requested, cost: requested * fraction, fraction, drift };
}

export function roomRates(s: GameState, seconds = 0.1, magic = s.magic) {
  const cap = capacities(s),
    work = efficiency(s);
  const flows = TOWER_IDS.flatMap((id) =>
    ROOM_IDS.flatMap((room) => {
      const r = s.colony.rooms[id][room],
        def = ROOMS[room];
      if (!r || !def.resource || !r.workers) return [];
      const bonus =
        (room === "library" && hasResearch(s, "library")) ||
        (room === "resonator" && hasResearch(s, "crystals"))
          ? 1.25
          : 1;
      return [
        {
          id,
          room,
          resource: def.resource,
          input:
            def.input *
            r.workers *
            work *
            (room === "kitchen" && hasResearch(s, "kitchen") ? 0.8 : 1),
          output:
            def.output * r.workers * work * bonus * roomElementFactor(id, room),
        },
      ];
    }),
  );
  // Share remaining storage across rooms before sharing the available magic.
  for (const resource of ["food", "crystals"] as const) {
    const total = flows
      .filter((f) => f.resource === resource)
      .reduce((n, f) => n + f.output, 0);
    const fraction = total
      ? Math.min(
          1,
          Math.max(0, cap[resource] - s.colony[resource]) / (total * seconds),
        )
      : 0;
    for (const f of flows)
      if (f.resource === resource) {
        f.input *= fraction;
        f.output *= fraction;
      }
  }
  const requested = flows.reduce((n, f) => n + f.input, 0);
  const fraction = requested
    ? Math.min(1, Math.max(0, magic) / (requested * seconds))
    : 1;
  for (const f of flows) {
    f.input *= fraction;
    f.output *= fraction;
  }
  return {
    flows,
    magic: requested * fraction,
    fraction,
    food: flows
      .filter((f) => f.resource === "food")
      .reduce((n, f) => n + f.output, 0),
    knowledge: flows
      .filter((f) => f.resource === "knowledge")
      .reduce((n, f) => n + f.output, 0),
    crystals: flows
      .filter((f) => f.resource === "crystals")
      .reduce((n, f) => n + f.output, 0),
  };
}
export function runRooms(s: GameState, seconds: number) {
  const c = s.colony,
    need = c.minions * FOOD_PER_MINION * seconds,
    served = Math.min(c.food, need);
  c.food = Math.max(0, c.food - served);
  if (!c.minions) c.supply = 100;
  else
    c.supply = Math.max(
      0,
      Math.min(
        100,
        c.supply +
          (served >= need - EPS ? 5 : -5 * (1 - served / need)) * seconds,
      ),
    );
  const rates = roomRates(s, seconds);
  s.magic = Math.max(0, s.magic - rates.magic * seconds);
  c.food += rates.food * seconds;
  c.knowledge += rates.knowledge * seconds;
  c.crystals += rates.crystals * seconds;
}
export function economyPreview(s: GameState, gross: number) {
  const resonance = resonanceRates(s);
  const delivered =
    s.contract.phase === "active" ? gross * s.contract.allocation : 0;
  const next = {
    ...s,
    colony: {
      ...s.colony,
      food: Math.max(
        0,
        s.colony.food - s.colony.minions * FOOD_PER_MINION * 0.1,
      ),
      crystals: Math.max(0, s.colony.crystals - resonance.cost * 0.1),
    },
  };
  return {
    rooms: roomRates(next, 0.1, s.magic + (gross - delivered) * 0.1),
    resonance,
    delivered,
  };
}
