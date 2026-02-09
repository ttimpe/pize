OK, now there are 3 additional modes the MFD can be in:


## Arrived at trip destination:

In the navy top bar it should say "Endhaltestelle / terminal station"
In the white box, show text like either:
- when just destination changes "Weiterfahrt auf gleicher Linie in Richtug ZIEL"
- when line and destination change: "Weiterfahrt auf Linie X in Richtung ZIEL".
- or if the course actually ends there for the day: "Wir bitten alle Fahrgäste auszusteigen."

## Connections view:
- This will be triggered when we are are at a fixed distance before the stop (let's say 50m for now)
- Instead of the destination at the top, the navy bar will have the text: "Ihre nächste Verbindungen"
- Where the white box is, a black table fills it and shows the connections, 6 rows, three columns: absolute time, line number, destination
- This view will disappear and return to the normal view after the vehicle has passed the stop
## Information view:
- This is a view that shows text messages from the operator. 
- It will fill the screen just white, with the text in the middle of the screen. This will be a placeholder for now.

Maybe MFD.js needs to be rewritten and split into different views/files to support this.