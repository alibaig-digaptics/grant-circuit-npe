"use client"

import React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: number
  label: string
}

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  steps?: Step[]
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  steps,
}) => {
  const resolved = steps?.length
    ? steps
    : Array.from({ length: totalSteps }, (_, i) => ({
        id: i + 1,
        label: `Step ${i + 1}`,
      }))
  const stepCount = resolved.length
  const percentage =
    stepCount > 1
      ? Math.min(Math.max(((currentStep - 1) / (stepCount - 1)) * 100, 0), 100)
      : 100
  const connectorInset = `${100 / (resolved.length * 2)}%`

  return (
    <div className="mb-5 mx-auto w-full max-w-sm">
      <div
        className="relative grid items-start"
        style={{
          gridTemplateColumns: `repeat(${resolved.length}, minmax(0, 1fr))`,
        }}
      >
        <div
          className="absolute top-3.5 h-0.5 -translate-y-1/2 overflow-hidden bg-muted rounded-full"
          style={{ left: connectorInset, right: connectorInset }}
          aria-hidden="true"
        >
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {resolved.map((step) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id

          return (
            <div
              key={step.id}
              className="relative z-10 flex min-w-0 flex-col items-center text-center"
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all duration-300",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-background text-primary shadow-xs ring-3 ring-primary/15",
                  !isCompleted &&
                    !isCurrent &&
                    "border-border bg-card text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "mt-1 flex items-center justify-center text-center text-balance text-[11px] font-semibold leading-tight",
                  isCurrent
                    ? "text-primary font-bold"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
