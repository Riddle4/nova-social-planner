import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "nova-media";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getSupabaseStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function uploadMediaBuffer(params: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder?: string;
}) {
  const filename = `${Date.now()}-${safeFilename(params.filename)}`;
  const objectPath = params.folder ? `${params.folder}/${filename}` : filename;
  const supabase = getSupabaseStorageClient();

  if (supabase) {
    const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(objectPath, params.buffer, {
      contentType: params.contentType,
      upsert: false
    });
    if (error) throw error;

    const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
    return {
      url: data.publicUrl,
      filename,
      storagePath: objectPath
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", params.folder || "");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), params.buffer);

  return {
    url: params.folder ? `/uploads/${params.folder}/${filename}` : `/uploads/${filename}`,
    filename,
    storagePath: objectPath
  };
}
