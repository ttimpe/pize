import { Announcement } from './../models/database/Announcement';
import PlaySound from 'play-sound';

class AudioController {

    async playAnnouncement(announcement: Announcement) {

       console.log('PLAY ANNOUNCEMENT', announcement);
       PlaySound().play('./announcements/' + announcement.fileName);

    }

}

export { AudioController }