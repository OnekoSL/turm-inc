import { legacyFixture } from "./legacy-fixture";
import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SaveStore, validateGame } from "../src/persistence/store";
import { newGame } from "../src/game/engine";

const directories: string[] = [];
function directory() {
  const d = mkdtempSync(join(tmpdir(), "turm-store-test-"));
  directories.push(d);
  return d;
}
afterEach(() => {
  for (const d of directories.splice(0)) {
    if (!d.startsWith(join(tmpdir(), "turm-store-test-")))
      throw new Error("Unsafe test path");
    rmSync(d, { recursive: true, force: true });
  }
});

describe("Lokaler Spielstand", () => {
  it("migrates v2 with every old economic value intact and no colony gifts", () => {
    const d = directory(),
      store = new SaveStore(d);
    const colony = newGame().colony;
    const old = legacyFixture(newGame(), 2);
    const legacy = {
      ...old,
      schemaVersion: 2,
      balanceVersion: 1,
      magic: 812.5,
      lifetimeMagic: 1200,
      activeSeconds: 600,
      hasCompletedRecovery: true,
      contractsResolved: 2,
    };
    legacy.towers.wald.level = 3;
    legacy.towers.pilz.level = 2;
    legacy.towers.blitz.level = 1;
    legacy.towers.wald.lock = 12.5;
    legacy.towers.wald.instability = 53;
    legacy.contract = {
      ...legacy.contract,
      phase: "cooldown",
      number: 2,
      remaining: 25,
    };
    const source = JSON.stringify(legacy);
    writeFileSync(store.path, source);
    const loaded = store.load();
    expect(loaded.blocked).toBe(false);
    expect(loaded.issue).toBeNull();
    const { colony: migrated, schemaVersion } = loaded.game!;
    expect(schemaVersion).toBe(4);
    expect(loaded.game).toMatchObject({
      magic: 812.5,
      lifetimeMagic: 1200,
      activeSeconds: 600,
      hasCompletedRecovery: true,
      contractsResolved: 2,
      balanceVersion: 2,
    });
    expect(loaded.game!.towers).toMatchObject(legacy.towers);
    expect(loaded.game!.contract).toMatchObject(legacy.contract);
    expect(migrated).toEqual(colony);
    expect(readFileSync(store.path, "utf8")).toBe(source);
    store.save(loaded.game!);
    expect(readFileSync(store.backup, "utf8")).toBe(source);
    expect(new SaveStore(d).load().game).toEqual(loaded.game);
  });
  it("round-trips without altering game time or awarding offline magic", () => {
    const store = new SaveStore(directory());
    const s = newGame();
    s.magic = 15;
    s.activeSeconds = 50;
    store.save(s);
    expect(new SaveStore(store.directory).load().game).toEqual(s);
  });
  it("keeps the preceding valid state as backup", () => {
    const store = new SaveStore(directory());
    const s = newGame();
    store.save(s);
    s.magic = 42;
    store.save(s);
    expect(JSON.parse(readFileSync(store.backup, "utf8")).magic).toBe(0);
    expect(store.load().game?.magic).toBe(42);
  });
  it("requires explicit acknowledgment before restoring a backup and preserves corruption", () => {
    const d = directory();
    const store = new SaveStore(d);
    const s = newGame();
    store.save(s);
    s.magic = 42;
    store.save(s);
    writeFileSync(store.path, "{broken");
    const recovered = new SaveStore(d);
    const loaded = recovered.load();
    expect(loaded.game?.magic).toBe(0);
    expect(loaded.issue).not.toBeNull();
    expect(() => recovered.save(loaded.game!)).toThrow();
    recovered.acknowledgeRecovery();
    recovered.save(loaded.game!);
    const archive = readdirSync(d).find((f) =>
      f.startsWith("spielstand.archiv-"),
    )!;
    expect(readFileSync(join(d, archive), "utf8")).toBe("{broken");
    expect(recovered.load().game?.magic).toBe(0);
  });
  it("blocks incompatible future versions rather than silently replacing them", () => {
    const store = new SaveStore(directory());
    writeFileSync(
      store.path,
      JSON.stringify({ ...newGame(), schemaVersion: 999 }),
    );
    const loaded = store.load();
    expect(loaded.blocked).toBe(true);
    expect(loaded.game).toBeNull();
    expect(() => store.save(newGame())).toThrow();
    expect(JSON.parse(readFileSync(store.path, "utf8")).schemaVersion).toBe(
      999,
    );
    store.acknowledgeRecovery(true);
    store.save(newGame());
    expect(store.load().blocked).toBe(false);
  });
  it("handles a corrupted primary without a backup as a visible blocked state", () => {
    const store = new SaveStore(directory());
    writeFileSync(store.path, "broken");
    expect(store.load()).toMatchObject({ blocked: true, game: null });
    expect(readFileSync(store.path, "utf8")).toBe("broken");
  });
  it("propagates write errors while leaving the primary intact", () => {
    const d = directory();
    const store = new SaveStore(d);
    const s = newGame();
    store.save(s);
    const original = readFileSync(store.path, "utf8");
    // A file in place of the target directory forces a real filesystem error.
    const badPath = join(d, "not-a-directory");
    writeFileSync(badPath, "");
    expect(() => new SaveStore(badPath).save(s)).toThrow();
    expect(readFileSync(store.path, "utf8")).toBe(original);
  });
  it.each([
    (s: any) => {
      s.magic = -1;
    },
    (s: any) => {
      s.towers.wald.level = 11;
    },
    (s: any) => {
      s.towers.wald.instability = NaN;
    },
    (s: any) => {
      s.rival.mode = "cheat";
    },
    (s: any) => {
      s.contract.allocation = 0.9;
    },
    (s: any) => {
      s.contract = null;
    },
  ])("rejects invalid stored data", (mutate) => {
    const s = newGame();
    mutate(s);
    expect(validateGame(s)).toBe(false);
  });
});
