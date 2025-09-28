# Granola Clone Backend

> Enterprise-grade Node.js backend for real-time Hindi speech-to-text transcription with advanced security and monitoring

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey.svg)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-8.18.3-blue.svg)](https://github.com/websockets/ws)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

## 🎯 Overview

The Granola Clone Backend is a robust Node.js server application built with Express 5, providing real-time Hindi speech-to-text transcription services through WebSocket connections. It features enterprise-grade security middleware, comprehensive monitoring, and seamless integration with SarvamAI's speech recognition API.

## ✨ Features

### 🎤 **Real-time Speech Processing**

- **WebSocket Integration**: High-performance WebSocket server for live audio streaming
- **SarvamAI API Integration**: Professional Hindi speech-to-text recognition
- **Advanced Audio Processing**: WAV validation, format correction, and optimization
- **Mock Mode Support**: Development-friendly mock transcription for testing

### 🔒 **Enterprise Security**

- **Comprehensive Security Middleware**: Helmet, CORS, rate limiting, and input sanitization
- **Multi-layer Rate Limiting**: API protection with configurable limits per endpoint
- **Input Validation**: Joi-based request validation with detailed error reporting
- **Environment Security**: Secure configuration management with validation

### 📊 **Monitoring & Health Checks**

- **Health Monitoring**: Comprehensive health checks for all system components
- **Performance Metrics**: Real-time system monitoring with memory and CPU tracking
- **API Status Monitoring**: SarvamAI connectivity and service health verification
- **Graceful Shutdown**: Clean resource cleanup and connection termination

### 🎯 **Professional Architecture**

- **Modular Design**: Clean separation of concerns with dedicated middleware
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Logging System**: Professional request logging with configurable levels
- **Configuration Management**: Environment-based configuration with validation

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **SarvamAI API Key** (for production transcription)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/granola-clone-backend.git
cd granola-clone-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
HOST=localhost
NODE_ENV=development

# SarvamAI API Configuration
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_API_URL=https://api.sarvam.ai
SARVAM_TIMEOUT=120000

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
MAX_REQUEST_SIZE=50mb
SESSION_SECRET=your_secure_session_secret_here

# WebSocket Configuration
WS_PATH=/ws/stt
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=100
WS_MAX_MESSAGE_SIZE=52428800

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log
LOG_MAX_FILES=5
LOG_MAX_SIZE=10m

# Storage Configuration
DATA_PATH=./data
TEMP_PATH=/tmp/granola-clone
MAX_FILE_SIZE=52428800

# Performance Configuration
MEMORY_LIMIT=536870912
CPU_LIMIT=80
CLEANUP_INTERVAL=300000
```

## 📁 Project Structure

```
granola-clone-backend/
├── config/
│   └── environment.js          # Environment configuration and validation
├── middleware/
│   ├── security.js             # Security middleware stack
│   └── validation.js           # Request validation middleware
├── routes/
│   ├── health.js              # Health monitoring endpoints
│   └── transcripts.js         # Transcript CRUD operations
├── utils/
│   └── wavValidator.js        # WAV file validation and processing
├── ws/
│   └── sttHandler.js          # WebSocket speech-to-text handler
├── data/
│   └── transcripts.json       # Transcript storage (development)
├── logs/                      # Application logs
├── temp/                      # Temporary file processing
├── server.js                  # Main application server
├── package.json               # Project dependencies and scripts
└── README.md                  # This file
```

## 🎯 Core Components

### **server.js** - Main Application Server

The main server application featuring:

- Express 5 integration with security middleware
- Environment configuration management
- Health monitoring endpoint setup
- WebSocket server initialization
- Graceful shutdown handling

### **ws/sttHandler.js** - WebSocket Speech-to-Text Handler

Advanced WebSocket handling with:

- Real-time audio data processing
- SarvamAI API integration with retry logic
- Buffer-to-string message parsing
- Rate limiting and queue management
- Comprehensive error handling and user feedback

### **middleware/security.js** - Security Middleware Stack

Enterprise-grade security featuring:

- Helmet security headers configuration
- Multi-tier rate limiting (general, WebSocket, upload)
- CORS configuration with origin validation
- Request sanitization and XSS protection
- Compression and performance optimization

### **config/environment.js** - Configuration Management

Professional configuration system with:

- Environment variable validation and type checking
- Development/production separation
- Secure default values and fallbacks
- Configuration schema validation
- Detailed error reporting

## 🔧 API Endpoints

### **Health & Monitoring**

```bash
# Basic health check
GET /health
Response: {"status":"healthy","timestamp":"...","uptime":"..."}

# Detailed health check
GET /health/detailed
Response: {"status":"healthy","checks":{...},"system":{...}}

# System status
GET /status
Response: {"application":{...},"server":{...},"system":{...}}

# Readiness check (for load balancers)
GET /ready
Response: {"status":"ready","timestamp":"..."}

# Liveness check (for container orchestration)
GET /live
Response: {"status":"alive","timestamp":"...","memory":{...}}
```

### **Transcript Management**

```bash
# Get all transcripts
GET /api/transcripts
Response: [{"id":1,"title":"...","date":"...","content":"..."}]

# Get transcript by ID
GET /api/transcripts/:id
Response: {"id":1,"title":"...","date":"...","content":"..."}

# Create new transcript
POST /api/transcripts
Body: {"title":"Meeting Title","content":"Transcript content..."}
Response: {"id":123,"title":"...","date":"...","content":"..."}
```

### **WebSocket Speech-to-Text**

```bash
# WebSocket connection
ws://localhost:5000/ws/stt

# Send audio data
{
  "audio": "base64_encoded_wav_data",
  "mimeType": "audio/wav",
  "timestamp": "2025-09-28T10:00:00.000Z"
}

# Receive transcription
{
  "transcript": "नमस्ते, आज का मीटिंग शुरू हो रहा है।",
  "timestamp": "2025-09-28T10:00:01.000Z",
  "processingTime": 1500
}
```

## 🔒 Security Features

### **Security Headers (Helmet)**

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options protection
- X-Content-Type-Options nosniff
- Referrer Policy configuration

### **Rate Limiting**

- **General API**: 100 requests per 15 minutes
- **WebSocket Connections**: 10 connections per minute
- **File Uploads**: 20 uploads per 15 minutes
- **Customizable**: Environment-based configuration

### **Input Validation**

- **Joi Schema Validation**: Comprehensive request validation
- **File Upload Validation**: Size, type, and content validation
- **WebSocket Message Validation**: Real-time data validation
- **XSS Protection**: Request sanitization and output encoding

### **CORS Configuration**

- **Origin Validation**: Configurable allowed origins
- **Credential Support**: Secure cookie and auth handling
- **Method Restrictions**: Limited HTTP methods
- **Header Controls**: Strict header validation

## 📊 Monitoring & Logging

### **Health Monitoring**

- **System Metrics**: Memory, CPU, and uptime monitoring
- **API Connectivity**: SarvamAI service health checks
- **Storage Health**: File system access and write tests
- **WebSocket Status**: Connection and performance monitoring

### **Logging System**

- **Request Logging**: Comprehensive HTTP request logging
- **Error Tracking**: Detailed error logging with stack traces
- **Performance Logging**: Response time and resource usage
- **Security Logging**: Rate limiting and security event logging

### **Performance Metrics**

- **Memory Usage**: Real-time memory consumption tracking
- **CPU Utilization**: Process CPU usage monitoring
- **Response Times**: API endpoint performance tracking
- **Connection Monitoring**: WebSocket connection health

## 🎵 Audio Processing

### **WAV File Processing**

- **Format Validation**: Comprehensive WAV header validation
- **Automatic Correction**: FFmpeg-based format optimization
- **SarvamAI Optimization**: 16kHz, mono, 16-bit configuration
- **Memory Efficient**: Streaming processing for large files

### **WebSocket Audio Handling**

- **Real-time Processing**: Live audio stream handling
- **Buffer Management**: Efficient memory usage for audio data
- **Queue Management**: Smart queuing for concurrent requests
- **Error Recovery**: Robust error handling and retry logic

## 🚀 Deployment

### **Development**

```bash
# Start development server with hot reload
npm run dev

# Run with specific environment
NODE_ENV=development npm run dev

# Enable debug logging
LOG_LEVEL=debug npm run dev
```

### **Production**

```bash
# Install production dependencies only
npm ci --only=production

# Start production server
NODE_ENV=production npm start

# Process manager (PM2)
pm2 start server.js --name granola-backend

# Docker deployment
docker build -t granola-backend .
docker run -p 5000:5000 granola-backend
```

### **Docker Configuration**

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
CMD ["npm", "start"]
```

### **Environment Deployment**

```bash
# Staging deployment
NODE_ENV=staging npm start

# Production deployment
NODE_ENV=production npm start

# Load balancer health checks
curl http://localhost:5000/ready
curl http://localhost:5000/live
```

## 🧪 Testing

### **Running Tests**

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run security audit
npm run security:audit

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### **Health Check Testing**

```bash
# Test server health
npm run health

# Manual health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed
```

## 🛠️ Development

### **Development Workflow**

```bash
# Start development server
npm run dev

# Check server health
npm run health

# View logs
npm run logs

# Clean temporary files
npm run clean

# Security audit
npm run security:check
```

### **Code Quality**

- **ESLint**: Comprehensive JavaScript linting
- **JSDoc**: Professional code documentation
- **Security Audit**: Regular dependency security checks
- **Performance Monitoring**: Real-time performance tracking

## 🔧 Configuration

### **Environment Variables**

| Variable         | Description             | Default       | Required         |
| ---------------- | ----------------------- | ------------- | ---------------- |
| `PORT`           | Server port             | `5000`        | No               |
| `HOST`           | Server host             | `localhost`   | No               |
| `NODE_ENV`       | Environment             | `development` | No               |
| `SARVAM_API_KEY` | SarvamAI API key        | -             | Yes (production) |
| `CORS_ORIGIN`    | CORS allowed origins    | `*`           | No               |
| `RATE_LIMIT_MAX` | Rate limit max requests | `100`         | No               |
| `SESSION_SECRET` | Session secret key      | Generated     | No (development) |

### **Production Configuration**

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
SARVAM_API_KEY=your_production_api_key
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=500
SESSION_SECRET=your_secure_production_secret
LOG_LEVEL=info
```

## 📈 Performance Optimization

### **Server Performance**

- **Response Compression**: Gzip compression for all responses
- **Connection Pooling**: Efficient HTTP connection management
- **Memory Management**: Automatic garbage collection optimization
- **CPU Optimization**: Process clustering for multi-core systems

### **WebSocket Optimization**

- **Connection Pooling**: Efficient WebSocket connection management
- **Message Queuing**: Smart queuing for concurrent audio processing
- **Buffer Management**: Memory-efficient audio data handling
- **Heartbeat Monitoring**: Connection health and timeout management

## 🚨 Error Handling

### **Error Categories**

- **Validation Errors**: Input validation and format errors
- **API Errors**: SarvamAI API communication errors
- **System Errors**: Server and resource-related errors
- **Security Errors**: Rate limiting and security violations

### **Error Response Format**

```json
{
  "error": "User-friendly error message",
  "errorId": "unique_error_identifier",
  "timestamp": "2025-09-28T10:00:00.000Z",
  "details": "Technical error details (development only)"
}
```

## 🔍 Debugging

### **Debug Mode**

```bash
# Enable debug logging
DEBUG=* npm run dev

# Enable specific debug categories
DEBUG=express:* npm run dev

# Enable verbose logging
LOG_LEVEL=debug npm run dev
```

### **Common Issues**

1. **SarvamAI API Connection Issues**

   - Verify API key configuration
   - Check network connectivity
   - Test with mock mode: Remove `SARVAM_API_KEY`

2. **WebSocket Connection Problems**

   - Check CORS configuration
   - Verify WebSocket path: `/ws/stt`
   - Test connection limits

3. **Memory Issues**
   - Monitor memory usage: `/health/detailed`
   - Adjust `MEMORY_LIMIT` configuration
   - Check for memory leaks in audio processing

## 📱 Browser & Client Support

### **WebSocket Clients**

- **Web Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **Node.js Clients**: ws, socket.io-client
- **Mobile Apps**: React Native, Flutter WebSocket support
- **Testing Tools**: Postman, wscat, WebSocket King

### **API Clients**

- **HTTP Clients**: Axios, Fetch API, curl
- **Testing Tools**: Postman, Insomnia, HTTPie
- **Integration**: Any REST API client

## 🤝 Contributing

### **Development Setup**

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/granola-clone-backend.git`
3. Install dependencies: `npm install`
4. Configure environment: `cp .env.example .env`
5. Start development server: `npm run dev`
6. Make your changes
7. Run tests: `npm test`
8. Submit pull request

### **Code Standards**

- Follow ESLint configuration
- Write comprehensive JSDoc comments
- Include unit tests for new features
- Update documentation for API changes
- Follow security guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Express.js Team** for the robust web framework
- **SarvamAI** for Hindi speech-to-text API services
- **WebSocket Community** for real-time communication protocols
- **Security Community** for middleware and best practices
- **Open Source Contributors** for various dependencies

## 📞 Support

For support and questions:

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/your-username/granola-clone-backend/issues)
- **Documentation**: Check this README and inline code comments
- **Health Checks**: Use `/health` and `/status` endpoints for troubleshooting
- **Security Issues**: Report security concerns privately

---

**Built with ❤️ using Node.js, Express 5, and modern backend technologies**
