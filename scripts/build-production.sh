#!/bin/bash

# Production Build Script for KwickLingo
# This script builds the app for production deployment

set -e  # Exit on any error

echo "🏭 Starting KwickLingo Production Build..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf android/app/build
rm -rf ios/build
rm -rf node_modules/.cache

# Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

# Install iOS dependencies if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_status "Installing iOS dependencies..."
    cd ios && pod install && cd ..
fi

# Run linting
print_status "Running ESLint..."
npx eslint src/ --ext .ts,.tsx --fix

# Run type checking
print_status "Running TypeScript type checking..."
npx tsc --noEmit

# Run tests
print_status "Running tests..."
npm test -- --coverage --watchAll=false

# Build Android APK
print_status "Building Android APK..."
cd android
./gradlew assembleRelease
cd ..

# Build Android AAB (for Play Store)
print_status "Building Android AAB..."
cd android
./gradlew bundleRelease
cd ..

# Build iOS (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_status "Building iOS..."
    npx react-native run-ios --configuration Release
fi

# Create build artifacts directory
print_status "Creating build artifacts..."
mkdir -p build-artifacts

# Copy Android APK
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp android/app/build/outputs/apk/release/app-release.apk build-artifacts/kwicklingo-release.apk
    print_success "Android APK copied to build-artifacts/"
fi

# Copy Android AAB
if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
    cp android/app/build/outputs/bundle/release/app-release.aab build-artifacts/kwicklingo-release.aab
    print_success "Android AAB copied to build-artifacts/"
fi

# Copy iOS build (if exists)
if [ -d "ios/build/Build/Products/Release-iphoneos" ]; then
    cp -r ios/build/Build/Products/Release-iphoneos/*.app build-artifacts/
    print_success "iOS app copied to build-artifacts/"
fi

# Generate build info
print_status "Generating build info..."
cat > build-artifacts/build-info.json << EOF
{
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git branch --show-current)",
  "version": "$(node -p "require('./package.json').version")",
  "buildNumber": "$(date +%Y%m%d%H%M)",
  "environment": "production"
}
EOF

# Generate checksums
print_status "Generating checksums..."
cd build-artifacts
sha256sum * > checksums.sha256
cd ..

print_success "Production build completed successfully!"
print_status "Build artifacts are available in the 'build-artifacts' directory"
print_status "Don't forget to:"
print_status "  1. Test the production build thoroughly"
print_status "  2. Update server configuration for production"
print_status "  3. Configure Firebase for production"
print_status "  4. Set up crash reporting and analytics"
print_status "  5. Deploy to app stores"

echo ""
print_success "🎉 KwickLingo is ready for production! 🚀"
