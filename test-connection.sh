#!/bin/bash

echo "🔍 Testing KwickLingo Cross-Device Connection"
echo "=============================================="
echo ""

# Get computer IP
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "📱 Your computer's IP address: $IP_ADDRESS"
echo "🌐 Server URL: http://$IP_ADDRESS:3000"
echo ""

# Test server connection
echo "🧪 Testing server connection..."
if curl -s "http://$IP_ADDRESS:3000/health" > /dev/null; then
    echo "✅ Server is running and accessible"
    echo ""
    echo "📋 Instructions for cross-device testing:"
    echo "1. Make sure both devices are on the same WiFi network"
    echo "2. Physical device: Install the app and run it"
    echo "3. Virtual device: Run the app in emulator"
    echo "4. Both devices will connect to: http://$IP_ADDRESS:3000"
    echo ""
    echo "🎯 To start video chat:"
    echo "   - Open the app on both devices"
    echo "   - Go to video chat screen on both"
    echo "   - One device will find the other automatically"
    echo ""
    echo "🔧 If connection fails:"
    echo "   - Check firewall settings"
    echo "   - Ensure both devices are on same network"
    echo "   - Restart the server if needed"
else
    echo "❌ Server is not accessible"
    echo "   Please start the server first:"
    echo "   cd server && npm start"
fi
