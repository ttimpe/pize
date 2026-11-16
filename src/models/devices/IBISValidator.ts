import { IBISTelegram } from "../../extensions/IBISTelegram";
import { TelegramGenerator } from "../../IBISTelegramGenerator";
import { StatusGeraet } from "../../controllers/GeraeteStatusAbfrage";

// Entwerter. Statusantwort g<St> (0 = OK, 1 = Störung, …) enthält keine Adresse; die Zuordnung
// übernimmt GeraeteStatusAbfrage über die gerade offene Abfrage.
class IBISValidator implements StatusGeraet {
    address: IBISAddress
    status?: number

    constructor(address: IBISAddress) {
        this.address = address
    }

    get name(): string {
        return 'Entwerter ' + this.address
    }

    get fehlerText(): string {
        return "ENTWERT.DEF.1:" + this.address.toString().padStart(2, '0')
    }

    abfrageTelegramm(): IBISTelegram {
        return TelegramGenerator.DS070(this.address)
    }

    istAntwort(telegram: IBISTelegram): boolean {
        return /^g[0-9]/.test(telegram as string)
    }

    onAntwort(telegram: IBISTelegram) {
        this.status = parseInt(telegram.substring(1, 2))
    }
}
export { IBISValidator }
