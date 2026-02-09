import React, { useState } from 'react';
import './TripSelection.css';

export const TripSelection: React.FC = () => {
    const [line, setLine] = useState('');
    const [kurs, setKurs] = useState('');
    const [activeField, setActiveField] = useState<'LINE' | 'KURS'>('LINE'); // For input focus

    const handleNumKey = (key: string) => {
        if (key === 'C') {
            if (activeField === 'LINE') setLine('');
            else setKurs('');
            return;
        }

        // Max lengths: Line 3, Kurs 2 (based on screenshot)
        if (activeField === 'LINE') {
            if (line.length < 3) setLine(prev => prev + key);
        } else {
            if (kurs.length < 2) setKurs(prev => prev + key);
        }
    };

    const handleOk = () => {
        // Submit
        console.log("Submitting", line, kurs);
        fetch('/api/mtt/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineNr: parseInt(line), kurs: parseInt(kurs) })
        }).then(() => alert('Fahrt übernommen!'));
    };

    return (
        <div className="trip-selection-container">
            {/* Title Bar inside the view */}
            <div className="view-title">
                Fahrtauswahl
                <img src="/assets/images/route.svg" className="title-icon" /> {/* Compass icon placeholder */}
            </div>

            <div className="ts-content">
                {/* Left Side: Menu */}
                <div className="ts-menu">
                    <div className="menu-item active">
                        <span className="label">Linie/Kurs</span>
                        <span className="value">Fahrplan</span>
                    </div>
                    <div className="menu-item">
                        <span className="label">Linie/Kurs</span>
                        <span className="value">Linienfahrweg</span>
                    </div>
                    <div className="menu-item">
                        <span className="label">Linie/Kurs</span>
                        <span className="value">Relativer Fahrplan</span>
                    </div>

                    <div className="menu-header">Ziel</div>
                    <div className="menu-item">
                        <span className="value">Sonderziel</span>
                    </div>
                    <div className="menu-item">
                        <span className="label">Linie/Kurs</span>
                        <span className="value">Sonderfahrt</span>
                    </div>
                </div>

                {/* Right Side: Inputs + Numpad */}
                <div className="ts-input-area">
                    {/* Input Row: Line | Kurs */}
                    <div className="input-row">
                        <div
                            className={`input-box line-box ${activeField === 'LINE' ? 'focused' : ''}`}
                            onClick={() => setActiveField('LINE')}
                        >
                            {line}_
                        </div>
                        <div
                            className={`input-box kurs-box ${activeField === 'KURS' ? 'focused' : ''}`}
                            onClick={() => setActiveField('KURS')}
                        >
                            {kurs}
                        </div>
                    </div>

                    {/* Numpad */}
                    <div className="numpad-grid">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <button key={n} className="num-btn" onClick={() => handleNumKey(n.toString())}>
                                {n}
                            </button>
                        ))}
                        <button className="num-btn" onClick={() => handleNumKey('C')}>C</button>
                        <button className="num-btn" onClick={() => handleNumKey('0')}>0</button>
                        <button className="num-btn ok-btn" onClick={handleOk}>OK</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
