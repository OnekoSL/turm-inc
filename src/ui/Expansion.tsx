import React, { useState } from "react";
import {
  BookOpen,
  Users,
  Gem,
  CookingPot,
  BedDouble,
  Package,
  X,
  FlaskConical,
} from "lucide-react";
import { translate, type Language, type Message } from "../i18n";
import {
  ROOM_IDS,
  RESEARCH_IDS,
  RESONANCE_MODES,
  type RoomId,
  type GameState,
  type GameAction,
  type TowerId,
} from "../game/types";
import {
  ROOMS,
  RESEARCH,
  roomSlots,
  roomUnlocked,
  roomUpgradeCost,
  roomLevel,
  capacities,
  beds,
  freeWorkers,
  efficiency,
  economyPreview,
  FOOD_PER_MINION,
} from "../game/economy";
import { totalProduction } from "../game/engine";

type Props = {
  s: GameState;
  language: Language;
  act: (a: GameAction) => Promise<void>;
};
const icons = {
  housing: BedDouble,
  kitchen: CookingPot,
  library: BookOpen,
  resonator: Gem,
  storage: Package,
};
function useText(language: Language) {
  const tr = (key: Message["key"], params?: Message["params"]) =>
    translate(language, key, params);
  const num = (n: number) =>
    new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US", {
      maximumFractionDigits: 3,
    }).format(n);
  return { tr, num };
}
export function ColonyBar({
  s,
  language,
  act,
  onResearch,
}: Props & { onResearch: () => void }) {
  const { tr, num } = useText(language),
    cap = capacities(s),
    preview = economyPreview(s, totalProduction(s)),
    c = s.colony;
  const net = {
    food: preview.rooms.food - c.minions * FOOD_PER_MINION,
    crystals: preview.rooms.crystals - preview.resonance.cost,
    knowledge: preview.rooms.knowledge,
  };
  return (
    <section className="colony-bar" aria-label={tr("room.title")}>
      <div className="colony-resources">
        {(["food", "crystals", "knowledge"] as const).map((key) => (
          <div className="colony-resource" key={key}>
            <span>{tr(`resource.${key}`)}</span>
            <strong data-testid={`stock-${key}`}>
              {num(c[key])}
              {key !== "knowledge" && <small> / {num(cap[key])}</small>}
            </strong>
            <span className={net[key] < 0 ? "warning-text" : ""}>
              {net[key] >= 0 ? "+" : ""}
              {num(net[key])}/s
            </span>
            {key !== "knowledge" && (
              <small>
                {c[key] > cap[key]
                  ? tr("resource.overflow")
                  : net[key] < -1e-8
                    ? tr("resource.runway", {
                        seconds: Math.floor(c[key] / -net[key]),
                      })
                    : tr("resource.stable")}
              </small>
            )}
          </div>
        ))}
        <div className="colony-population">
          <span>
            <Users size={15} /> {tr("resource.minions")}
          </span>
          <strong>
            {tr("resource.population", {
              total: c.minions,
              free: freeWorkers(s),
              beds: beds(s),
            })}
          </strong>
          <span>
            {tr("resource.supply")}: {num(c.supply)} % ·{" "}
            {tr("resource.work", { percent: Math.round(efficiency(s) * 100) })}
          </span>
          <button
            data-testid="recruit"
            disabled={
              s.paused || !c.settled || c.minions >= beds(s) || s.magic < 20
            }
            onClick={() => void act({ type: "recruit" })}
          >
            {tr("resource.recruit")}
          </button>
        </div>
        <button
          className="research-open"
          onClick={onResearch}
          disabled={s.paused}
        >
          <FlaskConical size={18} />
          {tr("research.title")}
          <small>{c.research.length} / 5</small>
        </button>
      </div>
      <div className="economy-notes">
        <span>
          {tr("resource.delivery", { rate: num(preview.delivered) })} ·{" "}
          {tr("resource.roomUse", { rate: num(preview.rooms.magic) })}
        </span>
        {c.minions > beds(s) && (
          <span className="warning-text">{tr("resource.overcrowded")}</span>
        )}
        {c.minions > 0 && c.supply < 99.9 && (
          <span className="warning-text">
            {tr(
              c.food < c.minions * FOOD_PER_MINION * 0.1
                ? "resource.shortage"
                : "resource.recovering",
            )}
          </span>
        )}
        {preview.rooms.fraction < 0.999 && (
          <span className="warning-text">{tr("resource.magicShortage")}</span>
        )}
      </div>
    </section>
  );
}
export function RoomsPanel({ s, language, act, id }: Props & { id: TowerId }) {
  const { tr, num } = useText(language),
    [pending, setPending] = useState<RoomId | null>(null);
  const rooms = s.colony.rooms[id],
    used = Object.keys(rooms).length,
    preview = economyPreview(s, totalProduction(s));
  return (
    <div className="rooms-panel">
      <div className="section-heading">
        <span>{tr("room.title")}</span>
        <span>{tr("room.slots", { used, max: roomSlots(s) })}</span>
      </div>
      <p>{tr("room.free", { count: freeWorkers(s) })}</p>
      {used >= roomSlots(s) && (
        <p className="room-hint">{tr("room.noSlots")}</p>
      )}
      {ROOM_IDS.map((type) => {
        const room = rooms[type],
          def = ROOMS[type],
          Icon = icons[type],
          available = s.towers[id].level > 0 && roomUnlocked(s, type);
        const cost = room
          ? roomUpgradeCost(type, room.level)
          : { magic: def.cost, knowledge: 0 };
        const flow = preview.rooms.flows.find(
          (f) => f.id === id && f.room === type,
        );
        const cap = capacities(s);
        return (
          <article
            className={`room-card ${room ? "built" : ""}`}
            key={type}
            data-testid={`room-${type}`}
          >
            <div className="room-title">
              <Icon size={18} />
              <h3>{tr(`room.${type}`)}</h3>
              {room && <small>{tr("room.level", { level: room.level })}</small>}
            </div>
            <p>{tr(`room.${type}Hint`)}</p>
            {!available && (
              <p className="warning-text">
                {tr(
                  s.towers.wald.level < 2 || !s.towers[id].level
                    ? "room.lockBase"
                    : type === "library"
                      ? "room.lockLibrary"
                      : "room.lockResonator",
                )}
              </p>
            )}
            {room && def.resource && (
              <>
                <label className="worker-control">
                  <span>{tr("room.workers")}</span>
                  <select
                    data-testid={`workers-${type}`}
                    aria-label={tr("room.assignLabel", {
                      room: tr(`room.${type}`),
                    })}
                    value={room.workers}
                    disabled={s.paused}
                    onChange={(e) =>
                      void act({
                        type: "assign",
                        id,
                        room: type,
                        workers: Number(e.target.value),
                      })
                    }
                  >
                    {Array.from({ length: room.level + 1 }, (_, workers) => (
                      <option
                        key={workers}
                        value={workers}
                        disabled={workers > room.workers + freeWorkers(s)}
                      >
                        {tr("room.workerCount", { count: workers })}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="room-flow">
                  {tr("room.flow", {
                    input: num(flow?.input ?? 0),
                    output: num(flow?.output ?? 0),
                    resource: tr(`resource.${def.resource}`),
                  })}
                </p>
                {!room.workers && <p>{tr("room.unstaffed")}</p>}
                {def.resource !== "knowledge" &&
                  s.colony[def.resource] >= cap[def.resource] && (
                    <p>{tr("room.full")}</p>
                  )}
              </>
            )}
            {(!room || room.level < 3) && (
              <>
                <small>{tr("room.cost", cost)}</small>
                <button
                  className="room-buy"
                  data-testid={`${room ? "upgrade" : "build"}-${type}`}
                  disabled={
                    s.paused ||
                    !available ||
                    (!room && used >= roomSlots(s)) ||
                    s.magic + 1e-8 < cost.magic ||
                    s.colony.knowledge + 1e-8 < cost.knowledge
                  }
                  onClick={() =>
                    void act({
                      type: room ? "upgrade-room" : "build-room",
                      id,
                      room: type,
                    })
                  }
                >
                  {tr(room ? "room.upgrade" : "room.build")}
                </button>
              </>
            )}
            {room && (
              <button
                className="demolish"
                disabled={s.paused}
                onClick={() => setPending(type)}
              >
                {tr("room.demolish")}
              </button>
            )}
            {pending === type && room && (
              <div
                className="demolition-confirm"
                role="group"
                aria-label={tr("room.confirmButton")}
              >
                <p>
                  {tr("room.confirm", {
                    room: tr(`room.${type}`),
                    refund: room.investedMagic / 2,
                  })}
                </p>
                <button
                  disabled={s.paused}
                  onClick={() => {
                    setPending(null);
                    void act({
                      type: "demolish-room",
                      id,
                      room: type,
                      confirmed: true,
                    });
                  }}
                >
                  {tr("room.confirmButton")}
                </button>
                <button onClick={() => setPending(null)}>
                  {tr("room.cancel")}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
export function ResonancePanel({
  s,
  language,
  act,
  id,
}: Props & { id: TowerId }) {
  const { tr, num } = useText(language),
    r = economyPreview(s, totalProduction(s)).resonance,
    unlocked = roomLevel(s, "resonator") > 0;
  return (
    <section className="resonance-panel">
      <h3>
        <Gem size={15} /> {tr("resonance.title")}
      </h3>
      <div className="resonance-options">
        {RESONANCE_MODES.map((mode) => (
          <button
            key={mode}
            data-testid={`resonance-${mode}`}
            aria-pressed={s.colony.resonance[id] === mode}
            disabled={
              s.paused || !s.towers[id].level || (!unlocked && mode !== "off")
            }
            onClick={() => void act({ type: "resonance", id, mode })}
          >
            {tr(`resonance.${mode}`)}
          </button>
        ))}
      </div>
      <p>{tr(unlocked ? "resonance.hint" : "resonance.locked")}</p>
      {unlocked && (
        <>
          <p>
            {tr("resonance.actual", {
              rate: num(r.cost),
              percent: Math.round(r.fraction * 100),
            })}
          </p>
          <p>{tr("resonance.drift", { rate: num(r.drift[id]) })}</p>
          {s.towers[id].mode === "rest" ? (
            <p>{tr("resonance.rest")}</p>
          ) : (
            r.requested > 0 &&
            r.fraction < 0.999 && (
              <p className="warning-text">{tr("resonance.waiting")}</p>
            )
          )}
        </>
      )}
    </section>
  );
}
export function ResearchPanel({
  s,
  language,
  act,
  onClose,
}: Props & { onClose: () => void }) {
  const { tr } = useText(language),
    available = roomLevel(s, "library") > 0;
  return (
    <div className="modal-scrim">
      <section
        className="help-card research-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-title"
      >
        <button
          autoFocus
          className="close-help icon-button"
          onClick={onClose}
          aria-label={tr("research.close")}
        >
          <X size={20} />
        </button>
        <h2 id="research-title">{tr("research.title")}</h2>
        <p>{tr("research.hint")}</p>
        <p>
          {tr("room.cost", { magic: s.magic, knowledge: s.colony.knowledge })}
        </p>
        {!available && <p>{tr("research.locked")}</p>}
        <div className="research-list">
          {RESEARCH_IDS.map((id) => {
            const done = s.colony.research.includes(id),
              cost = RESEARCH[id];
            return (
              <article key={id}>
                <div>
                  <h3>{tr(`research.${id}`)}</h3>
                  <p>{tr(`research.${id}Hint`)}</p>
                  <small>{tr("room.cost", cost)}</small>
                </div>
                <button
                  data-testid={`research-${id}`}
                  disabled={
                    !available ||
                    done ||
                    s.paused ||
                    s.magic + 1e-8 < cost.magic ||
                    s.colony.knowledge + 1e-8 < cost.knowledge
                  }
                  onClick={() => void act({ type: "research", research: id })}
                >
                  {tr(done ? "research.done" : "research.buy")}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
