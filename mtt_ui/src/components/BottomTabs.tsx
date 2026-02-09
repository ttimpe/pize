import React from 'react';
import './BottomTabs.css';

interface BottomTabsProps {
    activeView: string;
    onTabChange: (view: any) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ activeView, onTabChange }) => {
    return (
        <footer className="bottom-tabs">
            <button
                className={`tab-item ${activeView === 'TRIP_SELECTION' ? 'active' : ''}`}
                onClick={() => onTabChange('TRIP_SELECTION')}
            >
                <img src="/assets/images/vehicle.svg" alt="Fahrt" />
            </button>

            <button
                className={`tab-item ${activeView === 'SETTINGS' ? 'active' : ''}`}
                onClick={() => onTabChange('SETTINGS')}
            >
                <img src="/assets/images/settings.svg" alt="System" />
            </button>

            <button
                className={`tab-item ${activeView === 'GLOSSARY' ? 'active' : ''}`}
                onClick={() => onTabChange('GLOSSARY')}
                disabled // Grayed out in screenshot often
            >
                <img src="/assets/images/tab3.svg" alt="List" />
            </button>

            <button
                className={`tab-item ${activeView === 'MESSAGES' ? 'active' : ''}`}
                onClick={() => onTabChange('MESSAGES')}
            >
                <img src="/assets/images/communication.svg" alt="Msg" />
            </button>

            <button
                className={`tab-item ${activeView === 'ROUTE_MONITOR' ? 'active' : ''}`}
                onClick={() => onTabChange('ROUTE_MONITOR')}
            >
                <img src="/assets/images/visual-inspection.svg" alt="View" />
            </button>

            {/* Map/Route Line icon - inferred */}
            <button
                className={`tab-item ${activeView === 'ROUTE_MONITOR_MAP' ? 'active' : ''}`}
                onClick={() => onTabChange('ROUTE_MONITOR')}
            >
                <img src="/assets/images/route.svg" alt="Route" />
            </button>
        </footer>
    );
};
