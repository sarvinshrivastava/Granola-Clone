# Granola Clone Frontend

> Modern React application for real-time Hindi speech-to-text transcription with professional UI/UX

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

## 🎯 Overview

The Granola Clone Frontend is a sophisticated React application that provides an intuitive interface for real-time Hindi speech-to-text transcription. Built with modern React 19 patterns and enhanced with professional security features, it offers seamless integration with the backend WebSocket service for live audio processing.

## ✨ Features

### 🎤 **Audio Recording & Processing**

- **Web Audio API Integration**: Professional-grade audio recording using modern browser APIs
- **Custom WAV Encoder**: High-quality WAV file generation optimized for SarvamAI API
- **Real-time Processing**: Live audio streaming with WebSocket connectivity
- **Cross-browser Compatibility**: Consistent performance across all modern browsers

### 🎨 **User Interface**

- **Modern React 19**: Latest React features with concurrent rendering
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Professional Navigation**: Clean routing with React Router DOM 7.9
- **Real-time Feedback**: Live transcription display with status indicators

### 🔒 **Security & Performance**

- **Conditional StrictMode**: Configurable strict mode for development debugging
- **Error Boundary Protection**: Comprehensive error handling and recovery
- **Optimized Bundle**: Efficient code splitting and performance optimization
- **Professional Documentation**: Enterprise-grade code documentation

### 💾 **State Management**

- **Context API**: Professional state management with memoized contexts
- **Optimistic Updates**: Smooth UX with predictive state updates
- **Retry Logic**: Robust error handling with automatic retry mechanisms
- **Memory Management**: Efficient resource cleanup and memory optimization

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0 or **yarn** >= 1.22.0
- Modern web browser with Web Audio API support

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/granola-clone.git
cd granola-clone

# Install dependencies
npm install

# Start development server
npm start
```

### Development

```bash
# Start with hot reload
npm start

# Build for production
npm run build

# Run tests
npm test

# Disable StrictMode for WebSocket testing
# Open: http://localhost:3000?strict=false
```

## 📁 Project Structure

```
granola-clone/
├── public/
│   ├── index.html              # Main HTML template
│   ├── favicon.ico             # Application favicon
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── MeetingCard.js      # Meeting display component
│   │   ├── MicButton.js        # Microphone control component
│   │   ├── Navbar.js           # Navigation component
│   │   └── TranscriptViewer.js # Real-time transcript display
│   ├── context/                # React Context providers
│   │   └── TranscriptContext.js # Global transcript state management
│   ├── pages/                  # Application pages/routes
│   │   ├── Home.js             # Meeting list and dashboard
│   │   ├── LiveMeeting.js      # Live recording interface
│   │   └── Transcript.js       # Individual transcript view
│   ├── utils/                  # Utility functions and helpers
│   │   └── wavEncoder.js       # Advanced WAV encoding utilities
│   ├── __mocks__/              # Mock data and testing utilities
│   │   ├── mockData.js         # Sample transcript data
│   │   └── useTranscriptMock.js # Mock transcript hook
│   ├── App.css                 # Global application styles
│   ├── App.js                  # Main application component
│   └── index.js                # Application entry point
├── build/                      # Production build output
├── package.json                # Project dependencies and scripts
└── README.md                   # This file
```

## 🎯 Core Components

### **LiveMeeting.js** - Real-time Recording Interface

The heart of the application, providing:

- Advanced Web Audio API integration
- Real-time WebSocket communication
- Professional error handling and user feedback
- Comprehensive browser compatibility checking

### **TranscriptContext.js** - State Management

Professional state management featuring:

- Memoized context values for performance
- Optimistic updates for smooth UX
- Retry logic with exponential backoff
- Comprehensive error state handling

### **wavEncoder.js** - Audio Processing

Enterprise-grade audio processing with:

- Custom WAV file encoding
- SarvamAI API optimization (16kHz, mono, 16-bit)
- Memory-efficient processing
- Cross-browser compatibility

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000/ws/stt

# Feature Flags
REACT_APP_ENABLE_MOCK_MODE=false
REACT_APP_DEBUG_MODE=true

# Performance
REACT_APP_MAX_RECORDING_DURATION=300
REACT_APP_AUDIO_SAMPLE_RATE=16000
```

