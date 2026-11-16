import { IBISTelegram } from "../extensions/IBISTelegram"
import { Util } from "../util"

// Ein Gerät, dessen Status reihum abgefragt wird (Anzeige, Entwerter, Haltestellenansage).
export interface StatusGeraet {
    name: string
    abfrageTelegramm(): IBISTelegram
    // Antwort-Typ prüfen. Antworten tragen oft keine Adresse (z.B. g0), deshalb wird eine Antwort
    // nur dem Gerät zugeordnet, dessen Abfrage gerade offen ist.
    istAntwort(telegram: IBISTelegram): boolean
    onAntwort(telegram: IBISTelegram): void
    fehlerText: string
}

// Statusabfrage nach dem Muster der HPW ZRE4: alle 16 s eine Runde über alle Geräte, immer nur
// eine Abfrage offen, ohne Antwort bis zu 4 Versuche im Abstand von 1 s, erst dann Fehler.
export class GeraeteStatusAbfrage {
    private RUNDEN_INTERVALL_S = 16
    private WIEDERHOLUNG_MS = 1000
    private MAX_VERSUCHE = 4

    private geraete: StatusGeraet[] = []
    private defekt = new Set<StatusGeraet>()
    private sekunden = 0
    private rundeLaeuft = false
    private index = 0
    private offen?: { geraet: StatusGeraet, versuch: number, timer?: NodeJS.Timeout }

    constructor(
        private send: (telegram: IBISTelegram, onSent?: () => void) => void,
        private meldeFehler: (text: string) => void
    ) { }

    add(geraet: StatusGeraet) {
        this.geraete.push(geraet)
    }

    // Jede Sekunde aufrufen; startet alle RUNDEN_INTERVALL_S eine neue Runde
    tick() {
        if (this.geraete.length === 0) return
        if (this.sekunden % this.RUNDEN_INTERVALL_S === 0) this.starteRunde()
        this.sekunden++
    }

    istDefekt(geraet: StatusGeraet): boolean {
        return this.defekt.has(geraet)
    }

    private starteRunde() {
        if (this.rundeLaeuft) return
        this.rundeLaeuft = true
        this.index = 0
        this.naechstes()
    }

    private naechstes() {
        if (this.index >= this.geraete.length) {
            this.rundeLaeuft = false
            return
        }
        this.frage(this.geraete[this.index++], 1)
    }

    private frage(geraet: StatusGeraet, versuch: number) {
        const offen: { geraet: StatusGeraet, versuch: number, timer?: NodeJS.Timeout } = { geraet, versuch }
        this.offen = offen
        // Wartezeit erst ab dem tatsächlichen Senden, nicht ab dem Einreihen
        this.send(geraet.abfrageTelegramm(), () => {
            if (this.offen !== offen) return
            offen.timer = setTimeout(() => {
                if (this.offen !== offen) return
                this.offen = undefined
                if (versuch < this.MAX_VERSUCHE) {
                    this.frage(geraet, versuch + 1)
                    return
                }
                if (!this.defekt.has(geraet)) {
                    this.defekt.add(geraet)
                    Util.log(`${geraet.name}: keine Antwort nach ${versuch} Versuchen`)
                    this.meldeFehler(geraet.fehlerText)
                }
                this.naechstes()
            }, this.WIEDERHOLUNG_MS)
        })
    }

    // Jedes empfangene Telegramm (ohne vorangestelltes Prüfbyte) hier durchreichen
    onTelegram(telegram: IBISTelegram) {
        const offen = this.offen
        if (!offen || !offen.geraet.istAntwort(telegram)) return
        if (offen.timer) clearTimeout(offen.timer)
        this.offen = undefined
        if (this.defekt.delete(offen.geraet)) {
            Util.log(`${offen.geraet.name}: antwortet wieder`)
        }
        offen.geraet.onAntwort(telegram)
        this.naechstes()
    }
}
