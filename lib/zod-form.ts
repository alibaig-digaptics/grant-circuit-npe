import { z } from "zod"
import { isHiddenField, type FormField, type FormStep } from "@/lib/form-schema"

export function schemaForFields(fields: FormField[]) {
  const shape: Record<string, z.ZodType> = {}
  for (const field of fields) {
    if (isHiddenField(field) || field.type === "file") continue
    let rule: z.ZodType = z.string()
    if (field.type === "email") {
      rule = field.required
        ? z.string().min(1, `${field.label} is required`).email("Enter a valid email")
        : z.string().email("Enter a valid email").or(z.literal(""))
    } else if (field.type === "number") {
      rule = field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string()
    } else if (field.required) {
      rule = z.string().min(1, `${field.label} is required`)
    } else {
      rule = z.string()
    }
    shape[field.name] = rule
  }
  return z.object(shape)
}

export function schemaForStep(step: FormStep) {
  return schemaForFields(step.fields)
}

export function defaultValuesFor(steps: FormStep[], extras: Record<string, string>) {
  const values: Record<string, string> = { ...extras }
  for (const step of steps) {
    for (const field of step.fields) {
      if (field.type === "file") continue
      if (values[field.name] === undefined) values[field.name] = ""
    }
  }
  return values
}
