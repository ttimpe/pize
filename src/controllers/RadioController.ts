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

    // Ortsmeldung an die Leitstelle: wird vom LocationController bei erkannter
    // Ortsbake aufgerufen. Bis zur echten FFSK-Implementierung nur geloggt.
    updateLocation(ortNr: number, ormaCode: number) {
        console.log("RadioController (Stub) updateLocation", ortNr, ormaCode);
    }
}