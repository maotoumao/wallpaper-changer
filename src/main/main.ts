/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, Tray, Menu, Notification} from 'electron';
import { resolveHtmlPath } from './util';
import {
  resumeBackgroundWindow,
  setBackgroundWindow,
} from './lib/wallpaper-addon.node';
import debounce from 'lodash.debounce';

import Store from 'electron-store';

Store.initRenderer();

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

let currentWindow: string | null = null;
let windowMeta: IWallpaperAddOnParam.IWindowMeta | null = null;


app.setAppUserModelId(app.name);
const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

ipcMain.on('mainwindow-min', async (event, arg) => {
  mainWindow?.minimize();
});

ipcMain.on('update-tip', async(event, arg) => {
  if(tray) {
    if(currentWindow && windowMeta) {
      resumeBackgroundWindow(currentWindow, {
        windowX: windowMeta.windowX,
        windowY: windowMeta.windowY,
        windowWidth: windowMeta.windowWidth,
        windowHeight: windowMeta.windowHeight,
        windowStyle: windowMeta.windowStyle,
      });
      windowMeta = null;
      currentWindow = null;
    }
    tray?.setImage(getAssetPath('tray.ico'));
    tray?.setToolTip(`${arg} | 双击切换为桌面壁纸`);
  }
})


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

// const isDevelopment =
//   process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';



const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const createWindow = async () => {

  mainWindow = new BrowserWindow({
    show: false,
    width: 300,
    height: 200,
    icon: getAssetPath('tray_active.ico'),
    maximizable: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true
    },
  });

  // mainWindow.webContents.openDevTools();

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.menuBarVisible = false;
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.minimize();
  })

  mainWindow.on('closed', () => {
    mainWindow = null;
  });


  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

};


const getCurrentApp = ():string => store.get('currentApp') as string ?? '阴阳师-网易游戏';

const createTray = () => {
  tray = new Tray(getAssetPath('tray.ico'));
  tray.on(
    'double-click',
    debounce(() => {
      if (!currentWindow) {
        const _currentApp = getCurrentApp();
        const result = setBackgroundWindow(_currentApp);
        if (result.success) {
          currentWindow = _currentApp;
          windowMeta = result as IWallpaperAddOnParam.IWindowMeta;
          tray?.setImage(getAssetPath('tray_active.ico'));
          tray?.setToolTip(`${_currentApp} | 双击切换为正常窗口`);
          new Notification({
            icon: getAssetPath('tray_active.ico'),
            title: `设置壁纸成功`,
            body: `${_currentApp} 已被设置为壁纸`
          }).show();
        } else {
          currentWindow = null;
          windowMeta = null;
          new Notification({
            icon: getAssetPath('tray_active.ico'),
            title: `设置壁纸失败`,
            body: `没有检测到 ${_currentApp}`
          }).show();
        }
        console.log(result);
      } else if (windowMeta) {
        resumeBackgroundWindow(getCurrentApp(), {
          windowX: windowMeta.windowX,
          windowY: windowMeta.windowY,
          windowWidth: windowMeta.windowWidth,
          windowHeight: windowMeta.windowHeight,
          windowStyle: windowMeta.windowStyle,
        });
        windowMeta = null;
        currentWindow = null;
        tray?.setImage(getAssetPath('tray.ico'));
        tray?.setToolTip(`${getCurrentApp()} | 双击切换为桌面壁纸`);
        new Notification({
          icon: getAssetPath('tray_active.ico'),
          title: '壁纸已恢复正常'
        }).show();
      }
    }, 800)
  );
  const ctxMenu = Menu.buildFromTemplate([
    {
      label: '选择窗口',
      type: 'normal',
      click(){
        mainWindow?.show();
      }
    },
    {
      label: '原理',
      type: 'normal',
      click(){
        shell.openExternal('http://blog.upup.fun/2021/12/18/%E8%AE%BE%E7%BD%AE%E9%98%B4%E9%98%B3%E5%B8%88%E6%B8%B8%E6%88%8F%E4%B8%BA%E6%A1%8C%E9%9D%A2%E5%A3%81%E7%BA%B8/')
      }
    },
    {
      label: '源代码',
      type: 'normal',
      click(){
        shell.openExternal('https://gitee.com/maotoumao/wallpaper-changer')
      }
    },
    {
      type: 'separator'
    },
    {
      label: "退出",
      type: 'normal',
      click(){
        app.exit(0);
      }
    },
  ]);
  tray.setContextMenu(ctxMenu);

  tray.setToolTip(`${getCurrentApp()} | 双击切换为桌面壁纸`);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    createTray();
    await createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
