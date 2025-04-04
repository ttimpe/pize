import Speaker from 'speaker';
import FFT from 'fft.js';
import { Readable } from 'stream';
import Mic  from 'node-microphone';
import crc from 'crc';
import { IBISController } from './IBISController';

const SAMPLE_RATE = 8000;
const BIT_RATE = 2400;
const FREQ_MARK = 1200;
const FREQ_SPACE = 2400;
const BIT_SYNC = [1, 1, 1, 1, 1, 1];
const FRAME_SYNC = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const FFT_SIZE = 1024;
const TELEGRAM_LENGTH = 69;
const RESPONSE_TELEGRAM_LENGTH = 60;



type RadioMode = 'control_center' | 'vehicle';

enum CallTelegram {
    C00 = 0x0, C01 = 0x1, C02 = 0x2, C03 = 0x3,
    C04 = 0x4, C05 = 0x5, C06 = 0x6, C07 = 0x7,
    C08 = 0x8, C09 = 0x9, C10 = 0xA, C11 = 0xB,
    C12 = 0xC, C13 = 0xD, C14 = 0xE, C15 = 0xF
}

enum ResponseTelegram {
    R00 = 0x0, R01 = 0x1, R02 = 0x2, R03 = 0x3,
    R04 = 0x4, R05 = 0x5, R06 = 0x6, R07 = 0x7,
    R08 = 0x8, R09 = 0x9, R10 = 0xA, R11 = 0xB,
    R12 = 0xC, R13 = 0xD, R14 = 0xE, R15 = 0xF
}

class RadioController {
    private speaker: Speaker;
    private mic: Mic;
    private receivedBits: number[] = [];
    private receivedBytes: number[] = [];
    private mode: RadioMode;

    
    private ibisController?: IBISController

    private radix40Table = " ABCDEFGHIJKLMNOPQRSTUVWXYZ:.=0123456789";

