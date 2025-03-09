class DeviceRadioChannelConfiguration {
    voice: number
    data: number
}
class DeviceRadioConfiguration {
    channels: DeviceRadioChannelConfiguration
}
export { DeviceRadioConfiguration, DeviceRadioChannelConfiguration }