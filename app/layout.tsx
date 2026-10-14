import type { Metadata } from "next"
import { Newsreader, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { cn } from "@/lib/utils"

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
})
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Grant Circuit",
  description:
    "Grant Circuit runs the full grant lifecycle for funding organizations, applicants, and grant admins.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans antialiased", display.variable, sans.variable)}
    >
      <body className="min-h-full bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
