// route finden -> start -> ende anhand id, fußweg ignorieren, doppelte haltestellen entfernen



const START_STOP_ID = 'de:05711:5040'
const END_STOP_ID = 'de:05711:10502'
const LINE_ID = 1
const ROUTE_ID = 61
async function getRoute(start, end) {
let response = await fetch("https://westfalenfahrplan.de/nwl-efa/XML_TRIP_REQUEST2?allInterchangesAsLegs=0&convertAddressesITKernel2LocationServer=1&convertCoord2LocationServer=1&convertCrossingsITKernel2LocationServer=1&convertPOIsITKernel2LocationServer=1&convertStopsPTKernel2LocationServer=1&coordOutputDistance=1&coordOutputFormat=WGS84%5Bdd.ddddd%5D&genC=1&genMaps=0&imparedOptionsActive=1&inclMOT_1=true&inclMOT_10=true&inclMOT_11=true&inclMOT_13=true&inclMOT_14=true&inclMOT_15=true&inclMOT_16=true&inclMOT_17=true&inclMOT_18=true&inclMOT_19=true&inclMOT_2=true&inclMOT_3=true&inclMOT_4=true&inclMOT_5=true&inclMOT_6=true&inclMOT_7=true&inclMOT_8=true&inclMOT_9=true&includedMeans=checkbox&itOptionsActive=1&itdTripDateTimeDepArr=dep&language=de&lineRestriction=400&locationServerActive=1&name_destination=" + end + "&name_origin=" + start + "&nwlTripMacro=1&outputFormat=rapidJSON&ptOptionsActive=1&routeType=LEASTTIME&serverInfo=1&sl3plusTripMacro=1&trITMOTvalue100=10&type_destination=any&type_notVia=any&type_origin=any&type_via=any&useProxFootSearch=true&useRealtime=1&useUT=1&version=10.5.17.3", {
  "headers": {
    
    "accept": "*/*",
    
    "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7,la;q=0.6,ru;q=0.5",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "body": null,
  "method": "GET"
});


let json = response.json()
return json

}


getRoute(START_STOP_ID, END_STOP_ID).then().then(data => {

  let firstJourneyLegs = data.journeys[0].legs
  let allStops = []
  for (var i=0; i<firstJourneyLegs.length; i++) {
    if (firstJourneyLegs[i].stopSequence) {
    const stopIds = firstJourneyLegs[i].stopSequence.map(stop => stop.id)
   
   allStops = allStops.concat(stopIds)
  }
  }
  allStops = [...new Set(allStops)]


  for (var i=0; i<allStops.length; i++) {
    console.log('insert into route_stops (stop_id, line_id, route_id, sequence_number) VALUES("' + allStops[i] + '", ' + LINE_ID + ', ' + ROUTE_ID + ',' + (i+1) + ');');

  }

})

