#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:=asia-northeast3}"
: "${BASE_URL:?Set BASE_URL, e.g. https://punch.jamtong.kr}"
: "${SCHEDULER_SERVICE_ACCOUNT:?Set SCHEDULER_SERVICE_ACCOUNT}"

create_job() {
  local name="$1" schedule="$2" path="$3"
  gcloud scheduler jobs create http "$name" \
    --project="$PROJECT_ID" --location="$REGION" --schedule="$schedule" --time-zone="Asia/Seoul" \
    --uri="$BASE_URL$path" --http-method=POST \
    --oidc-service-account-email="$SCHEDULER_SERVICE_ACCOUNT" --oidc-token-audience="$BASE_URL/api/cron" \
    --attempt-deadline=180s || gcloud scheduler jobs update http "$name" \
    --project="$PROJECT_ID" --location="$REGION" --schedule="$schedule" --time-zone="Asia/Seoul" \
    --uri="$BASE_URL$path" --http-method=POST \
    --oidc-service-account-email="$SCHEDULER_SERVICE_ACCOUNT" --oidc-token-audience="$BASE_URL/api/cron" \
    --attempt-deadline=180s
}

create_job jamtong-rollup "* * * * *" "/api/cron/rollup"
create_job jamtong-expire "5 0 * * *" "/api/cron/expire"
create_job jamtong-reconcile "0 4 * * *" "/api/cron/reconcile"
