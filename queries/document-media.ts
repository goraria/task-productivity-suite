"use client"
import { caller } from "@/utils/caller"
export async function uploadDocumentFile(
  pageId: string,
  bucket: string,
  file: File,
  signal?: AbortSignal
) {
  const data = await caller<{
    assetId: string
    upload: { id: string; url: string; headers: Record<string, string> }
  }>({
    url: `/internal/task/document/${pageId}/upload`,
    method: "POST",
    body: {
      bucket,
      filename: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    },
    signal,
  })
  try {
    const uploaded = await fetch(data.upload.url, {
      method: "PUT",
      headers: data.upload.headers,
      body: file,
      signal,
    })
    if (!uploaded.ok) throw new Error("Object upload failed")
    await caller({
      url: `/external/media/upload/${data.upload.id}/complete`,
      method: "POST",
      body: {},
      signal,
    })
    return caller({
      url: `/internal/task/document/${pageId}/attachment`,
      method: "POST",
      body: { assetId: data.assetId },
      signal,
    })
  } catch (error) {
    // Abort only this user's upload; no provider credentials or arbitrary endpoint.
    await caller({
      url: `/external/media/upload/${data.upload.id}`,
      method: "DELETE",
    }).catch(() => {})
    throw error
  }
}
