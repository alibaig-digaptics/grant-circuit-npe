"use client"

import React from "react"

interface HeaderProps {
  title?: string
  subtitle?: string
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-6 w-full text-center">
      <div className="mb-4 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="Initiative on Islam and Medicine"
          className="mx-auto h-14 w-auto max-w-[280px] object-contain sm:h-16"
        />
      </div>
      {title ? (
        <h1 className="mb-1.5 font-serif text-[1.65rem] leading-tight font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mx-auto max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
