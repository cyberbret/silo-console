#!/bin/bash

yell() { echo "$0: $*" >&2; }

warnings_log=${CHECK_WARNINGS_LOG:-yarn.log}
if [[ -n ${CHECK_WARNINGS_LOG:-} && $warnings_log != /* ]]; then
  yell "CHECK_WARNINGS_LOG must be an absolute path"
  exit 111
fi

die() {
  yell "$*"
  cat "$warnings_log"
  exit 111
}

try() { "$@" &> "$warnings_log" || die "cannot $*"; }

rm -f "$warnings_log"
try yarn build

if cat "$warnings_log" | grep "Warning"; then
  echo "There are warnings in the code"
  exit 1
fi
