"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui-crm/input"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, X } from "lucide-react"

interface Props {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  /** If true, multiple values comma-separated are supported */
  multi?: boolean
}

export function FilterCombobox({ options, value, onChange, placeholder, className, multi }: Props) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => { setInputValue(value) }, [value])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // commit whatever was typed
        onChange(inputValue)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [inputValue, onChange])

  // For multi mode, the "active" token is the last comma-separated segment
  const activeToken = multi
    ? (inputValue.split(",").pop() ?? "").trim()
    : inputValue.trim()

  const filtered = activeToken.length === 0
    ? options.slice(0, 50)
    : options.filter((o) => o.toLowerCase().includes(activeToken.toLowerCase())).slice(0, 50)

  const handleSelect = useCallback((option: string) => {
    if (multi) {
      const parts = inputValue.split(",").map((s) => s.trim()).filter(Boolean)
      parts.pop() // remove the partial token
      parts.push(option)
      const next = parts.join(", ")
      setInputValue(next + ", ")
      onChange(next)
    } else {
      setInputValue(option)
      onChange(option)
      setOpen(false)
    }
    inputRef.current?.focus()
  }, [inputValue, multi, onChange])

  function handleInputChange(v: string) {
    setInputValue(v)
    onChange(v)
    setOpen(true)
  }

  function handleClear() {
    setInputValue("")
    onChange("")
    inputRef.current?.focus()
  }

  const selectedValues = multi ? value.split(",").map((s) => s.trim()).filter(Boolean) : []

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          className="h-8 text-sm pr-14"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() }
            if (e.key === "Enter" && filtered.length === 1) { handleSelect(filtered[0]); e.preventDefault() }
          }}
        />
        <div className="absolute right-1 top-1 flex items-center gap-0.5">
          {value && (
            <button
              onClick={handleClear}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => { setOpen((v) => !v); inputRef.current?.focus() }}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((opt) => {
              const isSelected = multi ? selectedValues.includes(opt) : value === opt
              return (
                <button
                  key={opt}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors",
                    isSelected && "bg-muted/60 font-medium"
                  )}
                >
                  <span className="flex-1 truncate">{opt}</span>
                  {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
          {activeToken && !options.some((o) => o.toLowerCase() === activeToken.toLowerCase()) && (
            <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Press Enter to use "<span className="font-medium text-foreground">{activeToken}</span>"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
