import Link from "next/link"
import { Header } from "@/components/common/Header"
import { Footer } from "@/components/common/Footer"
import { FORMS } from "@/lib/forms"

const GROUPS = [
  { key: "funder", label: "Funder" },
  { key: "applicant", label: "Applicant" },
  { key: "staff", label: "Staff" },
] as const

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl sm:p-8">
        <Header
          title="Grant Circuit"
          subtitle="Open a form. Conditions, uploads, and review paths live here — not on n8n form pages."
        />
        <div className="space-y-8">
          {GROUPS.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-xs font-bold tracking-wide text-primary uppercase">
                {group.label}
              </h2>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {FORMS.filter((f) => f.audience === group.key).map((form) => (
                  <li key={form.slug}>
                    <Link
                      href={`/forms/${form.slug}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-accent"
                    >
                      <span>
                        <span className="font-semibold">{form.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {form.subtitle}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-primary">Open</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <Footer />
      </div>
    </main>
  )
}
