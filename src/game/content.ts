import { message, type Message } from "../i18n";
import type {
  Mode,
  TowerId,
  ElementId,
  GameState,
  RoomId,
  ContractRules,
} from "./types";
export const TOWERS: Record<
  TowerId,
  {
    element: ElementId;
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
    element: "earth",
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
    element: "earth",
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
    element: "air",
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
  fels: {
    element: "earth",
    name: message("tower.fels.name"),
    region: message("tower.fels.region"),
    role: message("element.earth"),
    description: message("tower.fels.description"),
    image: "fels.webp",
    base: 6,
    activation: 600,
    upgrade: 100,
    threshold: 0,
    accent: "#c4ba9c",
  },
  eis: {
    element: "water",
    name: message("tower.eis.name"),
    region: message("tower.eis.region"),
    role: message("element.water"),
    description: message("tower.eis.description"),
    image: "eis.webp",
    base: 6,
    activation: 600,
    upgrade: 100,
    threshold: 0,
    accent: "#a4dced",
  },
  lava: {
    element: "fire",
    name: message("tower.lava.name"),
    region: message("tower.lava.region"),
    role: message("element.fire"),
    description: message("tower.lava.description"),
    image: "lava.webp",
    base: 6,
    activation: 600,
    upgrade: 100,
    threshold: 0,
    accent: "#f4a074",
  },
  wind: {
    element: "air",
    name: message("tower.wind.name"),
    region: message("tower.wind.region"),
    role: message("element.air"),
    description: message("tower.wind.description"),
    image: "wind.webp",
    base: 6,
    activation: 600,
    upgrade: 100,
    threshold: 0,
    accent: "#c4d8ed",
  },
  sonne: {
    element: "light",
    name: message("tower.sonne.name"),
    region: message("tower.sonne.region"),
    role: message("element.light"),
    description: message("tower.sonne.description"),
    image: "sonne.webp",
    base: 6,
    activation: 600,
    upgrade: 100,
    threshold: 0,
    accent: "#efda92",
  },
  mond: {
    element: "shadow",
    name: message("tower.mond.name"),
    region: message("tower.mond.region"),
    role: message("element.shadow"),
    description: message("tower.mond.description"),
    image: "mond.webp",
    base: 6,
    activation: 600,
    upgrade: 100,
    threshold: 0,
    accent: "#c3b4e8",
  },
};
export const MODE_LABELS: Record<Mode, Message> = {
  normal: message("mode.normal"),
  high: message("mode.high"),
  rest: message("mode.rest"),
};
export const DRIFT: Record<Mode, number> = { normal: 0.4, high: 1, rest: -1 };
export const CONTRACT = {
  duration: 180,
  preparation: 30,
  cooldown: 60,
};
export const MAX_LEVEL = 10;
export const MODE_LOCK = 15;
export const STEP_MS = 100;

export const ELEMENTS: Record<ElementId, { name: Message; bonus: Message }> =
  Object.fromEntries(
    ["earth", "water", "fire", "air", "light", "shadow"].map((id) => [
      id,
      {
        name: message(`element.${id}` as Message["key"]),
        bonus: message(`element.${id}Bonus` as Message["key"]),
      },
    ]),
  ) as Record<ElementId, { name: Message; bonus: Message }>;
export const ELEMENT_BALANCE = {
  roomOutput: 1.2,
  fireOutput: 1.2,
  waterRecovery: 1.2,
  airLock: 12,
};
export const EXPANSION_PRICE = { base: 600, growth: 1.6 };
export const CONTRACT_TIERS: readonly ContractRules[] = [
  { tier: 1, target: 80, reward: 160, rivalBase: 2 },
  { tier: 2, target: 240, reward: 480, rivalBase: 6 },
  { tier: 3, target: 480, reward: 960, rivalBase: 12 },
  { tier: 4, target: 800, reward: 1600, rivalBase: 20 },
];
export const rulesForCount = (count: number): ContractRules =>
  CONTRACT_TIERS[count >= 8 ? 3 : count >= 6 ? 2 : count >= 4 ? 1 : 0];
export const activeTowerCount = (s: GameState) =>
  Object.values(s.towers).filter((t) => t.level > 0).length;
export const nextContractRules = (s: GameState) =>
  rulesForCount(activeTowerCount(s));
export const modeLock = (id: TowerId) =>
  TOWERS[id].element === "air" ? ELEMENT_BALANCE.airLock : MODE_LOCK;
export const towerDrift = (id: TowerId, mode: Mode) =>
  mode === "rest" && TOWERS[id].element === "water"
    ? -ELEMENT_BALANCE.waterRecovery
    : DRIFT[mode];
export const roomElementFactor = (id: TowerId, room: RoomId) =>
  (room === "kitchen" && TOWERS[id].element === "earth") ||
  (room === "library" && TOWERS[id].element === "light") ||
  (room === "resonator" && TOWERS[id].element === "shadow")
    ? ELEMENT_BALANCE.roomOutput
    : 1;
