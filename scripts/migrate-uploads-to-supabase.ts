import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "nova-media";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function localPathFromUrl(url: string) {
  if (!url.startsWith("/uploads/")) return null;
  return path.join(process.cwd(), "public", url);
}

function storagePathFromUrl(url: string) {
  return url.replace(/^\/uploads\//, "");
}

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) return;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"]
  });
  if (error) throw error;
}

async function main() {
  await ensureBucket();

  const assets = await prisma.mediaAsset.findMany({
    where: {
      url: { startsWith: "/uploads/" }
    },
    orderBy: { createdAt: "asc" }
  });

  for (const asset of assets) {
    const localPath = localPathFromUrl(asset.url);
    if (!localPath || !existsSync(localPath)) {
      console.warn(`Missing local file for ${asset.title || asset.filename}: ${asset.url}`);
      continue;
    }

    const objectPath = storagePathFromUrl(asset.url);
    const file = await readFile(localPath);
    const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
      contentType: asset.type || "application/octet-stream",
      upsert: true
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { url: data.publicUrl }
    });

    console.log(`Uploaded ${asset.title || asset.filename} -> ${data.publicUrl}`);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
