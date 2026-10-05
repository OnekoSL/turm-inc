import {
  ColonyBar,
  RoomsPanel,
  ResearchPanel,
  ResonancePanel,
} from "./Expansion";

import { economyPreview } from "../game/economy";

import {
  formatNumber,
  languages,
  message,
  renderMessage,
  translate,
  type Language,
  type LocalizedText,
  type Message,
} from "../i18n";

import React, { useEffect, useState } from "react";

import { createRoot } from "react-dom/client";

import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Crown,
  Flame,
  Leaf,
  Mountain,
  Snowflake,
  Sun,
  LockKeyhole,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Swords,
  Timer,
  TowerControl,
  TriangleAlert,
  Wind,
  X,
  Zap,
} from "lucide-react";

import {
  ELEMENTS,
  modeLock,
  nextContractRules,
  activeTowerCount,
  rulesForCount,
  MAX_LEVEL,
  MODE_LABELS,
  TOWERS,
} from "../game/content";

import {
  factor,
  activationCost,
  introductionComplete,
  nextObjective,
  nominal,
  production,
  totalProduction,
  unlocked,
  upgradeCost,
} from "../game/engine";

import {
  MODES,
  SHARES,
  TOWER_IDS,
  ELEMENT_IDS,
  STARTER_IDS,
  type DesktopAPI,
  type ActionResult,
  type GameAction,
  type GameState,
  type Snapshot,
  type TowerId,
} from "../game/types";

import "./styles.css";

declare global {
  interface Window {
    turm: DesktopAPI;
  }
}

const duration = (n: number) => {
  const rounded = Math.ceil(Math.max(0, n));

  return `${Math.floor(rounded / 60)}:${(rounded % 60).toString().padStart(2, "0")}`;
};

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

const icons = {
  wald: Leaf,
  pilz: Sprout,
  blitz: Zap,
  fels: Mountain,
  eis: Snowflake,
  lava: Flame,
  wind: Wind,
  sonne: Sun,
  mond: Moon,
};

const modeIcons = { normal: Wind, high: Flame, rest: Moon };

