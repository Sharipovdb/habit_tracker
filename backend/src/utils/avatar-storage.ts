import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const AVATAR_ROUTE_PREFIX = "/api/profile/avatar/";
const AVATAR_STORAGE_DIR = path.resolve(process.cwd(), "uploads", "avatars");
const AVATAR_STORAGE_ROOT = `${AVATAR_STORAGE_DIR}${path.sep}`;
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

export class AvatarStorageError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AvatarStorageError";
  }
}

function getFileExtension(fileName: string | undefined, mimeType: string) {
  const fileExtension = path.extname(fileName ?? "").toLowerCase();

  if (fileExtension) {
    return fileExtension;
  }

  const subtype = mimeType
    .split("/")[1]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!subtype) {
    return ".img";
  }

  return subtype === "svgxml" ? ".svg" : `.${subtype}`;
}

function resolveAvatarFilePath(fileName: string) {
  const safeFileName = path.basename(fileName);
  const filePath = path.resolve(AVATAR_STORAGE_DIR, safeFileName);

  if (filePath !== AVATAR_STORAGE_DIR && !filePath.startsWith(AVATAR_STORAGE_ROOT)) {
    return null;
  }

  return filePath;
}

function getAvatarPathname(imageUrl: string) {
  try {
    return new URL(imageUrl).pathname;
  } catch {
    return imageUrl;
  }
}

function getLocalAvatarPath(imageUrl: string | null | undefined) {
  if (!imageUrl) {
    return null;
  }

  const pathname = getAvatarPathname(imageUrl);

  if (!pathname.startsWith(AVATAR_ROUTE_PREFIX)) {
    return null;
  }

  const fileName = decodeURIComponent(pathname.slice(AVATAR_ROUTE_PREFIX.length));
  return resolveAvatarFilePath(fileName);
}

function getAvatarContentType(fileName: string) {
  return CONTENT_TYPE_BY_EXTENSION[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

function buildAvatarUrl(request: FastifyRequest, fileName: string) {
  const host = request.headers.host ?? request.hostname;
  return new URL(`${AVATAR_ROUTE_PREFIX}${encodeURIComponent(fileName)}`, `${request.protocol}://${host}`).toString();
}

export async function saveAvatarUpload(request: FastifyRequest, userId: string, file: MultipartFile) {
  if (!file.mimetype.startsWith("image/")) {
    file.file.resume();
    throw new AvatarStorageError("Only image files are allowed", 400);
  }

  await mkdir(AVATAR_STORAGE_DIR, { recursive: true });

  const fileName = `${userId}-${randomUUID()}${getFileExtension(file.filename, file.mimetype)}`;
  const filePath = resolveAvatarFilePath(fileName);

  if (!filePath) {
    file.file.resume();
    throw new AvatarStorageError("Invalid avatar file name", 400);
  }

  await pipeline(file.file, createWriteStream(filePath));
  return buildAvatarUrl(request, fileName);
}

export async function deleteLocalAvatar(imageUrl: string | null | undefined) {
  const filePath = getLocalAvatarPath(imageUrl);

  if (!filePath) {
    return;
  }

  await rm(filePath, { force: true });
}

export async function getLocalAvatarFile(fileName: string) {
  const filePath = resolveAvatarFilePath(fileName);

  if (!filePath) {
    return null;
  }

  try {
    await access(filePath);
    return {
      filePath,
      contentType: getAvatarContentType(fileName),
    };
  } catch {
    return null;
  }
}