#!/bin/bash

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helper Functions ---
header() {
  echo -e "\n${CYAN}🚀 $1${NC}"
  echo -e "${CYAN}$(printf '%*s' "${#1}" '' | tr ' ' '=')===${NC}\n"
}

step() {
  echo -e "${BLUE}  ➜${NC} $1"
}

info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  # Only exit if not being sourced
  if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    exit 1
  fi
}

remote_info() {
  echo -e "${CYAN}[REMOTE]${NC} $1"
}

# Check if script is run with sudo or has root privileges
check_privileges() {
  if [ "$EUID" -ne 0 ]; then
    error "Please run this script with sudo or as root."
  fi
}

# Ensure script is run from project root
check_project_root() {
  if [ ! -d "bin" ]; then
    error "Script must be run from the project root."
  fi
}