function Meter({
  value,

  max = 100,

  tone = "",

  label,
}: {
  value: number;

  max?: number;

  tone?: string;

  label: string;
}) {
  return (
    <div
      className={`meter ${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, value)}
    >
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const [notice, setNotice] = useState<ActionResult | null>(null);

  const [error, setError] = useState<LocalizedText>("");

  const language = snapshot?.language ?? "de";

  const tr = (key: Message["key"], params?: Message["params"]) =>
    translate(language, key, params);

  const render = (text: LocalizedText) => renderMessage(language, text);

  const num = (value: number) => formatNumber(language, value);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => setNotice(null), [snapshot?.game.selected]);
  const [help, setHelp] = useState(false);

  const [research, setResearch] = useState(false);

  const [tab, setTab] = useState<"operation" | "rooms">("operation");

  useEffect(() => {
    if (snapshot?.game.paused) setResearch(false);
  }, [snapshot?.game.paused]);

  useEffect(() => {
    let alive = true;

    const unsubscribe = window.turm.subscribe((value) => {
      if (alive) setSnapshot(value);
    });

    window.turm

      .snapshot()

      .then((value) => {
        if (alive) setSnapshot(value);
      })

      .catch(() => setError(message("error.connect")));

    return () => {
      alive = false;

      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!error) return;

    const timeout = setTimeout(() => setError(""), 7000);

    return () => clearTimeout(timeout);
  }, [error]);

  async function act(action: GameAction) {
    try {
      const result = await window.turm.action(action);

      if (!result.ok) setError(result.error ?? message("error.action"));
      else if (result.changed) setNotice(result);
    } catch {
      setError(message("error.connectionLost"));
    }
  }

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (research) setResearch(false);
      else if (help) setHelp(false);
      else void act({ type: "pause" });
    };

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [help, research]);

  useEffect(() => {
    if (!snapshot?.game.paused && !help && !research) return;

    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const dialog = document.querySelector('[role="dialog"]');

      const buttons = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), select:not(:disabled)",
        ) ?? [],
      );

      const first = buttons[0],
        last = buttons.at(-1);

      if (!first || !last) return;

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();

        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();

        first.focus();
      }
    };

    document.addEventListener("keydown", trap);

    return () => document.removeEventListener("keydown", trap);
  }, [snapshot?.game.paused, help, research]);

  if (!snapshot)
    return (
      <main className="loading">
        <TowerControl size={40} />

        <h1>Turm INC</h1>

        <p>{error ? render(error) : tr("ui.loading")}</p>
      </main>
    );

  const s = snapshot.game;

  const id = s.selected;

  const def = TOWERS[id];

  const t = s.towers[id];

  const gross = totalProduction(s);

  const economy = economyPreview(s, gross);

  const assigned =
    s.contract.phase === "active" ? gross * s.contract.allocation : 0;

  const goal = nextObjective(s);

  const activeCount = TOWER_IDS.filter((key) => s.towers[key].level > 0).length;

  const economyDisabled = s.paused;

  const discovered = unlocked(s, id);

  const cost = t.level ? upgradeCost(s, id) : activationCost(s, id);

  const canBuy =
    !economyDisabled &&
    discovered &&
    t.level < MAX_LEVEL &&
    s.magic + 1e-8 >= cost;

  const upgradePreview = structuredClone(s);

  if (t.level > 0 && t.level < MAX_LEVEL) upgradePreview.towers[id].level++;

  const gain = totalProduction(upgradePreview) - gross;

  const poor = t.instability >= 70;

  const recovery = t.mode === "rest";

  return (
    <div
      className={`app ${s.paused ? "is-paused" : ""}`}
      style={{ "--accent": def.accent } as React.CSSProperties}
    >
      <header className="topbar" inert={s.paused || help || research}>
        <div className="brand">
          <span className="brand-mark">
            <TowerControl size={25} strokeWidth={1.3} />
          </span>

          <div>
            <strong>
              TURM <em>INC</em>
            </strong>

            <small>{tr("brand.tagline")}</small>
          </div>
        </div>

        <div className="resources">
          <div className="resource primary">
            <Sparkles size={18} />

            <div>
              <span>{tr("ui.magic")}</span>

              <strong data-testid="magic">{num(s.magic)}</strong>
            </div>
          </div>

          <div className="resource">
            <Wind size={17} />

            <div>
              <span>{tr("ui.production")}</span>

              <strong>
                {num(gross)} <small>/ s</small>
              </strong>
            </div>
          </div>

          <div className="resource income">
            <ArrowUpRight size={18} />

            <div>
              <span>{tr("ui.income")}</span>

              <strong>
                {gross - assigned - economy.rooms.magic >= 0 ? "+" : ""}
                {num(gross - assigned - economy.rooms.magic)} <small>/ s</small>
              </strong>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <LanguageSelector language={language} act={act} />

          <button
            className="icon-button"
            aria-label={tr("ui.helpOpen")}
            title={tr("ui.helpTitle")}
            onClick={() => {
              setHelp(true);

              void act({ type: "pause" });
            }}
          >
            <CircleHelp size={19} />
          </button>

          <button
            className="pause-button"
            onClick={() => void act({ type: "pause" })}
          >
            <Pause size={15} /> {tr("ui.pause")}
          </button>
        </div>
      </header>

      <div inert={s.paused || help || research}>
        <ColonyBar
          s={s}
          language={language}
          act={act}
          onResearch={() => setResearch(true)}
        />
      </div>

      <main className="game-layout" inert={s.paused || help || research}>
        <aside className="tower-rail" aria-label={tr("ui.towers")}>
          <div className="section-heading">
            <span>{tr("ui.network")}</span>

            <small>
              {activeCount} / {TOWER_IDS.length}
            </small>
          </div>

          <nav>
            {ELEMENT_IDS.map((element) => (
              <details className="element-group" key={element} open>
                <summary data-testid={`element-${element}`}>
                  {render(ELEMENTS[element].name)}{" "}
                  <span>
                    {
                      TOWER_IDS.filter(
                        (key) =>
                          TOWERS[key].element === element &&
                          s.towers[key].level > 0,
                      ).length
                    }
                    /
                    {
                      TOWER_IDS.filter((key) => TOWERS[key].element === element)
                        .length
                    }
                  </span>
                </summary>

                {TOWER_IDS.filter((key) => TOWERS[key].element === element).map(
                  (key) => {
                    const index = TOWER_IDS.indexOf(key);

                    const td = TOWERS[key],
                      ts = s.towers[key],
                      Icon = icons[key];

                    const isUnlocked = unlocked(s, key);

                    return (
                      <button
                        key={key}
                        className={`tower-card ${key === id ? "selected" : ""} ${ts.level ? "" : "dormant"}`}
                        onClick={() => void act({ type: "select", id: key })}
                        aria-pressed={id === key}
                        data-testid={`select-${key}`}
                      >
                        <div className="tower-thumb">
                          <img src={asset(td.image)} alt="" />

                          <span className="tower-number">0{index + 1}</span>

                          {!ts.level && (
                            <span className="lock-badge">
                              {isUnlocked ? (
                                <Sparkles size={13} />
                              ) : (
                                <LockKeyhole size={13} />
                              )}
                            </span>
                          )}
                        </div>

                        <div className="tower-card-info">
                          <div className="tower-title">
                            <strong>{render(td.name)}</strong>

                            <Icon size={14} />
                          </div>

                          <p>
                            {ts.level
                              ? tr("ui.towerLevel", {
                                  level: ts.level,

                                  rate: production(s, key),
                                })
                              : isUnlocked
                                ? tr("elements.price", {
                                    cost: activationCost(s, key),
                                  })
                                : (STARTER_IDS as readonly string[]).includes(
                                      key,
                                    )
                                  ? tr("ui.discover", { amount: td.threshold })
                                  : tr("elements.locked")}
                          </p>

                          <small className="element-card-bonus">
                            {render(ELEMENTS[td.element].bonus)}
                          </small>

                          {ts.level > 0 && (
                            <>
                              <Meter
                                value={ts.instability}
                                tone={
                                  ts.instability >= 70
                                    ? "danger"
                                    : ts.mode === "rest"
                                      ? "calm"
                                      : ""
                                }
                                label={tr("ui.towerInstability", {
                                  tower: td.name,
                                })}
                              />

                              <span className="tower-state">
                                {render(MODE_LABELS[ts.mode])}{" "}
                                <span>
                                  {Math.round(ts.instability)} %{" "}
                                  {ts.lock > 0 && `· ${Math.ceil(ts.lock)}s`}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </details>
            ))}
          </nav>

          <div className="rail-note">
            <span className="tiny-stars">✦ · ✧</span>

            <p>{tr("ui.railNote")}</p>

            <span>{tr("ui.created", { amount: s.lifetimeMagic })}</span>
          </div>
        </aside>

        <section
          className="scene"
          aria-label={tr("ui.sceneLabel", { tower: def.name })}
        >
          <img
            className="scene-backdrop"
            src={asset(def.image)}
            alt=""
            aria-hidden="true"
          />

          <img
            className="scene-image"
            src={asset(def.image)}
            alt={tr("ui.sceneAlt", { tower: def.name })}
            key={id}
          />

          <div className="scene-shade" />

          {t.level > 0 && (
            <div className="particles" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </div>
          )}

          <div className="scene-top">
            <span className="location">
              <span className="dot" />

              {render(def.region)}
            </span>

            <span className="scene-chapter">
              {tr("ui.towerNumber", {
                number: `0${TOWER_IDS.indexOf(id) + 1}`,
              })}
            </span>
          </div>

          <div className="scene-bottom">
            <div className="scene-eyebrow">
              {t.level
                ? tr("ui.awakened", { level: t.level })
                : discovered
                  ? tr("ui.newConnection")
                  : tr("ui.beyond")}
            </div>

            <h1>{render(def.name)}</h1>

            <p>{render(def.description)}</p>

            <div className="scene-divider" />

            <div className="scene-foot">
              <span>{render(def.role)}</span>

              <span>✦</span>
            </div>
          </div>
        </section>

        <aside className="control-panel" aria-label={tr("ui.controls")}>
          <div
            className="panel-tabs"
            role="tablist"
            aria-label={tr("ui.controls")}
          >
            <button
              role="tab"
              aria-selected={tab === "operation"}
              onClick={() => setTab("operation")}
            >
              {tr("room.operationTab")}
            </button>

            <button
              role="tab"
              aria-selected={tab === "rooms"}
              onClick={() => setTab("rooms")}
            >
              {tr("room.roomsTab")}
            </button>
          </div>

          <div className="element-controls">
            <strong>{render(ELEMENTS[def.element].name)}</strong>

            <p>{render(ELEMENTS[def.element].bonus)}</p>

            <details>
              <summary>
                {tr("elements.group", { element: ELEMENTS[def.element].name })}
              </summary>

              <p>{tr("elements.groupHint")}</p>

              <div className="element-modes">
                {MODES.map((mode) => (
                  <button
                    key={mode}
                    data-testid={`group-${mode}`}
                    disabled={
                      s.paused ||
                      !TOWER_IDS.some(
                        (key) =>
                          TOWERS[key].element === def.element &&
                          s.towers[key].level > 0,
                      )
                    }
                    onClick={() =>
                      void act({
                        type: "element-mode",
                        element: def.element,
                        mode,
                      })
                    }
                  >
                    {render(MODE_LABELS[mode])}
                  </button>
                ))}
              </div>

              {notice && (
                <p role="status">
                  {tr("elements.changed", {
                    towers: notice.changed?.length
                      ? notice.changed
                          .map((id) => render(TOWERS[id].name))
                          .join(", ")
                      : tr("elements.none"),
                    locked: notice.skippedLocked?.length
                      ? notice.skippedLocked
                          .map((id) => render(TOWERS[id].name))
                          .join(", ")
                      : tr("elements.none"),
                  })}
                </p>
              )}
            </details>
          </div>

          {tab === "rooms" ? (
            <RoomsPanel key={id} s={s} id={id} language={language} act={act} />
          ) : (
            <>
              <div className="section-heading">
                <span>{tr("ui.operation")}</span>

                <span className={`status-pill ${t.level ? "live" : ""}`}>
                  {t.level ? tr("ui.active") : tr("ui.dormant")}
                </span>
              </div>

              <div className="output">
                <span>{tr("ui.currentOutput")}</span>

                <strong>
                  {num(production(s, id))}

                  <small>{tr("ui.magicRate")}</small>
                </strong>

                <div>
                  {tr("ui.nominal")}

                  <b>{num(nominal(s, id))} / s</b>

                  {id === "wald" && s.towers.pilz.level > 0 && (
                    <em>
                      {tr("ui.mushroomBonus", {
                        percent: s.towers.pilz.level * 25,
                      })}
                    </em>
                  )}
                </div>
              </div>

              <div className="stability-box">
                <div className="stability-heading">
                  <span>{tr("ui.instability")}</span>

                  <strong className={poor ? "warning-text" : ""}>
                    {Math.round(t.instability)} <small>/ 100</small>
                  </strong>
                </div>

                <Meter
                  value={t.instability}
                  tone={poor ? "danger" : recovery ? "calm" : ""}
                  label={tr("ui.selectedInstability")}
                />

                <p>
                  {!t.level
                    ? tr("ui.dormantHint")
                    : recovery
                      ? tr(
                          t.instability > 0 ? "ui.recovering" : "ui.recovered",
                          { rate: -economy.resonance.drift[id] },
                        )
                      : `${t.instability >= 100 ? tr("ui.strainMax") : tr("ui.strainRising", { rate: economy.resonance.drift[id] })} ${poor ? tr("ui.recoveryHint") : tr("ui.strainHint")}`}
                </p>
              </div>

              <div className="mode-heading">
                <span>{tr("ui.mode")}</span>

                {t.lock > 0 && (
                  <span>
                    <Timer size={11} />{" "}
                    {tr("ui.bound", { seconds: Math.ceil(t.lock) })}
                  </span>
                )}
              </div>

              <div className="mode-list">
                {MODES.map((mode) => {
                  const Icon = modeIcons[mode];

                  return (
                    <button
                      key={mode}
                      data-testid={`mode-${mode}`}
                      className={`mode-button ${t.mode === mode ? "chosen" : ""}`}
                      disabled={
                        economyDisabled ||
                        !t.level ||
                        (t.lock > 1e-8 && t.mode !== mode)
                      }
                      aria-pressed={t.mode === mode}
                      onClick={() => void act({ type: "mode", id, mode })}
                    >
                      <Icon size={18} />

                      <span>
                        <strong>{render(MODE_LABELS[mode])}</strong>

                        <small>
                          {mode === "normal"
                            ? tr("mode.normalHint")
                            : mode === "high"
                              ? tr("mode.highHint")
                              : tr("mode.restHint")}
                        </small>
                      </span>

                      <b>
                        {num(nominal(s, id) * factor(mode, t.instability))}

                        <small>/ s</small>
                      </b>

                      {t.mode === mode && (
                        <span className="mode-check">
                          <Check size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mode-explainer">
                {tr("ui.modeHint", { seconds: modeLock(id) })}
              </p>

              <div className="upgrade-box">
                <div className="section-heading">
                  <span>
                    {t.level ? tr("ui.upgradeTitle") : tr("ui.awakenTitle")}
                  </span>

                  {t.level > 0 && (
                    <small>
                      {t.level} / {MAX_LEVEL}
                    </small>
                  )}
                </div>

                <h3>
                  {!t.level
                    ? discovered
                      ? tr("ui.newBeginning")
                      : tr("ui.undiscovered")
                    : t.level === MAX_LEVEL
                      ? tr("ui.fullyUpgraded")
                      : tr("ui.growLevel", { level: t.level + 1 })}
                </h3>

                <p>
                  {!discovered
                    ? tr(
                        !(STARTER_IDS as readonly string[]).includes(id)
                          ? "elements.locked"
                          : id === "blitz"
                            ? "ui.unlockBlitz"
                            : "ui.unlockHint",
                        {
                          amount: def.threshold,
                        },
                      )
                    : !t.level
                      ? tr("ui.awakenHint")
                      : t.level === MAX_LEVEL
                        ? tr("ui.maxHint")
                        : tr("ui.gain", { rate: gain })}
                </p>

                <button
                  className="buy-button"
                  data-testid={`buy-${id}`}
                  disabled={!canBuy}
                  onClick={() =>
                    void act({ type: t.level ? "upgrade" : "activate", id })
                  }
                >
                  <span>
                    {!t.level
                      ? tr("ui.awaken")
                      : t.level === MAX_LEVEL
                        ? tr("ui.maxLevel")
                        : tr("ui.upgrade")}
                  </span>

                  <span>
                    {t.level === MAX_LEVEL ? (
                      <Check size={16} />
                    ) : cost === 0 ? (
                      tr("ui.free")
                    ) : (
                      <>
                        <Sparkles size={14} /> {num(cost)}
                      </>
                    )}
                  </span>
                </button>

                {!t.level && discovered && (
                  <p>
                    {tr("elements.purchaseTier", {
                      tier: rulesForCount(activeTowerCount(s) + 1).tier,
                    })}
                  </p>
                )}

                {discovered && t.level < MAX_LEVEL && s.magic < cost && (
                  <small className="missing">
                    {tr("ui.missing", { amount: cost - s.magic })}
                  </small>
                )}
              </div>

              <ResonancePanel s={s} id={id} language={language} act={act} />
            </>
          )}
        </aside>

        <section className="goal-panel" aria-label={tr("ui.nextGoal")}>
          <div className="goal-icon">
            {introductionComplete(s) ? (
              <Crown size={22} />
            ) : (
              <Sprout size={22} />
            )}
          </div>

          <div className="goal-content">
            <span className="eyebrow">
              {introductionComplete(s)
                ? tr("ui.introComplete")
                : tr("ui.nextStep")}
            </span>

            <h2>{render(goal.title)}</h2>

            <p>{render(goal.description)}</p>

            <Meter
              value={goal.progress}
              max={1}
              label={tr("ui.goalProgress")}
            />
          </div>

          <div className="chronicle">
            <span className="eyebrow">{tr("ui.chronicle")}</span>

            {s.log.slice(0, 2).map((event, i) => (
              <p key={`${event.time}-${i}`}>
                <span>{duration(event.time)}</span>

                {render(event.text)}
              </p>
            ))}
          </div>
        </section>

        <ContractPanel state={s} act={act} language={language} />
      </main>

      <footer className="footer" inert={s.paused || help || research}>
        <span className="footer-brand">
          TURM INC <i>·</i> {tr("ui.prototype")}
          <span className="image-credit">{tr("credits.imageOwner")}</span>
        </span>

        <span
          className={`save-indicator ${snapshot.saveStatus === "error" ? "save-error" : ""}`}
        >
          <ShieldCheck size={12} />{" "}
          {snapshot.saveStatus === "error"
            ? tr("ui.saveFailed")
            : tr("ui.saved")}
          {snapshot.saveStatus === "error" && (
            <button onClick={() => void act({ type: "retry-save" })}>
              {tr("ui.retry")}
            </button>
          )}
        </span>

        <span>
          <span className="dot" />{" "}
          {s.paused ? tr("ui.worldPaused") : tr("ui.worldRunning")} <i>·</i>{" "}
          {duration(s.activeSeconds)}
        </span>
      </footer>

      {snapshot.saveStatus === "error" && (
        <div className="save-banner" role="alert">
          <TriangleAlert size={16} />

          <span>{render(snapshot.saveMessage)}</span>

          <button onClick={() => void act({ type: "retry-save" })}>
            {tr("ui.retrySave")}
          </button>
        </div>
      )}

      {error && (
        <div className="toast" role="alert">
          <TriangleAlert size={16} />

          {render(error)}

          <button
            aria-label={tr("ui.closeMessage")}
            onClick={() => setError("")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {s.paused && !help && (
        <div className="modal-scrim">
          <section
            className="pause-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            <LanguageSelector language={language} act={act} />

            <span className="pause-emblem">
              <TowerControl size={38} strokeWidth={1.2} />
            </span>

            <span className="eyebrow">
              {s.activeSeconds === 0 ? tr("ui.welcome") : tr("ui.breathe")}
            </span>

            <h2 id="pause-title">
              {s.activeSeconds === 0
                ? tr("ui.welcomeHeading")
                : tr("ui.pauseHeading")}
            </h2>

            <p>
              {render(
                snapshot.loadIssue ??
                  (s.activeSeconds === 0
                    ? tr("ui.welcomeBody")
                    : s.pauseReason),
              )}
            </p>

            <div className="pause-note">
              <Moon size={15} />

              {tr("ui.pauseHint")}
            </div>

            {!snapshot.loadBlocked && (
              <button
                autoFocus
                className="primary-button"
                data-testid="resume"
                onClick={() => void act({ type: "resume" })}
              >
                <Play size={16} />

                {snapshot.loadIssue
                  ? tr("ui.restore")
                  : s.activeSeconds === 0
                    ? tr("ui.begin")
                    : tr("ui.resume")}

                <ChevronRight size={17} />
              </button>
            )}

            <div className="pause-links">
              <button onClick={() => setHelp(true)}>
                <CircleHelp size={14} /> {tr("ui.howTo")}
              </button>

              {(s.activeSeconds > 0 || snapshot.loadBlocked) && (
                <button onClick={() => void act({ type: "new-game" })}>
                  <RotateCcw size={13} /> {tr("ui.newGame")}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {research && !s.paused && (
        <ResearchPanel
          s={s}
          language={language}
          act={act}
          onClose={() => setResearch(false)}
        />
      )}

      {help && (
        <div className="modal-scrim">
          <section
            className="help-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <button
              className="close-help icon-button"
              autoFocus
              aria-label={tr("ui.closeHelp")}
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>

            <LanguageSelector language={language} act={act} />

            <span className="eyebrow">{tr("ui.helpEyebrow")}</span>

            <h2 id="help-title">{tr("ui.helpHeading")}</h2>

            <div className="help-grid">
              <div>
                <Sparkles />

                <h3>{tr("ui.helpGrowthTitle")}</h3>

                <p>{tr("ui.helpGrowth")}</p>
              </div>

              <div>
                <Wind />

                <h3>{tr("ui.helpRecoveryTitle")}</h3>

                <p>{tr("ui.helpRecovery")}</p>
              </div>

              <div>
                <Swords />

                <h3>{tr("ui.helpContractTitle")}</h3>

                <p>{tr("ui.helpContract")}</p>
              </div>

              <div>
                <Pause />

                <h3>{tr("ui.helpTimeTitle")}</h3>

                <p>{tr("ui.helpTime")}</p>
              </div>
            </div>

            <div className="help-grid">
              <div>
                <h3>{tr("help.expansionTitle")}</h3>

                <p>{tr("help.expansion")}</p>
              </div>

              <div>
                <h3>{tr("help.researchTitle")}</h3>

                <p>{tr("help.research")}</p>
              </div>
            </div>

            <p className="help-credit">{tr("credits.imageOwner")}</p>

            <button className="primary-button" onClick={() => setHelp(false)}>
              {tr("ui.understood")}

              <Check size={17} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function LanguageSelector({
  language,

  act,
}: {
  language: Language;

  act: (action: GameAction) => Promise<void>;
}) {
  return (
    <label className="language-selector">
      <span>{translate(language, "language.label")}</span>

      <select
        value={language}
        onChange={(event) =>
          void act({
            type: "set-language",

            language: event.target.value as Language,
          })
        }
      >
        {Object.entries(languages).map(([key, value]) => (
          <option key={key} value={key}>
            {value.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContractPanel({
  state: s,

  act,

  language,
}: {
  state: GameState;

  language: Language;

  act: (a: GameAction) => Promise<void>;
}) {
  const tr = (key: Message["key"], params?: Message["params"]) =>
    translate(language, key, params);

  const num = (value: number) => formatNumber(language, value);

  const c = s.contract;

  const visible = c.phase !== "locked";

  const active = c.phase === "active";

  const ownRate = active ? totalProduction(s) * c.allocation : 0;

  const rivalRate = active
    ? c.rules.rivalBase *
      factor(s.rival.mode, s.rival.instability) *
      s.rival.allocation
    : 0;

  const result = c.lastResult;

  const next = nextContractRules(s);

  const rules = active ? c.rules : next;

  return (
    <section
      className={`contract-panel ${!visible ? "locked-contract" : ""}`}
      aria-label={tr("contract.label")}
    >
      <div className="rival-portrait">
        <img src={asset("rival.webp")} alt={tr("contract.rivalAlt")} />

        <span>
          <Swords size={16} />
        </span>
      </div>

      <div className="contract-info">
        <div className="contract-topline">
          <span className="eyebrow">
            {visible ? tr("contract.eyebrow") : tr("contract.lockedEyebrow")}
          </span>

          {visible && (
            <span className="contract-clock">
              <Timer size={12} />

              {duration(c.remaining)}
            </span>
          )}
        </div>

        <div className="contract-heading">
          <h2>
            {!visible
              ? tr("contract.rivalTitle")
              : active
                ? tr("contract.title", { number: c.number })
                : c.phase === "preparing"
                  ? tr("contract.preparing")
                  : tr("contract.cooldown")}
          </h2>

          {visible && (
            <span className="reward">
              <Sparkles size={12} />

              {tr("contract.reward", { amount: rules.reward })}
            </span>
          )}
        </div>

        {!visible ? (
          <p className="contract-intro">{tr("contract.unlock")}</p>
        ) : (
          <>
            <p className="tier-note">
              {tr("elements.tier", {
                tier: c.rules.tier,
                rate: c.rules.rivalBase,
              })}
              <br />
              {tr("elements.nextTier", {
                tier: next.tier,
                target: next.target,
                reward: next.reward,
              })}
            </p>

            <div className="deliveries">
              <div>
                <div className="delivery-label">
                  <span>{tr("contract.yourNetwork")}</span>

                  <b>
                    {num(active ? c.playerDelivered : 0)} / {num(rules.target)}{" "}
                    <small>· {num(ownRate)}/s</small>
                  </b>
                </div>

                <Meter
                  value={active ? c.playerDelivered : 0}
                  max={rules.target}
                  label={tr("contract.yourDelivery")}
                />
              </div>

              <div>
                <div className="delivery-label">
                  <span>{tr("contract.rivalName")}</span>

                  <b>
                    {num(active ? c.rivalDelivered : 0)} / {num(rules.target)}{" "}
                    <small>· {num(rivalRate)}/s</small>
                  </b>
                </div>

                <Meter
                  value={active ? c.rivalDelivered : 0}
                  max={rules.target}
                  tone="rival"
                  label={tr("contract.rivalDelivery")}
                />
              </div>
            </div>

            <div className="contract-controls">
              <div className="allocation">
                <span>
                  {active ? tr("contract.share") : tr("contract.planShare")}
                </span>

                {SHARES.map((share) => (
                  <button
                    key={share}
                    aria-pressed={c.allocation === share}
                    className={c.allocation === share ? "selected" : ""}
                    disabled={s.paused}
                    onClick={() => void act({ type: "allocation", share })}
                  >
                    {share * 100}%
                  </button>
                ))}
              </div>

              <span className="rival-intention">
                {!active
                  ? tr("contract.rivalWaiting")
                  : s.rival.mode === "high"
                    ? tr("contract.rivalHigh")
                    : s.rival.mode === "rest"
                      ? tr("contract.rivalRest")
                      : tr("contract.rivalNormal")}
              </span>
            </div>

            {result && !active && (
              <p
                className="result-note"
                title={tr("elements.result", {
                  target: result.rules.target,
                  reward: result.rules.reward,
                })}
              >
                {result.winner === "player"
                  ? tr("contract.resultPlayer", {
                      number: result.number,
                      reward: result.reward,
                    })
                  : result.winner === "tie"
                    ? tr("contract.resultTie", {
                        number: result.number,
                        reward: result.reward,
                      })
                    : result.winner === "rival"
                      ? tr("contract.resultRival", { number: result.number })
                      : tr("contract.resultExpired", { number: result.number })}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
