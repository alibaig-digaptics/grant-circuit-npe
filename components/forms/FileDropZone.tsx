"use client"

import { useFileDialog, useDropZone } from "@siberiacancode/reactuse"
import {
  FileIcon,
  UploadCloudIcon,
  XIcon,
  FileCheckIcon,
  FileTextIcon,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileDropZone({
  files,
  multiple,
  accept,
  invalid,
  onChange,
}: {
  files: File[]
  multiple?: boolean
  accept?: string
  invalid?: boolean
  onChange: (files: File[]) => void
}) {
  const dialog = useFileDialog(
    (picked) => {
      if (!picked?.length) return
      const list = Array.from(picked)
      onChange(multiple ? [...files, ...list] : [list[0]])
    },
    { accept: accept || "*/*", multiple: !!multiple, reset: true }
  )

  const dropZone = useDropZone<HTMLDivElement>({
    multiple: !!multiple,
    onDrop: (dropped) => {
      if (!dropped?.length) return
      onChange(multiple ? [...files, ...dropped] : [dropped[0]])
    },
  })

  return (
    <div className="flex flex-col gap-3 w-full">
      <input
        type="file"
        multiple={!!multiple}
        accept={accept || "*/*"}
        style={{ display: "none" }}
        className="hidden-file-input"
        onChange={(e) => {
          if (e.target.files && e.target.files.length) {
            const list = Array.from(e.target.files)
            onChange(multiple ? [...files, ...list] : [list[0]])
          }
        }}
      />
      <div
        ref={dropZone.ref}
        role="button"
        tabIndex={0}
        data-invalid={invalid || undefined}
        className={cn(
          "group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200 outline-none",
          dropZone.overed
            ? "border-primary bg-primary/10 shadow-sm ring-4 ring-primary/10 scale-[0.99]"
            : "border-border/90 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
          invalid && "border-destructive bg-destructive/5 ring-2 ring-destructive/10"
        )}
        onClick={() => dialog.open()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            dialog.open()
          }
        }}
      >
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105",
            dropZone.overed
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-primary/10 text-primary border border-primary/20"
          )}
        >
          <UploadCloudIcon className="size-5.5 stroke-[2.2]" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            {dropZone.overed ? (
              <span className="text-primary font-bold">Release to upload files</span>
            ) : (
              <>
                <span className="text-primary hover:underline">Click to browse</span> or drag and drop
              </>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            PDF, DOCX, PNG, JPG, or CSV (max 10MB each)
          </p>
        </div>
      </div>

      {files.length ? (
        <ul className="flex flex-col gap-2 pt-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/90 px-3.5 py-2.5 shadow-xs transition-all hover:border-border/80"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileTextIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {formatSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${file.name}`}
                className="size-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <XIcon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
