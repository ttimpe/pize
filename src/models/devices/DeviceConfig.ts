import { GPIOPinoutConfiguration } from "./GPIOPinoutConfiguration"
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
    use_gpio?: boolean
    GPIO_PINOUT?: GPIOPinoutConfiguration
    announcement_distance_before_next_stop: number
    line_number_in_ds009: boolean
}

export { DeviceConfig }