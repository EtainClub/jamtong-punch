#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:=jamtong-punch}"
firebase deploy --project="$PROJECT_ID" --only firestore:indexes
firebase deploy --project="$PROJECT_ID" --only firestore:rules
firebase deploy --project="$PROJECT_ID" --only storage
