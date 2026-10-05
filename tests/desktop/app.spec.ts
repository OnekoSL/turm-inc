import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
} from "@playwright/test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { newGame } from "../../src/game/engine";
import { LEGACY_CONTRACT_TIERS, rulesForRank } from "../../src/game/content";
import { NEW_TOWER_IDS, TOWER_IDS } from "../../src/game/types";
import { legacyFixture } from "../legacy-fixture";
import { spawn } from "node:child_process";

const executablePath = resolve("out/Turm INC-win32-x64/Turm INC.exe");
const dirs: string[] = [];
const instances = new Set<ElectronApplication>();
function temp() {
  const d = mkdtempSync(join(tmpdir(), "turm-desktop-test-"));
  dirs.push(d);
  return d;
}
async function launch(directory: string) {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries({ ...process.env, TURM_USER_DATA: directory }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath, env, timeout: 25000 });
  instances.add(app);
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await app.context().setOffline(true);
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.restore();
    w.show();
    w.focus();
  });
  await expect(page.getByTestId("resume")).toBeVisible();
  return { app, page };
}
test.afterEach(async () => {
  for (const app of instances) {
    await app.close().catch(() => {});
  }
  instances.clear();
  for (const directory of dirs.splice(0)) {
    if (!directory.startsWith(join(tmpdir(), "turm-desktop-test-")))
      throw new Error("Unsafe test path");
    rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  }
});

test("packaged fresh game works offline, pauses on lifecycle events, saves and resumes", async ({}, info) => {
  expect(existsSync(executablePath)).toBe(true);
  const d = temp();
  const { app, page } = await launch(d);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.screenshot({
    path: info.outputPath("01-willkommen.png"),
    fullPage: true,
  });
  await page.getByTestId("resume").click();
  await page.getByTestId("buy-wald").click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).game.towers.wald
          .level,
    )
    .toBe(1);
  await page.getByTestId("mode-high").click();
  await expect(page.getByTestId("mode-rest")).toBeDisabled();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).game.magic,
    )
    .toBeGreaterThan(1);
  const images = await page
    .locator("img")
    .evaluateAll((images) =>
      images.every(
        (img) =>
          (img as HTMLImageElement).complete &&
          (img as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(images).toBe(true);
  await page.screenshot({
    path: info.outputPath("02-waldturm.png"),
    fullPage: true,
  });
  await app.evaluate(({ BrowserWindow }) => {
    // Windows does not reliably transfer focus when blurring its last active window.
    const other = new BrowserWindow({ width: 240, height: 160, show: true });
    (globalThis as any).__focusProbe = other;
    other.focus();
  });
  await expect(page.getByTestId("resume")).toBeVisible();
  const paused = (await page.evaluate(() => window.turm.snapshot())).game;
  await page.waitForTimeout(500);
  const after = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(after).toEqual(paused);
  const blocked = await page.evaluate(() =>
    window.turm.action({ type: "mode", id: "wald", mode: "rest" }),
  );
  expect(blocked.ok).toBe(false);
  await app.evaluate(({ BrowserWindow }) => {
    (globalThis as any).__focusProbe?.destroy();
    BrowserWindow.getAllWindows()[0].focus();
  });
  await page.getByTestId("resume").click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].minimize(),
  );
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).game.paused,
    )
    .toBe(true);
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.restore();
    w.focus();
  });
  await page.getByTestId("resume").click();
  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.emit("suspend");
  });
  await expect(page.getByTestId("resume")).toBeVisible();
  await app.close();
  instances.delete(app);
  const saved = JSON.parse(readFileSync(join(d, "spielstand.json"), "utf8"));
  await new Promise((r) => setTimeout(r, 250));
  const restarted = await launch(d);
  const restored = (await restarted.page.evaluate(() => window.turm.snapshot()))
    .game;
  expect(restored.magic).toBe(saved.magic);
  expect(restored.activeSeconds).toBe(saved.activeSeconds);
  expect(restored.towers).toEqual(saved.towers);
  expect(restored.contract).toEqual(saved.contract);
  expect(errors).toEqual([]);
});

