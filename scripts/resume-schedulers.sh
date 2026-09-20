#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:=asia-northeast3}"

for job in jamtong-rollup jamtong-expire jamtong-reconcile; do
  gcloud scheduler jobs resume "$job" --project="$PROJECT_ID" --location="$REGION"
done
