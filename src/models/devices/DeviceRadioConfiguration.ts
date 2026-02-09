class DeviceRadioChannelConfiguration {
    voice: number
    data: number
    lsa: number
}
class DeviceRadioConfiguration {
    enabled: boolean
    vehicle_address: number
    channels: DeviceRadioChannelConfiguration
}
export { DeviceRadioConfiguration, DeviceRadioChannelConfiguration }