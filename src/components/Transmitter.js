import React, { useState, useRef, useCallback, useEffect } from 'react';
import './Transmitter.css';

const Transmitter = () => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
  const [flashSpeed, setFlashSpeed] = useState(100); // milliseconds per bit
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const transmissionRef = useRef(null);
  const fileInputRef = useRef(null);
  const countdownRef = useRef(null);

  // Convert string to binary
  const stringToBinary = (str) => {
    return str.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join('');
  };

  // Convert file to binary (simplified - reads as text)
  const fileToBinary = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        resolve(stringToBinary(text));
      };
      reader.readAsText(file);
    });
  };

  // Sound transmission function with Morse-like encoding
  const transmitBinary = useCallback(async (binaryData) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume audio context (required for user interaction)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz tone
    oscillator.type = 'sine';
    
    setIsTransmitting(true);
    
    // Add start sequence (10101010) and end sequence (01010101)
    const startSequence = '10101010';
    const endSequence = '01010101';
    const fullData = startSequence + binaryData + endSequence;

    // Frequency-based encoding:
    // - '0' = 600Hz tone
    // - '1' = 1000Hz tone
    // - Each bit has same duration
    
    oscillator.start();
    
          for (let i = 0; i < fullData.length; i++) {
        if (!transmissionRef.current) break;
        
        const bit = fullData[i];
        const currentTime = audioContext.currentTime;
        const bitDuration = flashSpeed / 1000; // Convert ms to seconds
        
        // Set frequency based on bit value
        const frequency = bit === '0' ? 600 : 1000;
        oscillator.frequency.setValueAtTime(frequency, currentTime);
        
        // Play the tone for the bit duration
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + bitDuration - 0.01);
        
        await new Promise(resolve => setTimeout(resolve, flashSpeed));
      }
    
    oscillator.stop();
    setIsTransmitting(false);
  }, [flashSpeed]);

  // Countdown function
  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdown(3);
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setIsCountingDown(false);
          setCountdown(0);
          // Start actual transmission
          performTransmission();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Actual transmission function
  const performTransmission = async () => {
    let binaryData = '';
    
    if (inputMode === 'text' && inputText.trim()) {
      binaryData = stringToBinary(inputText);
    } else if (inputMode === 'file' && selectedFile) {
      binaryData = await fileToBinary(selectedFile);
    }

    if (binaryData) {
      transmissionRef.current = true;
      await transmitBinary(binaryData);
      transmissionRef.current = null;
    }
  };

  const handleTransmit = async () => {
    // Validate input
    if (inputMode === 'text' && !inputText.trim()) {
      alert('Please enter text to transmit.');
      return;
    }
    if (inputMode === 'file' && !selectedFile) {
      alert('Please select a file to transmit.');
      return;
    }

    // Start countdown
    startCountdown();
  };

  const stopTransmission = () => {
    // Stop countdown if running
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    transmissionRef.current = null;
    setIsTransmitting(false);
    setIsCountingDown(false);
    setCountdown(0);
    
    const flashArea = document.getElementById('flash-area');
    if (flashArea) {
      flashArea.style.backgroundColor = '#f0f0f0';
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return (
    <div className="transmitter">
      <div className="control-panel">
        <div className="input-mode-selector">
          <button 
            className={`mode-button ${inputMode === 'text' ? 'active' : ''}`}
            onClick={() => setInputMode('text')}
          >
            Text
          </button>
          <button 
            className={`mode-button ${inputMode === 'file' ? 'active' : ''}`}
            onClick={() => setInputMode('file')}
          >
            File
          </button>
        </div>

        {inputMode === 'text' ? (
          <div className="text-input-section">
            <label htmlFor="text-input">Enter text to transmit:</label>
            <textarea
              id="text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              disabled={isTransmitting}
            />
          </div>
        ) : (
          <div className="file-input-section">
            <label htmlFor="file-input">Select file to transmit:</label>
            <input
              type="file"
              id="file-input"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".txt,.json,.csv,.md"
              disabled={isTransmitting}
              style={{ display: 'none' }}
            />
            <button 
              className="file-select-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTransmitting}
            >
              {selectedFile ? selectedFile.name : 'Choose File'}
            </button>
          </div>
        )}

        <div className="speed-control">
          <label htmlFor="speed-slider">Transmission Speed: {flashSpeed}ms per bit</label>
          <input
            type="range"
            id="speed-slider"
            min="100"
            max="1000"
            value={flashSpeed}
            onChange={(e) => setFlashSpeed(Number(e.target.value))}
            disabled={isTransmitting}
          />
        </div>

        <div className="transmission-controls">
          {!isTransmitting && !isCountingDown ? (
            <>
              <button className="transmit-button" onClick={handleTransmit}>
                Start Transmission
              </button>
              <button 
                className="test-audio-button" 
                onClick={async () => {
                  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                  }
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  oscillator.type = 'sine';
                  oscillator.start();
                  
                  // Test both frequencies
                  const currentTime = audioContext.currentTime;
                  oscillator.frequency.setValueAtTime(600, currentTime); // '0' tone
                  gainNode.gain.setValueAtTime(0.5, currentTime);
                  
                  setTimeout(() => {
                    oscillator.frequency.setValueAtTime(1000, currentTime + 0.5); // '1' tone
                  }, 500);
                  
                  setTimeout(() => {
                    oscillator.stop();
                  }, 1000);
                }}
              >
                🔊 Test Tones (600Hz + 1000Hz)
              </button>
            </>
          ) : (
            <button className="stop-button" onClick={stopTransmission}>
              {isCountingDown ? 'Cancel Countdown' : 'Stop Transmission'}
            </button>
          )}
        </div>

        {isCountingDown && (
          <div className="countdown-display">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-text">Transmission starting in...</div>
          </div>
        )}
      </div>

      <div className="sound-container">
        <h3>Sound Transmission</h3>
        <div id="sound-area" className="sound-area">
          {isCountingDown ? (
            <div className="countdown-status">Get ready! {countdown}</div>
          ) : isTransmitting ? (
            <div className="transmission-status">
              🔊 Transmitting audio...
              <div className="audio-visualizer">
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
                <div className="audio-bar"></div>
              </div>
            </div>
          ) : (
            <div className="ready-status">Ready to transmit</div>
          )}
        </div>
        <p className="sound-instructions">
          🔊 Audio will be transmitted through your speakers. Point receiver microphone at speakers.
        </p>
      </div>
    </div>
  );
};

export default Transmitter;