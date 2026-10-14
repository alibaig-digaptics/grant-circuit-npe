import { notFound } from "next/navigation"
import { Suspense } from "react"
import { GrantForm } from "@/components/forms/GrantForm"
import { getForm } from "@/lib/forms"

export const metadata = {
  robots: "noindex, nofollow",
}

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const form = getForm(slug)
  if (!form) notFound()

  return (
    <main className="min-h-screen bg-transparent">
      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <GrantForm form={form} isEmbedded />
      </Suspense>
    </main>
  )
}
