import { IBISController } from './IBISController';

export class RadioController {
    constructor(public mode: string, public ibisController: IBISController) { }

    startListening() {
        console.log("RadioController (Stub) listening...");
    }

    playFFSKBits(bits: any) {
        console.log("RadioController (Stub) playFFSKBits", bits);
    }

    processWavUpload(data: any, filename: string) {
        console.log("RadioController (Stub) processWavUpload", filename);
    }

    setFunkrueckfallEnabled(enabled: boolean) {
        console.log("RadioController (Stub) setFunkrueckfallEnabled", enabled);
    }
}