#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${LABD_SCENARIOS_DIR:-/opt/dead3ars-labd/scenarios}"

echo "Validating scenarios before sync..."
node "${REPO_DIR}/scripts/check-scenarios.mjs"

if [ ! -d "${TARGET_DIR}" ]; then
  echo "Target directory ${TARGET_DIR} does not exist; creating..."
  sudo mkdir -p "${TARGET_DIR}"
fi

sudo cp "${REPO_DIR}"/labd/scenarios/*.sh "${TARGET_DIR}/"
sudo chmod 755 "${TARGET_DIR}"/*.sh
diff -rq "${REPO_DIR}/labd/scenarios" "${TARGET_DIR}"
echo "✓ Synced labd/scenarios/*.sh -> ${TARGET_DIR}"
