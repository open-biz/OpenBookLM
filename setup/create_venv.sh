#!/bin/bash

set -e

# Run:
# chmod +x ./scripts/create_venv.sh
# ./scripts/create_venv.sh

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Setting up Python 3.12 on macOS..."
    # Check if brew is installed
    if ! command -v brew &> /dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew update
    brew install python@3.12
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Setting up Python 3.12 on Ubuntu..."
    if ! which python3.12 &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y software-properties-common
        sudo add-apt-repository -y ppa:deadsnakes/ppa
        sudo apt update -y
        sudo apt install -y python3.12 python3.12-dev python3.12-venv
    elif ! python3.12 -m venv --help &> /dev/null; then
        sudo apt-get update -y
        sudo add-apt-repository -y ppa:deadsnakes/ppa
        sudo apt update -y
        sudo apt-get install -y python3.12-venv
    fi
else
    echo "Unsupported operating system"
    exit 1
fi

# Get absolute path to script directory and project root
script_dir="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT="$(dirname "$script_dir")"
reqs_fullpath="$ROOT"/requirements.txt
venv_fullpath="$ROOT"/venv

# Create virtual environment
if [ ! -d "$venv_fullpath" ]; then
    echo "Creating virtual environment..."
    python3.12 -m venv "$venv_fullpath"
else
    echo "Virtual environment already exists"
fi

# Activate and install requirements
echo "Activating virtual environment and installing requirements..."
source venv/bin/activate

# Check and install requirements using absolute path
if [ -f "$reqs_fullpath" ]; then
    pip install -r "$reqs_fullpath"
fi

echo -e "\nFrom root directory, activate the virtual environment:"
echo "source venv/bin/activate"
echo -e "\nTo deactivate:"
echo "deactivate"
echo
