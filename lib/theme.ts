export type Theme = "light" | "dark"

export function setTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
  localStorage.setItem("alba-theme", theme)
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return (localStorage.getItem("alba-theme") as Theme) ?? "light"
}

export function getScoreClass(score: number): string {
  if (score >= 80) return "score-high"
  if (score >= 50) return "score-mid"
  return "score-low"
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "High"
  if (score >= 50) return "Medium"
  return "Low"
}
