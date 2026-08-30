#!/usr/bin/env bash
# Open the one-click Render free deploy for SAVENTRA Technologies.
set -euo pipefail

REPO_URL="https://github.com/SatishKallepalli-KSO/saventra-technologies"
DEPLOY_URL="https://render.com/deploy?repo=${REPO_URL}"
LIVE_URL="https://saventra-technologies.onrender.com"

echo ""
echo "SAVENTRA Technologies: free live deploy (Render)"
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
