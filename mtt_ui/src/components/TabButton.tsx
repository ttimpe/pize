import React from 'react';
import './TabButton.css';

interface TabButtonProps {
    label: string;
    icon: string;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, icon, active, onClick, disabled }) => {
    // Map icon names to actual paths if needed, or pass full paths
    // Mapping simpler names to the SVGs we found
    const getIconPath = (name: string) => {
        switch (name) {
            case 'bus.png': return '/assets/images/vehicle.svg';
            case 'settings.png': return '/assets/images/settings.svg';
            case 'book.png': return '/assets/images/tab3.svg'; // Placeholder
            case 'warning.png': return '/assets/images/exclamation.svg';
            case 'route.png': return '/assets/images/route.svg';
            default: return name;
        }
    }

    return (
        <button
            className={`tab-button ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={onClick}
            disabled={disabled}
        >
            <div className="icon-container">
                <img src={getIconPath(icon)} alt={label} />
            </div>
            <span className="label">{label}</span>
        </button>
    );
};
