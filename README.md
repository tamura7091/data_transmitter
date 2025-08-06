# Ancient Data Transmitter

A web-based application that transmits data using binary light flashes and receives them via camera detection. Send text or files by converting them to binary and flashing white/black patterns on screen, then decode them using your device's camera.

## Features

- **Transmitter Mode**: Convert text or files to binary and transmit via screen flashes
- **Receiver Mode**: Use camera to detect and decode binary light flashes
- **Apple-inspired UI**: Clean, modern interface following Apple design guidelines
- **Adjustable Speed**: Control flash speed for different transmission conditions
- **File Support**: Upload and transmit text files
- **Real-time Detection**: Live camera feed with brightness analysis
- **Data Export**: Copy received data or download as file

## How It Works

1. **Encoding**: Text or file content is converted to binary (8-bit ASCII)
2. **Transmission**: Screen flashes white for '1' bits and black for '0' bits
3. **Detection**: Camera analyzes brightness changes in real-time
4. **Decoding**: Binary sequence is converted back to readable text

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Transmitting Data

1. Switch to "Transmitter" tab
2. Choose input method (Text or File)
3. Enter your message or select a file
4. Adjust flash speed if needed (50-500ms per bit)
5. Click "Start Transmission"
6. Point receiver camera at the flashing area

### Receiving Data

1. Switch to "Receiver" tab
2. Click "Start Receiving" to activate camera
3. Point camera at transmitter's flash area
4. Adjust detection sensitivity if needed
5. Data will automatically appear when detected
6. Copy to clipboard or download as file

## Technical Details

- Uses `getUserMedia()` API for camera access
- Canvas-based brightness analysis for flash detection
- Start/end sequences for reliable data framing
- Configurable detection sensitivity
- Error handling for camera permissions

## Browser Requirements

- Modern browser with camera support
- HTTPS required for camera access (or localhost for development)
- WebRTC support for video streaming

## Tips for Best Results

- Use in well-lit environment for better contrast
- Keep camera steady and focused on flash area
- Adjust sensitivity based on ambient lighting
- Slower transmission speeds work better in poor conditions
- Ensure camera has permission to access video

## License

MIT License - feel free to use and modify as needed.