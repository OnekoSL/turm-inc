export const expansionEN = {
  "resource.recovering":
    "Supply is recovering; work efficiency is rising again.",
  "economy.locked": "This expansion is not available yet.",
  "economy.space": "Not enough free room slots or beds.",
  "economy.cost": "Not enough magic or knowledge.",
  "economy.workers": "Not enough free minions or workplaces.",
  "economy.invalid": "This room action is not available.",
  "room.housing": "Living quarters",
  "room.kitchen": "Kitchen",
  "room.library": "Library",
  "room.resonator": "Resonance chamber",
  "room.storage": "Storage",
  "room.housingHint":
    "Two beds per level. Your first quarters welcome two minions and ten food, once only.",
  "room.kitchenHint":
    "Per worker: 0.5 magic/s → 0.2 food/s. Each minion needs 0.02 food/s.",
  "room.libraryHint":
    "Per worker: 0.1 magic/s → 0.05 knowledge/s. Knowledge funds permanent research.",
  "room.resonatorHint":
    "Per worker: 0.4 magic/s → 0.04 harmony crystals/s. Crystals reduce strain.",
  "room.storageHint":
    "Each level stores an additional 60 food and 30 crystals. No workers needed.",
  "room.lockBase": "Upgrade the Forest Tower to level 2 and awaken this tower.",
  "room.lockLibrary": "Build living quarters and welcome residents first.",
  "room.lockResonator": "Awaken the Mushroom Tower first.",
  "room.build": "Build",
  "room.upgrade": "Upgrade room",
  "room.demolish": "Demolish",
  "room.confirm":
    "Demolish {room}? Refund: {refund} magic. Knowledge stays spent. Workers become available; stocks and residents are retained.",
  "room.confirmButton": "Confirm demolition",
  "room.cancel": "Cancel",
  "room.level": "Level {level} / 3",
  "room.slots": "{used} / {max} room slots",
  "room.workers": "Work group",
  "room.assignLabel": "Work group: {room}",
  "room.workerCount": "{count} minions",
  "room.flow": "{input} magic/s → {output} {resource}/s",
  "room.full": "Storage limit reached: only newly available space is refilled.",
  "room.unstaffed": "Assign available minions to start production.",
  "room.free": "{count} minions available",
  "room.cost": "{magic} magic · {knowledge} knowledge",
  "room.noSlots":
    "All slots occupied. Research space planning or replace a room.",
  "room.title": "Interior expansion",
  "room.operationTab": "Operation",
  "room.roomsTab": "Rooms",
  "resource.food": "Food",
  "resource.crystals": "Harmony crystals",
  "resource.knowledge": "Knowledge",
  "resource.minions": "Minions",
  "resource.supply": "Supply",
  "resource.work": "Work efficiency: {percent}%",
  "resource.population": "{total} residents · {free} available · {beds} beds",
  "resource.recruit": "Recruit minion · 20 magic",
  "resource.overcrowded":
    "Housing shortage. Add beds before recruiting more minions.",
  "resource.shortage":
    "Food shortage: work efficiency falls as low as 25%. Staff a kitchen; minions stay.",
  "resource.magicShortage":
    "Not enough magic for all rooms. Their production is reduced proportionally.",
  "resource.overflow":
    "Over capacity: stocks are retained; further storage is paused.",
  "resource.runway": "Stock lasts another {seconds} s",
  "resource.stable": "Stock stable or growing",
  "resource.roomUse": "Rooms: −{rate} magic/s",
  "resource.delivery": "Delivery: −{rate} magic/s",
  "research.title": "Research",
  "research.hint":
    "One-time permanent improvements for the entire network. Choose any order.",
  "research.locked":
    "Build a library first. Assign minions to generate knowledge.",
  "research.buy": "Research",
  "research.done": "Researched",
  "research.close": "Close research",
  "research.storage": "Stock management",
  "research.storageHint": "Food and crystal capacity +25%.",
  "research.kitchen": "Kitchen organization",
  "research.kitchenHint": "Kitchen magic costs −20%.",
  "research.library": "Study methods",
  "research.libraryHint": "Knowledge output +25% at the same magic cost.",
  "research.crystals": "Crystal cultivation",
  "research.crystalsHint": "Crystal output +25% at the same magic cost.",
  "research.space": "Space planning",
  "research.spaceHint": "A fourth room slot in every tower.",
  "resonance.title": "Crystal stabilization",
  "resonance.off": "Off",
  "resonance.gentle": "Gentle",
  "resonance.strong": "Strong",
  "resonance.hint":
    "Gentle: 0.015 crystals/s, −0.2 strain/s. Strong: 0.05 crystals/s, −0.5 strain/s. Does not remove existing instability.",
  "resonance.locked": "Build a resonance chamber to unlock stabilization.",
  "resonance.actual": "Network use: {rate} crystals/s · Coverage: {percent}%",
  "resonance.drift": "Current strain increase: {rate}/s",
  "resonance.waiting":
    "No crystals available. Your setting is retained and uses new supply automatically.",
  "resonance.rest": "Recovery does not consume crystals.",
  "goal.interior": "Open your tower to residents",
  "goal.interiorHint":
    "Upgrade the Forest Tower to level 2. Interior expansion then becomes available under Rooms.",
  "goal.residents": "Create a home",
  "goal.residentsHint":
    "Build living quarters under Rooms. Two minions and ten food arrive once.",
  "goal.kitchen": "Feed your residents",
  "goal.kitchenHint":
    "Build a kitchen and assign at least one available minion.",
  "goal.research": "Discover new knowledge",
  "goal.researchHint":
    "Build and staff a library, then buy a research project. Stock management costs 10 knowledge and 30 magic.",
  "goal.resonance": "Let the crystals resonate",
  "goal.resonanceHint":
    "Staff a resonance chamber and enable crystal stabilization under Operation. Supply it with crystals for at least ten active seconds.",
  "help.expansionTitle": "Residents & rooms",
  "help.expansion":
    "Build rooms from Forest Tower level 2. Living quarters welcome residents; the kitchen feeds them. Assign available minions to the kitchen, library and resonance chamber. Without food, work slows down but nobody is lost.",
  "help.researchTitle": "Knowledge & resonance",
  "help.research":
    "Knowledge buys permanent research. Harmony crystals are consumed automatically when stabilization is enabled under Operation. Overdrive still builds strain; recovery remains important.",
} as const;
