import { notFound } from "next/navigation"
import { Suspense } from "react"
import { GrantForm } from "@/components/forms/GrantForm"
import { getForm } from "@/lib/forms"

export default async function FormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const form = getForm(slug)
  if (!form) notFound()

  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <GrantForm form={form} />
      </Suspense>
    </main>
  )
}

export async function generateStaticParams() {
  const { FORMS } = await import("@/lib/forms")
  return FORMS.map((f) => ({ slug: f.slug }))
}
