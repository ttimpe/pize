import React, { useEffect, useState } from 'react';
import './Views.css';
import './RouteMonitor.css';

interface Stop {
    name: string;
    time: string;
}

export const RouteMonitor: React.FC = () => {
    // Mock data based on screenshot if API fails or for visual testing
    const [stops, setStops] = useState<Stop[]>([
        { name: "Lohmannshof", time: "13:34" },
        { name: "Rosenhöhe", time: "13:04" },
        { name: "Sennefriedhof", time: "13:03" },
        { name: "Senne", time: "13:02" }, // Current
        { name: "Senne", time: "12:50" }
    ]);
    const [currentIndex, setCurrentIndex] = useState(3);

    useEffect(() => {
        // Try fetch real data
        fetch('/api/mtt/state')
            .then(res => res.json())
            .then(data => {
                if (data.currentStops && data.currentStops.length > 0) {
                    setStops(data.currentStops);
                    // Find current based on time or index? 
                    // For now, index 0 is next ? 
                    // The screenshot shows PAST stops above? Or future stops?
                    // Arrow usually points DOWN or UP.
                    // Screenshot: Arrow points UP to Lohmannshof(13:34).
                    // Senne (13:02) is highlighted.
                    // Senne (12:50) is below.
                    // Times increase UPWARDS? 12:50 -> 13:02 -> 13:03 -> 13:04 -> 13:34.
                    // So Top is destination? Yes "Lohmannshof (415)" is destination.
                }
            })
            .catch(() => { });
    }, []);

    return (
        <div className="route-monitor-container">
            <div className="view-title">
                Linie/Kurs Fahrplan
                <img src="/assets/images/route.svg" className="title-icon" />
            </div>

            <div className="rm-content">
                {/* Scroll Buttons */}
                <div className="scroll-buttons">
                    <button className="scroll-btn up"><img src="/assets/images/route.svg" style={{ transform: 'rotate(-90deg)' }} /></button>
                    <div className="spacer"></div>
                    <button className="scroll-btn down"><img src="/assets/images/route.svg" style={{ transform: 'rotate(90deg)' }} /></button>
                </div>

                {/* List */}
                <div className="rm-list">
                    {stops.map((stop, i) => (
                        <div key={i} className={`rm-row ${i === currentIndex ? 'current' : ''} ${i > currentIndex ? 'past' : ''}`}>
                            <div className="rm-name">{stop.name}</div>
                            <div className="rm-timeline">
                                <div className="line"></div>
                                <div className={`dot ${i === 0 ? 'top-dot' : ''}`}></div>
                                {i === 0 && <div className="arrow-up"></div>}
                            </div>
                            <div className="rm-time">{stop.time}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
