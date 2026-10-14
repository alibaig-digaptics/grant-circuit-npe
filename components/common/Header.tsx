"use client"

import React from "react"

import { ASSETS } from "@/constant/assets.constant"

interface HeaderProps {
  title?: string
  subtitle?: string
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-6 w-full text-center">
      <div className="mb-4 flex items-center justify-center">
        <img
          src={ASSETS.LOGO_ON_LIGHT}
          alt="Initiative on Islam and Medicine"
          className="mx-auto h-20 w-auto max-w-[360px] object-contain sm:h-24 sm:max-w-[440px] dark:hidden"
        />
        <img
          src={ASSETS.LOGO_ON_DARK}
          alt=""
          className="mx-auto hidden h-20 w-auto max-w-[360px] object-contain sm:h-24 sm:max-w-[440px] dark:block"
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
