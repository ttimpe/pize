import { RouteStop } from '../models/database/RouteStop';
import { Announcement } from './../models/database/Announcement';
import PlaySound from 'play-sound';

class AudioController {

    announcementsMuted: boolean = false;
    async playAnnouncement(announcement: Announcement, callback: Function) {
        if (this.announcementsMuted == false) {

        console.log('PLAY ANNOUNCEMENT', announcement);
        PlaySound().play('./announcements/' + announcement.fileName, (err) => {
            callback();
        })

    }
    }

    async playStopAnnouncement(routeStop: RouteStop, callback: Function) {
        if (this.announcementsMuted == false) {

        if (routeStop.announcement) {
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

}

export { AudioController }