import { Stop } from "./Stop"

export class Route {
 route_id: string
 line_id: string
 destination_id: string
 stops: Stop[] = []
}