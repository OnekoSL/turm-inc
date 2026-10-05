import { de, type TranslationKey } from "./de";
import { en } from "./en";

export type Language = "de" | "en";
export const languages: Record<Language, { name: string; locale: string }> = {
  de: { name: "Deutsch", locale: "de-DE" },
  en: { name: "English", locale: "en-US" },
};
export type Message = {
  key: TranslationKey;
  params?: Record<string, string | number | Message>;
};
export type LocalizedText = string | Message;
export const message = (
  key: TranslationKey,
  params?: Message["params"],
): Message => (params ? { key, params } : { key });
export const isLanguage = (value: unknown): value is Language =>
  value === "de" || value === "en";
export const formatNumber = (language: Language, value: number) =>
  new Intl.NumberFormat(languages[language].locale, {
    maximumFractionDigits: 1,
  }).format(value);

export function translate(
  language: Language,
  key: TranslationKey,
  params?: Message["params"],
): string {
  const template = (language === "en" ? en : de)[key] ?? de[key];
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = params?.[name];
    return value === undefined
      ? token
      : typeof value === "number"
        ? formatNumber(language, value)
        : typeof value === "string"
          ? value
          : translate(language, value.key, value.params);
  });
}

/** Migrate the original German chronicle without changing economic state. Unknown text is retained. */
export function legacyMessage(text: string): LocalizedText {
  for (const [key, template] of Object.entries(de)) {
    if (template === text) return message(key as TranslationKey);
    if (!key.startsWith("log.")) continue;
    const names: string[] = [];
    const pattern = template
      .split(/(\{\w+\})/)
      .map((part) => {
        if (/^\{\w+\}$/.test(part)) {
          names.push(part.slice(1, -1));
          return "(.+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    const match = names.length ? text.match(new RegExp(`^${pattern}$`)) : null;
    if (match) {
      const params: NonNullable<Message["params"]> = {};
      names.forEach((name, i) => {
        const value = match[i + 1];
        params[name] =
          name === "tower"
            ? legacyMessage(value)
            : Number.isFinite(Number(value))
              ? Number(value)
              : value;
      });
      return message(key as TranslationKey, params);
    }
  }
  return text;
}
export function renderMessage(
  language: Language,
  value: LocalizedText,
): string {
  const ref = typeof value === "string" ? legacyMessage(value) : value;
  return typeof ref === "string"
    ? ref
    : translate(language, ref.key, ref.params);
}
export function validText(value: unknown, depth = 0): value is LocalizedText {
  if (typeof value === "string") return value.length <= 500;
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 3)
    return false;
  const v = value as Record<string, unknown>;
  if (typeof v.key !== "string" || !Object.hasOwn(de, v.key)) return false;
  if (v.params === undefined) return true;
  if (!v.params || typeof v.params !== "object" || Array.isArray(v.params))
    return false;
  const entries = Object.entries(v.params);
  return (
    entries.length <= 8 &&
    entries.every(
      ([key, item]) =>
        key.length <= 40 &&
        (typeof item === "number"
          ? Number.isFinite(item)
          : validText(item, depth + 1)),
    )
  );
}
export class LocalizedError extends Error {
  constructor(readonly text: Message) {
    super(renderMessage("de", text));
  }
}
export function errorMessage(error: unknown): Message {
  if (error instanceof LocalizedError) return error.text;
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "UNKNOWN";
  return message("error.storage", { code });
}
