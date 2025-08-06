import React, { useState } from 'react';
import './App.css';
import Transmitter from './components/Transmitter';
import Receiver from './components/Receiver';

function App() {
  const [activeTab, setActiveTab] = useState('transmitter');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ancient Data Transmitter</h1>
        <p>Send data through binary light flashes</p>
      </header>
      
      <nav className="tab-nav">
        <button 
          className={`tab-button ${activeTab === 'transmitter' ? 'active' : ''}`}
          onClick={() => setActiveTab('transmitter')}
        >
          Transmitter
        </button>
        <button 
          className={`tab-button ${activeTab === 'receiver' ? 'active' : ''}`}
          onClick={() => setActiveTab('receiver')}
        >
          Receiver
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'transmitter' ? <Transmitter /> : <Receiver />}
      </main>
    </div>
  );
}

export default App;