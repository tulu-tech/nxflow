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

  // Close on outside click — use pointerdown for broader support + commit typed value
  useEffect(() => {
    if (!open) return
    function handle(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // commit whatever was typed (clean trailing comma in multi)
        const clean = multi ? inputValue.split(",").map((s) => s.trim()).filter(Boolean).join(", ") : inputValue.trim()
        setInputValue(clean)
        onChange(clean)
      }
    }
    document.addEventListener("pointerdown", handle)
    return () => document.removeEventListener("pointerdown", handle)
  }, [open, inputValue, multi, onChange])

  // For multi mode, the "active" token is the last comma-separated segment
  const activeToken = multi
    ? (inputValue.split(",").pop() ?? "").trim()
    : inputValue.trim()

  const selectedValues = multi
    ? inputValue.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  const filtered = activeToken.length === 0
    ? options.slice(0, 50)
    : options.filter((o) => o.toLowerCase().includes(activeToken.toLowerCase())).slice(0, 50)

  const handleSelect = useCallback((option: string) => {
    if (multi) {
      // Toggle: if already selected, remove it. Otherwise add.
      const current = inputValue.split(",").map((s) => s.trim()).filter(Boolean)
      // Drop the partial token (active typing)
      const partial = current[current.length - 1]
      const alreadySelected = current.includes(option)
      let next: string[]
      if (alreadySelected) {
        next = current.filter((c) => c !== option)
      } else {
        // remove partial token if any and add the option
        const withoutPartial = partial && !options.includes(partial) ? current.slice(0, -1) : current
        next = [...withoutPartial.filter((c) => c !== option), option]
      }
      const nextStr = next.join(", ")
      setInputValue(nextStr)
      onChange(nextStr)
      // Keep dropdown open so user can pick more
      inputRef.current?.focus()
    } else {
      setInputValue(option)
      onChange(option)
      setOpen(false)
    }
  }, [inputValue, multi, onChange, options])

  function handleInputChange(v: string) {
    setInputValue(v)
    if (!multi) onChange(v)
    setOpen(true)
  }

  function handleClear() {
    setInputValue("")
    onChange("")
    inputRef.current?.focus()
  }

  function handleDone() {
    setOpen(false)
    const clean = multi ? inputValue.split(",").map((s) => s.trim()).filter(Boolean).join(", ") : inputValue.trim()
    setInputValue(clean)
    onChange(clean)
    inputRef.current?.blur()
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          className="h-8 pr-14"
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
              type="button"
              onClick={handleClear}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setOpen((v) => !v); if (!open) inputRef.current?.focus() }}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
          {multi && selectedValues.length > 0 && (
            <div className="px-3 py-1.5 border-b text-xs text-muted-foreground bg-muted/30 flex items-center justify-between">
              <span><b className="text-foreground">{selectedValues.length}</b> selected</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] hover:text-destructive"
              >
                Clear
              </button>
            </div>
          )}
          {filtered.length > 0 ? (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map((opt) => {
                const isSelected = multi ? selectedValues.includes(opt) : value === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted transition-colors",
                      isSelected && "bg-muted/60 font-medium"
                    )}
                  >
                    <span className="flex-1 truncate">{opt}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              No matches
            </div>
          )}
          {activeToken && !options.some((o) => o.toLowerCase() === activeToken.toLowerCase()) && (
            <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Press Enter to use "<span className="font-medium text-foreground">{activeToken}</span>"
            </div>
          )}
          {multi && (
            <div className="border-t px-3 py-1.5 flex justify-end">
              <button
                type="button"
                onClick={handleDone}
                className="text-xs font-medium text-primary hover:underline"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
