"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MAX_MILESTONES, type Milestone } from "@/lib/milestones"

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
    <div className="space-y-3 rounded-xl border border-border/70 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Milestones</p>
        <p className="text-xs text-muted-foreground">
          List each milestone from your proposal. Use timing such as the first six months, not a calendar date.
        </p>
      </div>
      {value.map((row, index) => (
        <div key={index} className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Milestone {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove milestone ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Field>
            <FieldLabel htmlFor={`milestone-name-${index}`}>Name</FieldLabel>
            <Input id={`milestone-name-${index}`} value={row.name} onChange={(e) => update(index, { name: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`milestone-description-${index}`}>Description</FieldLabel>
            <Textarea
              id={`milestone-description-${index}`}
              rows={2}
              value={row.description}
              onChange={(e) => update(index, { description: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`milestone-timing-${index}`}>Timing</FieldLabel>
            <Input
              id={`milestone-timing-${index}`}
              placeholder="For example, first six months"
              value={row.timing}
              onChange={(e) => update(index, { timing: e.target.value })}
            />
          </Field>
        </div>
      ))}
      {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={value.length >= MAX_MILESTONES}
        onClick={() => onChange([...value, { ...EMPTY_MILESTONE }])}
      >
        <Plus className="mr-1.5 size-4" />
        Add milestone
      </Button>
    </div>
  )
}
