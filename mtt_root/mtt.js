// MTT - Mobile Touch Terminal JavaScript

// Global state
let currentView = 'trip-list';
let selectedLine = null;
let selectedTrip = null;
let currentInput = '';
let currentInputField = null;
let isShiftActive = false;

// Update date/time in header
function updateHeaderTime() {
    const now = new Date();
    const days = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
    const day = days[now.getDay()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateStr = `${day} ${hours}:${minutes}:${seconds}`;
    document.getElementById('header-date').textContent = dateStr;
}

// Initialize
function init() {
    updateHeaderTime();
    setInterval(updateHeaderTime, 1000);

    setupTabNavigation();
    setupNumpad();
    setupKeyboard();
    loadTripData();

    console.log('MTT initialized');
}

// Tab Navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn[data-view]');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewName = btn.getAttribute('data-view');
            switchView(viewName);

            // Update active tab
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Sidebar function buttons
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            console.log('Sidebar button clicked:', index);
            // TODO: Implement function button logic
        });
    });
}

function switchView(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
        currentView = viewName;

        // Update header title
        const titles = {
            'trip-list': 'Linie/Kurs Fahrplan',
            'route': 'Linienverlauf',
            'input': 'Fahrtauswahl',
            'keyboard': 'Eingabe'
        };
        document.getElementById('header-title').textContent = titles[viewName] || 'MTT';
    }
}

// Load Trip Data from API
async function loadTripData() {
    try {
        const response = await fetch('/api/mtt/trips');
        if (!response.ok) {
            console.error('Failed to load trips');
            // Show dummy data for testing
            showDummyTrips();
            return;
        }

        const data = await response.json();
        displayTrips(data.trips);
    } catch (error) {
        console.error('Error loading trips:', error);
        showDummyTrips();
    }
}

// Display trips in list
function displayTrips(trips) {
    const tripList = document.getElementById('trip-list');
    tripList.innerHTML = '';

    trips.forEach(trip => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-header">
                <span>Linie ${trip.line} - ${trip.destination}</span>
                <span class="list-item-time">${trip.startTime}</span>
            </div>
            <div class="list-item-details">
                Kurs: ${trip.kurs} | ${trip.stopCount} Haltestellen
            </div>
        `;

        item.addEventListener('click', () => {
            selectTrip(trip);
        });

        tripList.appendChild(item);
    });
}

// Show dummy data for testing
function showDummyTrips() {
    const dummyTrips = [
        { line: '1', destination: 'Schildesche', startTime: '11:08', kurs: 123, stopCount: 24 },
        { line: '1', destination: 'Sieker', startTime: '11:18', kurs: 124, stopCount: 26 },
        { line: '2', destination: 'Milse', startTime: '11:24', kurs: 142, stopCount: 22 },
        { line: '3', destination: 'Babenhausen Süd', startTime: '11:34', kurs: 187, stopCount: 28 },
        { line: '4', destination: 'Lohmannshof', startTime: '11:42', kurs: 203, stopCount: 19 }
    ];

    displayTrips(dummyTrips);
}

// Select a trip
function selectTrip(trip) {
    selectedTrip = trip;

    // Highlight selected trip
    const items = document.querySelectorAll('#trip-list .list-item');
    items.forEach(item => item.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    // Load route stops for this trip
    loadRouteStops(trip);

    console.log('Selected trip:', trip);
}

// Load route stops
async function loadRouteStops(trip) {
    try {
        const response = await fetch(`/api/mtt/route/${trip.line}/${trip.kurs}`);
        if (!response.ok) {
            console.error('Failed to load route');
            showDummyRoute();
            return;
        }

        const data = await response.json();
        displayRoute(data.stops);
    } catch (error) {
        console.error('Error loading route:', error);
        showDummyRoute();
    }
}

// Display route stops
function displayRoute(stops) {
    const stopList = document.getElementById('stop-list');
    stopList.innerHTML = '';

    stops.forEach((stop, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-header">
                <span>${index + 1}. ${stop.name}</span>
                <span class="list-item-time">${stop.time || ''}</span>
            </div>
        `;

        stopList.appendChild(item);
    });
}

// Show dummy route for testing
function showDummyRoute() {
    const dummyStops = [
        { name: 'Jahnplatz', time: '11:08' },
        { name: 'Rathaus', time: '11:10' },
        { name: 'Hauptbahnhof', time: '11:12' },
        { name: 'Sudbrackstraße', time: '11:14' },
        { name: 'Windelsbleicher Str.', time: '11:16' },
        { name: 'Schildesche', time: '11:18' }
    ];

    displayRoute(dummyStops);
}

// Numpad functionality
function setupNumpad() {
    const numpadBtns = document.querySelectorAll('.numpad-btn');

    numpadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            handleNumpadInput(key);
        });
    });
}

function handleNumpadInput(key) {
    const activeInput = document.querySelector('.input-field input:focus') || document.getElementById('line-input');

    if (key === 'backspace') {
        currentInput = currentInput.slice(0, -1);
    } else if (key === 'ok') {
        handleNumpadOk();
        return;
    } else {
        currentInput += key;
    }

    if (activeInput) {
        activeInput.value = currentInput;
    }
}

function handleNumpadOk() {
    console.log('Numpad OK pressed, input:', currentInput);

    // Process input (e.g., search for line/trip)
    if (currentInput) {
        searchTrips(currentInput);
    }

    currentInput = '';
}

async function searchTrips(query) {
    try {
        const response = await fetch(`/api/mtt/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            console.error('Search failed');
            return;
        }

        const data = await response.json();
        displayTrips(data.trips);

        // Switch to trip list view
        switchView('trip-list');
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Keyboard functionality
function setupKeyboard() {
    const keys = document.querySelectorAll('.key');

    keys.forEach(key => {
        key.addEventListener('click', () => {
            const keyValue = key.getAttribute('data-key');
            handleKeyboardInput(keyValue);
        });
    });
}

function handleKeyboardInput(key) {
    const input = document.getElementById('keyboard-input');
    let currentValue = input.value;

    if (key === 'backspace') {
        currentValue = currentValue.slice(0, -1);
    } else if (key === 'shift') {
        isShiftActive = !isShiftActive;
        updateKeyboardCase();
        return;
    } else if (key === 'space') {
        currentValue += ' ';
    } else if (key === 'ok') {
        handleKeyboardOk();
        return;
    } else {
        const char = isShiftActive ? key.toUpperCase() : key.toLowerCase();
        currentValue += char;
        isShiftActive = false;
        updateKeyboardCase();
    }

    input.value = currentValue;
}

function updateKeyboardCase() {
    const keys = document.querySelectorAll('.key[data-key]');
    keys.forEach(key => {
        const keyValue = key.getAttribute('data-key');
        if (keyValue.length === 1 && keyValue.match(/[a-zäöü]/i)) {
            key.textContent = isShiftActive ? keyValue.toUpperCase() : keyValue.toUpperCase();
        }
    });
}

function handleKeyboardOk() {
    const input = document.getElementById('keyboard-input');
    console.log('Keyboard OK pressed, input:', input.value);

    // Process input (e.g., search by destination name)
    if (input.value) {
        searchTrips(input.value);
    }

    input.value = '';
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
