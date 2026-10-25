#!/bin/sh
# Post-build optimization for the go:embed payload.
#
#  - Drop the mds login background image: only referenced by the mds
#    LoginWrapper component, which this app no longer renders.
#  - Precompress text assets with a pinned, platform-independent gzip
#    implementation and keep only the .gz files; the Go file server emits them with
#    Content-Encoding: gzip, decompressing on the fly for the rare client
#    that does not accept gzip (see api/configure_console.go).
#
# index.html is intentionally left uncompressed: the SPA fallback handler
# serves it directly from the embedded filesystem.
set -eu
cd "$(dirname "$0")/build"

rm -rf background

node ../gzip-embed.mjs

echo "Embed payload optimized: $(du -sh . | cut -f1)"
