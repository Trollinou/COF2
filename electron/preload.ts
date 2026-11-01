import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveCharacter: (charData: any, defaultFilename?: string) =>
    ipcRenderer.invoke('save-character-file', { charData, defaultFilename }),
  loadCharacter: () => ipcRenderer.invoke('load-character-file'),
  exportPdf: (defaultFilename?: string) =>
    ipcRenderer.invoke('export-character-pdf', { defaultFilename }),
  onMenuSave: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('menu-trigger-save', subscription);
    return () => ipcRenderer.removeListener('menu-trigger-save', subscription);
  },
  onMenuLoad: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('menu-trigger-load', subscription);
    return () => ipcRenderer.removeListener('menu-trigger-load', subscription);
  },
  onMenuPdf: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('menu-trigger-pdf', subscription);
    return () => ipcRenderer.removeListener('menu-trigger-pdf', subscription);
  },
  isElectron: true,
});
