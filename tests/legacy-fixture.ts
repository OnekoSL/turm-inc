import { NEW_TOWER_IDS, STARTER_IDS, type GameState } from "../src/game/types";
export function legacyFixture(state: GameState, version = 3): any {
  const s: any = structuredClone(state);
  s.schemaVersion = version;
  s.balanceVersion = 1;
  delete s.competitionRank;
  if (version === 4) {
    s.balanceVersion = 2;
    delete s.contract.rules.rank;
    if (s.contract.lastResult) delete s.contract.lastResult.rules.rank;
    return s;
  }
  delete s.elementsUnlocked;
  for (const id of NEW_TOWER_IDS) {
    delete s.towers[id];
    delete s.colony.rooms[id];
    delete s.colony.resonance[id];
  }
  delete s.contract.rules;
  if (s.contract.lastResult) delete s.contract.lastResult.rules;
  if (version < 3) delete s.colony;
  return s;
}
