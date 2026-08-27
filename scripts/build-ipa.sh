#!/usr/bin/env bash
#
# Build an UNSIGNED .ipa for sideloading with AltStore / Sideloadly.
#
# AltStore / Sideloadly re-sign the app with your own Apple ID at install
# time, so we deliberately skip code signing here. The output is:
#
#   PolentitaMusic/build/ipa/PolentitaMusic.ipa
#
# Usage:
#   ./scripts/build-ipa.sh            # Release build (default)
#   CONFIGURATION=Debug ./scripts/build-ipa.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

WORKSPACE="ios/PolentitaMusic.xcworkspace"
SCHEME="PolentitaMusic"
CONFIGURATION="${CONFIGURATION:-Release}"

BUILD_DIR="$PROJECT_ROOT/build"
ARCHIVE_PATH="$BUILD_DIR/PolentitaMusic.xcarchive"
IPA_DIR="$BUILD_DIR/ipa"
IPA_PATH="$IPA_DIR/PolentitaMusic.ipa"

echo "==> Cleaning previous build artifacts"
rm -rf "$ARCHIVE_PATH" "$IPA_DIR"
mkdir -p "$IPA_DIR"

echo "==> Archiving ($CONFIGURATION, unsigned)"
XCODE_LOG="$BUILD_DIR/xcodebuild-archive.log"
set +e
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  AD_HOC_CODE_SIGNING_ALLOWED=YES \
  > "$XCODE_LOG" 2>&1
rc=$?
set -e
if [[ $rc -ne 0 ]]; then
  echo "ARCHIVE FAILED (rc=$rc). Last lines of $XCODE_LOG:" >&2
  grep -nE "error:|FAILED|no identity|Command .* failed" "$XCODE_LOG" | tail -40 >&2 || true
  tail -30 "$XCODE_LOG" >&2
  exit $rc
fi

APP_PATH="$ARCHIVE_PATH/Products/Applications/PolentitaMusic.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "ERROR: expected app not found at $APP_PATH" >&2
  exit 1
fi

echo "==> Packaging .ipa"
rm -rf "$IPA_DIR/Payload"
mkdir -p "$IPA_DIR/Payload"
cp -R "$APP_PATH" "$IPA_DIR/Payload/"
( cd "$IPA_DIR" && zip -qry "PolentitaMusic.ipa" "Payload" && rm -rf "Payload" )

echo
echo "==> Done"
echo "    $IPA_PATH"
du -h "$IPA_PATH" | awk '{print "    size: " $1}'
echo
echo "Next: open Sideloadly / AltStore and drop this .ipa in. It will be"
echo "re-signed with your Apple ID on install."
