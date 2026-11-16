import { TelegramGenerator } from "../../IBISTelegramGenerator"
import { IBISTelegram } from "../../extensions/IBISTelegram"
import { StatusGeraet } from "../../controllers/GeraeteStatusAbfrage"

// Anzeige. Statusantwort a<St> (0 = OK, 1 = angezeigt, 2 = gesucht, 3 = Störung).
class IBISSign implements StatusGeraet {
    address: IBISAddress
    status?: number

    constructor(address: IBISAddress) {
        this.address = address
    }

    get name(): string {
        return 'Anzeige ' + this.address
    }

    get fehlerText(): string {
        return "ANZEIGE.DEF.1:" + this.address.toString().padStart(2, '0')
    }

    abfrageTelegramm(): IBISTelegram {
        return TelegramGenerator.DS020(this.address)
    }

    istAntwort(telegram: IBISTelegram): boolean {
        return /^a[0-9]/.test(telegram as string)
    }

    onAntwort(telegram: IBISTelegram) {
        this.status = parseInt(telegram.substring(1, 2))
    }
}
export { IBISSign }
