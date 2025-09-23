# KwickLingo Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- React Native development environment
- Android Studio (for Android) or Xcode (for iOS)

### Running the App

#### Option 1: Using the startup script (Recommended)
```bash
./start-dev.sh
```

#### Option 2: Manual setup
1. **Start the signaling server:**
   ```bash
   cd server
   npm install
   npm start
   ```

2. **In a new terminal, start the React Native app:**
   ```bash
   npm start
   ```

3. **Run on device/emulator:**
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## 🔧 Recent Fixes Applied

### ✅ Critical Issues Fixed
1. **File Naming**: Fixed typos in component names
   - `VidoeControls.tsx` → `VideoControls.tsx`
   - `AppNaviagtion.tsx` → `AppNavigation.tsx`

2. **Signaling Server**: Created complete Socket.io server
   - Handles user matching
   - WebRTC signaling
   - Chat messaging
   - Partner disconnection

3. **Configuration**: Centralized config management
   - Created `src/config/config.ts`
   - Updated Firebase and Google Sign-in configs
   - Environment-ready configuration

4. **Permissions**: Added proper permission handling
   - Camera and microphone permissions
   - User-friendly permission requests
   - Graceful fallback for denied permissions

5. **TypeScript**: Fixed navigation type issues
   - Corrected screen type definitions
   - Fixed import paths

## 📱 App Features

### Authentication
- Firebase Authentication
- Email/Password registration and login
- Google Sign-in integration
- Persistent login state

### Video Calling
- WebRTC peer-to-peer video calls
- Real-time video streaming
- Camera switching (front/back)
- Mute/unmute audio
- Enable/disable video
- Partner matching system

### Chat System
- Real-time text messaging during video calls
- Socket.io for signaling
- Message history display

## 🛠️ Development

### Project Structure
```
kwicklingo/
├── src/
│   ├── components/          # Reusable components
│   ├── config/             # Configuration files
│   ├── navigation/         # Navigation setup
│   ├── screens/           # App screens
│   ├── service/           # API and auth services
│   └── utils/             # Utility functions
├── server/                # Socket.io signaling server
└── assets/               # Images and videos
```

### Key Dependencies
- React Native 0.79.4
- React Navigation 7
- React Native WebRTC
- Firebase Auth & Firestore
- Socket.io
- React Native Permissions

## 🐛 Troubleshooting

### Common Issues

1. **"No partners available"**
   - Ensure signaling server is running
   - Check server logs for errors
   - Verify network connectivity

2. **Permission denied errors**
   - Check device settings
   - Grant camera/microphone permissions
   - Restart the app

3. **Video not showing**
   - Check camera permissions
   - Verify WebRTC setup
   - Check device compatibility

### Server Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-09-22T06:09:48.333Z",
  "queueLength": 0,
  "activeConnections": 0
}
```

## 📝 Next Steps

### Immediate Improvements
1. Add user profiles and avatars
2. Implement call history
3. Add reporting system
4. Improve error handling
5. Add push notifications

### Production Considerations
1. Move to production signaling server
2. Implement proper environment variables
3. Add analytics and monitoring
4. Implement rate limiting
5. Add user moderation features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
