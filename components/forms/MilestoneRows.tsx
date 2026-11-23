"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MAX_MILESTONES, TIMING_OPTIONS, type Milestone } from "@/lib/milestones"

export const EMPTY_MILESTONE: Milestone = { name: "", description: "", timing: "" }

export function MilestoneRows({
  value,
  onChange,
  error,
}: {
  value: Milestone[]
  onChange: (next: Milestone[]) => void
  error?: string | null
}) {
  const update = (index: number, patch: Partial<Milestone>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Milestones</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            List what you will deliver and when, counted from the start of the grant. You will file expenses against these.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {value.length} added
        </span>
      </div>

      {value.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          No milestones yet. Add the first one below.
        </p>
      ) : null}

      {value.map((row, index) => {
        const timings = row.timing && !TIMING_OPTIONS.includes(row.timing) ? [row.timing, ...TIMING_OPTIONS] : TIMING_OPTIONS
        return (
          <div key={index} className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                Milestone {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove milestone ${index + 1}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <Field>
                <FieldLabel htmlFor={`milestone-name-${index}`}>Name</FieldLabel>
                <Input
                  id={`milestone-name-${index}`}
                  placeholder="For example, Recruit volunteers"
                  value={row.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`milestone-timing-${index}`}>Timing</FieldLabel>
                <Select value={row.timing || null} onValueChange={(v) => update(index, { timing: String(v ?? "") })}>
                  <SelectTrigger id={`milestone-timing-${index}`} className="h-10 rounded-xl">
                    <SelectValue placeholder="Select timing">{row.timing || null}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border/80 shadow-lg">
                    <SelectGroup>
                      {timings.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-lg text-xs sm:text-sm">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`milestone-description-${index}`}>Description</FieldLabel>
              <Textarea
                id={`milestone-description-${index}`}
                rows={2}
                placeholder="What will be done or delivered"
                value={row.description}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </Field>
          </div>
        )
      })}

      {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl"
        disabled={value.length >= MAX_MILESTONES}
        onClick={() => onChange([...value, { ...EMPTY_MILESTONE }])}
      >
        <Plus className="mr-1.5 size-4" />
        Add milestone
      </Button>
    </div>
  )
}
