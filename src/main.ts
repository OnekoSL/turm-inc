import {
  message,
  translate,
  renderMessage,
  errorMessage,
  type Language,
  type LocalizedText,
  type Message,
} from "./i18n";
import { app, BrowserWindow, dialog, ipcMain, powerMonitor } from "electron";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  advanceMilliseconds,
  applyAction,
  isGameAction,
  newGame,
} from "./game/engine";
import type { ActionResult, Snapshot } from "./game/types";
import { SettingsStore } from "./persistence/settings";
import { SaveStore } from "./persistence/store";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

app.setName("Turm INC");
const customData = process.env.TURM_USER_DATA;
if (customData) app.setPath("userData", customData);
let window: BrowserWindow | null = null;
let store: SaveStore;
let settings: SettingsStore;
let language: Language = "de";
const tr = (key: Message["key"]) => translate(language, key);
let state = newGame();
let saveStatus: Snapshot["saveStatus"] = "saved";
let saveMessage = message("save.saved");
let loadIssue: LocalizedText | null = null;
let loadBlocked = false;
let lastTime = performance.now();
let lastAutosave = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let discardOnClose = false;
let closePromptOpen = false;

const snapshot = (): Snapshot => ({
  game: state,
  language,
  saveStatus,
  saveMessage,
  loadIssue,
  loadBlocked,
});
function publish() {
  if (window && !window.isDestroyed() && !window.webContents.isDestroyed())
    window.webContents.send("game:state", snapshot());
}
function save() {
  if (loadIssue || loadBlocked) return;
  try {
    saveStatus = "saving";
    store.save(state);
    lastAutosave = state.activeSeconds;
    saveStatus = "saved";
    saveMessage = message("save.saved");
  } catch (error) {
    saveStatus = "error";
    saveMessage = message("save.failed", { detail: errorMessage(error) });
  }
}
function accrue() {
  const now = performance.now();
  const elapsed = now - lastTime;
  lastTime = now;
  if (state.paused) return;
  // A suspended or stalled process must never award absence progress.
  if (elapsed > 2000) {
    state.paused = true;
    state.pauseReason = message("pause.interrupted");
    save();
    return;
  }
  const resolvedBefore = state.contractsResolved;
  advanceMilliseconds(state, elapsed);
  if (state.contractsResolved !== resolvedBefore) save();
}
function pause(reason: LocalizedText) {
  accrue();
  state.paused = true;
  state.pauseReason = reason;
  save();
  publish();
}

async function createWindow() {
  settings = new SettingsStore(app.getPath("userData"));
  language = settings.load();
  store = new SaveStore(app.getPath("userData"));
  const loaded = store.load();
  state = loaded.game ?? newGame();
  state.paused = true;
  state.pauseReason = loaded.game
    ? message("pause.return")
    : message("pause.waiting");
  loadIssue = loaded.issue;
  loadBlocked = loaded.blocked;
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 760,
    show: false,
    backgroundColor: "#101611",
    title: "Turm INC",
    autoHideMenuBar: true,
    icon: join(__dirname, "../../build/icon.ico"),
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window?.webContents.getURL()) event.preventDefault();
  });
  window.once("ready-to-show", () => {
    window?.show();
  });
  window.on("blur", () => pause(message("pause.blur")));
  window.on("minimize", () => pause(message("pause.minimized")));
  window.on("close", (event) => {
    pause(message("pause.closed"));
    if (saveStatus !== "error" || discardOnClose) return;
    event.preventDefault();
    if (closePromptOpen || !window) return;
    closePromptOpen = true;
    void dialog
      .showMessageBox(window, {
        type: "warning",
        title: tr("dialog.unsavedTitle"),
        message: tr("dialog.unsaved"),
        detail: tr("dialog.unsavedDetail"),
        buttons: [tr("dialog.return"), tr("dialog.discard")],
        defaultId: 0,
        cancelId: 0,
      })
      .then(({ response }) => {
        closePromptOpen = false;
        if (response === 1) {
          discardOnClose = true;
          window?.close();
        }
      });
  });
  window.on("closed", () => {
    window = null;
    if (timer) clearInterval(timer);
  });
  powerMonitor.on("suspend", () => pause(message("pause.suspend")));
  powerMonitor.on("lock-screen", () => pause(message("pause.locked")));

  function trusted(event: Electron.IpcMainInvokeEvent) {
    return (
      !!window &&
      event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame
    );
  }
  ipcMain.handle("game:snapshot", (event) => {
    if (!trusted(event)) throw new Error("Unbekanntes Fenster.");
    return snapshot();
  });
  ipcMain.handle(
    "game:action",
    async (event, input: unknown): Promise<ActionResult> => {
      if (!trusted(event) || !isGameAction(input))
        return { ok: false, error: message("error.invalidAction") };
      if (input.type === "set-language") {
        try {
          settings.save(input.language);
          language = input.language;
          publish();
          return { ok: true };
        } catch {
          return { ok: false, error: message("language.saved") };
        }
      }
      accrue();
      let result: ActionResult = { ok: true };
      if (input.type === "resume") {
        if (loadBlocked)
          return {
            ok: false,
            error: message("error.loadBlocked"),
          };
        if (!window?.isFocused() || window.isMinimized())
          return {
            ok: false,
            error: message("error.focus"),
          };
        if (loadIssue) {
          try {
            store.acknowledgeRecovery();
            loadIssue = null;
          } catch {
            return {
              ok: false,
              error: message("error.archiveCorrupt"),
            };
          }
        }
        state.paused = false;
        state.pauseReason = "";
        lastTime = performance.now();
      } else if (input.type === "pause") pause(message("pause.manual"));
      else if (input.type === "retry-save") save();
      else if (input.type === "new-game") {
        if (!window) return { ok: false };
        pause(message("pause.newGame"));
        const choice = await dialog.showMessageBox(window, {
          type: "question",
          title: tr("dialog.newTitle"),
          message: tr("dialog.newMessage"),
          detail: tr("dialog.newDetail"),
          buttons: [tr("dialog.cancel"), tr("dialog.newConfirm")],
          defaultId: 0,
          cancelId: 0,
        });
        if (choice.response === 1) {
          try {
            store.acknowledgeRecovery(true);
            state = newGame();
            loadIssue = null;
            loadBlocked = false;
          } catch {
            result = {
              ok: false,
              error: message("error.archiveOld"),
            };
          }
        }
      } else result = applyAction(state, input);
      if (result.ok) save();
      publish();
      return result;
    },
  );
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL)
    await window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else
    await window.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  lastTime = performance.now();
  timer = setInterval(() => {
    accrue();
    if (!state.paused && state.activeSeconds - lastAutosave >= 10) {
      save();
      lastAutosave = state.activeSeconds;
    }
    publish();
  }, 100);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    window?.restore();
    window?.focus();
  });
  app
    .whenReady()
    .then(createWindow)
    .catch((error) => {
      dialog.showErrorBox(
        tr("dialog.startFailed"),
        renderMessage(language, errorMessage(error)),
      );
      app.quit();
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    if (store) pause(message("pause.quit"));
  });
}
