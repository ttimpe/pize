class DeviceRadioChannelConfiguration {
    voice: number
    data: number
}
class DeviceRadioConfiguration {
    enabled: boolean
    channels: DeviceRadioChannelConfiguration
}
export { DeviceRadioConfiguration, DeviceRadioChannelConfiguration }