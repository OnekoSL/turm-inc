import type { Language, LocalizedText } from "../i18n";
export const TOWER_IDS = ["wald", "pilz", "blitz"] as const;
export type TowerId = (typeof TOWER_IDS)[number];
export const MODES = ["normal", "high", "rest"] as const;
export type Mode = (typeof MODES)[number];
export const SHARES = [0, 0.25, 0.5, 0.75] as const;
export type Share = (typeof SHARES)[number];
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
  number: number;
  winner: Winner;
  playerDelivered: number;
  rivalDelivered: number;
  reward: number;
}
export interface GameState {
  schemaVersion: 2;
  balanceVersion: 1;
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
  ok: boolean;
  error?: LocalizedText;
}
export interface DesktopAPI {
  snapshot(): Promise<Snapshot>;
  action(action: GameAction): Promise<ActionResult>;
  subscribe(callback: (snapshot: Snapshot) => void): () => void;
}
