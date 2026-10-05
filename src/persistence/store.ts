import { CONTRACT_TIERS } from "../game/content";
import { introductionComplete } from "../game/engine";
import { newColony, ROOMS, roomUpgradeCost } from "../game/economy";
import {
  LocalizedError,
  legacyMessage,
  validText,
  message,
  type LocalizedText,
} from "../i18n";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  MODES,
  SHARES,
  TOWER_IDS,
  STARTER_IDS,
  NEW_TOWER_IDS,
  ROOM_IDS,
  RESEARCH_IDS,
  RESONANCE_MODES,
  type GameState,
} from "../game/types";

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, max = 1e15): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const integer = (v: unknown, max = 1e9) =>
  number(v, max) && Number.isInteger(v);
const text = (v: unknown, max = 500) =>
  typeof v === "string" && v.length <= max;
function validOperation(v: unknown) {
  return (
    record(v) &&
    MODES.includes(v.mode as never) &&
    number(v.instability, 100) &&
    number(v.lock, 15.000001) &&
    typeof v.recoveryEligible === "boolean"
  );
}
function validColony(v: unknown, towers: unknown, legacy = false) {
  if (!record(v) || !record(towers) || !record(v.rooms) || !record(v.resonance))
    return false;
  if (
    !["food", "crystals", "knowledge", "stabilizedSeconds"].every((key) =>
      number(v[key]),
    ) ||
    !number(v.stabilizedSeconds, 10.000001) ||
    !number(v.supply, 100) ||
    !integer(v.minions, (legacy ? STARTER_IDS.length : TOWER_IDS.length) * 6) ||
    typeof v.settled !== "boolean" ||
    typeof v.kitchenStaffed !== "boolean"
  )
    return false;
  if (
    !Array.isArray(v.research) ||
    new Set(v.research).size !== v.research.length ||
    !v.research.every((x) => RESEARCH_IDS.includes(x))
  )
    return false;
  if (!v.settled && (v.minions !== 0 || v.kitchenStaffed)) return false;
  const ids = legacy ? STARTER_IDS : TOWER_IDS;
  if (
    Object.keys(v.rooms).length !== ids.length ||
    Object.keys(v.resonance).length !== ids.length
  )
    return false;
  let workers = 0;
  for (const id of legacy ? STARTER_IDS : TOWER_IDS) {
    const rooms = v.rooms[id],
      tower = towers[id];
    if (
      !record(rooms) ||
      !record(tower) ||
      !RESONANCE_MODES.includes(v.resonance[id] as never)
    )
      return false;
    if (
      Object.keys(rooms).length > (v.research.includes("space") ? 4 : 3) ||
      (!tower.level && Object.keys(rooms).length)
    )
      return false;
    for (const [key, r] of Object.entries(rooms)) {
      if (
        !ROOM_IDS.includes(key as never) ||
        !record(r) ||
        !integer(r.level, 3) ||
        r.level === 0 ||
        !integer(r.workers, r.level as number) ||
        !number(r.investedMagic)
      )
        return false;
      const type = key as (typeof ROOM_IDS)[number];
      if (!ROOMS[type].resource && r.workers !== 0) return false;
      let investment = ROOMS[type].cost;
      for (let level = 1; level < (r.level as number); level++)
        investment += roomUpgradeCost(type, level).magic;
      if (r.investedMagic !== investment) return false;
      workers += r.workers as number;
    }
  }
  return workers <= (v.minions as number);
}
function validRules(v: unknown) {
  return (
    record(v) &&
    CONTRACT_TIERS.some(
      (r) =>
        r.tier === v.tier &&
        r.target === v.target &&
        r.reward === v.reward &&
        r.rivalBase === v.rivalBase,
    )
  );
}
export function validateGame(value: unknown): value is GameState {
  return validateSchema(value, false);
}
function validateSchema(value: unknown, legacy: boolean): boolean {
  if (
    !record(value) ||
    value.schemaVersion !== (legacy ? 3 : 4) ||
    value.balanceVersion !== (legacy ? 1 : 2)
  )
    return false;
  const s = value;
  const ids = legacy ? STARTER_IDS : TOWER_IDS;
  if (!legacy && typeof s.elementsUnlocked !== "boolean") return false;
  if (!validColony(s.colony, s.towers, legacy)) return false;
  if (
    !number(s.magic) ||
    !number(s.lifetimeMagic) ||
    !number(s.activeSeconds) ||
    !number(s.remainderMs, 99.9999999)
  )
    return false;
  if (
    !record(s.towers) ||
    Object.keys(s.towers).length !== ids.length ||
    !ids.every((id) => {
      const t = (s.towers as Record<string, unknown>)[id];
      return validOperation(t) && record(t) && integer(t.level, 10);
    })
  )
    return false;
  if (
    !ids.includes(s.selected as never) ||
    typeof s.paused !== "boolean" ||
    !validText(s.pauseReason) ||
    typeof s.hasCompletedRecovery !== "boolean" ||
    !integer(s.contractsResolved)
  )
    return false;
  const c = s.contract;
  if (!record(c) || (!legacy && !validRules(c.rules))) return false;
  const rules = legacy
    ? CONTRACT_TIERS[0]
    : (c.rules as unknown as (typeof CONTRACT_TIERS)[number]);
  if (
    !record(c) ||
    !["locked", "preparing", "active", "cooldown"].includes(String(c.phase)) ||
    !integer(c.number) ||
    !number(c.remaining, 180.000001) ||
    !SHARES.includes(c.allocation as never) ||
    !number(c.playerDelivered, rules.target + 0.000001) ||
    !number(c.rivalDelivered, rules.target + 0.000001)
  )
    return false;
  if (
    c.phase === "locked" &&
    (c.number !== 0 || c.remaining !== 0 || c.allocation !== 0)
  )
    return false;
  if (
    c.phase !== "locked" &&
    (!s.hasCompletedRecovery ||
      (s.towers.pilz as Record<string, unknown>).level === 0 ||
      c.number === 0)
  )
    return false;
  if (c.lastResult !== null) {
    const r = c.lastResult;
    if (!record(r) || (!legacy && !validRules(r.rules))) return false;
    const resultRules = legacy
      ? CONTRACT_TIERS[0]
      : (r.rules as unknown as (typeof CONTRACT_TIERS)[number]);
    if (
      !record(r) ||
      !integer(r.number) ||
      !["player", "rival", "tie", "expired"].includes(String(r.winner)) ||
      !number(r.playerDelivered, resultRules.target + 0.000001) ||
      !number(r.rivalDelivered, resultRules.target + 0.000001) ||
      r.reward !==
        (r.winner === "player"
          ? resultRules.reward
          : r.winner === "tie"
            ? resultRules.reward / 2
            : 0)
    )
      return false;
  }
  const r = s.rival;
  if (
    !validOperation(r) ||
    !record(r) ||
    !SHARES.includes(r.allocation as never) ||
    !number(r.decisionIn, 5.000001)
  )
    return false;
  return (
    Array.isArray(s.log) &&
    s.log.length <= 8 &&
    s.log.every((e) => record(e) && number(e.time) && validText(e.text))
  );
}

