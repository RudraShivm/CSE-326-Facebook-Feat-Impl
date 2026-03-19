import apiClient from "./client";

export async function uploadMedia(file: File): Promise<string> {
  // We must use FormData because we are sending a binary file,
  // not JSON.
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post("/storage/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.url; // Returns the public Supabase URL
}
