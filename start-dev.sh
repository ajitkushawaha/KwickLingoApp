#!/bin/bash

# KwickLingo Development Startup Script
echo "🚀 Starting KwickLingo Development Environment..."

# Check if server is already running
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Signaling server is already running"
else
    echo "🔄 Starting signaling server..."
    cd server
    npm start &
    SERVER_PID=$!
    cd ..
    
    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    sleep 3
    
    # Check if server started successfully
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Signaling server started successfully"
    else
        echo "❌ Failed to start signaling server"
        exit 1
    fi
fi

echo "🔄 Starting React Native Metro bundler..."
npm start
