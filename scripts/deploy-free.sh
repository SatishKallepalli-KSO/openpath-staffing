#!/usr/bin/env bash
# Open the one-click Render free deploy for OpenPath Staffing.
set -euo pipefail

REPO_URL="https://github.com/SatishKallepalli-KSO/openpath-staffing"
DEPLOY_URL="https://render.com/deploy?repo=${REPO_URL}"
LIVE_URL="https://openpath-staffing.onrender.com"

echo ""
echo "OpenPath Staffing: free live deploy (Render)"
echo ""
echo "1) One-click Blueprint (browser):"
echo "   ${DEPLOY_URL}"
echo ""
echo "2) After the web service exists, set DATABASE_URL to the Neon pooled URL"
echo "   (see docs/DATABASE.md), set ADMIN_PIN, then open:"
echo "   ${LIVE_URL}"
echo ""

if command -v open >/dev/null 2>&1; then
  open "${DEPLOY_URL}"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${DEPLOY_URL}"
else
  echo "Open the Blueprint URL above in your browser."
fi
