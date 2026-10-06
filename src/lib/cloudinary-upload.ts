"use client";

export type UploadFolder = "rebel-season/products" | "rebel-season/categories" | "rebel-season/storefront";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/**
 * Uploads a file straight from the browser to Cloudinary using a short-lived
 * signature from our admin API, and returns the secure URL.
 */
export async function uploadToCloudinary(file: File, folder: UploadFolder): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !(isVideo && folder === "rebel-season/storefront")) {
    throw new Error("Unsupported file type");
  }
  if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
    throw new Error(`File is too large (max ${isVideo ? "100" : "10"} MB)`);
  }

  const sigRes = await fetch(`/api/admin/cloudinary-signature?folder=${encodeURIComponent(folder)}`);
  if (!sigRes.ok) throw new Error("Could not authorise upload");
  const { signature, timestamp, cloudName, apiKey } = await sigRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await uploadRes.json();
  if (!uploadRes.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Upload failed");
  }
  return data.secure_url as string;
}
