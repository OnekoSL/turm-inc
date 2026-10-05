import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { isLanguage, type Language } from "../i18n";

/** Preferences are independent of the game, including recovery and new games. */
export class SettingsStore {
  readonly path: string;
  private invalid = false;
  constructor(readonly directory: string) {
    this.path = join(directory, "settings.json");
  }
  load(): Language {
    if (!existsSync(this.path)) return "de";
    try {
      const value: unknown = JSON.parse(readFileSync(this.path, "utf8"));
      if (
        value &&
        typeof value === "object" &&
        "version" in value &&
        value.version === 1 &&
        "language" in value &&
        isLanguage(value.language)
      )
        return value.language;
    } catch {
      /* Preserve an unreadable preference file on the next explicit change. */
    }
    this.invalid = true;
    return "de";
  }
  save(language: Language) {
    mkdirSync(this.directory, { recursive: true });
    const temporary = this.path + ".tmp";
    writeFileSync(temporary, JSON.stringify({ version: 1, language }), {
      encoding: "utf8",
      flush: true,
    });
    if (this.invalid && existsSync(this.path)) {
      renameSync(
        this.path,
        `${this.path}.archive-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
      );
      this.invalid = false;
    }
    renameSync(temporary, this.path);
  }
}
