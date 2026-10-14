import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-[100px] w-full rounded-xl border border-input/90 bg-card/60 px-3.5 py-2.5 text-xs sm:text-sm text-foreground transition-all duration-150 outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-card/30 dark:focus-visible:bg-card",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
