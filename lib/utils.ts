import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { env } from "@/lib/env.config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  if (env.app.publicUrl) return env.app.publicUrl
  if (env.app.vercelProjectProductionUrl) {
    return `https://${env.app.vercelProjectProductionUrl}`
  }
  if (env.app.vercelUrl) return `https://${env.app.vercelUrl}`
  return "http://localhost:3010"
}