### StrictMode Configuration

Control React StrictMode behavior:

```javascript
// Disable StrictMode for WebSocket testing
http://localhost:3000?strict=false

// Enable StrictMode (default)
http://localhost:3000?strict=true
```

## 🎨 Styling & Theming

The application uses a clean, modern design system:

- **Responsive Grid**: Mobile-first CSS Grid layout
- **Professional Color Palette**: Consistent brand colors throughout
- **Accessible Design**: WCAG 2.1 compliant accessibility features
- **Modern Typography**: Clean, readable font hierarchy

### CSS Architecture

```css
/* Global Styles */
body {
  /* Mobile-first responsive design */
}

/* Component Styles */
.navbar {
  /* Professional navigation styling */
}
.card {
  /* Consistent card component design */
}
.mic-btn {
  /* Interactive microphone button */
}

/* State-based Styling */
.mic-btn.active {
  /* Active recording state */
}
.error-state {
  /* Error feedback styling */
}
```

## 🌐 API Integration

### WebSocket Communication

```javascript
// WebSocket connection for real-time transcription
const ws = new WebSocket("ws://localhost:5000/ws/stt");

// Send audio data
ws.send(
  JSON.stringify({
    audio: base64AudioData,
    mimeType: "audio/wav",
    timestamp: new Date().toISOString(),
  })
);
```

### REST API Integration

```javascript
// Fetch transcripts
const response = await axios.get("/api/transcripts");

// Create new transcript
const newTranscript = await axios.post("/api/transcripts", {
  title: "Meeting Title",
  content: "Transcript content...",
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full application workflow testing

## 📈 Performance Optimization

### Build Optimization

- **Code Splitting**: Automatic route-based code splitting
- **Bundle Analysis**: Built-in bundle size analysis
- **Asset Optimization**: Automatic image and asset optimization
- **Caching Strategy**: Efficient browser caching implementation

### Runtime Performance

- **Memoized Components**: Optimized re-rendering with React.memo
- **Context Optimization**: Memoized context values
- **Memory Management**: Proper cleanup of WebSocket connections
- **Audio Processing**: Efficient WAV encoding and processing

## 🚀 Deployment

### Production Build

```bash
# Create production build
npm run build

# Preview production build locally
npx serve -s build
```

### Deployment Options

- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN Deployment**: AWS CloudFront, Azure CDN
- **Container Deployment**: Docker with nginx
- **Server Deployment**: Traditional web server hosting

## 🛠️ Development

### Development Workflow

```bash
# Start development server
npm start

# Format code
npm run format

# Lint code
npm run lint

# Type checking
npm run type-check
```

### Code Quality

- **ESLint**: Comprehensive linting with React-specific rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for code quality
- **JSDoc**: Comprehensive code documentation

## 🔍 Debugging

### Development Tools

- **React Developer Tools**: Component tree inspection
- **Redux DevTools**: State management debugging
- **WebSocket Inspector**: Real-time WebSocket debugging
- **Performance Profiler**: Component rendering analysis

### Common Issues

1. **WebSocket Connection Issues**

   - Check backend server status
   - Verify CORS configuration
   - Test with `?strict=false` parameter

2. **Audio Recording Problems**

   - Ensure HTTPS for production
   - Check microphone permissions
   - Verify Web Audio API support

3. **Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

## 📱 Browser Support

- **Chrome/Chromium** 88+
- **Firefox** 85+
- **Safari** 14+
- **Edge** 88+

### Required APIs

- Web Audio API
- MediaDevices.getUserMedia()
- WebSocket API
- ES6+ JavaScript features

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create feature branch: `git checkout -b feature/amazing-feature`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open Pull Request

### Code Standards

- Follow ESLint configuration
- Write comprehensive JSDoc comments
- Include unit tests for new features
- Maintain accessibility standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **SarvamAI** for speech-to-text API services
- **Web Audio API** for professional audio processing
- **Open Source Contributors** for various dependencies

## 📞 Support

For support and questions:

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/your-username/granola-clone/issues)
- **Documentation**: Check this README and inline code comments
- **Community**: Join our discussions and community forums

---

**Built with ❤️ using React 19 and modern web technologies**
