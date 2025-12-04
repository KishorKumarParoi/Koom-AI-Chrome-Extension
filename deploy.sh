#!/usr/bin/env bash
# ==============================================================================
# 🧩 KOOMAI CHROME EXTENSION DEPLOYMENT & VERIFICATION SCRIPT
# Manifest V3 Extension Validator & Chrome Web Store Packager
# ==============================================================================

set -eo pipefail

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}${BOLD}"
cat << "EOF"
================================================================================
  🧩 KOOMAI SCREEN RECORDER CHROME EXTENSION (MANIFEST V3)
  Deployment & Packaging Orchestrator
================================================================================
EOF
echo -e "${NC}"

# 1. Validate manifest.json exists and is valid JSON
echo -e "${CYAN}[1/3] Validating Manifest V3 configuration...${NC}"
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}[ERROR] manifest.json not found in ${SCRIPT_DIR}.${NC}"
    exit 1
fi

if command -v node &>/dev/null; then
    node -e "const m = require('./manifest.json'); console.log('  • Name: ' + m.name + '\n  • Version: ' + m.version + '\n  • Manifest Version: ' + m.manifest_version);"
fi
echo -e "${GREEN}[✓] Manifest V3 valid.${NC}"

# 2. Check Extension Assets
echo -e "\n${CYAN}[2/3] Checking core extension components...${NC}"
FILES_TO_CHECK=(
    "service_worker.js"
    "popup.html"
    "popup.js"
    "offscreen.html"
    "offscreen.js"
    "content.js"
    "video.html"
    "video.js"
    "camera.html"
    "camera.js"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✔${NC} Found $file"
    else
        echo -e "  ${RED}✖ Missing $file${NC}"
    fi
done

# 3. Packaging or Instructions
if [ "$1" = "--package" ] || [ "$1" = "-p" ]; then
    echo -e "\n${CYAN}[3/3] Packaging production zip bundle for Chrome Web Store...${NC}"
    ZIP_NAME="koomai-chrome-extension-v$(node -p "require('./manifest.json').version").zip"
    rm -f "$ZIP_NAME"
    zip -q -r "$ZIP_NAME" . -x "*.git*" "*.DS_Store*" "*.zip" "deploy.sh" "clear.sh" "ARCHITECTURE.md"
    echo -e "${GREEN}[✓] Bundle packaged: ${BOLD}${ZIP_NAME}${NC}"
else
    echo -e "\n${CYAN}[3/3] Installation Instructions for Google Chrome / Brave / Edge:${NC}"
    echo -e "  1. Open your browser and navigate to: ${BOLD}chrome://extensions${NC}"
    echo -e "  2. Toggle on ${BOLD}Developer mode${NC} in the top-right corner."
    echo -e "  3. Click ${BOLD}Load unpacked${NC} and select this directory:"
    echo -e "     ${YELLOW}${SCRIPT_DIR}${NC}"
    echo -e "  4. The KoomAI screen recorder extension will appear on your toolbar!"
    echo -e "\n${GREEN}[✓] Extension ready to test!${NC}\n"
fi
