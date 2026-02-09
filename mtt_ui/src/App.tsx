import { useState, useEffect } from 'react'
import './App.css'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar' // New component
import { BottomTabs } from './components/BottomTabs' // Refactored Footer
import { TripSelection } from './views/TripSelection'
import { RouteMonitor } from './views/RouteMonitor'
import { Messages } from './views/Messages'
import { Settings } from './views/Settings'

// Views enum
type View = 'TRIP_SELECTION' | 'ROUTE_MONITOR' | 'MESSAGES' | 'SETTINGS' | 'GLOSSARY';

function App() {
  const [activeView, setActiveView] = useState<View>('TRIP_SELECTION');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'TRIP_SELECTION': return <TripSelection />;
      case 'ROUTE_MONITOR': return <RouteMonitor />;
      case 'MESSAGES': return <Messages />;
      case 'SETTINGS': return <Settings />;
      default: return <div className="p-4">Not Implemented</div>;
    }
  }

  const getHeaderTitle = () => {
    switch (activeView) {
      case 'TRIP_SELECTION': return 'Fahrtauswahl';
      case 'ROUTE_MONITOR': return 'Linie/Kurs Fahrplan';
      case 'MESSAGES': return 'Meldungen';
      case 'SETTINGS': return 'Systemeinstellungen';
      case 'GLOSSARY': return 'Glossar';
    }
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header title={getHeaderTitle()} time={currentTime} />

      {/* Middle Section: Content + Sidebar */}
      <div className="middle-section">
        <main className="content-area">
          {renderContent()}
        </main>
        <Sidebar activeView={activeView} />
      </div>

      {/* Bottom Tabs */}
      <BottomTabs activeView={activeView} onTabChange={setActiveView} />
    </div>
  )
}

export default App
