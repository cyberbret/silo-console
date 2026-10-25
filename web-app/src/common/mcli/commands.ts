// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Verified with mcli RELEASE.2026-08-26T17-15-27Z. Values are shell arguments,
// never shell source. Intended flags precede --; positionals follow it because
// mcli otherwise reorders leading-hyphen names into options, even when quoted.
// Builders deliberately have no secret-key parameter.
export const shQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`;

const target = (bucket: string, prefix = "") =>
  shQuote(`ALIAS/${bucket}${prefix ? `/${prefix}` : ""}`);
const present = (value: string) => value.trim() !== "";
const unique = (values: readonly string[]) => [
  ...new Set(values.filter(present)),
];
const option = (flag: string, value?: string) =>
  value ? ` --${flag} ${shQuote(value)}` : "";

type Versioning = {
  bucket: string;
  enabled: boolean;
  excludeFolders?: boolean;
  excludedPrefixes?: string;
};

export const bucketVersioningCommands = ({
  bucket,
  enabled,
  excludeFolders,
  excludedPrefixes,
}: Versioning): string[] => {
  if (!present(bucket)) return [];
  const exclusions = (excludedPrefixes || "")
    .split(",")
    .filter(present)
    .join(",");
  return [
    `mcli version ${enabled ? "enable" : "suspend"}` +
      (enabled
        ? (excludeFolders ? " --exclude-folders" : "") +
          option("excluded-prefixes", exclusions)
        : "") +
      ` -- ${target(bucket)}`,
  ];
};

export const bucketQuotaCommands = ({
  bucket,
  enabled,
  size,
}: {
  bucket: string;
  enabled: boolean;
  size?: string;
}): string[] => {
  if (!present(bucket) || (enabled && !size)) return [];
  return [
    enabled
      ? `mcli quota set${option("size", size)} -- ${target(bucket)}`
      : `mcli quota clear -- ${target(bucket)}`,
  ];
};

export const createBucketCommands = ({
  name,
  objectLock,
  versioning,
  excludeFolders,
  excludedPrefixes,
  quota,
  retention,
}: {
  name: string;
  objectLock?: boolean;
  versioning?: boolean;
  excludeFolders?: boolean;
  excludedPrefixes?: string;
  quota?: string;
  retention?: { mode: string; validity: number; unit: string };
}): string[] => {
  if (!present(name)) return [];
  const commands = [
    `mcli mb${objectLock ? " --with-lock" : ""}${versioning ? " --with-versioning" : ""} -- ${target(name)}`,
  ];
  if (versioning && !objectLock && (excludeFolders || excludedPrefixes)) {
    commands.push(
      ...bucketVersioningCommands({
        bucket: name,
        enabled: true,
        excludeFolders,
        excludedPrefixes,
      }),
    );
  }
  if (quota) {
    commands.push(
      ...bucketQuotaCommands({ bucket: name, enabled: true, size: quota }),
    );
  }
  if (objectLock && retention && retention.validity > 0) {
    const mode = retention.mode.toLowerCase();
    if (mode === "governance" || mode === "compliance") {
      commands.push(
        `mcli retention set --default -- ${mode} ${shQuote(`${retention.validity}${retention.unit === "years" ? "y" : "d"}`)} ${target(name)}`,
      );
    }
  }
  return commands;
};

export const bucketTagsCommands = (
  bucket: string,
  tags: Readonly<Record<string, string>>,
): string[] => {
  if (!present(bucket)) return [];
  // mcli parses a URL query, so shell quoting alone cannot protect &, = or +.
  const query = new URLSearchParams(Object.entries(tags)).toString();
  return [
    query
      ? `mcli tag set -- ${target(bucket)} ${shQuote(query)}`
      : `mcli tag remove -- ${target(bucket)}`,
  ];
};

export const bucketAnonymousCommands = ({
  bucket,
  access,
  prefix,
}: {
  bucket: string;
  access: string;
  prefix?: string;
}): string[] => {
  if (!present(bucket)) return [];
  const permissions: Record<string, string> = {
    readonly: "download",
    writeonly: "upload",
    readwrite: "public",
    none: "none",
    download: "download",
    upload: "upload",
    public: "public",
  };
  const permission = Object.hasOwn(permissions, access)
    ? permissions[access]
    : undefined;
  // anonymous's set/set-json are positional operations, not CLI subcommands.
  // Its terminator must precede the operation as well as the variable values.
  return permission
    ? [
        `mcli anonymous -- set ${permission} ${target(bucket, prefix === "/" ? "" : prefix)}`,
      ]
    : [];
};

// SetAccessPolicy replaces the complete document. Prefix edits above must keep
// using the incremental CLI operation, which preserves unrelated statements.
export const bucketAccessPolicyCommands = ({
  bucket,
  access,
}: {
  bucket: string;
  access: string;
}): string[] =>
  present(bucket) && ["PRIVATE", "PUBLIC", "CUSTOM"].includes(access)
    ? [`mcli anonymous -- set-json policy.json ${target(bucket)}`]
    : [];

// These presets match api/user_buckets.go: policy.SetPolicy on a fresh policy,
// using minio-go/v7/pkg/policy. Never reuse the bucket's existing statements.
export const bucketAccessPolicyJSON = (
  bucket: string,
  access: string,
): string | undefined => {
  if (!present(bucket) || !["PRIVATE", "PUBLIC"].includes(access))
    return undefined;
  const statement = (actions: string[], resource: string) => ({
    Action: actions,
    Effect: "Allow",
    Principal: { AWS: ["*"] },
    Resource: [resource],
    Sid: "",
  });
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement:
        access === "PRIVATE"
          ? []
          : [
              statement(
                [
                  "s3:GetBucketLocation",
                  "s3:ListBucket",
                  "s3:ListBucketMultipartUploads",
                ],
                `arn:aws:s3:::${bucket}`,
              ),
              statement(
                [
                  "s3:AbortMultipartUpload",
                  "s3:DeleteObject",
                  "s3:GetObject",
                  "s3:ListMultipartUploadParts",
                  "s3:PutObject",
                ],
                `arn:aws:s3:::${bucket}/*`,
              ),
            ],
    },
    null,
    2,
  );
};

export const lifecycleRuleCommands = ({
  bucket,
  type,
  version,
  value,
  unit = "days",
  prefix,
  tags,
  storageClass,
  expireDeleteMarker,
  expireAllVersions,
}: {
  bucket: string;
  type: "expiry" | "transition";
  version: "current" | "noncurrent";
  value: string;
  unit?: string;
  prefix?: string;
  tags?: string;
  storageClass?: string;
  expireDeleteMarker?: boolean;
  expireAllVersions?: boolean;
}): string[] => {
  if (!present(bucket) || !present(value)) return [];
  if (
    type === "transition" &&
    (!storageClass || (version === "noncurrent" && unit !== "days"))
  )
    return [];
  let command = `mcli ilm rule add${option("prefix", prefix)}${option("tags", tags)}`;
  if (type === "expiry") {
    const flag =
      version === "current"
        ? "expire-days"
        : unit === "days"
          ? "noncurrent-expire-days"
          : "noncurrent-expire-newer";
    command += option(flag, value);
  } else {
    const noncurrent = version === "noncurrent" ? "noncurrent-" : "";
    command += option(`${noncurrent}transition-days`, value);
    command += option(
      `${noncurrent}transition-tier`,
      storageClass?.toUpperCase(),
    );
  }
  if (expireDeleteMarker) command += " --expire-delete-marker";
  if (expireAllVersions) command += " --expire-all-object-versions";
  return [`${command} -- ${target(bucket)}`];
};

export const bucketEventCommands = ({
  bucket,
  arn,
  events,
  prefix,
  suffix,
}: {
  bucket: string;
  arn: string;
  events: readonly string[];
  prefix?: string;
  suffix?: string;
}): string[] => {
  if (!present(bucket) || !present(arn)) return [];
  // An empty selection uses the same defaults as createBucketEvent in the API.
  const selected = events.length ? unique(events) : ["get", "put", "delete"];
  return [
    `mcli event add${option("event", selected.join(","))}${option("prefix", prefix)}${option("suffix", suffix)} --ignore-existing -- ${target(bucket)} ${shQuote(arn)}`,
  ];
};

export const setPoliciesCommands = ({
  entity,
  name,
  policies,
  currentPolicies = [],
}: {
  entity: "user" | "group";
  name: string;
  policies: readonly string[];
  currentPolicies?: readonly string[];
}): string[] => {
  if (!present(name)) return [];
  const previous = unique(currentPolicies);
  const next = unique(policies);
  const changes = [
    ["detach", previous.filter((policy) => !next.includes(policy))],
    ["attach", next.filter((policy) => !previous.includes(policy))],
  ] as const;
  return changes.flatMap(([action, changed]) =>
    changed.length
      ? [
          `mcli admin policy ${action} --${entity} ${shQuote(name)} -- ALIAS ${changed.map(shQuote).join(" ")}`,
        ]
      : [],
  );
};

export const createUserCommands = ({
  accessKey,
  policies = [],
  groups = [],
}: {
  accessKey: string;
  policies?: readonly string[];
  groups?: readonly string[];
}): string[] => {
  if (!present(accessKey)) return [];
  return [
    `mcli admin user add -- ALIAS ${shQuote(accessKey)} '<SECRET>'`,
    ...setPoliciesCommands({ entity: "user", name: accessKey, policies }),
    ...unique(groups).map(
      (group) =>
        `mcli admin group add -- ALIAS ${shQuote(group)} ${shQuote(accessKey)}`,
    ),
  ];
};

export const createGroupCommands = ({
  name,
  members,
}: {
  name: string;
  members: readonly string[];
}): string[] => {
  const users = unique(members);
  // This CLI requires at least one member; do not invent an empty-group command.
  if (!present(name) || !users.length) return [];
  return [
    `mcli admin group add -- ALIAS ${shQuote(name)} ${users.map(shQuote).join(" ")}`,
  ];
};

export const createPolicyCommands = (name: string): string[] =>
  present(name)
    ? [`mcli admin policy create -- ALIAS ${shQuote(name.trim())} policy.json`]
    : [];

export const createAccessKeyCommands = ({
  user,
  accessKey,
  customSecret,
  policy,
  name,
  description,
  expiry,
}: {
  user?: string;
  accessKey?: string;
  customSecret?: boolean;
  policy?: boolean;
  name?: string;
  description?: string;
  expiry?: string | null;
}): string[] => [
  `mcli admin accesskey create` +
    option("access-key", accessKey) +
    (customSecret ? " --secret-key '<SECRET>'" : "") +
    (policy ? " --policy policy.json" : "") +
    option("name", name) +
    option("description", description) +
    option("expiry", expiry || undefined) +
    ` -- ALIAS${user ? ` ${shQuote(user)}` : ""}`,
];
