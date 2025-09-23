#!/bin/bash

echo "🔍 Finding your computer's IP address for mobile device testing..."
echo ""

# Get local IP address
LOCAL_IP=$(ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    # Alternative method for macOS
    LOCAL_IP=$(ifconfig | grep -E "inet.*192\.168\." | awk '{print $2}' | head -1)
fi

if [ -z "$LOCAL_IP" ]; then
    # Another alternative
    LOCAL_IP=$(ip route get 1 | awk '{print $7; exit}' 2>/dev/null)
fi

if [ -n "$LOCAL_IP" ]; then
    echo "✅ Your computer's IP address: $LOCAL_IP"
    echo ""
    echo "📱 For testing on physical devices:"
    echo "   Update src/config/config.ts with:"
    echo "   SIGNALING_URL: \"http://$LOCAL_IP:3000\""
    echo ""
    echo "🧪 Test server connection:"
    echo "   curl http://$LOCAL_IP:3000/health"
    echo ""
else
    echo "❌ Could not determine IP address automatically"
    echo "Please find your IP address manually and update the config"
fi
