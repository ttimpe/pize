import { DeviceConfig } from "./DeviceConfig"

/**
 * Minimal, safe default configuration written to device_config.json when none exists,
 * so a fresh device boots into "setup mode": no serial port, no terminals, no radio —
 * just the web server + setup wizard reachable so the user can configure the vehicle.
 *
 * `serial_port` is intentionally omitted → IBISController stays in no-serial mode until
 * the wizard sets it.
 */
export const defaultDeviceConfig: DeviceConfig = {
    vehicle_number: 0,
    MFD: false,
    external_announcements: false,
    TERMINAL_A: false,
    TERMINAL_B: false,
    validators: [],
    signs: [],
    UESTRA_LVA: [],
    DS021_STOP_NAME: [],
    terminal_config: {
        actions: [],
        sounds: { ABFAHRT: 0, WEISUNG: 0, FEHLER: 0 }
    },
    use_gpio: false,
    GPIO_PINOUT: {
        WI: 0, OBI: 0, TK: 0, FLE: 0, PLE: 0, UEB: 0, KKA: 0, KKB: 0,
        K1: 0, K2: 0, K4: 0, K8: 0, DS: 0, STAST: 0, TFS: 0
    },
    announcement_distance_before_next_stop: 100,
    line_number_in_ds009: false,
    query_device_status: false,
    RADIO: {
        enabled: false,
        vehicle_address: 0,
        channels: { voice: 0, data: 0, lsa: 0 }
    },
    IRIS_A: false,
    IRIS_B: false,
    AUDIO: {
        radio: { input_device: 'default', output_device: 'default' },
        announcements: { output_device: 'default' }
    }
}
