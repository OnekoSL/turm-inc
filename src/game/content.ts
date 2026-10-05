import { message, type Message } from "../i18n";
import type { Mode, TowerId } from "./types";
export const TOWERS: Record<
  TowerId,
  {
    name: Message;
    region: Message;
    role: Message;
    description: Message;
    image: string;
    base: number;
    activation: number;
    upgrade: number;
    threshold: number;
    accent: string;
  }
> = {
  wald: {
    name: message("tower.wald.name"),
    region: message("tower.wald.region"),
    role: message("tower.wald.role"),
    description: message("tower.wald.description"),
    image: "wald.webp",
    base: 1,
    activation: 0,
    upgrade: 10,
    threshold: 0,
    accent: "#b5ce9a",
  },
  pilz: {
    name: message("tower.pilz.name"),
    region: message("tower.pilz.region"),
    role: message("tower.pilz.role"),
    description: message("tower.pilz.description"),
    image: "pilz.webp",
    base: 0.5,
    activation: 75,
    upgrade: 25,
    threshold: 100,
    accent: "#cfafe8",
  },
  blitz: {
    name: message("tower.blitz.name"),
    region: message("tower.blitz.region"),
    role: message("tower.blitz.role"),
    description: message("tower.blitz.description"),
    image: "blitz.webp",
    base: 5,
    activation: 350,
    upgrade: 80,
    threshold: 500,
    accent: "#9dcaeb",
  },
};
export const MODE_LABELS: Record<Mode, Message> = {
  normal: message("mode.normal"),
  high: message("mode.high"),
  rest: message("mode.rest"),
};
export const DRIFT: Record<Mode, number> = { normal: 0.4, high: 1, rest: -1 };
export const CONTRACT = {
  target: 80,
  reward: 160,
  duration: 180,
  preparation: 30,
  cooldown: 60,
};
export const MAX_LEVEL = 10;
export const MODE_LOCK = 15;
export const RIVAL_BASE = 2;
export const STEP_MS = 100;
