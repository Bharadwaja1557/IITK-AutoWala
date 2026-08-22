import { useState } from 'react';
import { DemoBanner } from './components/DemoBanner.js';
import { DriverScreen } from './screens/DriverScreen.js';
import { RiderScreen } from './screens/RiderScreen.js';

type View = 'rider' | 'driver';

export function App() {
  const [view, setView] = useState<View>('rider');

  return (
    <div className="app">
      <header className="app-header">
        <h1>IITK AutoWala</h1>
        <p className="muted">Who is free right now, and how far away.</p>
        <nav className="tabs">
          <button
            type="button"
            className={view === 'rider' ? 'tab active' : 'tab'}
            onClick={() => setView('rider')}
          >
            I need an auto
          </button>
          <button
            type="button"
            className={view === 'driver' ? 'tab active' : 'tab'}
            onClick={() => setView('driver')}
          >
            I drive one
          </button>
        </nav>
      </header>

      {/* Above the view switch, so it is on screen no matter which is showing. */}
      <DemoBanner />

      <main>{view === 'rider' ? <RiderScreen /> : <DriverScreen />}</main>
    </div>
  );
}
