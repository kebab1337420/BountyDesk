/// <reference types="vite/client" />
import type { BountyDeskBridge } from '../../shared/ipc'

declare global {
  interface Window {
    bountydesk: BountyDeskBridge
  }
}

export {}