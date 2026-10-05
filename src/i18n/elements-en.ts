import type { elementsDE } from "./elements-de";
export const elementsEN = {
  "element.earth": "Earth",
  "element.earthBonus": "Kitchens: +20% food for the same magic input.",
  "element.water": "Water",
  "element.waterBonus": "Recovery: −1.2 instability/s.",
  "element.fire": "Fire",
  "element.fireBonus": "Nominal production: +20% magic.",
  "element.air": "Air",
  "element.airBonus": "Mode lock: 12 instead of 15 seconds.",
  "element.light": "Light",
  "element.lightBonus": "Libraries: +20% knowledge for the same magic input.",
  "element.shadow": "Shadow",
  "element.shadowBonus":
    "Resonance chambers: +20% crystals for the same magic input.",
  "tower.fels.name": "Stone Tower",
  "tower.fels.region": "Autumn Cliffs",
  "tower.fels.description":
    "Rooted in stone, this tower nourishes its residents.",
  "tower.eis.name": "Ice Tower",
  "tower.eis.region": "Frost Coast",
  "tower.eis.description":
    "Between snow and sea, strained magic recovers more quickly.",
  "tower.lava.name": "Lava Tower",
  "tower.lava.region": "Ember Cavern",
  "tower.lava.description":
    "Deep within the embers, every magical source grows stronger.",
  "tower.wind.name": "Wind Tower",
  "tower.wind.region": "Cloud Sea",
  "tower.wind.description":
    "Above the clouds, operations follow the shifting winds.",
  "tower.sonne.name": "Sun Tower",
  "tower.sonne.region": "Golden Horizon",
  "tower.sonne.description": "Warm light guides the work of its libraries.",
  "tower.mond.name": "Moon Tower",
  "tower.mond.region": "Silver Hillside",
  "tower.mond.description":
    "In quiet moonlight, the crystals of its resonance chambers flourish.",
  "elements.locked": "Available after completing the introduction.",
  "elements.price": "Awaken: {cost} magic",
  "elements.goal": "New towers: {count}/6",
  "elements.goalHint":
    "Choose your next element. The next awakening costs {cost} magic.",
  "elements.complete":
    "All nine towers are awake. Shape their rooms and keep your network in balance.",
  "elements.group": "Operation for {element}",
  "elements.groupHint":
    "Immediately affects available active towers of this element. Locked towers are skipped.",
  "elements.changed": "Changed: {towers}. Still locked: {locked}.",
  "elements.none": "none",
  "elements.tier": "Tier {tier} · Rival: {rate} magic/s nominal production",
  "elements.nextTier":
    "Next contract: tier {tier} · Target {target} · Reward {reward}",
  "elements.purchaseTier": "After awakening: next contract at tier {tier}.",
  "elements.result": "Contract target: {target} · Prize: {reward}",
} satisfies Record<keyof typeof elementsDE, string>;
