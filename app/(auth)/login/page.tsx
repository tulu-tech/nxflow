"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore, CRM_SHARED_EMAIL, CRM_SHARED_PASSWORD } from "@/store/authStore"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Zap, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const currentUser = useAuthStore((s) => s.currentUser)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoSigningIn, setAutoSigningIn] = useState(false)

  // Auto sign-in fallback: if the user already has an nxflow PIN session,
  // sign into the shared CRM Supabase identity silently and bounce to
  // /dashboard. Catches the case where middleware redirected here.
  useEffect(() => {
    if (!currentUser) return

    let cancelled = false
    setAutoSigningIn(true)
    ;(async () => {
      try {
        const { data: existing } = await supabase.auth.getSession()
        if (!existing.session) {
          const { error: signErr } = await supabase.auth.signInWithPassword({
            email: CRM_SHARED_EMAIL,
            password: CRM_SHARED_PASSWORD,
          })
          if (signErr) {
            if (!cancelled) {
              setError(`SSO failed: ${signErr.message}`)
              setAutoSigningIn(false)
            }
            return
          }
        }
        if (cancelled) return
        router.replace("/dashboard")
        router.refresh()
      } catch (e) {
        if (!cancelled) {
          setError(`SSO error: ${(e as Error).message}`)
          setAutoSigningIn(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser, router, supabase])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  // While auto-signing in, show a minimal loading state
  if (autoSigningIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Signing you in…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-[18px]"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 12px 32px rgba(99,102,241,0.35)",
            }}
          >
            <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Alba Collective CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@albacollective.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Contact your admin to create an account.
        </p>
      </div>
    </div>
  )
}
