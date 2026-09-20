#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"

enable_ttl() {
  gcloud firestore fields ttls update expiresAt --project="$PROJECT_ID" --collection-group="$1" --enable-ttl --async --quiet
}

enable_ttl sessions
enable_ttl daily
enable_ttl ip
# Nested abuse documents outlive their parent unless their own collection groups have TTL too.
enable_ttl shards
enable_ttl uids
enable_ttl items