export interface LoadResult {
  game: GameState | null;
  issue: LocalizedText | null;
  blocked: boolean;
}

export class SaveStore {
  readonly path: string;
  readonly backup: string;
  private preservePrimary = false;
  private blocked = false;
  constructor(readonly directory: string) {
    this.path = join(directory, "spielstand.json");
    this.backup = join(directory, "spielstand.backup.json");
  }
  private read(path: string): GameState {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (record(raw) && raw.schemaVersion === 1) {
      // Validate the old text representation before upgrading only presentation data.
      if (
        !text(raw.pauseReason) ||
        !Array.isArray(raw.log) ||
        !raw.log.every((e) => record(e) && text(e.text))
      )
        throw new LocalizedError(message("error.saveVersion"));
      raw.schemaVersion = 2;
      raw.pauseReason = legacyMessage(raw.pauseReason as string);
      raw.log = raw.log.map((e) => ({ ...e, text: legacyMessage(e.text) }));
    }
    if (record(raw) && raw.schemaVersion === 2) {
      raw.schemaVersion = 3;
      const colony = newColony();
      raw.colony = {
        ...colony,
        rooms: Object.fromEntries(STARTER_IDS.map((id) => [id, {}])),
        resonance: Object.fromEntries(STARTER_IDS.map((id) => [id, "off"])),
      };
    }
    if (record(raw) && raw.schemaVersion === 3) {
      if (!validateSchema(raw, true))
        throw new LocalizedError(message("error.saveVersion"));
      const migrated = raw as unknown as GameState;
      for (const id of NEW_TOWER_IDS) {
        migrated.towers[id] = {
          level: 0,
          mode: "normal",
          instability: 0,
          lock: 0,
          recoveryEligible: false,
        };
        migrated.colony.rooms[id] = {};
        migrated.colony.resonance[id] = "off";
      }
      migrated.contract.rules = { ...CONTRACT_TIERS[0] };
      if (migrated.contract.lastResult)
        migrated.contract.lastResult.rules = { ...CONTRACT_TIERS[0] };
      migrated.elementsUnlocked = introductionComplete(migrated);
      migrated.schemaVersion = 4;
      migrated.balanceVersion = 2;
      for (const entry of migrated.log) {
        if (typeof entry.text !== "string" && entry.text.key === "log.contract")
          entry.text.params = { target: 80, reward: 160, ...entry.text.params };
      }
    }
    if (!validateGame(raw))
      throw new LocalizedError(message("error.saveVersion"));
    return raw;
  }
  load(): LoadResult {
    if (!existsSync(this.path) && !existsSync(this.backup))
      return { game: null, issue: null, blocked: false };
    try {
      return { game: this.read(this.path), issue: null, blocked: false };
    } catch {
      this.preservePrimary = existsSync(this.path);
      try {
        const raw: unknown = JSON.parse(readFileSync(this.path, "utf8"));
        if (
          record(raw) &&
          (![1, 2, 3, 4].includes(raw.schemaVersion as number) ||
            raw.balanceVersion !== (raw.schemaVersion === 4 ? 2 : 1))
        ) {
          this.blocked = true;
          return {
            game: null,
            issue: message("load.version"),
            blocked: true,
          };
        }
      } catch {
        /* Corrupt JSON can be recovered from the backup. */
      }
      try {
        return {
          game: this.read(this.backup),
          issue: message("load.backup"),
          blocked: false,
        };
      } catch {
        this.blocked = true;
        return {
          game: null,
          issue: message("load.broken"),
          blocked: true,
        };
      }
    }
  }
  /** Called only after an explicit resume of recovery or confirmed new game. */
  acknowledgeRecovery(reset = false) {
    mkdirSync(this.directory, { recursive: true });
    const suffix =
      new Date().toISOString().replace(/[:.]/g, "-") +
      "-" +
      Math.random().toString(16).slice(2, 8);
    if ((this.preservePrimary || reset) && existsSync(this.path))
      renameSync(
        this.path,
        join(this.directory, `spielstand.archiv-${suffix}.json`),
      );
    if (reset && existsSync(this.backup))
      renameSync(
        this.backup,
        join(this.directory, `sicherung.archiv-${suffix}.json`),
      );
    this.preservePrimary = false;
    this.blocked = false;
  }
  save(game: GameState) {
    if (this.blocked || this.preservePrimary)
      throw new LocalizedError(message("error.recoveryConfirm"));
    if (!validateGame(game))
      throw new LocalizedError(message("error.saveInvalid"));
    mkdirSync(this.directory, { recursive: true });
    const temporary = this.path + ".tmp";
    writeFileSync(temporary, JSON.stringify(game, null, 2), {
      encoding: "utf8",
      flush: true,
    });
    if (existsSync(this.path)) {
      try {
        this.read(this.path);
        copyFileSync(this.path, this.backup);
      } catch (error) {
        // A valid primary must remain available if copying its backup fails.
        try {
          this.read(this.path);
        } catch {
          throw new LocalizedError(message("error.existingCorrupt"));
        }
        throw error;
      }
    }
    renameSync(temporary, this.path);
  }
}
