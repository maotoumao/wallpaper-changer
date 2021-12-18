const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('electron', {
  events: {
    updateCurrentApp(s){
      store.set('currentApp', s);
      ipcRenderer.send('update-tip', s);
      ipcRenderer.send('mainwindow-min');
    }
  }
});
