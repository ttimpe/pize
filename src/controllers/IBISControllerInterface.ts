import { IBISTelegram } from "../extensions/IBISTelegram"
import { AudioController } from "./AudioController"
import { RecLid } from "../models/database/VDV/RecLid"
import { RecFrt } from "../models/database/VDV/RecFrt"
import { RecZnr } from "../models/database/VDV/RecZnr"
import { RecOrt } from "../models/database/VDV/RecOrt"

export interface IBISControllerInterface {
    sendTelegram(telegram: IBISTelegram): void
    setLine(lineNumber: string): Promise<boolean>
    setCourseNumber(courseNumber: number): Promise<boolean>
    setRoute(routeNumber: number): Promise<boolean>
    setZuglaenge(laenge: number): void
    setZiel(destinationNumber: number): Promise<boolean>
    setSpecialCharacter(characterNumber: number): Promise<boolean>
    setRichtung(direction: number): void
    toggleAnnouncementsMuted(): void
    sendSprechwunsch(): void
    sendUnfall(): void
    repeatStopAnnouncement(): void
    skipStop(): void
    getUpcomingStopShortId(): number;
    executeTestFunction(functionCode: number, terminalKey: 'A' | 'B'): void;
    setTfsEnabled(enabled: boolean): void;

    setRadioChannel(type: 'voice' | 'data' | 'lsa', channel: number): void;
    getRadioChannel(type: 'voice' | 'data' | 'lsa'): number;
    getLocationStatus(): { ortNr: number, weg: number };

    // Properties needed by Terminal
    upcomingStop: any // Can be RecOrt or similar structure, keeping any for flexibility during refactor
    audioController: AudioController

    // VDV Models replacing legacy ones
    linie?: RecLid
    kurs: number
    route?: any
    ziel?: RecZnr
    currentRouteNumber?: string

    stopIndex: number
    richtung: number
    zuglaenge: number
    funkmodus: number

    // VDV Properties
    currentStops: any[]
    currentTrips?: any[]
    currentStopSequence?: any[]
}
