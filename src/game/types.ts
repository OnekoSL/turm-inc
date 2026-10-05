import type { Language, LocalizedText } from "../i18n";
export const STARTER_IDS = ["wald", "pilz", "blitz"] as const;
export const NEW_TOWER_IDS = [
  "fels",
  "eis",
  "lava",
  "wind",
  "sonne",
  "mond",
] as const;
export const TOWER_IDS = [...STARTER_IDS, ...NEW_TOWER_IDS] as const;
export const ELEMENT_IDS = [
  "earth",
  "water",
  "fire",
  "air",
  "light",
  "shadow",
] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];
export interface ContractRules {
  rank: number | null; // null preserves a pre-rank contract during migration
  tier: number;
  target: number;
  reward: number;
  rivalBase: number;
}
export function towerRecord<T>(create: (id: TowerId) => T): Record<TowerId, T> {
  return Object.fromEntries(TOWER_IDS.map((id) => [id, create(id)])) as Record<
    TowerId,
    T
  >;
}
export type TowerId = (typeof TOWER_IDS)[number];
export const MODES = ["normal", "high", "rest"] as const;
export type Mode = (typeof MODES)[number];
export const SHARES = [0, 0.25, 0.5, 0.75] as const;
export type Share = (typeof SHARES)[number];
export const ROOM_IDS = [
  "housing",
  "kitchen",
  "library",
  "resonator",
  "storage",
] as const;
export type RoomId = (typeof ROOM_IDS)[number];
export const RESEARCH_IDS = [
  "storage",
  "kitchen",
  "library",
  "crystals",
  "space",
] as const;
export type ResearchId = (typeof RESEARCH_IDS)[number];
export const RESONANCE_MODES = ["off", "gentle", "strong"] as const;
export type ResonanceMode = (typeof RESONANCE_MODES)[number];
export interface RoomState {
  level: number;
  workers: number;
  investedMagic: number;
}
export interface Colony {
  food: number;
  crystals: number;
  knowledge: number;
  minions: number;
  supply: number;
  settled: boolean;
  kitchenStaffed: boolean;
  stabilizedSeconds: number;
  rooms: Record<TowerId, Partial<Record<RoomId, RoomState>>>;
  research: ResearchId[];
  resonance: Record<TowerId, ResonanceMode>;
}
export interface Operation {
  mode: Mode;
  instability: number;
  lock: number;
  recoveryEligible: boolean;
}
export interface TowerState extends Operation {
  level: number;
}
export type Winner = "player" | "rival" | "tie" | "expired";
export interface ContractResult {
  rules: ContractRules;
  number: number;
  winner: Winner;
  playerDelivered: number;
  rivalDelivered: number;
  reward: number;
}
export interface GameState {
  schemaVersion: 5;
  competitionRank: number;
  elementsUnlocked: boolean;
  colony: Colony;
  balanceVersion: 3;
  magic: number;
  lifetimeMagic: number;
  activeSeconds: number;
  remainderMs: number;
  towers: Record<TowerId, TowerState>;
  selected: TowerId;
  paused: boolean;
  pauseReason: LocalizedText;
  hasCompletedRecovery: boolean;
  contractsResolved: number;
  contract: {
    rules: ContractRules;
    phase: "locked" | "preparing" | "active" | "cooldown";
    number: number;
    remaining: number;
    allocation: Share;
    playerDelivered: number;
    rivalDelivered: number;
    lastResult: ContractResult | null;
  };
  rival: Operation & { allocation: Share; decisionIn: number };
  log: { time: number; text: LocalizedText }[];
}
export type GameAction =
  | { type: "element-mode"; element: ElementId; mode: Mode }
  | { type: "build-room" | "upgrade-room"; id: TowerId; room: RoomId }
  | { type: "demolish-room"; id: TowerId; room: RoomId; confirmed: true }
  | { type: "assign"; id: TowerId; room: RoomId; workers: number }
  | { type: "recruit" }
  | { type: "research"; research: ResearchId }
  | { type: "resonance"; id: TowerId; mode: ResonanceMode }
  | { type: "set-language"; language: Language }
  | { type: "activate"; id: TowerId }
  | { type: "upgrade"; id: TowerId }
  | { type: "select"; id: TowerId }
  | { type: "mode"; id: TowerId; mode: Mode }
  | { type: "allocation"; share: Share }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "retry-save" }
  | { type: "new-game" };
export interface Snapshot {
  language: Language;
  game: GameState;
  saveStatus: "saved" | "saving" | "error";
  saveMessage: LocalizedText;
  loadIssue: LocalizedText | null;
  loadBlocked: boolean;
}
export interface ActionResult {
  changed?: TowerId[];
  skippedLocked?: TowerId[];
  ok: boolean;
  error?: LocalizedText;
}
export interface DesktopAPI {
  snapshot(): Promise<Snapshot>;
  action(action: GameAction): Promise<ActionResult>;
  subscribe(callback: (snapshot: Snapshot) => void): () => void;
}
