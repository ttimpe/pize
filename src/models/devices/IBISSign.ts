import { TelegramGenerator } from "../../TelegramGenerator"
import { IBISController } from "../../controllers/IBISController"
import { IBISTelegram } from "../../extensions/IBISTelegram"

class IBISSign {
    address: IBISAddress
    status: number
    lastStatusQueriedTime?: Date
    lastStatusReceivedTime?: Date
    constructor(private ibisController: IBISController, address: IBISAddress) {
        this.address = address
        this.ibisController = ibisController
    }
    
    queryStatus() {
        this.lastStatusQueriedTime = new Date()
        this.ibisController.sendTelegram(TelegramGenerator.DS020(this.address))
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        this.lastStatusReceivedTime = new Date()
    }
}
export { IBISSign }