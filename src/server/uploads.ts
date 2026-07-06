let _bucket: R2Bucket | undefined;

export function initUploads(bucket: R2Bucket) {
  _bucket = bucket;
}

export async function putUpload(
  filename: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<string> {
  if (!_bucket) throw new Error("Uploads not configured");
  await _bucket.put(filename, data, { httpMetadata: { contentType } });
  return `/api/uploads/${filename}`;
}

export async function getUpload(
  filename: string,
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  if (!_bucket) return null;
  const obj = await _bucket.get(filename);
  if (!obj) return null;
  return {
    data: await obj.arrayBuffer(),
    contentType: obj.httpMetadata?.contentType || "application/octet-stream",
  };
}
