const GHL = "https://services.leadconnectorhq.com"

export async function uploadGhlMedia(file: File): Promise<string> {
  const key = process.env.GF360_GHL_PRIVATE_KEY || ""
  const locationId = process.env.GF360_GHL_LOCATION_ID || "yOqSXTaFVFjQV5f4l5fb"
  if (!key) throw new Error("GF360_GHL_PRIVATE_KEY is missing")

  const body = new FormData()
  body.append("file", file, file.name)
  body.append("name", file.name)
  const res = await fetch(`${GHL}/medias/upload-file`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Version: process.env.GF360_GHL_API_VERSION || "2021-07-28",
      "Location-Id": locationId,
    },
    body,
  })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    data = {}
  }
  const url =
    (data.url as string) ||
    (data.fileUrl as string) ||
    ((data.file as Record<string, unknown> | undefined)?.url as string) ||
    (data.downloadUrl as string)
  if (!res.ok || !url) {
    throw new Error(`GHL media ${res.status}: ${text.slice(0, 200)}`)
  }
  return String(url)
}
