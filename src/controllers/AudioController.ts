import { RouteStop } from '../models/database/RouteStop';
import { Announcement } from './../models/database/Announcement';
import PlaySound from 'play-sound';
import { Util } from "../util"
import { Gpio } from 'onoff';
import { DeviceConfig } from '../models/devices/DeviceConfig';

class AudioController {

    announcementsMuted: boolean = false;
    lastAnnouncement?: Announcement
    private deviceConfig: DeviceConfig = require('../../device_config.json')
    private ansageInnenPin: Gpio
    private ansageAussenPin: Gpio

    constructor() {
        // Für Meister GLS-Verstärker: GPIO-Pins für Ansage innen und Ansage außen per GPIO

        if (this.deviceConfig.use_gpio == true) {
        
            this.ansageInnenPin = new Gpio(this.deviceConfig.GPIO_PINOUT.FLE, 'out')
            this.ansageAussenPin = new Gpio(this.deviceConfig.GPIO_PINOUT.PLE, 'out')
            this.ansageAussenPin.write(Gpio.HIGH, (err) => {
                if (err) {
                    Util.log('SetAnsageAussen pin failed')
                }
            });
            this.ansageInnenPin.write(Gpio.HIGH, (err) => {
                if (err) {
                    Util.log('Set AnsageInnen pin failed', err)
                }
            })

        }

    }

    async playAnnouncement(announcement: Announcement, callback: Function) {
        if (this.announcementsMuted == false) {
            Util.log('PLAY ANNOUNCEMENT', announcement);
        PlaySound().play('./announcements/' + announcement.fileName, (err) => {
            callback();
        })

    }
    }

    async playStopAnnouncement(routeStop: RouteStop, callback: Function) {
        if (this.announcementsMuted == false) {

        if (routeStop.announcement) {
            this.lastAnnouncement = routeStop.announcement
            PlaySound().play('./announcements/Gong.wav', (err) => {
                this.playAnnouncement(routeStop.announcement, () => {
                    // Play door side
                    if (routeStop.doorSide != undefined) {
                        switch (routeStop.doorSide) {
                            case 1:
                                PlaySound().play('./announcements/Rechts.wav', (err) => {
                                    callback();
                                });
                                break;
                            case 2:
                                PlaySound().play('./announcements/Links.wav', (err) => {
                                    callback();

                                });
                                break;
                            default:
                                callback();
                                break;
                        }
                    }
                });
            });



        }

    }
    }
    async playEndAnnouncement() {
        if (this.announcementsMuted == false) {
            PlaySound().play('./announcements/Ende.wav');
        }
    }


    // Aktiv bei setzen auf GND
    async setAnsageInnen() {
        if (this.deviceConfig.use_gpio == true) {
            this.ansageAussenPin.write(Gpio.HIGH, (err) => {
                if (err) {
                    Util.log('AnsageAussen Pin failed')
                } else {
                    this.ansageInnenPin.write(Gpio.LOW, (err) => {
                        if (err) {
                            Util.log('AnsageInnen failed')
                        }
                    })
                }
            })
   
        }
    }
    async setAnsageAussen() {
        if (this.deviceConfig.use_gpio == true) {
            this.ansageInnenPin.write(Gpio.HIGH, (err) => {
                if (err) {
                    Util.log('AnsageInnen Pin failed')
                } else {
                    this.ansageAussenPin.write(Gpio.LOW, (err) => {
                        if (err) {
                            Util.log('AnsageAussen failed')
                        }
                    })
                }
            })
   
        }
    }
    async unsetAnsage() {
        if (this.deviceConfig.use_gpio == true) {
            this.ansageInnenPin.write(Gpio.HIGH, (err) => {
                if (err) {
                    Util.log('AnsageInnen Pin failed')
                }
            })
            this.ansageAussenPin.write(Gpio.HIGH, (err) => {
                if (err) {
                    Util.log('AnsageAussen Pin failed')
                }
            })

        } 
    }
    
    
}

export { AudioController }