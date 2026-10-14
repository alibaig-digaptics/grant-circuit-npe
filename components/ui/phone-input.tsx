"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
  format: string
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", format: "(###) ###-####" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", format: "(###) ###-####" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", format: "#### ######" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", format: "### ### ###" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", format: "### #######" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", format: "##### #####" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", format: "## ### ####" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", format: "## ### ####" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", format: "#### ########" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", format: "# ## ## ## ##" },
]

function formatWithMask(digits: string, mask: string) {
  let result = ""
  let digitIndex = 0
  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === "#") {
      result += digits[digitIndex]
      digitIndex++
    } else {
      result += mask[i]
    }
  }
  return result
}

function formatPhoneByCountry(value: string, country: Country) {
  const digits = value.replace(/\D/g, "")
  if (country.code === "US" || country.code === "CA") {
    const limited = digits.slice(0, 10)
    if (limited.length < 4) return limited
    if (limited.length < 7) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  }
  return formatWithMask(digits.slice(0, 12), country.format)
}

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string
  onChange?: (value: string) => void
  invalid?: boolean
}

export function PhoneInput({
  value = "",
  onChange,
  className,
  invalid,
  id,
  placeholder,
  ...props
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(COUNTRIES[0])
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Extract clean number
  const rawNumber = value.startsWith(selectedCountry.dialCode)
    ? value.slice(selectedCountry.dialCode.length).trim()
    : value

  const formattedDisplay = formatPhoneByCountry(rawNumber, selectedCountry)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "")
    const formatted = formatPhoneByCountry(digitsOnly, selectedCountry)
    const fullE164 = digitsOnly ? `${selectedCountry.dialCode} ${formatted}` : ""
    onChange?.(fullE164)
  }

  const filteredCountries = React.useMemo(() => {
    if (!search) return COUNTRIES
    const s = search.toLowerCase()
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.dialCode.includes(s) ||
        c.code.toLowerCase().includes(s)
    )
  }, [search])

  return (
    <div
      className={cn(
        "relative flex w-full items-center rounded-xl border border-input/90 bg-card/60 transition-all duration-150 focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 dark:bg-card/30 dark:focus-within:bg-card",
        invalid && "border-destructive ring-2 ring-destructive/20 dark:border-destructive/50"
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          aria-label="Select country code"
          className="flex h-10 items-center gap-1.5 rounded-l-xl border-r border-border/80 bg-muted/30 px-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 outline-none transition-colors"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="tabular-nums text-muted-foreground font-semibold text-xs">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-64 p-1.5 rounded-xl border border-border/80 bg-popover shadow-lg z-50"
        >
          <div className="p-1 pb-2">
            <Input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs rounded-lg"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                  selectedCountry.code === c.code && "bg-primary/10 text-primary font-semibold"
                )}
                onClick={() => {
                  setSelectedCountry(c)
                  setOpen(false)
                  setSearch("")
                  if (rawNumber) {
                    const digitsOnly = rawNumber.replace(/\D/g, "")
                    const formatted = formatPhoneByCountry(digitsOnly, c)
                    onChange?.(digitsOnly ? `${c.dialCode} ${formatted}` : "")
                  }
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                  <span className="tabular-nums font-medium">{c.dialCode}</span>
                  {selectedCountry.code === c.code && <Check className="size-3.5 text-primary" />}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <input
        id={id}
        type="tel"
        value={formattedDisplay}
        onChange={handleInputChange}
        placeholder={placeholder || selectedCountry.format.replace(/#/g, "0")}
        className={cn(
          "h-10 w-full min-w-0 bg-transparent px-3 py-2 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}
