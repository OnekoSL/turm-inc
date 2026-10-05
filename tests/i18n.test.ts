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
import { de } from "../src/i18n/de";
import { en } from "../src/i18n/en";
import {
  formatNumber,
  legacyMessage,
  message,
  renderMessage,
  validText,
} from "../src/i18n";
import { isGameAction, newGame } from "../src/game/engine";
import { SaveStore, validateGame } from "../src/persistence/store";
import { SettingsStore } from "../src/persistence/settings";

const dirs: string[] = [];
const temp = () => {
  const d = mkdtempSync(join(tmpdir(), "turm-i18n-test-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) {
    if (!d.startsWith(join(tmpdir(), "turm-i18n-test-")))
      throw new Error("Unsafe test path");
    rmSync(d, { recursive: true, force: true });
  }
});
describe("Language-independent presentation and saved games", () => {
  it("provides all translations with matching interpolation parameters", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
    for (const key of Object.keys(de) as (keyof typeof de)[]) {
      expect(en[key].trim()).not.toBe("");
      expect((en[key].match(/\{\w+\}/g) ?? []).sort()).toEqual(
        (de[key].match(/\{\w+\}/g) ?? []).sort(),
      );
    }
  });
  it("renders nested tower names and locale numbers without changing the event", () => {
    const event = message("log.upgrade", {
      tower: message("tower.pilz.name"),
      level: 3,
    });
    expect(renderMessage("de", event)).toBe("Pilzturm erreicht Stufe 3.");
    expect(renderMessage("en", event)).toBe("Mushroom Tower reaches level 3.");
    expect(formatNumber("de", 1234.5)).toBe("1.234,5");
    expect(formatNumber("en", 1234.5)).toBe("1,234.5");
    expect(event.params?.level).toBe(3);
  });
  it("migrates v1 German logs, keeps unknown text and preserves all game amounts", () => {
    const d = temp();
    const state = {
      ...newGame(),
      schemaVersion: 1,
      magic: 1234.5,
      activeSeconds: 91,
      pauseReason: "Dein Netzwerk wartet.",
      log: [
        { time: 90, text: "Waldturm erreicht Stufe 3." },
        { time: 80, text: "Auftrag 2: 80 Magie liefern. 160 Magie gewinnen." },
        { time: 70, text: "Historischer unbekannter Text" },
      ],
    };
    const original = JSON.stringify(state);
    writeFileSync(join(d, "spielstand.json"), original);
    const store = new SaveStore(d);
    const loaded = store.load();
    expect(loaded.blocked).toBe(false);
    expect(loaded.issue).toBeNull();
    expect(loaded.game).toMatchObject({
      schemaVersion: 2,
      magic: 1234.5,
      activeSeconds: 91,
    });
    expect(loaded.game?.towers).toEqual(state.towers);
    expect(renderMessage("en", loaded.game!.log[0].text)).toBe(
      "Forest Tower reaches level 3.",
    );
    expect(renderMessage("en", loaded.game!.log[1].text)).toContain(
      "Contract 2",
    );
    expect(loaded.game!.log[2].text).toBe("Historischer unbekannter Text");
    expect(readFileSync(store.path, "utf8")).toBe(original);
    store.save(loaded.game!);
    expect(readFileSync(store.backup, "utf8")).toBe(original);
    expect(store.load().game).toEqual(loaded.game);
  });
  it("rejects malformed localized saved events and unsupported IPC languages", () => {
    const s = newGame();
    (s.log[0] as any).text = { key: "missing.key" };
    expect(validateGame(s)).toBe(false);
    expect(validText({ key: "log.win", params: { reward: Infinity } })).toBe(
      false,
    );
    expect(validText({ key: "log.win", params: [] })).toBe(false);
    expect(isGameAction({ type: "set-language", language: "en" })).toBe(true);
    expect(isGameAction({ type: "set-language", language: "xx" })).toBe(false);
    expect(isGameAction({ type: "set-language" })).toBe(false);
  });
  it("recognizes old static and dynamic messages in both languages", () => {
    for (const text of [
      "Waldturm erwacht. Die Produktion beginnt.",
      "Auftrag gewonnen. +160 Magie.",
      "Gleichstand. +80 Magie.",
    ]) {
      expect(typeof legacyMessage(text)).toBe("object");
      expect(renderMessage("de", legacyMessage(text))).toBe(text);
      expect(renderMessage("en", legacyMessage(text))).not.toBe(text);
    }
  });
});
describe("Local language preference", () => {
  it("defaults to German and survives game resets and application restarts", () => {
    const d = temp();
    const settings = new SettingsStore(d);
    expect(settings.load()).toBe("de");
    settings.save("en");
    new SaveStore(d).save(newGame());
    const game = new SaveStore(d);
    game.acknowledgeRecovery(true);
    game.save(newGame());
    expect(new SettingsStore(d).load()).toBe("en");
  });
  it("preserves invalid preferences before saving an explicit choice", () => {
    const d = temp();
    const settings = new SettingsStore(d);
    writeFileSync(settings.path, "{broken");
    expect(settings.load()).toBe("de");
    expect(readFileSync(settings.path, "utf8")).toBe("{broken");
    settings.save("en");
    const archive = readdirSync(d).find((f) =>
      f.startsWith("settings.json.archive-"),
    )!;
    expect(readFileSync(join(d, archive), "utf8")).toBe("{broken");
    expect(new SettingsStore(d).load()).toBe("en");
  });
  it("surfaces preference write errors", () => {
    const d = temp();
    const file = join(d, "file");
    writeFileSync(file, "keep");
    expect(() => new SettingsStore(file).save("en")).toThrow();
    expect(readFileSync(file, "utf8")).toBe("keep");
  });
});
