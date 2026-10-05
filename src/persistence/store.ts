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
import { MODES, SHARES, TOWER_IDS, type GameState } from "../game/types";

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
export function validateGame(value: unknown): value is GameState {
  if (!record(value) || value.schemaVersion !== 2 || value.balanceVersion !== 1)
    return false;
  const s = value;
  if (
    !number(s.magic) ||
    !number(s.lifetimeMagic) ||
    !number(s.activeSeconds) ||
    !number(s.remainderMs, 99.9999999)
  )
    return false;
  if (
    !record(s.towers) ||
    !TOWER_IDS.every((id) => {
      const t = (s.towers as Record<string, unknown>)[id];
      return validOperation(t) && record(t) && integer(t.level, 10);
    })
  )
    return false;
  if (
    !TOWER_IDS.includes(s.selected as never) ||
    typeof s.paused !== "boolean" ||
    !validText(s.pauseReason) ||
    typeof s.hasCompletedRecovery !== "boolean" ||
    !integer(s.contractsResolved)
  )
    return false;
  const c = s.contract;
  if (
    !record(c) ||
    !["locked", "preparing", "active", "cooldown"].includes(String(c.phase)) ||
    !integer(c.number) ||
    !number(c.remaining, 180.000001) ||
    !SHARES.includes(c.allocation as never) ||
    !number(c.playerDelivered, 80.000001) ||
    !number(c.rivalDelivered, 80.000001)
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
    if (
      !record(r) ||
      !integer(r.number) ||
      !["player", "rival", "tie", "expired"].includes(String(r.winner)) ||
      !number(r.playerDelivered, 80.000001) ||
      !number(r.rivalDelivered, 80.000001) ||
      ![0, 80, 160].includes(r.reward as number)
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
          (![1, 2].includes(raw.schemaVersion as number) ||
            raw.balanceVersion !== 1)
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
