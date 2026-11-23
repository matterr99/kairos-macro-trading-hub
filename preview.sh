#!/usr/bin/env bash
# Preview the production build of Kairos Macro Trading Hub
export PATH="/home/gabriel/.cache/node22/bin:$PATH"

echo "Previewing production build at http://localhost:4173..."
npx vite preview
