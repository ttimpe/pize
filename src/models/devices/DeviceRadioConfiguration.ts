class DeviceRadioChannelConfiguration {
    voice: number
    data: number
    lsa: number
}
class DeviceRadioConfiguration {
    enabled: boolean
    channels: DeviceRadioChannelConfiguration
}
export { DeviceRadioConfiguration, DeviceRadioChannelConfiguration }