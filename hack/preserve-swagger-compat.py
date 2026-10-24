#!/usr/bin/env python3
# Copyright (c) 2026 PGSTY
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Keep multipart handling compatible after regenerating the Swagger API."""
from pathlib import Path

path = Path("api/operations/console_api.go")
source = path.read_text()
generated = "MultipartformConsumer: runtime.ByteStreamConsumer(),"
compatible = "MultipartformConsumer: runtime.DiscardConsumer,"
if source.count(generated) != 1:
    raise SystemExit("Swagger multipart consumer changed; review the config-import contract before regenerating")

# The retained config-import binder parses the multipart request itself. Keep
# the API consumer from consuming the stream before that binder runs.
path.write_text(source.replace(generated, compatible, 1))
