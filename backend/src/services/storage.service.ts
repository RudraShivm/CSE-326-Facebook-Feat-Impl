import { supabase } from "../config/supabase";
import { AppError } from "../middleware/error.middleware";
import { v4 as uuidv4 } from "uuid";

const BUCKET_NAME = process.env.SUPABASE_BUCKET || "facebook-assets";

export async function uploadFile(
  userId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalName: string
) {
  // Validate file type
  if (!mimetype.startsWith("image/") && !mimetype.startsWith("video/")) {
    throw new AppError("Invalid file type. Only images and videos are allowed.", 400, "VALIDATION_ERROR");
  }

  // Generate a unique filename: folder(userId) / uuid.ext
  const extension = originalName.split(".").pop();
  const fileName = `${userId}/${uuidv4()}.${extension}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      contentType: mimetype,
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    console.error("Supabase upload error:", error.message);
    throw new AppError("File upload failed", 500, "INTERNAL_ERROR");
  }

  // Generate public URL
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return urlData.publicUrl;
}
