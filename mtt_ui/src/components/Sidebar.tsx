import React from 'react';
import './Sidebar.css';

interface SidebarProps {
    activeView: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView }) => {
    // Icons based on analysis
    // Red Triangle, Yellow Handset, Steering Wheel, Bus Front, Bus Side, Key/Back

    return (
        <aside className="sidebar">
            <button className="sidebar-btn btn-warning">
                <img src="/assets/images/exclamation.svg" alt="Warning" />
            </button>
            <button className="sidebar-btn btn-call">
                <img src="/assets/images/handset.svg" alt="Call" />
            </button>
            <button className="sidebar-btn btn-gray">
                <img src="/assets/images/visual-inspection.svg" alt="Inspect" />
            </button>
            <button className="sidebar-btn btn-gray">
                <img src="/assets/images/vehicle.svg" alt="Vehicle" />
            </button>
            <button className="sidebar-btn btn-gray">
                <img src="/assets/images/vehicle.svg" alt="Vehicle 2" />
            </button>

            <div className="spacer"></div>

            {/* Bottom button context sensitive? */}
            <button className="sidebar-btn btn-key">
                <img src="/assets/images/key.svg" alt="Key" />
            </button>
        </aside>
    );
};
