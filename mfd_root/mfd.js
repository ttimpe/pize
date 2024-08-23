var tripData;
var destinationLabel = document.getElementById('destination-label')
var lineNumberLabel = document.getElementById('line-number-label');
var nextStopLabel = document.getElementById('next-stop-label');

var upcomingStop3 = document.getElementById('upcoming-stop-3');
var upcomingStop2 = document.getElementById('upcoming-stop-2');
var upcomingStop1 = document.getElementById('upcoming-stop-1');
var nextStopRow = document.getElementById("next-stop-row");


setInterval(async () => {
    const response = await fetch("/api/tripData")
    if (!response.ok) {
        console.log('Error connecting to backend')
    } else {
        tripData = await response.json();

        setTripData(tripData);
        console.log(tripData);
    }
}, 10000);

function setTripData(tripData) {
    if (tripData.line) {
        lineNumberLabel.innerHTML = tripData.line.number;
        lineNumberLabel.classList.toggle('round', tripData.line.type == 0)
        lineNumberLabel.style.backgroundColor = tripData.line.color;
    }
    if (tripData.destination) {
        destinationLabel.innerHTML = tripData.destination.name;
    }
    if (tripData.route) {
        setStopData(upcomingStop1, tripData.route.stops[tripData.stopIndex + 1]);
        setStopData(upcomingStop2, tripData.route.stops[tripData.stopIndex + 2]);
        setStopData(upcomingStop3, tripData.route.stops[tripData.stopIndex + 3]);

        document.getElementById('next-stop-label').innerHTML = tripData.route.stops[tripData.stopIndex].information.shortName
    }

}

function setStopData(div, routestop) {
    div.getElementsByClassName('stop-label')[0].innerHTML = routestop.stop.information.shortName;
    div.getElementsByClassName('relative-time-label')[0].innerHTML = "";
}



