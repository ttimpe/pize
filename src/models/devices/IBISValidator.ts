import { IBISController } from "../../controllers/IBISController";
import { IBISTelegram } from "../../extensions/IBISTelegram";
import { TelegramGenerator } from "../../TelegramGenerator";

class IBISValidator {
    address: IBISAddress
    constructor(private ibisController: IBISController, address: IBISAddress) {
        this.ibisController = ibisController
        this.address = address
    }

    queryStatus() {
        this.ibisController.sendTelegram(TelegramGenerator.DS070(this.address));
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        
    }
}
export { IBISValidator }