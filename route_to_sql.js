// route to sql
const filePath = './route.json'
const line = 2
const route = 5

const routeData = require(filePath)

for (var i=0; i<routeData.length; i++) {
    const sql = 'INSERT INTO route_stops(route_id, line_id, stop_id, sequence_number) VALUES(' + route + ', ' + line + ', "' + routeData[i].id + '",' +  (i+1) + ');'
    console.log(sql)
}