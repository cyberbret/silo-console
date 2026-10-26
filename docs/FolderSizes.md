# Folder sizes

The object browser lists S3 prefixes as folders. S3 does not attach a size to a
prefix. **Calculate folder sizes** performs one recursive metadata scan of the
current directory and fills its immediate folder rows with current-object
sizes. It never downloads object contents and never starts automatically.
Use a folder's actions menu → **Calculate size** to narrow a large scan.

**Include retained versions** additionally lists older object versions and delete
markers. The Size column continues to show current bytes; retained bytes appear
separately. A latest delete marker contributes no current bytes, while older
versions behind it still contribute retained bytes. Zero-byte directory-marker
objects count as objects. Logical object bytes do not measure physical disk
allocation, compression, erasure coding, filesystem snapshots or replicas.

The panel shows progress, entry counts and calculation time. **Cancel** stops the
request and S3 pagination. Results are local to the current view and session;
navigation clears them. Recalculate after changing objects. Listings are live,
not an atomic snapshot: objects can change while a scan is running.

Only **Completed** means the listing finished. While running, canceled, limited
or failed, values carry a ≥ / Partial label and must not be used as complete
capacity totals. A permission failure, broken connection or interrupted response
never becomes a zero-sized folder. Scan a narrower prefix when limits are hit.
Size sorting uses calculated bytes for folders already included in the scan and
ordinary object metadata for files; as elsewhere, sorting covers loaded rows.

## Permissions and limits

Scanning requires a signed-in Console session with `s3:ListBucket` access to the
requested prefix. Version scans require `s3:ListBucketVersions`. The API always
uses that session's S3 credentials, including STS session tokens. It does not
use server administrator credentials, change objects or expose anonymous scans.

Operators can configure each Console process using these environment variables:

| Variable | Default | Accepted range |
| --- | --- | --- |
| `CONSOLE_PREFIX_USAGE_TIMEOUT` | `10m` | `1s`–`1h` |
| `CONSOLE_PREFIX_USAGE_MAX_ENTRIES` | `10000000` | 1–1000000000000 |
| `CONSOLE_PREFIX_USAGE_MAX_FOLDERS` | `1000` | 1–10000 |
| `CONSOLE_PREFIX_USAGE_MAX_CONCURRENT` | `2` | 1–64 |
| `CONSOLE_PREFIX_USAGE_PROGRESS_INTERVAL` | `1s` | `100ms`–`30s` |

Concurrency is per process. A busy process returns HTTP 429; the UI permits one
active scan per browser view. A time, entry or child-folder limit returns a
terminal partial result and cancels further listing requests. Invalid operator
configuration refuses scans rather than removing their limits.

## API

`GET /api/v1/buckets/{bucket}/prefix-usage?prefix=&versions=false&folders=true`
uses the normal authenticated Console API. Supply `prefix=` for the bucket root,
or a prefix ending in `/`. Set `folders=false` to calculate only this prefix.

The response is `application/x-ndjson`. Each line is a `prefixUsageFrame` defined
in `swagger.yml`: bucket/prefix/mode identity, start/update times, scanned entry
count, aggregate usage and child-folder usage. Byte values are decimal strings
so JavaScript does not round totals larger than 2^53. Frames end in `complete`,
`limited` or `failed`; missing or invalid terminal data is an incomplete result.
Initial listing failures preserve permission/not-found status before streaming.
Consumers should cancel the request when they stop reading.

Run `go test ./api -run TestPrefixUsage`, frontend `yarn typecheck`, and
`yarn exec playwright test --project=unit e2e/prefix-usage.unit.ts` for focused
checks. `e2e/prefix-usage.spec.ts` also runs against a real SILO backend and
Console: it owns a generated fixture bucket, checks pagination and version
accounting, exercises the folder UI, and removes every fixture version/marker.
Use the existing `CONSOLE_TEST_ENDPOINT`, `CONSOLE_TEST_ACCESS_KEY` and
`CONSOLE_TEST_SECRET_KEY` settings, plus `SILO_TEST_ENDPOINT` for the S3 endpoint.
Never point fixture tests at a bucket owned by an operator.
