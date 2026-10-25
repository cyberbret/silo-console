// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const MAX_TEXT_PREVIEW_BYTES = 1_048_576;
export const TEXT_PREVIEW_RANGE = `bytes=0-${MAX_TEXT_PREVIEW_BYTES - 1}`;

export type TextPreviewResult =
  | {
      status: "success";
      content: string;
      byteLength: number;
      truncated?: boolean;
    }
  | { status: "empty"; byteLength: number }
  | { status: "invalid_text" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "aborted" };

export interface TextPreviewDownloadClient {
  downloadObject: (
    bucketName: string,
    query: {
      prefix: string;
      version_id?: string;
    },
    params: {
      credentials: "same-origin";
      headers: Record<string, string>;
      signal: AbortSignal;
    },
  ) => Promise<Response>;
}

interface TextPreviewRequest {
  client: TextPreviewDownloadClient;
  bucketName: string;
  objectName: string;
  versionID?: string;
  anonymous: boolean;
  signal: AbortSignal;
}

export const requestTextPreviewObject = ({
  client,
  bucketName,
  objectName,
  versionID,
  anonymous,
  signal,
}: TextPreviewRequest): Promise<Response> =>
  client.downloadObject(
    bucketName,
    {
      prefix: objectName,
      ...(versionID ? { version_id: versionID } : {}),
    },
    {
      credentials: "same-origin",
      headers: {
        Range: TEXT_PREVIEW_RANGE,
        ...(anonymous ? { "X-Anonymous": "1" } : {}),
      },
      signal,
    },
  );

interface ContentRange {
  start: number;
  end: number;
  total?: number;
}

const parseNonNegativeInteger = (value: string | null): number | undefined => {
  if (!value || !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

const parseContentRange = (value: string | null): ContentRange | undefined => {
  if (!value) {
    return undefined;
  }

  const match = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = match[3] === "*" ? undefined : Number(match[3]);

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    end < start ||
    (total !== undefined &&
      (!Number.isSafeInteger(total) || total <= end || total < 1))
  ) {
    return undefined;
  }

  return { start, end, total };
};

const resultForHTTPStatus = (status: number): TextPreviewResult => {
  if (status === 401 || status === 403) {
    return { status: "forbidden" };
  }

  if (status === 404 || status === 410 || status === 412 || status === 416) {
    return { status: "not_found" };
  }

  return { status: "error" };
};

const errorStatus = (error: unknown): number | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
};

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "AbortError";

const cancelResponseBody = async (response: Response): Promise<void> => {
  if (!response.body) {
    return;
  }

  try {
    await response.body.cancel();
  } catch {
    // The response may already have been cancelled by the request signal.
  }
};

const readTextPreviewResponse = async (
  response: Response,
  signal: AbortSignal,
): Promise<TextPreviewResult> => {
  if (signal.aborted) {
    await cancelResponseBody(response);
    return { status: "aborted" };
  }

  if (!response.ok) {
    await cancelResponseBody(response);
    return resultForHTTPStatus(response.status);
  }

  const contentRangeHeader = response.headers.get("Content-Range");
  const contentRange = parseContentRange(contentRangeHeader);
  const contentLength = parseNonNegativeInteger(
    response.headers.get("Content-Length"),
  );

  if (response.status === 206) {
    if (
      !contentRange ||
      contentRange.start !== 0 ||
      contentRange.total === undefined
    ) {
      await cancelResponseBody(response);
      return { status: "error" };
    }
  } else if (contentRangeHeader && !contentRange) {
    await cancelResponseBody(response);
    return { status: "error" };
  }

  const contentRangeSize = contentRange?.total;
  const expectedLength = contentRange ? contentRange.end + 1 : contentLength;
  // A partial response must contain the entire requested prefix, not an
  // arbitrary fragment, and its length headers must agree.
  if (
    (contentRange &&
      (contentRange.start !== 0 ||
        contentRange.total === undefined ||
        contentRange.end !==
          Math.min(contentRange.total, MAX_TEXT_PREVIEW_BYTES) - 1)) ||
    (contentRange &&
      contentLength !== undefined &&
      contentLength !== expectedLength)
  ) {
    await cancelResponseBody(response);
    return { status: "error" };
  }
  let truncated =
    (contentRangeSize ?? contentLength ?? 0) > MAX_TEXT_PREVIEW_BYTES;

  if (!response.body) {
    return expectedLength === undefined || expectedLength === 0
      ? { status: "empty", byteLength: 0 }
      : { status: "error" };
  }

  const reader = response.body.getReader();
  const retainedBytes = new Uint8Array(MAX_TEXT_PREVIEW_BYTES);
  let byteLength = 0;

  try {
    while (true) {
      if (signal.aborted) {
        await reader.cancel();
        return { status: "aborted" };
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value || value.byteLength === 0) {
        continue;
      }

      const copyLength = Math.min(
        value.byteLength,
        retainedBytes.byteLength - byteLength,
      );
      retainedBytes.set(value.subarray(0, copyLength), byteLength);
      byteLength += copyLength;

      if (
        copyLength < value.byteLength ||
        (truncated && byteLength === MAX_TEXT_PREVIEW_BYTES)
      ) {
        truncated = true;
        await reader.cancel();
        break;
      }
    }
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      return { status: "aborted" };
    }
    return { status: "error" };
  } finally {
    reader.releaseLock();
  }

  if (signal.aborted) {
    return { status: "aborted" };
  }
  if (
    expectedLength !== undefined &&
    Math.min(expectedLength, MAX_TEXT_PREVIEW_BYTES) !== byteLength
  ) {
    return { status: "error" };
  }

  let content: string;
  try {
    const bytes = retainedBytes.subarray(0, byteLength);
    if (truncated) {
      // Streaming strict validation rejects malformed interior bytes while
      // allowing an incomplete code point at the range boundary. Only that
      // trailing fragment is discarded by the non-fatal display decoder.
      new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: true });
      content = new TextDecoder("utf-8", { fatal: false })
        .decode(bytes)
        .replace(/\uFFFD$/, "");
    } else {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch {
    return { status: "invalid_text" };
  }

  if (content.includes("\0")) {
    return { status: "invalid_text" };
  }

  return content.length === 0
    ? { status: "empty", byteLength }
    : {
        status: "success",
        content,
        byteLength,
        ...(truncated ? { truncated: true } : {}),
      };
};

interface LoadTextPreviewOptions {
  knownSize?: number;
  signal: AbortSignal;
  request: () => Promise<Response>;
}

export const loadTextPreview = async ({
  signal,
  request,
}: LoadTextPreviewOptions): Promise<TextPreviewResult> => {
  // Listing sizes are hints and may be stale. Always validate the ranged
  // response, including when the listing says the object exceeds the cap.
  let response: Response;
  try {
    response = await request();
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      return { status: "aborted" };
    }

    const status = errorStatus(error);
    return status === undefined
      ? { status: "error" }
      : resultForHTTPStatus(status);
  }

  return readTextPreviewResponse(response, signal);
};

export class PreviewRequestGeneration {
  private current = 0;

  begin(): number {
    this.current += 1;
    return this.current;
  }

  invalidate(): void {
    this.current += 1;
  }

  isCurrent(generation: number): boolean {
    return generation === this.current;
  }
}
