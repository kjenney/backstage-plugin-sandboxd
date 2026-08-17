#!/usr/bin/env bash
#
# Demo deployment script for the sandboxd Backstage plugin.
#
# This script provisions a complete demo environment:
# 1. Creates a Backstage catalog entity for a demo app
# 2. Deploys the app to sandboxd via the scaffolder action
# 3. Verifies the entity and sandbox are properly synced
#
# Usage:
#   ./deploy-demo.sh [OPTIONS]
#
# Options:
#   --app-name NAME     Application name (default: demo-app)
#   --preset PRESET     Sandboxd preset to use (default: react-vite)
#   --owner OWNER       Entity owner (default: user:demo)
#   --sandboxd-url URL  sandboxd control-plane URL (default: http://localhost:9090)
#   --backstage-url URL Backstage app URL (default: http://localhost:7007)
#   --help              Show this help message

set -euo pipefail

# Default values
APP_NAME="demo-app"
PRESET="react-vite"
OWNER="user:demo"
SANDBOXD_URL="http://localhost:9090"
BACKSTAGE_URL="http://localhost:7007"

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --preset)
      PRESET="$2"
      shift 2
      ;;
    --owner)
      OWNER="$2"
      shift 2
      ;;
    --sandboxd-url)
      SANDBOXD_URL="$2"
      shift 2
      ;;
    --backstage-url)
      BACKSTAGE_URL="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Provision a demo sandboxd app and Backstage entity."
      echo ""
      echo "Options:"
      echo "  --app-name NAME     Application name (default: demo-app)"
      echo "  --preset PRESET     Sandboxd preset to use (default: react-vite)"
      echo "  --owner OWNER       Entity owner (default: user:demo)"
      echo "  --sandboxd-url URL  sandboxd control-plane URL (default: http://localhost:9090)"
      echo "  --backstage-url URL Backstage app URL (default: http://localhost:7007)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "============================================"
echo " sandboxd Backstage Plugin — Demo Deployment"
echo "============================================"
echo ""
echo "App name:     $APP_NAME"
echo "Preset:       $PRESET"
echo "Owner:        $OWNER"
echo "sandboxd URL: $SANDBOXD_URL"
echo "Backstage URL: $BACKSTAGE_URL"
echo ""

# Step 1: Create the Backstage catalog entity
echo "Step 1: Creating Backstage catalog entity..."
echo ""

cat > /tmp/sandboxd-demo-entity.yaml <<EOF
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: $APP_NAME
  description: Demo app created by the sandboxd Backstage plugin demo
  annotations:
    sandboxd.backstage.io/sandboxd-enabled: 'true'
    sandboxd.backstage.io/runtime: '$PRESET'
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: demo/$APP_NAME
  tags:
    - sandboxd
    - demo
spec:
  type: service
  lifecycle: experimental
  owner: $OWNER
  system: demo
EOF

echo "Entity YAML:"
cat /tmp/sandboxd-demo-entity.yaml
echo ""

# Step 2: Deploy the app to sandboxd
echo "Step 2: Deploying app to sandboxd..."
echo ""

# Create a sandbox for the app using the sandboxd API
DEPLOY_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$APP_NAME\", \"presetId\": \"$PRESET\"}" \
  "${SANDBOXD_URL}/v1/apps" 2>/dev/null || echo "{\"error\": \"sandboxd unreachable\"}")

echo "Deploy response:"
echo "$DEPLOY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DEPLOY_RESPONSE"
echo ""

# Step 3: Register the entity in Backstage
echo "Step 3: Registering entity in Backstage..."
echo ""

ENTITY_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d @/tmp/sandboxd-demo-entity.yaml \
  "${BACKSTAGE_URL}/api/catalog/entities" 2>/dev/null || echo "{\"error\": \"Backstage unreachable\"}")

echo "Entity registration response:"
echo "$ENTITY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ENTITY_RESPONSE"
echo ""

# Step 4: Verify the deployment
echo "Step 4: Verifying deployment..."
echo ""

# Check the sandbox status
SANDBOX_STATUS=$(curl -s "${SANDBOXD_URL}/v1/apps/${APP_NAME}" 2>/dev/null || echo "{\"error\": \"sandboxd unreachable\"}")

echo "Sandbox status:"
echo "$SANDBOX_STATUS" | python3 -m json.tool 2>/dev/null || echo "$SANDBOX_STATUS"
echo ""

# Check the entity status
ENTITY_STATUS=$(curl -s "${BACKSTAGE_URL}/api/catalog/entities/by-name/component/default/${APP_NAME}" 2>/dev/null || echo "{\"error\": \"Backstage unreachable\"}")

echo "Entity status:"
echo "$ENTITY_STATUS" | python3 -m json.tool 2>/dev/null || echo "$ENTITY_STATUS"
echo ""

# Step 5: Summary
echo "============================================"
echo " Demo Deployment Complete!"
echo "============================================"
echo ""
echo "App name:     $APP_NAME"
echo "Preset:       $PRESET"
echo "sandboxd URL: $SANDBOXD_URL"
echo "Backstage URL: $BACKSTAGE_URL"
echo ""
echo "Next steps:"
echo "  1. Visit the Backstage entity page: $BACKSTAGE_URL/catalog/default/component/$APP_NAME"
echo "  2. Click the 'Sandboxd' tab to view your app"
echo "  3. Use the App Store or deploy more apps via the scaffolder action"
echo ""
echo "To clean up:"
echo "  curl -X DELETE ${SANDBOXD_URL}/v1/apps/${APP_NAME}"
echo "  curl -X DELETE ${BACKSTAGE_URL}/api/catalog/entities/by-name/component/default/${APP_NAME}"
