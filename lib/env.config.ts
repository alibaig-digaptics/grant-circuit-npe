export const env = {
  app: {
    publicUrl: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, ""),
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: process.env.VERCEL_URL,
  },
  ghl: {
    locationId: process.env.GF360_GHL_LOCATION_ID || "",
  },
  n8nBase: (
    process.env.N8N_BASE_URL || "https://360growth.io"
  ).replace(/\/+$/, ""),
} as const

export default env
