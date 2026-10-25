// Copyright (c) 2026 Pigsty
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export type AllowedPreviews =
  "image" | "pdf" | "audio" | "video" | "text" | "markdown" | "csv" | "none";

export type TextPreviewKind = "text" | "markdown" | "csv";

type LegacyPreview = Exclude<AllowedPreviews, TextPreviewKind>;

export const isTextPreview = (kind: AllowedPreviews): kind is TextPreviewKind =>
  kind === "text" || kind === "markdown" || kind === "csv";

const textExtensions = new Set(
  (
    "txt log json xml md markdown yaml yml toml ini cfg conf env properties csv tsv " +
    "sql sh bash zsh py go rs js mjs cjs ts tsx jsx java kt c h cpp hpp cs rb php lua pl " +
    "r swift scala gradle tf hcl proto graphql dockerfile makefile gitignore editorconfig"
  ).split(" "),
);
const textBasenames = new Set(
  "license licence notice readme authors changelog contributing makefile dockerfile codeowners version".split(
    " ",
  ),
);
const activeDocumentExtensions = new Set(["html", "htm", "xhtml"]);
const textMimeTypes = new Set([
  "text/plain",
  "application/json",
  "application/xml",
  "text/xml",
]);

const metadataContentType = (
  metaData: Record<string, unknown> | null | undefined,
): string => ((metaData && metaData["Content-Type"]) || "").toString();

const finalExtension = (fileName: string): string => {
  const finalName = fileName.split("/").pop() || "";
  const lastDot = finalName.lastIndexOf(".");

  if (lastDot === -1 || lastDot === finalName.length - 1) {
    return "";
  }

  return finalName.slice(lastDot + 1).toLowerCase();
};

// These two legacy classifiers intentionally retain their prior matching
// rules: a recognized extension wins conflicts with a media MIME type, and
// either media classifier wins over text. SVG remains an image, never text.
// Only after their combined result is "none" do we exclude active document
// extensions, then consider text extensions/basenames, then text MIME types.
// Thus page.txt + text/html stays inert text, but page.html + text/plain is blocked.
const legacyContentTypePreview = (contentType: string): LegacyPreview => {
  if (contentType) {
    const mimeObjectType = (contentType || "").toLowerCase();

    if (mimeObjectType.includes("image")) {
      return "image";
    }
    if (mimeObjectType.includes("pdf")) {
      return "pdf";
    }
    if (mimeObjectType.includes("audio")) {
      return "audio";
    }
    if (mimeObjectType.includes("video")) {
      return "video";
    }
  }

  return "none";
};

const legacyExtensionPreview = (fileName: string): LegacyPreview => {
  const imageExtensions = [
    "jif",
    "jfif",
    "apng",
    "avif",
    "svg",
    "webp",
    "bmp",
    "ico",
    "jpg",
    "jpe",
    "jpeg",
    "gif",
    "png",
    "heic",
  ];
  const pdfExtensions = ["pdf"];
  const audioExtensions = ["wav", "mp3", "alac", "aiff", "dsd", "pcm"];
  const videoExtensions = [
    "mp4",
    "avi",
    "mpg",
    "webm",
    "mov",
    "flv",
    "mkv",
    "wmv",
    "avchd",
    "mpeg-4",
  ];

  let fileExtension = fileName.split(".").pop();

  if (!fileExtension) {
    return "none";
  }

  fileExtension = fileExtension.toLowerCase();

  if (imageExtensions.includes(fileExtension)) {
    return "image";
  }

  if (pdfExtensions.includes(fileExtension)) {
    return "pdf";
  }

  if (audioExtensions.includes(fileExtension)) {
    return "audio";
  }

  if (videoExtensions.includes(fileExtension)) {
    return "video";
  }

  return "none";
};

export const legacyPreviewObjectType = (
  metaData: Record<string, unknown> | null | undefined,
  objectName: string,
): LegacyPreview => {
  const extensionType = legacyExtensionPreview(objectName || "");
  const contentType = legacyContentTypePreview(metadataContentType(metaData));

  let objectType: LegacyPreview = extensionType;

  if (extensionType === contentType) {
    objectType = extensionType;
  } else if (extensionType === "none" && contentType !== "none") {
    objectType = contentType;
  } else if (contentType === "none" && extensionType !== "none") {
    objectType = extensionType;
  }

  return objectType;
};

const normalizedTextContentType = (contentType: string): string =>
  contentType.split(";", 1)[0].trim().toLowerCase();

export const previewObjectType = (
  metaData: Record<string, unknown> | null | undefined,
  objectName: string,
): AllowedPreviews => {
  const legacyType = legacyPreviewObjectType(metaData, objectName);

  if (legacyType !== "none") {
    return legacyType;
  }

  const extension = finalExtension(objectName || "");

  if (activeDocumentExtensions.has(extension)) {
    return "none";
  }

  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }
  if (extension === "csv" || extension === "tsv") {
    return "csv";
  }
  const basename = (objectName.split("/").pop() || "").toLowerCase();
  if (
    textExtensions.has(extension) ||
    (!extension && textBasenames.has(basename))
  ) {
    return "text";
  }

  const mime = normalizedTextContentType(metadataContentType(metaData));
  return textMimeTypes.has(mime) ||
    (mime.startsWith("text/") && mime !== "text/html")
    ? "text"
    : "none";
};

interface PreviewEligibility {
  metaData: Record<string, unknown> | null | undefined;
  objectName: string;
  canGetObject: boolean;
  isDeleteMarker?: boolean;
  isPrefix?: boolean;
}

export const isPreviewAvailable = ({
  metaData,
  objectName,
  canGetObject,
  isDeleteMarker = false,
  isPrefix = objectName.endsWith("/"),
}: PreviewEligibility): boolean =>
  canGetObject &&
  !isDeleteMarker &&
  !isPrefix &&
  previewObjectType(metaData, objectName) !== "none";
