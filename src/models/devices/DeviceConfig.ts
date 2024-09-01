import { IBISTerminalConfiguration } from "./Terminal/IBISTerminalConfiguration"

class DeviceConfig {
    MFD: boolean
    external_announcements: boolean
    TERMINAL_A: boolean
    TERMINAL_B: boolean
    validators: boolean[]
    signs: boolean[]
    UESTRA_LVA: number[]
    terminal_config: IBISTerminalConfiguration
}

export { DeviceConfig }