import { IBISController } from "../../controllers/IBISController";
import { IBISTelegram } from "../../extensions/IBISTelegram";

class IBISValidator {
    address: IBISAddress
    constructor(private ibisController: IBISController, address: IBISAddress) {
        this.ibisController = ibisController
        this.address = address
    }

    queryStatus() {
        
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        
    }
}
export { IBISValidator }