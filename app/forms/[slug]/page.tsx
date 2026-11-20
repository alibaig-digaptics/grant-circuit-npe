import { notFound } from "next/navigation"
import { Suspense } from "react"
import { GrantForm } from "@/components/forms/GrantForm"
import { authorizedGrantDetails } from "@/lib/funder-review"
import { getForm } from "@/lib/forms"

export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const form = getForm(slug)
  if (!form) notFound()

  let grantDefaults: Record<string, string> | undefined
  if (slug === "grant-rfp") {
    const { organizationId, access } = await searchParams
    const details = typeof organizationId === "string" && typeof access === "string"
      ? await authorizedGrantDetails(organizationId, access).catch(() => null) : null
    if (!details) return <main className="mx-auto max-w-lg px-6 py-16"><h1 className="text-2xl font-semibold">Create Grant</h1><p className="mt-3">Use the private Create Grant link in your funder approval email.</p></main>
    grantDefaults = details
  }

  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <GrantForm form={form} grantDefaults={grantDefaults} />
      </Suspense>
    </main>
  )
}

export async function generateStaticParams() {
  const { FORMS } = await import("@/lib/forms")
  return FORMS.map((f) => ({ slug: f.slug }))
}
