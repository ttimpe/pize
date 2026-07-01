import { DeviceRadioConfiguration } from "./DeviceRadioConfiguration"
import { GPIOPinoutConfiguration } from "./GPIOPinoutConfiguration"
import { IBISTerminalConfiguration } from "./Terminal/IBISTerminalConfiguration"

// Audio device routing (was previously read via `as any`; now typed for the setup wizard)
class DeviceAudioRadioConfiguration {
    input_device: string
    output_device: string
}
class DeviceAudioAnnouncementsConfiguration {
    output_device: string
}
class DeviceAudioConfiguration {
    radio: DeviceAudioRadioConfiguration
    announcements: DeviceAudioAnnouncementsConfiguration
}

class DeviceConfig {
    // IBIS serial bus device path (e.g. /dev/ttyUSB0 or ./ttyV0 for dev). When unset,
    // the system boots in setup mode without opening the serial port.
    serial_port?: string
    // True fleet/car number of the vehicle (distinct from RADIO.vehicle_address).
    vehicle_number?: number
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
    AUDIO?: DeviceAudioConfiguration
}

export { DeviceConfig }