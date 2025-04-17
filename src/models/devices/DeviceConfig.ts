import { DeviceRadioConfiguration } from "./DeviceRadioConfiguration"
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
    DS021_STOP_NAME?: number[]
    terminal_config: IBISTerminalConfiguration
    use_gpio?: boolean
    GPIO_PINOUT?: GPIOPinoutConfiguration
    announcement_distance_before_next_stop: number
    line_number_in_ds009: boolean
    query_device_status: boolean
    messages?: string[]
    RADIO?: DeviceRadioConfiguration
    IRIS_A?: boolean
    IRIS_B?: boolean
}

export { DeviceConfig }