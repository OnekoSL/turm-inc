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
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].blur(),
  );
  await expect(page.getByTestId("resume")).toBeVisible();
  const paused = (await page.evaluate(() => window.turm.snapshot())).game;
  await page.waitForTimeout(500);
  const after = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(after).toEqual(paused);
  const blocked = await page.evaluate(() =>
    window.turm.action({ type: "mode", id: "wald", mode: "rest" }),
  );
  expect(blocked.ok).toBe(false);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].focus(),
  );
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
      ...s,
      schemaVersion: 1,
      pauseReason: "Dein Netzwerk wartet.",
      log: [{ time: 199, text: "Waldturm erreicht Stufe 2." }],
    }),
  );
  const { app, page } = await launch(d);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const before = (await page.evaluate(() => window.turm.snapshot())).game;
  await page.getByRole("combobox", { name: "Sprache" }).last().selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("resume")).toHaveText("Continue");
  const after = (await page.evaluate(() => window.turm.snapshot())).game;
  expect(after).toEqual(before);
  await expect(page.getByTestId("magic")).toHaveText("1,234.5");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(
    page.getByRole("heading", { name: "Your towers need direction." }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).last().selectOption("de");
  await expect(
    page.getByRole("heading", { name: "Deine Türme brauchen Richtung." }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Sprache" }).last().selectOption("en");
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
  await page.getByRole("combobox", { name: "Language" }).last().selectOption("de");
  await expect(
    page.getByRole("heading", { name: "Pilzturm", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Sprache" }).last().selectOption("en");
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
  await page.getByRole("combobox", { name: "Language" }).last().selectOption("de");
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
