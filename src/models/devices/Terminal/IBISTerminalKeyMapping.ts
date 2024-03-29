import { IBISTerminalKey } from "../../../enums/IBISTerminalKey"
import { IBISTerminalKeyAction } from "./IBISTerminalKeyAction"

class IBISTerminalKeyMapping {
    textLine1: string = ""
    textLine2: string = ""
    isPrompt: boolean = false
    isBlinking: boolean = false
    action?: IBISTerminalKeyAction
    key: IBISTerminalKey
}
export { IBISTerminalKeyMapping }