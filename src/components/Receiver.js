import React, { useState, useRef, useCallback, useEffect } from 'react';
import './Receiver.css';

const Receiver = () => {
  const [isReceiving, setIsReceiving] = useState(false);
  const [receivedData, setReceivedData] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [detectionSensitivity, setDetectionSensitivity] = useState(50);
  const [receivingStatus, setReceivingStatus] = useState('');
  const [currentBits, setCurrentBits] = useState('');
  const [detectedBits, setDetectedBits] = useState(0);
  const [decodedText, setDecodedText] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionRef = useRef(null);
  const binaryBufferRef = useRef('');
  const lastBrightnessRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastDetectionTime = useRef(0);
  const stateHistoryRef = useRef([]);
  const currentStateRef = useRef({ color: 'unknown', startTime: 0, duration: 0 });
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Convert binary to string
  const binaryToString = (binary) => {
    const bytes = binary.match(/.{1,8}/g) || [];
    return bytes.map(byte => {
      const charCode = parseInt(byte, 2);
      return charCode > 0 && charCode < 127 ? String.fromCharCode(charCode) : '';
    }).join('');
  };

  // Analyze frame brightness
  const analyzeBrightness = useCallback((canvas, ctx) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let totalBrightness = 0;
    
    // Sample center area for better detection
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sampleSize = Math.min(canvas.width, canvas.height) / 4;
    
    let sampleCount = 0;
    for (let y = centerY - sampleSize/2; y < centerY + sampleSize/2; y += 4) {
      for (let x = centerX - sampleSize/2; x < centerX + sampleSize/2; x += 4) {
        const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        if (index < data.length) {
          const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
          totalBrightness += brightness;
          sampleCount++;
        }
      }
    }
    
    return sampleCount > 0 ? totalBrightness / sampleCount : 0;
  }, []);

  // Process detected binary data
  const processBinaryData = useCallback((binaryString) => {
    // Look for start sequence (10101010) and end sequence (01010101)
    const startSequence = '10101010';
    const endSequence = '01010101';
    
    const startIndex = binaryString.indexOf(startSequence);
    const endIndex = binaryString.indexOf(endSequence, startIndex + startSequence.length);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const dataSection = binaryString.substring(startIndex + startSequence.length, endIndex);
      if (dataSection.length > 0 && dataSection.length % 8 === 0) {
        const decodedText = binaryToString(dataSection);
        if (decodedText.trim()) {
          setReceivedData(decodedText);
          setDecodedText(decodedText);
          setIsDecoding(false);
          setReceivingStatus('Data received successfully!');
          return true;
        }
      }
    }
    
    // Try to decode partial data for live display
    if (binaryString.length > 100) {
      const partialData = binaryString.slice(-200); // Look at last 200 bits
      const partialStartIndex = partialData.indexOf(startSequence);
      
      if (partialStartIndex !== -1) {
        const partialSection = partialData.substring(partialStartIndex + startSequence.length);
        if (partialSection.length >= 8 && partialSection.length % 8 === 0) {
          const partialText = binaryToString(partialSection);
          if (partialText.trim() && partialText !== decodedText) {
            setDecodedText(partialText);
            setIsDecoding(true);
          }
        }
      }
    }
    
    return false;
  }, [decodedText]);

    // Audio detection loop with frequency-based decoding
  const detectAudio = useCallback(() => {
    if (!isReceiving || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Check both target frequencies
    const sampleRate = 44100;
    const freq0 = 600; // '0' frequency
    const freq1 = 1000; // '1' frequency
    
    const binIndex0 = Math.floor(freq0 * analyser.fftSize / sampleRate);
    const binIndex1 = Math.floor(freq1 * analyser.fftSize / sampleRate);
    
    const volume0 = dataArray[binIndex0] || 0;
    const volume1 = dataArray[binIndex1] || 0;
    
    // Use the stronger signal
    const volume = Math.max(volume0, volume1);
    const dominantFreq = volume0 > volume1 ? 600 : 1000;
    
    const currentTime = Date.now();
    const threshold = detectionSensitivity * 2.55; // Convert percentage to 0-255 scale
    
    // Simple ON/OFF detection
    const isOn = volume > threshold;
    const currentState = isOn ? 'sound' : 'silence';
    
    // Detect state changes with debouncing
    if (currentState !== currentStateRef.current.color && 
        currentTime - lastDetectionTime.current > 50) { // 50ms debounce
        
              // Record the previous state
        if (currentStateRef.current.color !== 'unknown') {
          const duration = currentTime - currentStateRef.current.startTime;
          stateHistoryRef.current.push({
            color: currentStateRef.current.color,
            duration: duration,
            frequency: currentStateRef.current.frequency
          });
        
        // Keep only last 20 states
        if (stateHistoryRef.current.length > 20) {
          stateHistoryRef.current.shift();
        }
      }
      
              // Start new state
        currentStateRef.current = {
          color: currentState,
          startTime: currentTime,
          duration: 0,
          frequency: dominantFreq
        };
      
      // Frequency-based decoding: Determine bit based on dominant frequency
      if (stateHistoryRef.current.length >= 1) {
        const lastState = stateHistoryRef.current[stateHistoryRef.current.length - 1];
        
        let bit = null;
        if (lastState.color === 'sound') {
          // Determine bit based on frequency
          if (lastState.frequency === 600) {
            bit = '0';
          } else if (lastState.frequency === 1000) {
            bit = '1';
          }
        }
        
        if (bit !== null) {
          binaryBufferRef.current += bit;
          lastDetectionTime.current = currentTime;
          
          // Update live display of bits
          setDetectedBits(prev => prev + 1);
          setCurrentBits(prev => {
            const newBits = prev + bit;
            // Keep last 50 bits visible
            return newBits.length > 50 ? newBits.slice(-50) : newBits;
          });
          
          // Update status
          setReceivingStatus(`Detecting... (${binaryBufferRef.current.length} bits) - Last: ${bit} (${lastState.frequency}Hz)`);
          
          // Process data more frequently for better responsiveness
          if (binaryBufferRef.current.length > 50) {
            if (processBinaryData(binaryBufferRef.current)) {
              return; // Don't continue if data is successfully processed
            }
            
            // Keep reasonable buffer size
            if (binaryBufferRef.current.length > 2000) {
              binaryBufferRef.current = binaryBufferRef.current.slice(-1000);
            }
          }
        }
      }
    }
    
    lastBrightnessRef.current = volume;
    frameCountRef.current++;
    detectionRef.current = requestAnimationFrame(detectAudio);
  }, [isReceiving, detectionSensitivity, processBinaryData]);

  // Start microphone
  const startMicrophone = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      streamRef.current = stream;
      
      // Create audio context for analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      // Store for detection
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch (error) {
      console.error('Microphone access error:', error);
      setCameraError('Could not access microphone. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start receiving
  const startReceiving = async () => {
    await startMicrophone();
    setIsReceiving(true);
    setReceivedData('');
    setDecodedText('');
    setIsDecoding(false);
    setCurrentBits('');
    setDetectedBits(0);
    setReceivingStatus('Starting audio detection...');
    binaryBufferRef.current = '';
    frameCountRef.current = 0;
    lastDetectionTime.current = 0;
    stateHistoryRef.current = [];
    currentStateRef.current = { color: 'unknown', startTime: 0, duration: 0 };
  };

  // Stop receiving
  const stopReceiving = () => {
    setIsReceiving(false);
    setReceivingStatus('');
    stopCamera();
    if (detectionRef.current) {
      cancelAnimationFrame(detectionRef.current);
      detectionRef.current = null;
    }
  };

  // Start detection when receiving begins
  useEffect(() => {
    if (isReceiving) {
      detectAudio();
    }
    return () => {
      if (detectionRef.current) {
        cancelAnimationFrame(detectionRef.current);
      }
    };
  }, [isReceiving, detectAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (detectionRef.current) {
        cancelAnimationFrame(detectionRef.current);
      }
    };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(receivedData).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const downloadAsFile = () => {
    const blob = new Blob([receivedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'received_data.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="receiver">
      <div className="audio-section">
        <h3>Audio Detection</h3>
        <div className="audio-container">
          <div className="audio-visualizer-large">
            <div className="audio-wave">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          </div>
          
          {cameraError && (
            <div className="audio-error">
              {cameraError}
            </div>
          )}
          
          {!isReceiving && !cameraError && (
            <div className="audio-placeholder">
              🔊 Microphone will be activated when receiving
            </div>
          )}
        </div>

        <div className="camera-controls">
          <div className="sensitivity-control">
            <label htmlFor="sensitivity-slider">
              Audio Sensitivity: {detectionSensitivity}%
            </label>
            <input
              type="range"
              id="sensitivity-slider"
              min="10"
              max="90"
              value={detectionSensitivity}
              onChange={(e) => setDetectionSensitivity(Number(e.target.value))}
              disabled={isReceiving}
            />
          </div>

          <div className="receive-controls">
            {!isReceiving ? (
              <button className="start-receive-button" onClick={startReceiving}>
                Start Receiving
              </button>
            ) : (
              <button className="stop-receive-button" onClick={stopReceiving}>
                Stop Receiving
              </button>
            )}
          </div>

          {receivingStatus && (
            <div className="receiving-status">
              {receivingStatus}
            </div>
          )}

          {isReceiving && (
            <div className="detection-status">
              <div className="status-indicator">
                <span className="status-label">Current State:</span>
                <span className={`status-value ${currentStateRef.current.color}`}>
                  {currentStateRef.current.color}
                </span>
              </div>
              <div className="state-history">
                <span className="history-label">Recent States:</span>
                <div className="history-bars">
                  {stateHistoryRef.current.slice(-8).map((state, index) => (
                    <div 
                      key={index} 
                      className={`history-bar ${state.color}`}
                      title={`${state.color} (${Math.round(state.duration)}ms)`}
                    />
                  ))}
                </div>
              </div>
              <div className="brightness-info">
                <span className="brightness-label">Brightness:</span>
                <span className="brightness-value">
                  {Math.round(lastBrightnessRef.current)}
                </span>
              </div>
            </div>
          )}

          {isReceiving && currentBits && (
            <div className="live-bits-display">
              <h4>Live Binary Stream:</h4>
              <div className="bits-container">
                <div className="bits-stream" id="bits-stream">
                  {currentBits.length > 100 ? 
                    `${currentBits.slice(0, 50)}...${currentBits.slice(-50)}` : 
                    currentBits
                  }
                </div>
                <button 
                  className="copy-bits-button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentBits);
                    alert('Binary copied to clipboard!');
                  }}
                >
                  Copy All Bits
                </button>
              </div>
              <div className="bits-counter">
                Total bits detected: {detectedBits} | Showing: {currentBits.length > 100 ? '100 bits' : `${currentBits.length} bits`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="data-section">
        <h3>Received Data</h3>
        <div className="data-container">
          {isReceiving && decodedText && (
            <div className="live-decoding">
              <h4>Live Decoding:</h4>
              <div className={`decoded-preview ${isDecoding ? 'decoding' : 'complete'}`}>
                {decodedText}
                {isDecoding && <span className="decoding-indicator">...</span>}
              </div>
            </div>
          )}
          
          <textarea
            value={receivedData}
            readOnly
            placeholder="Received data will appear here..."
            rows={8}
            className="data-output"
          />
          
          {receivedData && (
            <div className="data-actions">
              <button className="copy-button" onClick={copyToClipboard}>
                Copy to Clipboard
              </button>
              <button className="download-button" onClick={downloadAsFile}>
                Download as File
              </button>
            </div>
          )}
        </div>

        <div className="instructions">
          <h4>Instructions:</h4>
          <ol>
            <li>Click "Start Receiving" to activate the microphone</li>
            <li>Point the microphone at the transmitter's speakers</li>
            <li>Adjust audio sensitivity if needed for better detection</li>
            <li>The app will automatically detect and decode the audio beeps</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Receiver;