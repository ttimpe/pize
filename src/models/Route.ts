import { Stop } from "./Stop"

export class Route {
 route_id: number
 line_id: string
 destination_id: string
 stops: Stop[] = []
}