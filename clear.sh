#!/usr/bin/env bash
# ==============================================================================
# 🛑 CLEANUP SCRIPT FOR KOOMAI CHROME EXTENSION
# Cleans temporary builds and zip packages
# ==============================================================================

set -eo pipefail

BOLD='\033[1m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}${BOLD}[*] Cleaning temporary zip packages and artifacts...${NC}"
rm -f *.zip 2>/dev/null || true
echo -e "${GREEN}[✓] Extension directory clean ($0.00 footprint).${NC}\n"
