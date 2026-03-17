#!/bin/bash
# This script runs inside the EAS build environment

if [ -f "google-services.json.gpg" ]; then
  echo "Decrypting google-services.json inside build environment..."
  gpg --batch --yes --passphrase "$GPG_PASSPHRASE" \
    --output google-services.json \
    --decrypt google-services.json.gpg
else
  echo "google-services.json.gpg not found, skipping decryption."
fi