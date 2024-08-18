import { RouteStop } from '../models/database/RouteStop';
import { Announcement } from './../models/database/Announcement';
import PlaySound from 'play-sound';

class AudioController {

    async playAnnouncement(announcement: Announcement) {

       console.log('PLAY ANNOUNCEMENT', announcement);
        PlaySound().play('./announcements/' + announcement.fileName);

    }

    async playStopAnnouncement(routeStop: RouteStop) {
        PlaySound().play('./announcements/Gong.wav');

        if (routeStop.announcement) {
            await this.playAnnouncement(routeStop.announcement);
        }
        // Play door side
        if (routeStop.doorSide != undefined) {
            switch (routeStop.doorSide) {
                case 0:
                    PlaySound().play('./announcements/Rechts.wav');
                    break;
                case 1:
                    PlaySound().play('./announcements/Links.wav');
                    break;
                default:
                    break;
            }
        }
        
    }
    async playEndAnnouncement() {
        PlaySound().play('./announcements/Ende.wav');
    }

}

export { AudioController }