import sqlite3 from "sqlite3";
import { Line } from "./models/Line";
import { Route } from "./models/Route";
import { Stop } from "./models/Stop";
export class DatabaseManager {
    db: any

     connect() {
     this.db = new sqlite3.Database('./timetable.sqlite3', (err) => {
        if (err) {
            return console.log('could not load database')
        }
        console.log('connected')
    })
    }



async getLine(lineString: string): Promise<Line | null> {
   const sql =  'SELECT * FROM lines WHERE id = ?'
console.log('trying to get line', lineString)
try {
    const row = await new Promise<any>((resolve, reject) => {
        this.db.get(sql, [parseInt(lineString)], (err, data) => {
            if (err) {
                console.log('ERROR', err)
                reject(err)
            } else {
                console.log('got line', data)
                resolve(data)
            }
        })
    })
    if (row) {
        console.log('got line row')
        const line: Line = {
            id: row.id,
            name: row.name
        };
        console.log(line)
        return line;
    } else {
        return null;
    }
} catch(error) {
    throw error
}
  
}
async getRoute(line: Line, routeId: string): Promise<Route | null> {
    // SELECT * FROM route WHERE line_id = line AND route = route

    const sql =  'SELECT * FROM routes WHERE line_id = ? AND route_id = ?'
    console.log('trying to get route', routeId, ' for line ', line.id)
    try {
        const row = await new Promise<any>((resolve, reject) => {
            this.db.get(sql, [parseInt(line.id), parseInt(routeId)], (err, data) => {
                if (err) {
                    console.log(err)
                    reject(err)
                } else {
                    console.log('Got route')
                    resolve(data)
                }
            })
        })
        if (row) {
            const route: Route = {
                route_id: row.route_id,
                line_id: row.line_id,
                destination_id: row.destination_id,
                stops: []
            };
            return route;
        } else {
            return null;
        }
    } catch(error) {
        throw error
    }
}
async getStops(route: Route): Promise<Stop[]> {
        // SELECT route_stops.stop_id, stop_info.short_name, stop_info.number, stop_info.announcement_id, route_stops.sequence_number, stops.longitude, stops.latitude FROM route_stops INNER JOIN stops ON route_stops.id = stops.id INNER JOIN stop_info ON route_stops.stop_id = stop_info.stop_id
    
        const sql =  'SELECT route_stops.stop_id, stop_info.number, stop_info.short_name, stop_info.announcement_id FROM route_stops INNER JOIN stop_info ON stop_info.stop_id = route_stops.stop_id WHERE line_id = ? AND route_id = ? ORDER BY sequence_number'

        try {
            const rows = await new Promise<any>((resolve, reject) => {
                this.db.all(sql, [route.line_id, route.route_id], (err, data) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                })
            })
            if (rows) {
                const stops: Stop[] = rows.map(row => ({
                    id: row.stop_id,
                    name: row.short_name,
                    number: row.number,
                    announcement_id: row.announcement_id
                }))
                return stops;
            } else {
                return null;
            }
        } catch(error) {
            throw error
        }
}
}