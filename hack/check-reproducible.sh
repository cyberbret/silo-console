#!/usr/bin/env bash
# Build the same commit in two independent checkouts, normalizing timestamps
# from that commit. Keep signed/OIDC statements out of the byte-for-byte check.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
commit="$(git rev-parse HEAD)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
for attempt in one two; do
  echo "Reproducibility build $attempt for $commit"
  git clone --quiet --no-local "$root" "$work/$attempt"
  git -C "$work/$attempt" checkout --quiet --detach "$commit"
  (
    cd "$work/$attempt"
    export GOWORK=off CGO_ENABLED=0 TZ=UTC LC_ALL=C
    SOURCE_DATE_EPOCH="$(git show -s --format=%ct HEAD)"
    export SOURCE_DATE_EPOCH
    # Separate build caches prevent a cache hit from masquerading as a rebuild.
    export GOCACHE="$work/cache-$attempt"
    goreleaser release --snapshot --clean --parallelism 2 --skip=publish,announce,sign,docker > "$work/$attempt.log" 2>&1 || { tail -60 "$work/$attempt.log"; exit 1; }
    LC_ALL=C sort dist/*_checksums.txt > "$work/$attempt.sha256"
  )
  # Only the checksum manifest is needed for comparison. Free this attempt's
  # private checkout and cache before starting another complete cross-build.
  rm -rf "$work/$attempt" "$work/cache-$attempt"
done
diff -u "$work/one.sha256" "$work/two.sha256"
echo "Binaries, bundles, packages, source and SBOMs reproduced for $commit"
