import { app, BrowserWindow } from "electron";
import path from "path";

let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDevelopment = process.env.NODE_ENV === "development";
  const startUrl = isDevelopment
    ? "http://localhost:3001"
    : `file://${path.join(__dirname, "../.next/server/pages/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle app squirrel event (Windows installer)
if (require("electron-squirrel-startup")) {
  app.quit();
}
