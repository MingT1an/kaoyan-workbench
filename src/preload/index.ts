import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo, SettingsMap, Subject, SubjectInput, SubjectUpdate } from '../shared/types'

const api = {
  subjects: {
    list: (): Promise<Subject[]> => ipcRenderer.invoke('subjects:list'),
    create: (input: SubjectInput): Promise<Subject> => ipcRenderer.invoke('subjects:create', input),
    update: (input: SubjectUpdate): Promise<Subject> => ipcRenderer.invoke('subjects:update', input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('subjects:remove', id)
  },
  settings: {
    all: (): Promise<SettingsMap> => ipcRenderer.invoke('settings:all'),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', { key, value })
  },
  app: {
    info: (): Promise<AppInfo> => ipcRenderer.invoke('app:info')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