test("network and contract controls render correctly, and a real save error is visible", async ({}, info) => {
  const d = temp();
  const s = newGame();
  s.towers.wald.level = 3;
  s.towers.wald.instability = 72;
  s.towers.pilz.level = 2;
  s.towers.pilz.mode = "rest";
  s.towers.pilz.instability = 32;
  s.towers.blitz.level = 1;
  s.selected = "pilz";
  s.magic = 245;
  s.lifetimeMagic = 920;
  s.activeSeconds = 485;
  s.hasCompletedRecovery = true;
  s.contract = {
    ...s.contract,
    phase: "active",
    number: 1,
    remaining: 113,
    allocation: 0.5,
    playerDelivered: 39,
    rivalDelivered: 34,
    lastResult: null,
  };
  s.rival = {
    mode: "high",
    instability: 37,
    lock: 4,
    recoveryEligible: false,
    allocation: 0.75,
    decisionIn: 5,
  };
  writeFileSync(join(d, "spielstand.json"), JSON.stringify(s));
  const { app, page } = await launch(d);
  await page.getByTestId("resume").click();
  await expect(
    page.getByRole("heading", { name: "Auftrag 1 · Magie für den Hain" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "75%", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).game.contract
          .allocation,
    )
    .toBe(0.75);
  await page.screenshot({
    path: info.outputPath("03-netzwerk.png"),
    fullPage: true,
  });
  await page.getByTestId("select-blitz").click();
  await page.screenshot({
    path: info.outputPath("04-blitzturm.png"),
    fullPage: true,
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1100, 800),
  );
  await page.screenshot({
    path: info.outputPath("05-kleines-fenster.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  mkdirSync(join(d, "spielstand.json.tmp"));
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByText("Speichern fehlgeschlagen:", { exact: false }).last(),
  ).toBeVisible();
  expect((await page.evaluate(() => window.turm.snapshot())).saveStatus).toBe(
    "error",
  );
  rmdirSync(join(d, "spielstand.json.tmp"));
  await page
    .getByRole("button", { name: "Erneut speichern", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).saveStatus,
    )
    .toBe("saved");
});

test("corrupt primary is explained and its backup can be explicitly resumed", async () => {
  const d = temp();
  const backup = newGame();
  backup.magic = 123;
  backup.towers.wald.level = 1;
  writeFileSync(join(d, "spielstand.json"), "{corrupt");
  writeFileSync(join(d, "spielstand.backup.json"), JSON.stringify(backup));
  const { page } = await launch(d);
  await expect(
    page.getByText("Eine gültige Sicherung ist verfügbar.", { exact: false }),
  ).toBeVisible();
  expect(readFileSync(join(d, "spielstand.json"), "utf8")).toBe("{corrupt");
  await page.getByTestId("resume").click();
  await expect
    .poll(
      async () => (await page.evaluate(() => window.turm.snapshot())).loadIssue,
    )
    .toBeNull();
  expect(
    readdirSync(d).some((name) => name.startsWith("spielstand.archiv-")),
  ).toBe(true);
  expect(
    (await page.evaluate(() => window.turm.snapshot())).game.magic,
  ).toBeGreaterThanOrEqual(123);
});

test("a second launch reuses the running application and cannot overwrite its save", async () => {
  const d = temp();
  const { app, page } = await launch(d);
  const before = (await page.evaluate(() => window.turm.snapshot())).game;
  const env = { ...process.env, TURM_USER_DATA: d } as NodeJS.ProcessEnv;
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(executablePath, [], {
    env,
    windowsHide: true,
    stdio: "ignore",
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Second instance did not exit"));
    }, 10000);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  expect(exitCode).toBe(0);
  expect(app.windows()).toHaveLength(1);
  const after = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(after.magic).toBe(before.magic);
  expect(after.activeSeconds).toBe(before.activeSeconds);
});

test("language changes localize the packaged game, persist, and never advance a paused world", async ({}, info) => {
  const d = temp();
  const s = newGame();
  s.magic = 1234.5;
  s.lifetimeMagic = 1500;
  s.activeSeconds = 200;
  s.towers.wald.level = 2;
  s.towers.pilz.level = 1;
  s.towers.pilz.mode = "rest";
  s.towers.pilz.instability = 30;
  s.selected = "pilz";
  s.hasCompletedRecovery = true;
  s.contract.phase = "active";
  s.contract.number = 1;
  s.contract.remaining = 180;
  // A real v1 save proves old chronicle strings also change language.
  writeFileSync(
    join(d, "spielstand.json"),
    JSON.stringify({
      ...legacyFixture(s, 1),
      schemaVersion: 1,
      pauseReason: "Dein Netzwerk wartet.",
      log: [{ time: 199, text: "Waldturm erreicht Stufe 2." }],
    }),
  );
  const { app, page } = await launch(d);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const before = (await page.evaluate(() => window.turm.snapshot())).game;
  await page
    .getByRole("combobox", { name: "Sprache" })
    .last()
    .selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("resume")).toHaveText("Continue");
  const after = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(after).toEqual(before);
  await expect(page.getByTestId("magic")).toHaveText("1,234.5");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(
    page.getByRole("heading", { name: "Your towers need direction." }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Language" })
    .last()
    .selectOption("de");
  await expect(
    page.getByRole("heading", { name: "Deine Türme brauchen Richtung." }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sprache" })
    .last()
    .selectOption("en");
  await page.getByRole("button", { name: "Got it" }).click();
  await page.screenshot({
    path: info.outputPath("06-english-pause.png"),
    fullPage: true,
  });
  await page.getByTestId("resume").click();
  await expect(
    page.getByRole("heading", { name: "Mushroom Tower", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Contract 1 · Magic for the grove" }),
  ).toBeVisible();
  await expect(page.getByText("Forest Tower reaches level 2.")).toBeVisible();
  await expect(
    page.getByText("Decreasing by 1 per second.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Language" })
    .last()
    .selectOption("de");
  await expect(
    page.getByRole("heading", { name: "Pilzturm", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sprache" })
    .last()
    .selectOption("en");
  await page.screenshot({
    path: info.outputPath("07-english-network.png"),
    fullPage: true,
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1100, 800),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("08-english-small.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("You paused the game.")).toBeVisible();
  // Exercise a genuine preference-write failure; the previous preference stays effective.
  mkdirSync(join(d, "settings.json.tmp"));
  await page
    .getByRole("combobox", { name: "Language" })
    .last()
    .selectOption("de");
  await expect(page.getByRole("alert")).toContainText(
    "The language could not be saved.",
  );
  expect((await page.evaluate(() => window.turm.snapshot())).language).toBe(
    "en",
  );
  rmdirSync(join(d, "settings.json.tmp"));
  await page.getByRole("button", { name: "Dismiss message" }).click();
  // Capture the native confirmation while acknowledging it in the test process.
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = (async (...args: unknown[]) => {
      (globalThis as any).__turmDialog = args.at(-1);
      return { response: 1, checkboxChecked: false };
    }) as typeof dialog.showMessageBox;
  });
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.getByTestId("resume")).toHaveText("Begin your network");
  const native = await app.evaluate(() => (globalThis as any).__turmDialog);
  expect(native.title).toBe("A new network?");
  expect(native.buttons).toEqual(["Cancel", "Start anew"]);
  expect((await page.evaluate(() => window.turm.snapshot())).language).toBe(
    "en",
  );
  await app.close();
  instances.delete(app);
  const restarted = await launch(d);
  await expect(
    restarted.page.getByRole("combobox", { name: "Language" }).last(),
  ).toHaveValue("en");
  await expect(restarted.page.getByTestId("resume")).toHaveText(
    "Begin your network",
  );
  expect(errors).toEqual([]);
});

test("v0.2 rooms, research, crystal controls and demolition work in both languages", async ({}, info) => {
  const d = temp(),
    s = newGame();
  s.paused = false;
  s.magic = 1200;
  s.lifetimeMagic = 1400;
  s.activeSeconds = 100;
  s.towers.wald.level = 2;
  s.towers.pilz.level = 1;
  s.colony.knowledge = 100;
  writeFileSync(join(d, "spielstand.json"), JSON.stringify(s));
  const { app, page } = await launch(d);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("resume").click();
  await page.getByRole("tab", { name: "Räume", exact: true }).click();
  await page.getByTestId("build-housing").click();
  await page.getByTestId("build-kitchen").click();
  await page.getByTestId("workers-kitchen").selectOption("1");
  await page.getByTestId("build-library").click();
  await page.getByTestId("workers-library").selectOption("1");
  await expect(page.getByTestId("build-storage")).toBeDisabled();
  await expect(page.getByTestId("workers-library")).toHaveValue("1");
  await page.getByRole("button", { name: "Forschung", exact: false }).click();
  await page.getByTestId("research-space").click();
  await expect(page.getByTestId("research-space")).toBeDisabled();
  await page.screenshot({
    path: info.outputPath("v02-research.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Forschung schließen", exact: true })
    .click();
  await page.getByTestId("build-storage").click();
  await page.getByTestId("upgrade-library").click();
  await expect(
    page.getByTestId("workers-library").locator('option[value="2"]'),
  ).toHaveJSProperty("disabled", true);
  await page.getByTestId("workers-kitchen").selectOption("0");
  await page.getByTestId("workers-library").selectOption("2");
  await page.screenshot({
    path: info.outputPath("v02-rooms-de.png"),
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Sprache" })
    .last()
    .selectOption("en");
  await expect(
    page.getByRole("tab", { name: "Rooms", exact: true }),
  ).toBeVisible();
  await page
    .getByTestId("room-storage")
    .getByRole("button", { name: "Demolish", exact: true })
    .click();
  await expect(
    page.getByText("Refund: 15 magic.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("build-storage")).toHaveCount(0);
  await page
    .getByTestId("room-storage")
    .getByRole("button", { name: "Demolish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm demolition", exact: true })
    .click();
  await expect(page.getByTestId("build-storage")).toBeVisible();
  await page.getByTestId("select-pilz").click();
  await page.getByTestId("build-housing").click();
  await page.getByTestId("recruit").click();
  await page.getByTestId("build-resonator").click();
  await page.getByTestId("workers-resonator").selectOption("1");
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).game.colony
          .crystals,
    )
    .toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Operation", exact: true }).click();
  await page.getByTestId("resonance-strong").click();
  await expect(page.getByTestId("resonance-strong")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("tab", { name: "Rooms", exact: true }).click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1100, 800),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("v02-rooms-en-small.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = (await page.evaluate(() => window.turm.snapshot())).game;
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.turm.snapshot())).game).toEqual(
    paused,
  );
  await app.close();
  instances.delete(app);
  const saved = JSON.parse(readFileSync(join(d, "spielstand.json"), "utf8"));
  const reopened = await launch(d);
  expect(
    (await reopened.page.evaluate(() => window.turm.snapshot())).game.colony,
  ).toEqual(saved.colony);
  expect(saved.schemaVersion).toBe(5);
  expect(errors).toEqual([]);
});

test("nine towers, element groups and tier-four competition work offline in both languages", async ({}, info) => {
  const d = temp(),
    s = newGame();
  s.competitionRank = 25;
  s.elementsUnlocked = true;
  s.magic = 3000;
  s.lifetimeMagic = 20000;
  s.hasCompletedRecovery = true;
  s.contractsResolved = 5;
  for (const id of TOWER_IDS) s.towers[id].level = 2;
  s.towers.wald.instability = 62;
  s.towers.pilz.lock = 15;
  s.colony.settled = true;
  s.colony.minions = 2;
  s.colony.food = 20;
  s.colony.kitchenStaffed = true;
  s.colony.research = ["storage", "library"];
  s.colony.stabilizedSeconds = 10;
  s.colony.rooms.sonne.library = { level: 1, workers: 1, investedMagic: 40 };
  s.colony.rooms.wald.kitchen = { level: 1, workers: 1, investedMagic: 25 };
  s.contract = {
    ...s.contract,
    rules: { ...LEGACY_CONTRACT_TIERS[3] },
    phase: "active",
    number: 6,
    remaining: 120,
    playerDelivered: 230,
    rivalDelivered: 205,
  };
  writeFileSync(join(d, "spielstand.json"), JSON.stringify(s));
  const { app, page } = await launch(d);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("resume").click();
  await page.locator(".element-controls summary").click();
  await page.getByTestId("group-rest").click();
  await expect(page.getByRole("status")).toContainText("Pilzturm");
  const grouped = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(grouped.towers.wald.mode).toBe("rest");
  expect(grouped.towers.fels.mode).toBe("rest");
  expect(grouped.towers.pilz.mode).toBe("normal");
  await expect(
    page.locator(".deliveries [role=progressbar]").first(),
  ).toHaveAttribute("aria-valuemax", "800");
  await page.screenshot({
    path: info.outputPath("v03-elements-de.png"),
    fullPage: true,
  });
  await page.getByTestId("element-earth").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("select-wald")).not.toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("select-wald")).toBeVisible();
  for (const id of NEW_TOWER_IDS) {
    await page.getByTestId(`select-${id}`).click();
    await expect(page.locator(".scene-image")).toHaveAttribute(
      "src",
      new RegExp(`${id}\\.webp$`),
    );
    expect(
      await page
        .locator(".scene-image")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
  }
  await page.getByTestId("select-eis").click();
  await page.getByTestId("mode-rest").click();
  await expect(page.locator(".element-controls")).toContainText("1,2");
  await page.getByRole("combobox", { name: "Sprache" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Ice Tower", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".element-controls")).toContainText("1.2");
  await page.getByTestId("select-sonne").click();
  await page.getByRole("tab", { name: "Rooms", exact: true }).click();
  await expect(page.locator(".element-controls")).toContainText(
    "+20% knowledge",
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1080, 760),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("v03-elements-en-small.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(
    (
      await page.evaluate(() =>
        window.turm.action({
          type: "element-mode",
          element: "light",
          mode: "high",
        }),
      )
    ).ok,
  ).toBe(false);
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.turm.snapshot())).game).toEqual(
    paused,
  );
  await app.close();
  instances.delete(app);
  const reopened = await launch(d);
  const restored = (await reopened.page.evaluate(() => window.turm.snapshot()))
    .game;
  expect(restored.towers).toEqual(paused.towers);
  expect(restored.contract).toEqual(paused.contract);
  expect(restored.colony).toEqual(paused.colony);
  expect(errors).toEqual([]);
});

test("packaged app migrates a completed v0.2 game and permits free choice of the first new tower", async () => {
  const d = temp(),
    s = newGame();
  s.magic = 600;
  s.lifetimeMagic = 3000;
  s.hasCompletedRecovery = true;
  s.contractsResolved = 1;
  s.towers.wald.level = 2;
  s.towers.pilz.level = 1;
  s.towers.blitz.level = 1;
  s.towers.blitz.lock = 14;
  s.colony.settled = true;
  s.colony.minions = 2;
  s.colony.kitchenStaffed = true;
  s.colony.research = ["storage"];
  s.colony.stabilizedSeconds = 10;
  const old = legacyFixture(s);
  writeFileSync(join(d, "spielstand.json"), JSON.stringify(old));
  const { page } = await launch(d);
  const initial = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(initial.schemaVersion).toBe(5);
  expect(initial.elementsUnlocked).toBe(true);
  expect(initial.towers.blitz.lock).toBe(14);
  await page.getByTestId("resume").click();
  await page.getByTestId("select-mond").click();
  await page.getByTestId("buy-mond").click();
  const after = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(after.towers.mond.level).toBe(1);
  expect(after.towers.fels.level).toBe(0);
  expect(after.magic).toBeLessThan(20);
  await page.getByTestId("select-lava").click();
  await expect(page.getByTestId("buy-lava")).toContainText("960");
});

test("a victory promotes rank, explains the next class in both languages and persists it", async ({}, info) => {
  const d = temp(),
    s = newGame();
  s.competitionRank = 4;
  s.magic = 100;
  s.lifetimeMagic = 1000;
  s.hasCompletedRecovery = true;
  s.towers.wald.level = 2;
  s.towers.pilz.level = 1;
  s.towers.blitz.level = 1;
  s.contract = {
    ...s.contract,
    phase: "active",
    number: 1,
    remaining: 100,
    allocation: 0.75,
    playerDelivered: 79.99,
    rules: rulesForRank(4),
  };
  writeFileSync(join(d, "spielstand.json"), JSON.stringify(s));
  const { app, page } = await launch(d);
  await expect(page.locator(".tier-note")).toContainText("Wettbewerbsrang 4");
  await page.getByTestId("resume").click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.turm.snapshot())).game
          .competitionRank,
    )
    .toBe(5);
  await expect(page.locator(".tier-note")).toContainText("Ziel 129");
  await expect(page.locator(".result-note")).toContainText("+160 Magie");
  await page.locator(".competition-help summary").click();
  await expect(page.locator(".competition-help")).toContainText("10 %");
  await page.screenshot({
    path: info.outputPath("rank-de.png"),
    fullPage: true,
  });
  await page.getByRole("combobox", { name: "Sprache" }).selectOption("en");
  await expect(page.locator(".tier-note")).toContainText("Competition rank 5");
  await expect(page.locator(".competition-help")).toContainText(
    "After a victory: rank 6",
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1080, 760),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("rank-en-small.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = (await page.evaluate(() => window.turm.snapshot())).game;
  await app.close();
  instances.delete(app);
  const reopened = await launch(d);
  const after = (await reopened.page.evaluate(() => window.turm.snapshot()))
    .game;
  expect(after.competitionRank).toBe(5);
  expect(after.contract).toEqual(before.contract);
  expect(after.magic).toBe(before.magic);
});
