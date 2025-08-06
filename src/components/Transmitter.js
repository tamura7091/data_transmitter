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

  // Flash transmission function with proper timing protocol
  const transmitBinary = useCallback(async (binaryData) => {
    const flashArea = document.getElementById('flash-area');
    if (!flashArea) return;

    setIsTransmitting(true);
    
    // Add start sequence (10101010) and end sequence (01010101)
    const startSequence = '10101010';
    const endSequence = '01010101';
    const fullData = startSequence + binaryData + endSequence;

    // Protocol: Each bit is transmitted as:
    // - WHITE for 1 bit duration = '1'
    // - BLACK for 1 bit duration = '0'
    // - Each bit is followed by a brief GRAY pulse for synchronization
    
    for (let i = 0; i < fullData.length; i++) {
      if (!transmissionRef.current) break;
      
      const bit = fullData[i];
      
      // Transmit the bit
      flashArea.style.backgroundColor = bit === '1' ? '#ffffff' : '#000000';
      await new Promise(resolve => setTimeout(resolve, flashSpeed));
      
      // Sync pulse (gray) to mark end of bit
      flashArea.style.backgroundColor = '#808080';
      await new Promise(resolve => setTimeout(resolve, flashSpeed * 0.3)); // 30% of bit duration
    }
    
    // Reset to default color
    flashArea.style.backgroundColor = '#f0f0f0';
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
          <label htmlFor="speed-slider">Flash Speed: {flashSpeed}ms per bit</label>
          <input
            type="range"
            id="speed-slider"
            min="50"
            max="500"
            value={flashSpeed}
            onChange={(e) => setFlashSpeed(Number(e.target.value))}
            disabled={isTransmitting}
          />
        </div>

        <div className="transmission-controls">
          {!isTransmitting && !isCountingDown ? (
            <button className="transmit-button" onClick={handleTransmit}>
              Start Transmission
            </button>
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

      <div className="flash-container">
        <h3>Transmission Area</h3>
        <div id="flash-area" className="flash-area">
          {isCountingDown ? (
            <div className="countdown-status">Get ready! {countdown}</div>
          ) : isTransmitting ? (
            <div className="transmission-status">Transmitting...</div>
          ) : (
            <div className="ready-status">Ready to transmit</div>
          )}
        </div>
        <p className="flash-instructions">
          Point your receiver camera at this area during transmission
        </p>
      </div>
    </div>
  );
};

export default Transmitter;