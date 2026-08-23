import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/session";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Stores uploads under public/uploads so they are served straight off disk.
 * Swap this for object storage (S3, R2, UploadThing) before going to
 * production — serverless hosts have an ephemeral filesystem.
 */
export async function POST(request: Request) {
  const user = await requireUser();

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Keep the image under 2 MB" }, { status: 400 });
  }

  // Namespaced per studio so one tenant can never guess another's paths.
  const dir = path.join(process.cwd(), "public", "uploads", user.studioId);
  await mkdir(dir, { recursive: true });

  const name = `${randomUUID()}.${EXTENSION[file.type]}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${user.studioId}/${name}` });
}
