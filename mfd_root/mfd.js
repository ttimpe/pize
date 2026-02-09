const MFD = {
    tripData: null,
    view: 'TRIP', // TRIP, ARRIVAL, CONNECTIONS, INFO
    layoutType: new URLSearchParams(window.location.search).get('typ') || new URLSearchParams(window.location.search).get('type'),
    elements: {
        mfdtable: document.getElementById('mfdtable'),
        destinationLabel: document.getElementById('destination-label'),
        lineNumberLabel: document.getElementById('line-number-label'),
        nextStopLabel: document.getElementById('next-stop-label'),
        nextStopRow: document.getElementById('next-stop-row'),
        connectionsDisplay: document.getElementById('connections-display'),
        footerLineNumber: document.getElementById('footer-line-number'),
        clock: document.getElementById('clock'),
        headerClock: document.getElementById('header-clock'),
        upcomingStopsList: document.getElementById('upcoming-stops-list'),
        upcoming: [
            document.getElementById('upcoming-stop-1'),
            document.getElementById('upcoming-stop-2'),
            document.getElementById('upcoming-stop-3')
        ]
    },

    init() {
        this.loadCSS();
        setInterval(() => this.update(), 1000);
    },

    loadCSS() {
        let cssFile = 'new.css';
        if (this.layoutType === 'buse') cssFile = 'buse.css';
        else if (this.layoutType === 'mobiel') cssFile = 'mobiel.css';

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssFile;
        document.head.appendChild(link);
    },

    async update() {
        // Clock update
        const now = new Date();
        this.elements.clock.innerHTML = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Data fetch
        try {
            const response = await fetch("/api/tripData");
            if (response.ok) {
                this.tripData = await response.json();
                this.determineView();
                this.render();
            }
        } catch (e) {
            console.error("MFD: Connection error", e);
        }
    },

    determineView() {
        if (this.tripData.infoMessage) {
            this.view = 'INFO';
        } else if (this.tripData.currentConnections && this.tripData.currentConnections.length > 0) {
            this.view = 'CONNECTIONS';
        } else if (this.isAtDestination()) {
            this.view = 'ARRIVAL';
        } else {
            this.view = 'TRIP';
        }
        this.elements.mfdtable.setAttribute('data-view', this.view);
    },

    isAtDestination() {
        if (!this.tripData.currentStops || this.tripData.currentStops.length === 0) return false;
        // Check if we are at or approaching the last PRODUCTIVE stop
        const productive = this.tripData.currentStops.filter(s => s.PRODUKTIV !== false && s.PRODUKTIV !== 0);
        if (productive.length === 0) return false;

        const lastProductiveIndexInOriginal = this.tripData.currentStops.indexOf(productive[productive.length - 1]);
        return this.tripData.stopIndex >= lastProductiveIndexInOriginal;
    },

    render() {
        // Common elements (Header Line Number)
        if (this.tripData.line) {
            const lineKuerzel = this.tripData.line.LI_KUERZEL || "";
            const lineNr = this.tripData.line.LI_NR || "";
            this.elements.lineNumberLabel.innerHTML = lineKuerzel;
            this.elements.mfdtable.setAttribute('data-line', lineNr);
            if (this.elements.footerLineNumber) {
                this.elements.footerLineNumber.innerHTML = lineKuerzel;
                this.elements.footerLineNumber.setAttribute('data-line', lineNr);
            }
        }

        // Reset special displays
        if (this.elements.connectionsDisplay) this.elements.connectionsDisplay.style.display = 'none';
        this.elements.mfdtable.setAttribute('data-view', this.view);

        // View specific rendering
        switch (this.view) {
            case 'TRIP': this.renderTripView(); break;
            case 'ARRIVAL': this.renderArrivalView(); break;
            case 'CONNECTIONS': this.renderConnectionsView(); break;
            case 'INFO': this.renderInfoView(); break;
        }
    },

    renderTripView() {
        const segments = this.getTripSegments();
        this.elements.mfdtable.setAttribute('data-remaining-stop-count', segments.remaining);

        // Header: Destination
        if (segments.remaining > 4) {
            this.elements.destinationLabel.innerHTML = this.getStopHtml(segments.destination, true);
            if (this.elements.headerClock) {
                this.elements.headerClock.innerHTML = this.formatRelative(segments.destination.plannedArrival);
            }
        } else {
            this.elements.destinationLabel.innerHTML = "";
            if (this.elements.headerClock) this.elements.headerClock.innerHTML = "";
        }

        // Upcoming Stops
        if (this.elements.upcomingStopsList) this.elements.upcomingStopsList.style.display = 'flex';
        this.elements.nextStopLabel.innerHTML = this.getStopHtml(segments.next, false, true);
        this.elements.upcoming.forEach((el, i) => {
            this.renderStopRow(el, segments.upcoming[i]);
        });
    },

    renderArrivalView() {
        // Header navy bar: Endhaltestelle
        this.elements.destinationLabel.innerHTML = `<div class="arrival-header">Endhaltestelle / terminal station</div>`;
        if (this.elements.headerClock) this.elements.headerClock.innerHTML = "";

        // White Box content: Weiterfahrt
        const next = this.tripData.nextTrip;
        let message = "Wir bitten alle Fahrgäste auszusteigen.";

        if (next) {
            if (next.isSameLine) {
                message = `Weiterfahrt auf gleicher Linie in Richtung <span class="dest-highlight">${next.destination}</span>`;
            } else {
                message = `Weiterfahrt auf Linie ${next.lineKuerzel} in Richtung <span class="dest-highlight">${next.destination}</span>`;
            }
        }

        this.elements.nextStopRow.innerHTML = `<div class="arrival-message">${message}</div>`;

        this.elements.nextStopRow.innerHTML = `<div class="arrival-message">${message}</div>`;

        // Hide upcoming stops list
        if (this.elements.upcomingStopsList) this.elements.upcomingStopsList.style.display = 'none';
    },

    renderConnectionsView() {
        // Header navy bar: connections
        this.elements.destinationLabel.innerHTML = `<div class="arrival-header">Ihre nächste Verbindungen</div>`;
        if (this.elements.headerClock) this.elements.headerClock.innerHTML = "";

        // Connections Display Content: Black table
        let tableHtml = `<div class="connections-container"><table class="connections-table">`;
        this.tripData.currentConnections.forEach(c => {
            tableHtml += `
                <tr>
                    <td class="conn-time">${c.time}</td>
                    <td class="conn-line"><span class="line-badge" data-line="${c.lineNumber}" data-type="${c.type}">${c.lineNumber}</span></td>
                    <td class="conn-dest">${c.destination}</td>
                </tr>`;
        });
        tableHtml += `</table></div>`;

        this.elements.connectionsDisplay.innerHTML = tableHtml;
        this.elements.connectionsDisplay.style.display = 'block';

        // Render current stop in footer
        const segments = this.getTripSegments();
        this.renderStopRow(this.elements.nextStopRow, segments.next);

        // Hide upcoming stops list
        if (this.elements.upcomingStopsList) this.elements.upcomingStopsList.style.display = 'none';
    },

    renderInfoView() {
        this.elements.destinationLabel.innerHTML = "";
        this.elements.nextStopRow.innerHTML = `<div class="info-message">${this.tripData.infoMessage}</div>`;
        if (this.elements.upcomingStopsList) this.elements.upcomingStopsList.style.display = 'none';
    },

    // Helper methods
    getTripSegments() {
        const all = this.tripData.currentStops || [];
        const rawIdx = this.tripData.stopIndex || 0;
        // In VDV, null or undefined usually means productive. 0/false means waypoint.
        const productive = all.filter((s, i) => s.PRODUKTIV !== false && s.PRODUKTIV !== 0 || i === rawIdx);
        const upcomingProductive = productive.filter(s => all.indexOf(s) >= rawIdx);

        return {
            remaining: upcomingProductive.length,
            next: upcomingProductive[0] || null,
            upcoming: [upcomingProductive[1], upcomingProductive[2], upcomingProductive[3]],
            destination: productive[productive.length - 1] || null
        };
    },

    getStopHtml(stop, isDestination = false, isNext = false) {
        if (!stop) return "";
        let name = stop.stop?.recOrt?.ORT_REF_ORT_NAME || stop.stop?.recOrt?.ORT_NAME || "Stop";
        let html = `<span class="stop-name">${name}</span>`;

        if (this.layoutType === 'mobiel' && stop.connectionLines?.length > 0) {
            html += '<div class="connection-lines">';
            stop.connectionLines.forEach(l => {
                html += `<span class="line-badge" data-line="${l.lineNumber}" data-type="${l.type}">${l.lineNumber}</span>`;
            });
            html += '</div>';
        }

        if (isNext && this.tripData.stopIndex === 0 && this.tripData.tripStartTime) {
            const diff = Math.ceil((this.tripData.tripStartTime - (Date.now() / 1000 + 3600)) / 60);
            if (diff > 0) html += `<div class="departure-info">Abfahrt in ${diff} Minuten</div>`;
        }

        return html;
    },

    renderStopRow(el, stop) {
        const label = el.getElementsByClassName('stop-label')[0];
        const timeLabel = el.getElementsByClassName('relative-time-label')[0];
        const leftCol = el.getElementsByClassName('left-column')[0];

        if (!stop) {
            label.innerHTML = "";
            if (timeLabel) timeLabel.innerHTML = "";
            if (leftCol) leftCol.innerHTML = "";
            el.style.display = 'none';
            return;
        }

        el.style.display = 'flex';
        label.innerHTML = this.getStopHtml(stop);
        const relTime = this.formatRelative(stop.plannedArrival);
        if (timeLabel) timeLabel.innerHTML = relTime;
        if (leftCol && this.layoutType === 'mobiel') leftCol.innerHTML = relTime;
    },

    formatRelative(seconds) {
        if (!seconds || !this.tripData.betriebstag) return "";

        // Parse Betriebstag (YYYYMMDD) to a Date object at midnight
        const bStr = String(this.tripData.betriebstag);
        const bDate = new Date(
            parseInt(bStr.substring(0, 4)),
            parseInt(bStr.substring(4, 6)) - 1,
            parseInt(bStr.substring(6, 8))
        );

        // Calculate seconds since that Betriebstag start
        const now = new Date();
        const currentSeconds = Math.floor((now.getTime() - bDate.getTime()) / 1000);

        let diffSeconds = seconds - currentSeconds;
        const diff = Math.round(diffSeconds / 60);

        if (diff <= 0) return "<1min";
        return `${diff} min`;
    }
};

MFD.init();

