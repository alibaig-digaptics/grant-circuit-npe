"use client"

import React from "react"
import { Header } from "@/components/common/Header"
import { Footer } from "@/components/common/Footer"
import { cn } from "@/lib/utils"
import type { FormDef } from "@/lib/forms"

export function FormShell({
  form,
  isEmbedded,
  children,
}: {
  form: FormDef
  currentStep?: number
  totalSteps?: number
  stepLabels?: { id: number; label: string }[]
  isEmbedded?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[580px]",
        isEmbedded ? "p-3 sm:p-4" : "px-4 py-10"
      )}
    >
      <div
        className={cn(
          "form-canvas rounded-2xl sm:rounded-[24px] border border-border/80 bg-card p-5 sm:p-7 shadow-xl transition-all duration-200",
          isEmbedded && "border-0 bg-transparent p-2 shadow-none sm:p-3"
        )}
      >
        <Header title={form.title} subtitle={form.subtitle} />
        {children}
        <Footer />
      </div>
    </div>
  )
}
