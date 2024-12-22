import { RouteStop } from '../models/database/RouteStop';
import { Announcement } from './../models/database/Announcement';
import PlaySound from 'play-sound';
import { Util } from "../util"
import { Chip, Line as ChipLine } from "node-libgpiod";
import { DeviceConfig } from '../models/devices/DeviceConfig';

class AudioController {

    announcementsMuted: boolean = false;
    lastAnnouncement?: Announcement
    private deviceConfig: DeviceConfig = require('../../device_config.json')
    private chip: Chip
    private ansageInnenLine: ChipLine
    private ansageAussenLine: ChipLine

    constructor() {
        this.chip = new Chip(0)
        this.ansageInnenLine = new ChipLine(this.chip, this.deviceConfig.GPIO_PINOUT.FLE);
        this.ansageAussenLine = new ChipLine(this.chip, this.deviceConfig.GPIO_PINOUT.PLE);

        // Set initial state for pins

        this.ansageInnenLine.requestOutputMode()
        this.ansageAussenLine.requestOutputMode()

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

    async setAnsageInnen() {
        this.ansageAussenLine.setValue(0)
        this.ansageInnenLine.setValue(1)
    }
    async setAnsageAussen() {
        this.ansageInnenLine.setValue(0)
        this.ansageAussenLine.setValue(1)
    }
    
    
}

export { AudioController }