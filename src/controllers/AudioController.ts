import { Announcement } from './../models/database/Announcement';

class AudioController {
    private player = require('play-sound')()

    async playAnnouncement(announcement: Announcement) {
        this.player.play('hello.mp3')
    }

}

export { AudioController }