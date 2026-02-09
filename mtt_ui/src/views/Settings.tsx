import React from 'react';

export const Settings: React.FC = () => {
    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <label>Helligkeit</label>
                <input type="range" min="0" max="100" style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
                <label>Lautstärke</label>
                <input type="range" min="0" max="100" style={{ width: '100%' }} />
            </div>
            <button className="button-std">Neustart</button>
        </div>
    );
};
