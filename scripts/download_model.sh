#!/bin/bash
# Download the MLC model artifacts for Local AI dev
# Model: Qwen2.5-0.5B-Instruct-q4f16_1-MLC
# Destination: public/models/Qwen2.5-0.5B-Instruct-q4f16_1-MLC

MODEL_REPO="mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
DEST_DIR="public/models/Qwen2.5-0.5B-Instruct-q4f16_1-MLC"

# Ensure destination exists
mkdir -p "$DEST_DIR"

echo "🚀 Starting download of $MODEL_REPO to $DEST_DIR..."

# Check if git-lfs is installed
if ! command -v git-lfs &> /dev/null; then
    echo "⚠️  git-lfs not found. Please install it: brew install git-lfs"
    echo "Trying simple clone (might fail for large files if not LFS initialized)..."
fi

# Clone the repo (depth 1 to save space)
# We use a temporary directory to clone, then move files
TEMP_DIR=$(mktemp -d)

echo "📥 Cloning from Hugging Face..."
git clone --depth 1 "https://huggingface.co/$MODEL_REPO" "$TEMP_DIR"

# Move files to public/models
echo "📂 Moving files..."
cp -r "$TEMP_DIR"/* "$DEST_DIR/"

# Cleanup
rm -rf "$TEMP_DIR"
rm -rf "$DEST_DIR/.git" # Remove git history to save space and avoid submodules issues

echo "✅ Download complete!"
echo "📍 Model assets are located in: $DEST_DIR"
echo "👉 You can now test Local AI."