    private fft: FFT = new FFT(FFT_SIZE)
    constructor(mode: RadioMode, ibisController?: IBISController) {
        this.mode = mode;
        this.speaker = new Speaker({
            channels: 1,
            bitDepth: 16,
            sampleRate: SAMPLE_RATE
        });
        this.mic = new Mic({ rate: SAMPLE_RATE, channels: 1 });

        this.ibisController = ibisController
    }
    private encodeRadix40(text: string): number[] {
        const radix40Table = " ABCDEFGHIJKLMNOPQRSTUVWXYZ:.=0123456789";
        let encoded: number[] = [];
        for (let i = 0; i < text.length; i += 3) {
            let value = 0;
            for (let j = 0; j < 3; j++) {
                value *= 40;
                if (i + j < text.length) {
                    let index = radix40Table.indexOf(text[i + j].toUpperCase());
                    if (index === -1) index = 0;
                    value += index;
                }
            }
            encoded.push((value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF);
        }
        return encoded;
    }

    private encodeBCD(value: number, length: number): number {
        let bcd = 0;
        for (let i = 0; i < length; i++) {
            bcd |= (value % 10) << (i * 4);
            value = Math.floor(value / 10);
        }
        return bcd;
    }


    private generateFFSKSignal(data: number[]): Float32Array {
        const samples: number[] = [];
        const symbolDuration = SAMPLE_RATE / BIT_RATE;
        
        for (const bit of data.flatMap(byte => [...byte.toString(2).padStart(8, '0')].map(Number))) {
            const frequency = bit ? FREQ_SPACE : FREQ_MARK;
            for (let i = 0; i < symbolDuration; i++) {
                samples.push(Math.sin(2 * Math.PI * frequency * (i / SAMPLE_RATE)));
            }
        }
        return new Float32Array(samples);
    }

    private transmit(telegram: number[]) {
        const telegramString = telegram.map(b => b.toString(16).padStart(2, '0')).join(' ')
        this.ibisController.sendToWebsocket(JSON.stringify({
            channel: "FUSD",
            data: telegramString
        }))
        console.log("Sending Telegram:", telegramString);
        const ffsSignal = this.generateFFSKSignal(telegram);
        const buffer = Buffer.alloc(ffsSignal.length * 2);
        for (let i = 0; i < ffsSignal.length; i++) {
            buffer.writeInt16LE(ffsSignal[i] * 32767, i * 2);
        }
        this.speaker.write(buffer);
    }

    private sendCallTelegram(type: CallTelegram, data: number[]) {
        const checksum = crc.crc8(Buffer.from(data));
        const telegram = [...BIT_SYNC, ...FRAME_SYNC, type, ...data, checksum];
        this.transmit(telegram);
    }



    public sendCallTelegram_C00(bk: number, fahrzeugadresse: number, za: number, zv: number, zf: number, zw: number) {
        const mode = 0b0000;
        const byte1 = (mode << 4) | ((bk & 0b11) << 2) | ((fahrzeugadresse >> 8) & 0b11);
        const byte2 = fahrzeugadresse & 0xFF;
        const byte3 = ((za & 0b1) << 7) | ((zv & 0b1) << 6) | ((zf & 0b11) << 4) | (zw & 0b1111);
        const infoBytes = [byte1, byte2, byte3, 0x00];
        this.sendCallTelegram(CallTelegram.C00, infoBytes);
    }

    public sendCallTelegram_C01(bk: number, fahrzeugadresse: number, setzeDaten: number, wert: number) {
        const mode = 0b0001;
        const byte1 = (mode << 4) | ((bk & 0b11) << 2) | ((fahrzeugadresse >> 8) & 0b11);
        const byte2 = fahrzeugadresse & 0xFF;
        const byte3 = (setzeDaten & 0b1111) << 4 | ((wert >> 8) & 0x0F);
        const byte4 = wert & 0xFF;
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C01, infoBytes);
    }
    public sendCallTelegram_C02(
        bk: number, fahrzeugadresse: number, innenLautsprecher: boolean,
        mikrofonSender: boolean, loescheAnzeige: boolean, sprachDatenKanal: boolean,
        kanalnummer: number, anweisungSetzen: boolean, quittierung: boolean,
        funktion: number, anweisungsnummer: number
    ) {
        const mode = 0b0010;
        const byte1 = (mode << 4) | ((bk & 0b11) << 2) | ((fahrzeugadresse >> 8) & 0b11);
        const byte2 = fahrzeugadresse & 0xFF;
        const byte3 = ((innenLautsprecher ? 1 : 0) << 7) | ((mikrofonSender ? 1 : 0) << 6) | 
                      ((loescheAnzeige ? 1 : 0) << 5) | ((sprachDatenKanal ? 1 : 0) << 4) | (kanalnummer & 0b1111);
        const byte4 = ((anweisungSetzen ? 1 : 0) << 7) | ((quittierung ? 1 : 0) << 6) |
                      ((funktion & 0b11) << 4) | (anweisungsnummer & 0b1111);
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C02, infoBytes);
    }
    
    public sendCallTelegram_C03(
        liniennummer: number, innenLautsprecher: boolean, mikrofonSender: boolean,
        loescheAnzeige: boolean, sprachDatenKanal: boolean, kanalnummer: number,
        anweisungSetzen: boolean, quittierung: boolean, funktion: number, anweisungsnummer: number
    ) {
        const mode = 0b0011;
        const byte1 = (mode << 4) | ((liniennummer >> 8) & 0x0F);
        const byte2 = liniennummer & 0xFF;
        const byte3 = ((innenLautsprecher ? 1 : 0) << 7) | ((mikrofonSender ? 1 : 0) << 6) | 
                      ((loescheAnzeige ? 1 : 0) << 5) | ((sprachDatenKanal ? 1 : 0) << 4) | (kanalnummer & 0b1111);
        const byte4 = ((anweisungSetzen ? 1 : 0) << 7) | ((quittierung ? 1 : 0) << 6) |
                      ((funktion & 0b11) << 4) | (anweisungsnummer & 0b1111);
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C03, infoBytes);
    }

    public sendCallTelegram_C04(
        bk: number, fahrzeugadresse: number, aa: number, as: number,
        quittiereDatensatz: number, quittiereUeberfallruf: boolean,
        quittiereUnfallruf: boolean, quittiereSprechwunsch: boolean,
        quittiereMeldung: boolean
    ) {
        const mode = 0b0100;
        const byte1 = (mode << 4) | ((bk & 0b11) << 2) | ((fahrzeugadresse >> 8) & 0b11);
        const byte2 = fahrzeugadresse & 0xFF;
        const byte3 = ((aa & 0b1111) << 4) | (as & 0b1111);
        const byte4 = ((quittiereDatensatz & 0b1111) << 4) |
                      ((quittiereUeberfallruf ? 1 : 0) << 3) |
                      ((quittiereUnfallruf ? 1 : 0) << 2) |
                      ((quittiereSprechwunsch ? 1 : 0) << 1) |
                      (quittiereMeldung ? 1 : 0);
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C04, infoBytes);
    }
    
    public sendCallTelegram_C10(
        bk: number, fahrzeugadresse: number,
        abstand: number, anforderungspunkt: number
    ) {
        const mode = 0b1010;
        const byte1 = (mode << 4) | ((bk & 0b11) << 2) | ((fahrzeugadresse >> 8) & 0b11);
        const byte2 = fahrzeugadresse & 0xFF;
        const byte3 = abstand & 0xFF;
        const byte4 = anforderungspunkt & 0xFF;
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C10, infoBytes);
    }
    

    
    public sendCallTelegram_C13(
        bk: number, fahrzeugadresse: number, c14Anzahl: number,
        logischeNummer: number, setzeAnzeige: boolean,
        quittierung: boolean, erstesZeichen: number
    ) {
        const mode = 0b1101;
        const byte1 = (mode << 4) | ((bk & 0b11) << 2) | ((fahrzeugadresse >> 8) & 0b11);
        const byte2 = fahrzeugadresse & 0xFF;
        const byte3 = ((c14Anzahl & 0b11) << 6) | (0b00 << 4) | (logischeNummer & 0b1111);
        const byte4 = ((setzeAnzeige ? 1 : 0) << 7) | ((quittierung ? 1 : 0) << 6) | (erstesZeichen & 0b111111);
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C13, infoBytes);
    }
    public sendCallTelegram_C14(teiltextkennung: boolean, text: string) {
        const mode = 0b1110;
        const byte1 = (mode << 4) | ((teiltextkennung ? 1 : 0) << 3);
        const encodedText = this.encodeRadix40(text);
        while (encodedText.length < 4) {
            encodedText.push(0);
        }
        const infoBytes = [byte1, ...encodedText.slice(0, 3)];
        this.sendCallTelegram(CallTelegram.C14, infoBytes);
    }

    public sendCallTelegram_C15(
        liniennummer: number, abfragetyp: number,
        timestamp: Date
    ) {
        const mode = 0b1111;
        const bcdLiniennummer = this.encodeBCD(liniennummer, 3);
        const byte1 = (mode << 4) | ((bcdLiniennummer >> 8) & 0x0F);
        const byte2 = bcdLiniennummer & 0xFF;
        let zeitOderDatum = 0;
        
        if (abfragetyp & 0b001) {
            const stunden = (timestamp.getHours() & 0b11111) << 8;
            const minuten = (timestamp.getMinutes() & 0b111111);
            zeitOderDatum = stunden | minuten;
        } else {
            const tag = (timestamp.getDate() & 0b11111) << 8;
            const monat = (timestamp.getMonth() + 1) & 0b1111;
            const jahr = (timestamp.getFullYear() % 10) & 0b1111;
            zeitOderDatum = tag | (monat << 4) | jahr;
        }
        
        const byte3 = ((abfragetyp & 0b111) << 5) | ((zeitOderDatum >> 8) & 0b11111);
        const byte4 = zeitOderDatum & 0xFF;
        const infoBytes = [byte1, byte2, byte3, byte4];
        this.sendCallTelegram(CallTelegram.C15, infoBytes);



    }


   
    private decodeFFSKSignal(audioBuffer: Float32Array): number[] {
        const bitStream: number[] = [];
        const segmentSize = SAMPLE_RATE / BIT_RATE;
        
        for (let i = 0; i < audioBuffer.length; i += segmentSize) {
            const segment = audioBuffer.slice(i, i + segmentSize);
            const spectrum = this.fft.createComplexArray();
            this.fft.realTransform(spectrum, segment);
            this.fft.completeSpectrum(spectrum);
            
            let peakFreq = 0;
            let maxMagnitude = 0;
            for (let j = 0; j < spectrum.length / 2; j++) {
                const magnitude = Math.sqrt(spectrum[2 * j] ** 2 + spectrum[2 * j + 1] ** 2);
                if (magnitude > maxMagnitude) {
                    maxMagnitude = magnitude;
                    peakFreq = j * SAMPLE_RATE / FFT_SIZE;
                }
            }
            bitStream.push(peakFreq > (FREQ_MARK + FREQ_SPACE) / 2 ? 1 : 0);
        }
        return bitStream;
    }

    
    public processReceivedBits(bits: number[]) {
        this.receivedBits.push(...bits);
        
        while (this.receivedBits.length >= RESPONSE_TELEGRAM_LENGTH) {
            const index = this.findSyncPattern();
            if (index === -1) {
                this.receivedBits.shift();
                continue;
            }
            
            let telegramLength = TELEGRAM_LENGTH;
            const telegramType = (this.receivedBits[index + 16] & 0b11110000) >> 4;
            if (this.receivedBits.length >= index + RESPONSE_TELEGRAM_LENGTH && telegramType in ResponseTelegram) {
                telegramLength = RESPONSE_TELEGRAM_LENGTH;
            }
            
            if (this.receivedBits.length < index + telegramLength) {
                break;
            }
            
            const telegram = this.receivedBits.slice(index, index + telegramLength);
            this.receivedBits.splice(0, index + telegramLength);
            
            if (telegramLength === TELEGRAM_LENGTH) {
                if (this.mode === 'vehicle') {
                    this.receiveCallTelegram(telegram);
                } else {
                    console.log(`Empfangenes C-Telegramm: ${telegramType}`);
                    this.ibisController.sendToWebsocket(JSON.stringify({
                        channel: "FUED",
                        data: telegram
                    }))
                    switch (telegramType) {
                        case CallTelegram.C00: this.handleC00(telegram); break;
                        case CallTelegram.C01: this.handleC01(telegram); break;
                        case CallTelegram.C02: this.handleC02(telegram); break;
                        case CallTelegram.C03: this.handleC03(telegram); break;
                        case CallTelegram.C04: this.handleC04(telegram); break;
                        case CallTelegram.C10: this.handleC10(telegram); break;
                        case CallTelegram.C13: this.handleC13(telegram); break;
                        case CallTelegram.C14: this.handleC14(telegram); break;
                        case CallTelegram.C15: this.handleC15(telegram); break;
                        default:
                            console.log(`Unbekanntes C-Telegramm: ${telegramType}`);
                    }
                }
            } else if (telegramLength === RESPONSE_TELEGRAM_LENGTH) {
                console.log(`Empfangenes R-Telegramm: ${telegramType}`);
                switch (telegramType) {
                    case ResponseTelegram.R00: this.handleR00(telegram); break;
                    case ResponseTelegram.R01: this.handleR01(telegram); break;
                    case ResponseTelegram.R02: this.handleR02(telegram); break;
                    case ResponseTelegram.R03: this.handleR03(telegram); break;
                    case ResponseTelegram.R04: this.handleR04(telegram); break;
                    case ResponseTelegram.R05: this.handleR05(telegram); break;
                    case ResponseTelegram.R06: this.handleR06(telegram); break;
                    case ResponseTelegram.R07: this.handleR07(telegram); break;
                    case ResponseTelegram.R08: this.handleR08(telegram); break;
                    case ResponseTelegram.R10: this.handleR10(telegram); break;
                    case ResponseTelegram.R14: this.handleR14(telegram); break;
                    case ResponseTelegram.R15: this.handleR15(telegram); break;
                    default:
                        console.log(`Unbekanntes R-Telegramm: ${telegramType}`);
                }
            }
        }
    }


    private findSyncPattern(): number {
        for (let i = 0; i <= this.receivedBits.length - TELEGRAM_LENGTH; i++) {
            if (this.receivedBits.slice(i, i + 6).join('') === BIT_SYNC.join('') &&
                this.receivedBits.slice(i + 6, i + 15).join('') === FRAME_SYNC.join('')) {
                return i;
            }
        }
        return -1;
    }

    private sendResponseTelegram(type: ResponseTelegram, infoBytes: number[]) {
        const startBit = 0b1;
        const lockBit = 0b1;
        const crcBytes = [crc.crc8(Buffer.from(infoBytes)), crc.crc8(Buffer.from(infoBytes.concat(lockBit)))];
        
        const telegram = [
            ...BIT_SYNC,
            ...FRAME_SYNC,
            startBit,
            ...infoBytes,
            lockBit,
            ...crcBytes[0].toString(2).padStart(8, '0').split('').map(Number),
            lockBit,
            ...crcBytes[1].toString(2).padStart(8, '0').split('').map(Number)
        ];
        
        this.transmit(telegram);
    }

    public sendResponseTelegram_R00(besetzgrad: number, wegzaehler: number, tuerSchliessWeg: number) {
        const mode = 0b0000;
        const byte1 = (mode << 4) | ((besetzgrad & 0b111) << 1) | ((wegzaehler >> 8) & 0b1);
        const byte2 = wegzaehler & 0xFF;
        const byte3 = tuerSchliessWeg & 0x7F; // Höchstwertiges Bit ist nicht gesetzt
        this.sendResponseTelegram(ResponseTelegram.R00, [byte1, byte2, byte3]);
    }
    public sendResponseTelegram_R01(fahrereingabe: boolean, fahrzeuglaenge: number, ortsmarke: number, zaehlerstand: number, ueberlauf: boolean, ueberlaufAnzahl: number) {
        const mode = 0b0001;
        const byte1 = (mode << 4) | ((fahrereingabe ? 1 : 0) << 3) | (fahrzeuglaenge & 0b111);
        let byte2, byte3;
        
        if (fahrereingabe) {
            byte2 = ((ortsmarke / 1000) % 10) << 4 | ((ortsmarke / 100) % 10);
            byte3 = ((ortsmarke / 10) % 10) << 4 | (ortsmarke % 10);
        } else {
            if (ueberlauf) {
                byte2 = 0xFF; // 8 mal 1 für Überlauf
                byte3 = ueberlaufAnzahl & 0xFF;
            } else {
                byte2 = (ortsmarke & 0x0F) << 4 | ((zaehlerstand >> 8) & 0x0F);
                byte3 = zaehlerstand & 0xFF;
            }
        }
        
        this.sendResponseTelegram(ResponseTelegram.R01, [byte1, byte2, byte3]);
    }    
    public sendResponseTelegram_R02(meldungsart1: number, meldung1: number, meldungsart2: number, meldung2: number) {
        const mode = 0b0010;
        const byte1 = (mode << 4) | 0b0000; // 4 reservierte Bits = 0
        const byte2 = ((meldungsart1 & 0b1111) << 4) | (meldung1 & 0b1111);
        const byte3 = ((meldungsart2 & 0b1111) << 4) | (meldung2 & 0b1111);
        this.sendResponseTelegram(ResponseTelegram.R02, [byte1, byte2, byte3]);
    }


    public sendResponseTelegram_R03(fahrereingabe: boolean, fahrzeugposition: number, einsteiger: number, aussteiger: number) {
        const mode = 0b0011;
        const byte1 = (mode << 4) | ((fahrereingabe ? 1 : 0) << 3) | (fahrzeugposition & 0b111);
        let byte2, byte3;
        
        if (fahrereingabe) {
            byte2 = 0x00; // 8 x 0, wenn Fahrereingabe aktiv
            byte3 = ((aussteiger % 10) | ((aussteiger / 10) % 10) << 4) & 0xFF; // BCD-kodiert, rechtsbündig
        } else {
            byte2 = einsteiger & 0xFF;
            byte3 = aussteiger & 0xFF;
        }
        
        this.sendResponseTelegram(ResponseTelegram.R03, [byte1, byte2, byte3]);
    }


    public sendResponseTelegram_R04(liniennummer: number, kursnummer: number) {
        const mode = 0b0100;
        const byte1 = (mode << 4) | ((liniennummer / 100) % 10);
        const byte2 = (((liniennummer / 10) % 10) << 4) | (liniennummer % 10);
        const byte3 = (((kursnummer / 10) % 10) << 4) | (kursnummer % 10);
        this.sendResponseTelegram(ResponseTelegram.R04, [byte1, byte2, byte3]);
    }


    public sendResponseTelegram_R05(fahrernummer: number) {
        const mode = 0b0101;
        const byte1 = (mode << 4) | ((fahrernummer / 10000) % 10);
        const byte2 = (((fahrernummer / 1000) % 10) << 4) | ((fahrernummer / 100) % 10);
        const byte3 = (((fahrernummer / 10) % 10) << 4) | (fahrernummer % 10);
        this.sendResponseTelegram(ResponseTelegram.R05, [byte1, byte2, byte3]);
    }


    public sendResponseTelegram_R06(fahrzeugnummer: number, wagennummer: number, betriebskennung: number, fahrzeugadresse: number) {
        const mode = 0b0110;
        const reserviert = 0b0;
        let byte1 :any, byte2: any, byte3: any;
        
        if (wagennummer === 0b1111) {
            byte1 = (mode << 4) | (reserviert << 3) | (fahrzeugnummer & 0b111);
            byte2 = ((betriebskennung & 0b11) << 6) | ((fahrzeugadresse >> 8) & 0b111111);
            byte3 = fahrzeugadresse & 0xFF;
        } else {
            byte1 = (mode << 4) | (reserviert << 3) | (fahrzeugnummer & 0b111);
            byte2 = ((wagennummer / 10) << 4) | (wagennummer % 10);
            byte3 = 0x00; // Füllt das letzte Byte auf
        }
        
        this.sendResponseTelegram(ResponseTelegram.R06, [byte1, byte2, byte3]);
    }

    public sendResponseTelegram_R07(zielnummer: number) {
        const mode = 0b0111;
        const byte1 = (mode << 4) | 0b0000; // 8 reservierte Bits = 0
        const byte2 = ((zielnummer / 100) % 10 << 4) | ((zielnummer / 10) % 10);
        const byte3 = (zielnummer % 10) << 4; // Rechtsbündig BCD, letzte 4 Bits sind 0
        this.sendResponseTelegram(ResponseTelegram.R07, [byte1, byte2, byte3]);
    }

    public sendResponseTelegram_R08(geraetenummer: number) {
        const mode = 0b1000;
        const reserviert = 0b0000000000; // 10 reservierte Bits = 0
        const byte1 = (mode << 4) | ((reserviert >> 6) & 0x0F);
        const byte2 = ((reserviert & 0x3F) << 2) | ((geraetenummer >> 8) & 0x03);
        const byte3 = geraetenummer & 0xFF; // Niederwertige 8 Bits der Gerätenummer
        this.sendResponseTelegram(ResponseTelegram.R08, [byte1, byte2, byte3]);
    }

    public sendResponseTelegram_R10(liniennummer: number, anforderungspunkt: number) {
        const mode = 0b1001;
        const byte1 = (mode << 4) | ((liniennummer / 100) % 10);
        const byte2 = (((liniennummer / 10) % 10) << 4) | (liniennummer % 10);
        const byte3 = anforderungspunkt & 0xFF;
        this.sendResponseTelegram(ResponseTelegram.R10, [byte1, byte2, byte3]);
    }
    public sendResponseTelegram_R14(wegzaehlerVorletzte: number, wegzaehlerDrittletzte: number) {
        const mode = 0b1101;
        const byte1 = (mode << 4) | 0b0000; // 4 reservierte Bits = 0
        const byte2 = wegzaehlerVorletzte & 0x7F; // 8 Bit ohne höchstwertiges Bit
        const byte3 = wegzaehlerDrittletzte & 0x7F; // 8 Bit ohne höchstwertiges Bit
        this.sendResponseTelegram(ResponseTelegram.R14, [byte1, byte2, byte3]);
    }

    public sendResponseTelegram_R15(ueberfallruf: boolean, unfallruf: boolean, sprechwunsch: boolean, anmeldung: boolean, fahrermeldung: number, betriebskennung: number, fahrzeugadresse: number) {
        const mode = 0b1111;
        const byte1 = (mode << 4) | ((ueberfallruf ? 1 : 0) << 3) | ((unfallruf ? 1 : 0) << 2) | ((sprechwunsch ? 1 : 0) << 1) | (anmeldung ? 1 : 0);
        const byte2 = ((fahrermeldung & 0b1111) << 4) | (betriebskennung & 0b11);
        const byte3 = fahrzeugadresse & 0xFF;
        this.sendResponseTelegram(ResponseTelegram.R15, [byte1, byte2, byte3]);
    }

    public playFFSKBits(bits: number[]) {
        const buffer = Buffer.alloc(bits.length * 2);
        for (let i = 0; i < bits.length; i++) {
            const freq = bits[i] === 1 ? FREQ_SPACE : FREQ_MARK;
            const sample = Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)) * 32767;
            buffer.writeInt16LE(sample, i * 2);
        }
        this.speaker.write(buffer);
    }




    public receiveCallTelegram(data: number[]) {
        if (data.length !== TELEGRAM_LENGTH) return;
        const mode = (data[15] >> 4) & 0x0F; // Modus aus dem ersten Info-Byte extrahieren
        const callType = mode as CallTelegram;
        
        switch (callType) {
            case CallTelegram.C00:
                this.handleC00(data);
                break;
            case CallTelegram.C01:
                this.handleC01(data);
                break;
            case CallTelegram.C02:
                this.handleC02(data);
                break;
            case CallTelegram.C03:
                this.handleC03(data);
                break;
            case CallTelegram.C04:
                this.handleC04(data);
                break;
            case CallTelegram.C10:
                this.handleC10(data)
                break;
            case CallTelegram.C13:
                this.handleC13(data)
                break;
            case CallTelegram.C14:
                this.handleC14(data)
                break;
            case CallTelegram.C15:
                this.handleC15(data)
                break;

            default:
                console.log("Unbekanntes C-Telegramm erhalten:", data);
        }
    }

    
    private handleC00(data: number[]) {
        const betriebskennziffer = (data[16] & 0b11);
        const fahrzeugadresse = ((data[16] & 0b1111111100) >> 2) | (data[17] << 8);
        const zeitart = (data[18] & 0b10000000) >> 7;
        const zeitvorzeichen = (data[18] & 0b01000000) >> 6;
        const zeitfaktor = (data[18] & 0b00110000) >> 4;
        const zahlenwert = (data[18] & 0b00001111);

        console.log(`C00 empfangen - BK: ${betriebskennziffer}, Fahrzeugadresse: ${fahrzeugadresse}, Zeitart: ${zeitart}, Zeitvorzeichen: ${zeitvorzeichen}, Zeitfaktor: ${zeitfaktor}, Zahlenwert: ${zahlenwert}`);
        
    }

    private bcdToNumber(bcd: number): number {
        return ((bcd >> 8) & 0x0F) * 100 + ((bcd >> 4) & 0x0F) * 10 + (bcd & 0x0F);
    }

    private handleC01(data: number[]) {
        const setzeDatenTyp = (data[16] & 0b1111);
        const wert = (data[17] << 4) | (data[18] & 0b1111);
        const decodedValue = this.bcdToNumber(wert);
        
        console.log(`C01 empfangen - Setze Daten Typ: ${setzeDatenTyp}, Wert: ${decodedValue}`);

        switch (setzeDatenTyp) {
            case 0b0000:
                console.log(`Setze Liniennummer: ${decodedValue}`);
                break;
            case 0b0001:
                console.log(`Setze Kursnummer: ${decodedValue}`);
                break;
            case 0b0010:
                console.log(`Setze Anschluss abwarten für Linie: ${decodedValue}`);
                break;
            case 0b0011:
                console.log(`Setze Zielnummer: ${decodedValue}`);
                break;
            case 0b0100:
                console.log(`Setze Entwerterzone: ${decodedValue}`);
                break;
            case 0b0101:
                console.log(`Setze Entwerterkurzstrecke: ${decodedValue}`);
                break;
            case 0b0110:
                console.log(`Setze Linie vorlassen: ${decodedValue}`);
                break;
            case 0b0111:
                const entwerterNummer = (wert & 0xF0) >> 4;
                const wegZaehlerStand = wert & 0x0F;
                console.log(`Setze Entwerter ${entwerterNummer} bei Wegzählerstand ${wegZaehlerStand}`);
                break;
            case 0b1010:
            case 0b1111:
                console.log("Reserviert für Bedarfsbetrieb");
                break;
            default:
                console.log("Unbekannter Datentyp");
        }
    }
    private handleC02(data: number[]) {
        const innenLautsprecher = (data[16] & 0b10000000) >> 7;
        const mikrofonEinschalten = (data[16] & 0b01000000) >> 6;
        const anzeigeLoeschen = (data[16] & 0b00100000) >> 5;
        const sprachDatenKanal = (data[16] & 0b00010000) >> 4;
        const kanalnummer = (data[16] & 0b00001111);
        const anweisungSetzen = (data[17] & 0b10000000) >> 7;
        const quittierungErforderlich = (data[17] & 0b01000000) >> 6;
        const funktion = (data[17] & 0b00110000) >> 4;
        const anweisungsnummer = (data[17] & 0b00001111);

        console.log(`C02 empfangen - Innenlautsprecher: ${innenLautsprecher}, Mikrofon: ${mikrofonEinschalten}, Anzeige löschen: ${anzeigeLoeschen}, Sprach/Datenkanal: ${sprachDatenKanal}, Kanalnummer: ${kanalnummer}, Anweisung setzen: ${anweisungSetzen}, Quittierung erforderlich: ${quittierungErforderlich}, Funktion: ${funktion}, Anweisungsnummer: ${anweisungsnummer}`);

        if (funktion === 0b10) { // Schaltanweisung
            switch (anweisungsnummer) {
                case 0b0001:
                    console.log("Abfahrtsignal geben");
                    break;
                case 0b0010:
                    console.log(anweisungSetzen ? "Fahrgastzählung ein" : "Fahrgastzählung aus");
                    break;
                case 0b0100:
                    console.log(anweisungSetzen ? "Bedarfsbetrieb ein" : "Bedarfsbetrieb aus");
                    break;
                case 0b0111:
                    console.log("Reserviert für Bedarfsbetrieb");
                    break;
                default:
                    console.log("Unbekannte Schaltanweisung");
            }
        } else if (funktion === 0b01) { // Fahreranweisung
            switch (anweisungsnummer) {
                case 0b0001:
                    console.log("Besetzung melden");
                    break;
                case 0b0010:
                    console.log("Standort eingeben durch den Fahrer");
                    break;
                case 0b0011:
                case 0b1010:
                    console.log("Fahrermeldung anzeigen");
                    break;
                default:
                    console.log("Unbekannte Fahreranweisung");
            }
        }
    }

    private handleC03(data: number[]) {
        const liniennummer = this.bcdToNumber((data[16] << 8) | data[17]);
        const innenLautsprecher = (data[18] & 0b10000000) >> 7;
        const mikrofonEinschalten = (data[18] & 0b01000000) >> 6;
        const anzeigeLoeschen = (data[18] & 0b00100000) >> 5;
        const sprachDatenKanal = (data[18] & 0b00010000) >> 4;
        const kanalnummer = (data[18] & 0b00001111);
        const anweisungSetzen = (data[19] & 0b10000000) >> 7;
        const quittierungErforderlich = (data[19] & 0b01000000) >> 6;
        const funktion = (data[19] & 0b00110000) >> 4;
        const anweisungsnummer = (data[19] & 0b00001111);

        console.log(`C03 empfangen - Liniennummer: ${liniennummer}, Innenlautsprecher: ${innenLautsprecher}, Mikrofon: ${mikrofonEinschalten}, Anzeige löschen: ${anzeigeLoeschen}, Sprach/Datenkanal: ${sprachDatenKanal}, Kanalnummer: ${kanalnummer}, Anweisung setzen: ${anweisungSetzen}, Quittierung erforderlich: ${quittierungErforderlich}, Funktion: ${funktion}, Anweisungsnummer: ${anweisungsnummer}`);

        if (funktion === 0b10) { // Schaltanweisung
            switch (anweisungsnummer) {
                case 0b0001:
                    console.log("Abfahrtsignal geben");
                    break;
                case 0b0010:
                    console.log(anweisungSetzen ? "Fahrgastzählung ein" : "Fahrgastzählung aus");
                    break;
                case 0b0100:
                    console.log(anweisungSetzen ? "Bedarfsbetrieb ein" : "Bedarfsbetrieb aus");
                    break;
                case 0b0111:
                    console.log("Reserviert für Bedarfsbetrieb");
                    break;
                default:
                    console.log("Unbekannte Schaltanweisung");
            }
        } else if (funktion === 0b01) { // Fahreranweisung
            switch (anweisungsnummer) {
                case 0b0001:
                    console.log("Besetzung melden");
                    break;
                case 0b0010:
                    console.log("Standort eingeben durch den Fahrer");
                    break;
                case 0b0011:
                case 0b1010:
                    console.log("Fahrermeldung anzeigen");
                    break;
                default:
                    console.log("Unbekannte Fahreranweisung");
            }
        }
    }

   private handleC04(data: number[]) {
        const abfragetyp = (data[16] & 0b1111);
        const subtyp = (data[17] & 0b1111);
        const quittierungsbits = (data[18] & 0b1111);
        const ueberfallQuittierung = (data[18] & 0b10000) >> 4;
        const unfallQuittierung = (data[18] & 0b100000) >> 5;
        const sprechwunschQuittierung = (data[18] & 0b1000000) >> 6;
        const meldungQuittierung = (data[18] & 0b10000000) >> 7;

        console.log(`C04 empfangen - Abfragetyp: ${abfragetyp}, Subtyp: ${subtyp}, Quittierungsbits: ${quittierungsbits}, Überfall: ${ueberfallQuittierung}, Unfall: ${unfallQuittierung}, Sprechwunsch: ${sprechwunschQuittierung}, Meldung: ${meldungQuittierung}`);

        if (abfragetyp === 0b0001 && subtyp === 0b0000) {
            console.log("Nenne Ortsmarke");
        } else if (abfragetyp === 0b0001 && subtyp === 0b0001) {
            console.log("Nenne Anzahl Überläufe");
        } else if (abfragetyp === 0b0110) {
            console.log(`Nenne Wagennummer des Wagens im Zugverbund, Stellung: ${subtyp}`);
        } else if (abfragetyp === 0b1110 && subtyp === 0b0000) {
            console.log("Nenne Wegzählerstand bei zweit- und drittletzter Haltestelle");
        } else if (abfragetyp === 0b1110 && subtyp === 0b0001) {
            console.log("Nenne Wegzählerstand bei viert- und fünftletzter Haltestelle");
        } else if (abfragetyp === 0b1111) {
            console.log("Keine Bedeutung");
        }

        if (ueberfallQuittierung) console.log("Quittierung für Überfallruf");
        if (unfallQuittierung) console.log("Quittierung für Unfallruf");
        if (sprechwunschQuittierung) console.log("Quittierung für Sprechwunsch");
        if (meldungQuittierung) console.log("Quittierung für Meldung");
    }
    public handleC05(data: number[]) {
        
    }
    public handleC06(data: number[]) {

    }
    public handleC07(data: number[]) {

    }
    public handleC08(data: number[]) {
        
    }

    public handleC09(data: number[]) {

    }
    private handleC10(data: number[]) {
        const betriebskennziffer = (data[16] & 0b11);
        const fahrzeugadresse = ((data[16] & 0b1111111100) >> 2) | (data[17] << 8);
        const abstand = Number(data[18]);
        const anforderungspunkt = Number(data[19]);

        console.log(`C10 empfangen - BK: ${betriebskennziffer}, Fahrzeugadresse: ${fahrzeugadresse}, Abstand: ${abstand * 10}m, Anforderungspunkt: ${anforderungspunkt}`);
    }
    public handleC11(data: number[]) {
        
    }
    public handleC12(data: number[]) {

    }

    private decodeRadix40(value: number): string {
        return this.radix40Table[value] || '?';
    }
    private handleC13(data: number[]) {
        const betriebskennziffer = (data[16] & 0b11);
        const fahrzeugadresse = ((data[16] & 0b1111111100) >> 2) | (data[17] << 8);
        const anzahlC14 = (data[18] & 0b11000000) >> 6;
        const reserviert = (data[18] & 0b00110000) >> 4;
        const logischeTextnummer = (data[18] & 0b00001111);
        const setzeAnzeige = (data[19] & 0b10000000) >> 7;
        const quittierungErforderlich = (data[19] & 0b01000000) >> 6;
        const erstesZeichen = data[19] & 0b00111111;
        const decodedZeichen = this.decodeRadix40(erstesZeichen);

        console.log(`C13 empfangen - BK: ${betriebskennziffer}, Fahrzeugadresse: ${fahrzeugadresse}, Anzahl C14: ${anzahlC14}, Logische Textnummer: ${logischeTextnummer}, Setze Anzeige: ${setzeAnzeige}, Quittierung erforderlich: ${quittierungErforderlich}, Erstes Zeichen: ${decodedZeichen}`);
    }


    private handleC14(data: number[]) {
        const teiltextkennung = (data[16] & 0b10000000) >> 7;
        const textBits = ((data[16] & 0b01111111) << 20) | (data[17] << 12) | (data[18] << 4) | ((data[19] & 0b11110000) >> 4);
        
        const zeichen1 = this.decodeRadix40((textBits / (40 * 40)) % 40);
        const zeichen2 = this.decodeRadix40((textBits / 40) % 40);
        const zeichen3 = this.decodeRadix40(textBits % 40);
        
        console.log(`C14 empfangen - Teiltextkennung: ${teiltextkennung}, Text: ${zeichen1}${zeichen2}${zeichen3}`);
    }
    private decodeBCD(value: number): number {
        return ((value >> 8) & 0x0F) * 100 + ((value >> 4) & 0x0F) * 10 + (value & 0x0F);
    }

    private handleC15(data: number[]) {
        const liniennummerBCD = (data[16] << 8) | data[17];
        const liniennummer = this.decodeBCD(liniennummerBCD);
        const abfragetyp = (data[17] & 0b00000111);
        const zeitOderDatum = ((data[18] << 5) | ((data[19] & 0b11111000) >> 3));

        console.log(`C15 empfangen - Liniennummer: ${liniennummer}, Abfragetyp: ${abfragetyp}`);

        if (abfragetyp & 0b1) {
            const stunden = (zeitOderDatum >> 8) & 0b11;
            const minuten = zeitOderDatum & 0x3F;
            console.log(`Uhrzeit: ${stunden}:${minuten}`);
            this.verarbeiteUhrzeit(stunden, minuten);
        } else {
            const tag = (zeitOderDatum >> 9) & 0b11111;
            const monat = (zeitOderDatum >> 5) & 0b1111;
            const jahr = zeitOderDatum & 0b1111;
            console.log(`Datum: ${tag}.${monat}.20${jahr}`);
            this.verarbeiteDatum(tag, monat, jahr);
        }
    }

    private verarbeiteUhrzeit(stunden: number, minuten: number) {
        console.log(`Verarbeite Uhrzeit: ${stunden}:${minuten}`);
    }

    private verarbeiteDatum(tag: number, monat: number, jahr: number) {
        console.log(`Verarbeite Datum: ${tag}.${monat}.20${jahr}`);
    }
    

    // Leitstellenempfang

    private handleR00(data: number[]) {
        const besetzgrad = (data[16] & 0b11100000) >> 5;
        const wegzaehlerstand = ((data[16] & 0b00011111) << 4) | ((data[17] & 0b11110000) >> 4);
        const letzterTuerSchliessWegzaehler = ((data[17] & 0b00001111) << 4) | (data[18] & 0b1111);

        console.log(`R00 empfangen - Besetzgrad: ${besetzgrad}, Wegzählerstand: ${wegzaehlerstand * 10}m, Letzter Türschließ-Wegzähler: ${letzterTuerSchliessWegzaehler * 10}m`);
    }


    private handleR01(data: number[]) {
        const fahrereingabe = (data[16] & 0b10000000) >> 7;
        const fahrzeuglaenge = (data[16] & 0b01110000) >> 4;
        let standortOderOrtsmarke: number;
        let wegzaehlerstandOderUeberlauf: number;

        if (fahrereingabe) {
            standortOderOrtsmarke = this.decodeBCD((data[17] << 8) | data[18]);
            console.log(`R01 empfangen - Fahrereingabe: Ja, Standort: ${standortOderOrtsmarke}`);
        } else {
            standortOderOrtsmarke = data[17];
            wegzaehlerstandOderUeberlauf = (data[18] === 0xFF) ? 255 : data[18] * 10;
            console.log(`R01 empfangen - Fahrereingabe: Nein, Ortsmarkennummer: ${standortOderOrtsmarke}, Wegzählerstand: ${wegzaehlerstandOderUeberlauf}m`);
        }
    }

    private handleR02(data: number[]) {
        const meldungsart1 = (data[16] & 0b11110000) >> 4;
        const meldung1 = (data[16] & 0b00001111);
        const meldungsart2 = (data[17] & 0b11110000) >> 4;
        const meldung2 = (data[17] & 0b00001111);

        console.log(`R02 empfangen - Meldungsart 1: ${meldungsart1}, Meldung 1: ${meldung1}, Meldungsart 2: ${meldungsart2}, Meldung 2: ${meldung2}`);
    }

    private handleR03(data: number[]) {
        const fahrereingabe = (data[16] & 0b10000000) >> 7;
        const fahrzeugposition = (data[16] & 0b01110000) >> 4;
        let einsteiger: number;
        let aussteiger: number;

        if (fahrereingabe) {
            aussteiger = this.decodeBCD(data[17]);
            console.log(`R03 empfangen - Fahrereingabe: Ja, Aussteiger: ${aussteiger}`);
        } else {
            einsteiger = data[17];
            aussteiger = data[18];
            console.log(`R03 empfangen - Fahrereingabe: Nein, Fahrzeugposition: ${fahrzeugposition}, Einsteiger: ${einsteiger}, Aussteiger: ${aussteiger}`);
        }
    }

    private handleR04(data: number[]) {
        const liniennummer = this.decodeBCD((data[16] << 8) | data[17]);
        const kursnummer = this.decodeBCD(data[18]);

        console.log(`R04 empfangen - Liniennummer: ${liniennummer}, Kursnummer: ${kursnummer}`);
    }

    private handleR05(data: number[]) {
        const fahrernummer = this.decodeBCD((data[16] << 16) | (data[17] << 8) | data[18]);
        console.log(`R05 empfangen - Fahrernummer: ${fahrernummer}`);
    }

    private handleR06(data: number[]) {
        const reserviert = (data[16] & 0b10000000) >> 7;
        const fahrzeugposition = (data[16] & 0b01110000) >> 4;
        const wagennummer = data[16] & 0b00001111;

        if (wagennummer === 0b1111) {
            const betriebskennung = (data[17] & 0b11000000) >> 6;
            const fahrzeugadresse = ((data[17] & 0b00111111) << 8) | data[18];
            console.log(`R06 empfangen - Fahrzeugposition: ${fahrzeugposition}, Betriebskennung: ${betriebskennung}, Fahrzeugadresse: ${fahrzeugadresse}`);
        } else {
            const wagennummerBCD = this.decodeBCD((data[17] << 8) | data[18]);
            console.log(`R06 empfangen - Fahrzeugposition: ${fahrzeugposition}, Wagennummer: ${wagennummerBCD}`);
        }
    }
    private handleR07(data: number[]) {
        const zielnummer = this.decodeBCD((data[16] << 8) | data[17]);
        console.log(`R07 empfangen - Zielnummer: ${zielnummer}`);
    }
    private handleR08(data: number[]) {
        const geraetenummer = ((data[16] << 8) | data[17]) & 0x03FF;
        console.log(`R08 empfangen - Gerätenummer: ${geraetenummer}`);
    }
    private handleR10(data: number[]) {
        const liniennummer = this.decodeBCD((data[16] << 8) | data[17]);
        const anforderungsdaten = data[18];
        console.log(`R10 empfangen - Liniennummer: ${liniennummer}, Anforderungsdaten: ${anforderungsdaten}`);
    }
    private handleR14(data: number[]) {
        const wegzaehlerVorletzte = data[16];
        const wegzaehlerDrittletzte = data[17];
        console.log(`R14 empfangen - Wegzähler vorletzter Türschluss: ${wegzaehlerVorletzte * 10}m, Wegzähler drittletzter Türschluss: ${wegzaehlerDrittletzte * 10}m`);
    }


    private handleR15(data: number[]) {
        const ueberfallruf = (data[16] & 0b10000000) >> 7;
        const unfallruf = (data[16] & 0b01000000) >> 6;
        const sprechwunsch = (data[16] & 0b00100000) >> 5;
        const anmeldung = (data[16] & 0b00010000) >> 4;
        const fahrermeldung = data[16] & 0b00001111;
        const betriebskennung = (data[17] & 0b11000000) >> 6;
        const fahrzeugadresse = ((data[17] & 0b00111111) << 8) | data[18];
        
        console.log(`R15 empfangen - Überfallruf: ${ueberfallruf}, Unfallruf: ${unfallruf}, Sprechwunsch: ${sprechwunsch}, Anmeldung: ${anmeldung}, Fahrermeldung: ${fahrermeldung}, Betriebskennung: ${betriebskennung}, Fahrzeugadresse: ${fahrzeugadresse}`);
    }

    public startListening() {
        const stream = this.mic.startRecording();
        stream.on('data', (chunk: Buffer) => {
            const int16Array = new Int16Array(chunk.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32767;
            }
            this.receivedBits.push(...this.decodeFFSKSignal(float32Array));
            
        });
        console.log("Listening for FFSK signals...");
    }




   

    public stopListening() {
        this.mic.stopRecording();
        console.log("Stopped listening to FFSK signals.");
    }
}


export { RadioController }