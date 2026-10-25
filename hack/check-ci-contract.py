#!/usr/bin/env python3
"""Fail validation when mutable Actions or unlocked test tools reappear."""
from pathlib import Path
import re
errors = []
paths = list(Path('.github/workflows').glob('*.yaml')) + list(Path('.github/actions').rglob('action.yaml'))
for path in paths:
    source = path.read_text()
    for line in source.splitlines():
        local = re.search(r'\buses:\s+(\./\.github/actions/[a-zA-Z0-9_-]+)\s*$', line)
        if local and (Path(local[1]) / 'action.yaml').is_file():
            continue  # Same-checkout actions are audited by this loop as well.
        if re.search(r'\buses:', line) and not re.search(r'@[a-f0-9]{40}\s+#\s+v\d', line):
            errors.append(f'{path}: Action must use a full SHA with version comment: {line.strip()}')
    for pattern in (r'\byarn add\b', r'\bnpm install\b', r'\bnpx testcafe\b', r'pip3? install semgrep', r'FIREFOX_VERSION:\s*latest'):
        if re.search(pattern, source):
            errors.append(f'{path}: unlocked runtime dependency: {pattern}')
firefox = Path('.github/requirements/firefox.env').read_text()
if not re.search(r'^FIREFOX_VERSION=\d+\.\d+(?:\.\d+)?$', firefox, re.M) or not re.search(r'^FIREFOX_SHA512=[a-f0-9]{128}$', firefox, re.M):
    errors.append('Firefox must have a reviewed release version and SHA-512 digest')
if errors:
    raise SystemExit('\n'.join(errors))
print('CI dependency contract passed')
