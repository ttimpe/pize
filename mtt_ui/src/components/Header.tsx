import React from 'react';
import './Header.css';

interface HeaderProps {
    title: string;
    time: Date;
}

export const Header: React.FC<HeaderProps> = ({ title, time }) => {
    return (
        <header className="view-header">
            <h1>{title}</h1>
            <div className="time">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
        </header>
    );
};
