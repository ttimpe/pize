import * as TelegramGenerator from "../../TelegramGenerator"
import * as IBISController from "../../controllers/IBISController"
import * as IBISTelegram from "../../extensions/IBISTelegram"

class IBISSign {
    address: IBISAddress
    ibisController: IBISController
    status: number
    lastStatusQueriedTime?: Date
    lastStatusReceivedTime?: Date
    constructor(ibisController: IBISController.IBISController, address: IBISAddress) {
        this.address = address
        this.ibisController = ibisController
    }
    
    queryStatus() {
        this.lastStatusQueriedTime = new Date()
        this.ibisController.sendTelegram(TelegramGenerator.TelegramGenerator.DS020(this.address))
    }
    onReceiveTelegram(telegram: IBISTelegram.IBISTelegram) {
        this.lastStatusReceivedTime = new Date()
    }
}
export { IBISSign }