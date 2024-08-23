setInterval(async () => {
    const response = await fetch("/api/tripData")
    if (!response.ok) {
        console.log('Error connecting to backend')
    } else {
        const tripData = await response.json();
        console.log(tripData);
    }
}, 10000);