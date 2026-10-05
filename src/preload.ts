import { contextBridge, ipcRenderer } from "electron";
import type { DesktopAPI, GameAction, Snapshot } from "./game/types";

const api: DesktopAPI = {
  snapshot: () => ipcRenderer.invoke("game:snapshot"),
  action: (action: GameAction) => ipcRenderer.invoke("game:action", action),
  subscribe: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, value: Snapshot) =>
      callback(value);
    ipcRenderer.on("game:state", listener);
    return () => {
      ipcRenderer.removeListener("game:state", listener);
    };
  },
};
contextBridge.exposeInMainWorld("turm", api);
