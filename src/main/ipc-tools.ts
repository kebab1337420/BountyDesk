import { ipcMain } from 'electron'
import { IPC, type ToolInstallResult, type ToolsListResult } from '../shared/ipc'
import { currentTools, installTool } from './services/tools/installer'

export function registerToolsIpc(): void {
  ipcMain.handle(IPC.ToolsList, async (): Promise<ToolsListResult> => {
    try {
      return { ok: true, tools: await currentTools() }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.ToolsInstall, async (event, id: unknown): Promise<ToolInstallResult> => {
    if (typeof id !== 'string' || id.length === 0 || id.length > 100) {
      return { ok: false, error: 'Identifiant d’outil invalide', output: '' }
    }
    const chunks: string[] = []
    const out = (line: string) => chunks.push(line)
    const res = await installTool(id, out)
    if (res.ok) return { ok: true, installed: res.installed, output: chunks.join('') }
    return { ok: false, error: res.error, output: chunks.join('') }
  })
}