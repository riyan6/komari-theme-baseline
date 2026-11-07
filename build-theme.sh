#!/bin/bash

# Komari Theme Build Script
# This script builds the theme package locally

set -e  # Exit on any error

echo "Building Komari Theme Package..."

# Verify required files exist
verify_files() {
    echo "Verifying required files..."
    
    local files_missing=false
    
    if [ ! -f "preview.webp" ]; then
        echo "[ERROR] preview.webp not found"
        files_missing=true
    fi
    
    if [ ! -f "komari-theme.json" ]; then
        echo "[ERROR] komari-theme.json not found"
        files_missing=true
    fi
    
    if [ ! -d "dist" ]; then
        echo "[ERROR] dist/ directory not found"
        files_missing=true
    fi
    
    if [ "$files_missing" = true ]; then
        exit 1
    fi
    
    echo "All required files found!"
}

# Create theme package
create_package() {
    echo "Creating theme package..."
    
    VERSION_DATE=$(date +"%y.%m.%d")
    if git rev-parse --short HEAD &> /dev/null; then
        COMMIT_HASH=$(git rev-parse --short HEAD)
    else
        COMMIT_HASH="dev"
    fi
    
    THEME_SHORT="komari-theme"
    if [ -f "komari-theme.json" ]; then
        PARSED_SHORT=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync("komari-theme.json")).short || "komari-theme")}catch(e){console.log("komari-theme")}')
        if [ -n "$PARSED_SHORT" ]; then
            THEME_SHORT="$PARSED_SHORT"
        fi
    fi

    ZIP_NAME="${THEME_SHORT}-v${VERSION_DATE}-${COMMIT_HASH}.zip"
    
    zip -r "${ZIP_NAME}" preview.webp komari-theme.json dist/
    
    echo "Created package: ${ZIP_NAME} 🎉"
}

main() {
    npm run build
    verify_files
    create_package
}

main "$@"
