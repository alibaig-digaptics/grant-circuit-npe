"use client"

import React from "react"

export const Footer: React.FC = () => {
  return (
    <footer className="mt-8 w-full border-t border-border/80 pt-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-primary">
        <a
          href="https://www.medicineandislam.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          www.medicineandislam.org
        </a>
        <span className="text-muted-foreground/60">·</span>
        <a
          href="https://360growthlab.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          <span>Powered by</span>
          <img
            src="https://360growthlab.com/images/logo/tab-icon.png"
            alt="360 Growth Lab"
            width={14}
            height={14}
            className="inline-block h-3.5 w-3.5 object-contain"
          />
          <span>360 Growth Lab</span>
        </a>
      </div>
    </footer>
  )
}
