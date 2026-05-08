"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Textarea } from "@/components/ui-crm/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui-crm/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-crm/tabs"
import { Switch } from "@/components/ui-crm/switch"
import { Badge } from "@/components/ui-crm/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui-crm/dialog"
import {
  User, Key, BrainCircuit, Palette, Lock,
  Loader2, CheckCircle2, AlertCircle, Eye, EyeOff,
  Zap, Mail, BarChart3, Plus, Trash2, Smartphone
} from "lucide-react"
import { setTheme, getStoredTheme, type Theme } from "@/lib/theme"
import type { ScoringRule, CreditUsage } from "@/types"
import { format } from "date-fns"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)

  // Profile
  const [fullName, setFullName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // API Keys
  const [lushaKey, setLushaKey] = useState("")
  const [lushaKeySet, setLushaKeySet] = useState(false)
  const [showLushaKey, setShowLushaKey] = useState(false)
  const [mailchimpKey, setMailchimpKey] = useState("")
  const [mailchimpKeySet, setMailchimpKeySet] = useState(false)
  const [showMailchimpKey, setShowMailchimpKey] = useState(false)
  const [serverPrefix, setServerPrefix] = useState("")
  const [savingKeys, setSavingKeys] = useState(false)
  const [keysSuccess, setKeysSuccess] = useState(false)
  const [keysError, setKeysError] = useState<string | null>(null)
  const [gmailAccounts, setGmailAccounts] = useState<{ id: string; email: string }[]>([])
  const [removingGmailId, setRemovingGmailId] = useState<string | null>(null)

  // Twilio
  const [twilioAccountSid, setTwilioAccountSid] = useState("")
  const [twilioApiKeySid, setTwilioApiKeySid] = useState("")
  const [twilioAuthToken, setTwilioAuthToken] = useState("")
  const [twilioPhone, setTwilioPhone] = useState("")
  const [twilioMyNumber, setTwilioMyNumber] = useState("")
  const [twilioConnected, setTwilioConnected] = useState(false)
  const [twilioApiKeySet, setTwilioApiKeySet] = useState(false)
  const [showTwilioSid, setShowTwilioSid] = useState(false)
  const [showTwilioToken, setShowTwilioToken] = useState(false)
  const [savingTwilio, setSavingTwilio] = useState(false)
  const [twilioSuccess, setTwilioSuccess] = useState(false)
  const [twilioError, setTwilioError] = useState<string | null>(null)

  // Credits
  const [credits, setCredits] = useState<{ lusha: number; claude: number; mailchimp: number }>({ lusha: 0, claude: 0, mailchimp: 0 })
  const [creditHistory, setCreditHistory] = useState<CreditUsage[]>([])

  // Scoring
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [directiveModal, setDirectiveModal] = useState(false)
  const [newDirective, setNewDirective] = useState("")
  const [savingDirective, setSavingDirective] = useState(false)

  // Appearance
  const [currentTheme, setCurrentTheme] = useState<Theme>("light")
  const [savingTheme, setSavingTheme] = useState(false)

  // Email Signature
  const [emailSignature, setEmailSignature] = useState("")
  const [savingSignature, setSavingSignature] = useState(false)
  const [signatureSuccess, setSignatureSuccess] = useState(false)

  // Password
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const loadAll = useCallback(async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const wsParam = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : ""
    const [keysRes, gmailRes, twilioRes, creditRes, historyRes, rulesRes, wsRes] = await Promise.all([
      fetch("/api/settings/api-keys"),
      supabase.from("gmail_tokens").select("id, email").not("email", "is", null).order("updated_at", { ascending: true }),
      fetch(`/api/settings/twilio${wsParam}`),
      supabase.from("credit_usage").select("type, amount").eq("workspace_id", activeWorkspaceId ?? "").gte("created_at", monthStart),
      supabase.from("credit_usage").select("*").eq("workspace_id", activeWorkspaceId ?? "").order("created_at", { ascending: false }).limit(20),
      supabase.from("scoring_rules").select("*").eq("workspace_id", activeWorkspaceId ?? "").order("created_at", { ascending: false }),
      activeWorkspaceId
        ? supabase.from("crm_workspaces").select("email_signature").eq("id", activeWorkspaceId).single()
        : Promise.resolve({ data: null }),
    ])

    if (keysRes.ok) {
      const keys = await keysRes.json()
      setFullName(keys.fullName ?? "")
      setLushaKeySet(keys.lushaKeySet)
      setMailchimpKeySet(keys.mailchimpKeySet)
      setServerPrefix(keys.mailchimpServerPrefix ?? "")
    }

    if (wsRes.data) setEmailSignature((wsRes.data as { email_signature: string | null }).email_signature ?? "")

    setGmailAccounts((gmailRes.data ?? []) as { id: string; email: string }[])

    if (twilioRes.ok) {
      const tw = await twilioRes.json()
      setTwilioPhone(tw.phoneNumber ?? "")
      setTwilioMyNumber(tw.myNumber ?? "")
      setTwilioConnected(tw.connected ?? false)
      setTwilioApiKeySet(tw.apiKeySidSet ?? false)
    }

    const creditRows = creditRes.data ?? []
    setCredits({
      lusha: creditRows.filter((r) => r.type === "lusha_email").reduce((s, r) => s + r.amount, 0),
      claude: creditRows.filter((r) => r.type === "claude_tokens").reduce((s, r) => s + r.amount, 0),
      mailchimp: creditRows.filter((r) => r.type === "mailchimp_send").reduce((s, r) => s + r.amount, 0),
    })
    setCreditHistory((historyRes.data as CreditUsage[]) ?? [])
    setRules((rulesRes.data as ScoringRule[]) ?? [])
    setCurrentTheme(getStoredTheme())
  }, [supabase, activeWorkspaceId])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileSuccess(false)
    await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    })
    setProfileSuccess(true)
    setSavingProfile(false)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  async function handleSaveSignature() {
    if (!activeWorkspaceId) return
    setSavingSignature(true)
    setSignatureSuccess(false)
    await fetch(`/api/workspaces?id=${activeWorkspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_signature: emailSignature || null }),
    })
    // Update local store so outreach page picks it up immediately
    const { updateWorkspace } = useCrmWorkspaceStore.getState()
    updateWorkspace(activeWorkspaceId, { email_signature: emailSignature || null })
    setSignatureSuccess(true)
    setSavingSignature(false)
    setTimeout(() => setSignatureSuccess(false), 3000)
  }

  async function handleSaveKeys() {
    setSavingKeys(true)
    setKeysError(null)
    setKeysSuccess(false)
    const body: Record<string, string> = { mailchimpServerPrefix: serverPrefix }
    if (lushaKey) body.lushaApiKey = lushaKey
    if (mailchimpKey) body.mailchimpApiKey = mailchimpKey
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setKeysSuccess(true)
      setLushaKey("")
      setMailchimpKey("")
      setLushaKeySet(!!lushaKey || lushaKeySet)
      setMailchimpKeySet(!!mailchimpKey || mailchimpKeySet)
      setTimeout(() => setKeysSuccess(false), 3000)
    } else {
      const d = await res.json()
      setKeysError(d.error)
    }
    setSavingKeys(false)
  }

  async function handleSaveTwilio() {
    setSavingTwilio(true)
    setTwilioError(null)
    setTwilioSuccess(false)
    const body: Record<string, string> = {
      phoneNumber: twilioPhone,
      myNumber: twilioMyNumber,
      workspaceId: activeWorkspaceId ?? "",
    }
    if (twilioAccountSid) body.accountSid = twilioAccountSid
    if (twilioApiKeySid !== undefined) body.apiKeySid = twilioApiKeySid
    if (twilioAuthToken) body.authToken = twilioAuthToken
    const res = await fetch("/api/settings/twilio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setTwilioSuccess(true)
      setTwilioAccountSid("")
      setTwilioApiKeySid("")
      setTwilioAuthToken("")
      setTwilioConnected(!!(twilioAccountSid || twilioConnected))
      await loadAll()
      setTimeout(() => setTwilioSuccess(false), 3000)
    } else {
      const d = await res.json()
      setTwilioError(d.error ?? "Failed to save Twilio settings")
    }
    setSavingTwilio(false)
  }

  async function handleRemoveGmail(id: string) {
    setRemovingGmailId(id)
    await supabase.from("gmail_tokens").delete().eq("id", id)
    setGmailAccounts((prev) => prev.filter((a) => a.id !== id))
    setRemovingGmailId(null)
  }

  async function handleToggleRule(id: string, current: boolean) {
    if (!current) await supabase.from("scoring_rules").update({ is_active: false }).neq("id", id)
    await supabase.from("scoring_rules").update({ is_active: !current }).eq("id", id)
    await loadAll()
  }

  async function handleDeleteRule(id: string) {
    await supabase.from("scoring_rules").delete().eq("id", id)
    await loadAll()
  }

  async function handleAddDirective() {
    if (!newDirective.trim()) return
    setSavingDirective(true)
    await supabase.from("scoring_rules").insert({ directive: newDirective.trim(), is_active: true })
    await supabase.from("scoring_rules").update({ is_active: false }).neq("directive", newDirective.trim())
    setNewDirective("")
    setDirectiveModal(false)
    await loadAll()
    setSavingDirective(false)
  }

  async function handleThemeChange(t: Theme) {
    setSavingTheme(true)
    setCurrentTheme(t)
    setTheme(t)
    await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    })
    setSavingTheme(false)
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setSavingPassword(false)
  }

  const CREDIT_TYPE_LABELS: Record<string, string> = {
    lusha_email: "Lusha Email",
    lusha_phone: "Lusha Phone",
    claude_tokens: "Claude Tokens",
    mailchimp_send: "Mailchimp Send",
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and integrations</p>
      </div>

      <Tabs defaultValue="profile" className="flex-col">
        <TabsList className="h-10 w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="profile" className="gap-1.5 shrink-0"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 shrink-0"><Key className="h-4 w-4" /> API & Credits</TabsTrigger>
          <TabsTrigger value="scoring" className="gap-1.5 shrink-0"><BrainCircuit className="h-4 w-4" /> Scoring</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 shrink-0"><Palette className="h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5 shrink-0"><Lock className="h-4 w-4" /> Password</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input className="h-9 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              {profileSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> Saved!
                </div>
              )}
              <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="gap-1.5">
                {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API & Credits */}
        <TabsContent value="api" className="mt-4 space-y-4">
          {/* Credit summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground">Lusha Credits</span>
                </div>
                <p className="text-2xl font-bold">{credits.lusha}</p>
                <p className="text-xs text-muted-foreground">this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Claude Tokens</span>
                </div>
                <p className="text-2xl font-bold">{credits.claude.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Emails Sent</span>
                </div>
                <p className="text-2xl font-bold">{credits.mailchimp}</p>
                <p className="text-xs text-muted-foreground">this month</p>
              </CardContent>
            </Card>
          </div>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">API Key Configuration</CardTitle>
              <CardDescription className="text-xs">Keys are stored securely and never exposed to the browser.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Lusha API Key
                  {lushaKeySet && <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Configured</Badge>}
                </Label>
                <div className="relative">
                  <Input
                    className="h-9 text-sm pr-10"
                    type={showLushaKey ? "text" : "password"}
                    value={lushaKey}
                    onChange={(e) => setLushaKey(e.target.value)}
                    placeholder={lushaKeySet ? "Enter new key to replace..." : "sk-..."}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLushaKey((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showLushaKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Mailchimp API Key
                  {mailchimpKeySet && <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Configured</Badge>}
                </Label>
                <div className="relative">
                  <Input
                    className="h-9 text-sm pr-10"
                    type={showMailchimpKey ? "text" : "password"}
                    value={mailchimpKey}
                    onChange={(e) => setMailchimpKey(e.target.value)}
                    placeholder={mailchimpKeySet ? "Enter new key to replace..." : "abc123..."}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMailchimpKey((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showMailchimpKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Mailchimp Server Prefix</Label>
                <Input
                  className="h-9 text-sm"
                  value={serverPrefix}
                  onChange={(e) => setServerPrefix(e.target.value)}
                  placeholder="e.g. us12"
                />
                <p className="text-xs text-muted-foreground">Find this in your Mailchimp API key (e.g. key ending in -us12)</p>
              </div>

              {keysSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> Keys saved securely!
                </div>
              )}
              {keysError && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{keysError}</div>
              )}
              <Button size="sm" onClick={handleSaveKeys} disabled={savingKeys} className="gap-1.5">
                {savingKeys ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save API Keys
              </Button>
            </CardContent>
          </Card>

          {/* Gmail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gmail Integration</CardTitle>
              <CardDescription className="text-xs">Connect one or more Gmail accounts for sending emails from Outreach.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {gmailAccounts.length > 0 && (
                <div className="space-y-1">
                  {gmailAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm flex-1 truncate font-mono">{acc.email ?? "—"}</span>
                      <button
                        onClick={() => handleRemoveGmail(acc.id)}
                        disabled={removingGmailId === acc.id}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove account"
                      >
                        {removingGmailId === acc.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <a
                href={`/api/auth/gmail${activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : ""}`}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.8rem] font-medium rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {gmailAccounts.length > 0 ? "Connect another account" : "Connect Gmail"}
              </a>
            </CardContent>
          </Card>

          {/* Email Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> Email Signature
              </CardTitle>
              <CardDescription className="text-xs">
                Automatically appended to every email sent from this workspace (individual and mass campaigns). Supports plain text or HTML.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                className="text-sm font-mono min-h-[140px] resize-y"
                placeholder={"Best regards,\nYour Name\n\n<a href=\"https://yoursite.com\">yoursite.com</a>"}
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveSignature}
                  disabled={savingSignature}
                >
                  {savingSignature ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Save Signature
                </Button>
                {signatureSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Twilio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" /> Twilio Integration
                {twilioConnected && <Badge variant="outline" className="text-xs gap-1 ml-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Connected</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">
                Required for SMS campaigns. Use <strong>Account SID + Auth Token</strong> (classic) or <strong>Account SID + API Key SID + API Key Secret</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Account SID <span className="text-muted-foreground">(starts with AC…)</span></Label>
                <div className="relative">
                  <Input
                    className="h-9 text-sm pr-10"
                    type={showTwilioSid ? "text" : "password"}
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    placeholder={twilioConnected ? "Enter new SID to replace…" : "ACxxxxxxxxxxxxxxxx"}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwilioSid((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showTwilioSid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  API Key SID <span className="text-muted-foreground">(starts with SK… — optional if using Auth Token)</span>
                  {twilioApiKeySet && !twilioApiKeySid && <Badge variant="outline" className="ml-1.5 text-[10px] gap-0.5"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Set</Badge>}
                </Label>
                <div className="relative">
                  <Input
                    className="h-9 text-sm pr-10"
                    type={showTwilioSid ? "text" : "password"}
                    value={twilioApiKeySid}
                    onChange={(e) => setTwilioApiKeySid(e.target.value)}
                    placeholder={twilioApiKeySet ? "Enter new API Key SID to replace…" : "SKxxxxxxxxxxxxxxxx"}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Auth Token <span className="text-muted-foreground">/ API Key Secret</span></Label>
                <div className="relative">
                  <Input
                    className="h-9 text-sm pr-10"
                    type={showTwilioToken ? "text" : "password"}
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    placeholder={twilioConnected ? "Enter new token to replace…" : "xxxxxxxxxxxxxxxx"}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwilioToken((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showTwilioToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Twilio Phone Number <span className="text-muted-foreground">(sender number)</span></Label>
                <Input
                  className="h-9 text-sm"
                  value={twilioPhone}
                  onChange={(e) => setTwilioPhone(e.target.value)}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-muted-foreground">Your Twilio-provisioned number in E.164 format. Used as the sender for SMS and calls.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  My Phone Number <span className="text-muted-foreground">(for click-to-call)</span>
                </Label>
                <Input
                  className="h-9 text-sm"
                  value={twilioMyNumber}
                  onChange={(e) => setTwilioMyNumber(e.target.value)}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-muted-foreground">Your personal number. When you click "Call" on a lead, Twilio calls this number first, then bridges you to the lead.</p>
              </div>
              {twilioSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> Twilio settings saved!
                </div>
              )}
              {twilioError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4" /> {twilioError}
                </div>
              )}
              <Button size="sm" onClick={handleSaveTwilio} disabled={savingTwilio} className="gap-1.5">
                {savingTwilio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Twilio
              </Button>
            </CardContent>
          </Card>

          {/* Credit history */}
          {creditHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" /> Recent Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1.5 text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium">Amount</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHistory.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-1.5 text-foreground">{CREDIT_TYPE_LABELS[row.type] ?? row.type}</td>
                        <td className="py-1.5 text-muted-foreground">{row.amount.toLocaleString()}</td>
                        <td className="py-1.5 text-muted-foreground hidden sm:table-cell">
                          {format(new Date(row.created_at), "MMM d")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scoring */}
        <TabsContent value="scoring" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Scoring Directives</p>
              <p className="text-xs text-muted-foreground">Active directive is used when scoring leads on the Leadboard.</p>
            </div>
            <Button size="sm" onClick={() => setDirectiveModal(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Directive
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No scoring directives yet</p>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className={rule.is_active ? "border-primary/40" : ""}>
                <CardContent className="pt-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {rule.is_active && <Badge className="text-xs mb-1.5">Active</Badge>}
                    <p className="text-sm text-foreground leading-snug">{rule.directive}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(rule.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.is_active} onCheckedChange={() => handleToggleRule(rule.id, rule.is_active)} />
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Theme</CardTitle>
              <CardDescription className="text-xs">Choose between light and dark mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${currentTheme === "light" ? "border-primary" : "border-border hover:border-muted-foreground/30"}`}
                >
                  <div className="h-16 rounded bg-white border mb-2 flex flex-col gap-1 p-2">
                    <div className="h-2 w-12 bg-gray-200 rounded" />
                    <div className="h-1.5 w-8 bg-gray-100 rounded" />
                    <div className="h-6 w-full bg-gray-50 rounded mt-1" />
                  </div>
                  <p className="text-sm font-medium">Light</p>
                  {currentTheme === "light" && <p className="text-xs text-primary mt-0.5">Active</p>}
                </button>
                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${currentTheme === "dark" ? "border-primary" : "border-border hover:border-muted-foreground/30"}`}
                >
                  <div className="h-16 rounded bg-gray-900 border border-gray-700 mb-2 flex flex-col gap-1 p-2">
                    <div className="h-2 w-12 bg-gray-600 rounded" />
                    <div className="h-1.5 w-8 bg-gray-700 rounded" />
                    <div className="h-6 w-full bg-gray-800 rounded mt-1" />
                  </div>
                  <p className="text-sm font-medium">Dark</p>
                  {currentTheme === "dark" && <p className="text-xs text-primary mt-0.5">Active</p>}
                </button>
              </div>
              {savingTheme && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password */}
        <TabsContent value="password" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">New Password</Label>
                <Input
                  type="password"
                  className="h-9 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirm Password</Label>
                <Input
                  type="password"
                  className="h-9 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              {passwordError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4" /> {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> Password updated!
                </div>
              )}
              <Button size="sm" onClick={handleChangePassword} disabled={!newPassword || !confirmPassword || savingPassword} className="gap-1.5">
                {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Directive Modal */}
      <Dialog open={directiveModal} onOpenChange={setDirectiveModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Scoring Directive</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Write a natural language directive that tells Claude how to score leads.
            </p>
            <Textarea
              className="text-sm resize-none"
              rows={4}
              value={newDirective}
              onChange={(e) => setNewDirective(e.target.value)}
              placeholder="e.g. Prioritize people with East Asian surnames. Companies in Southeast Asia preferred. Higher score for C-Level and VP roles."
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDirectiveModal(false)}>Cancel</Button>
            <Button onClick={handleAddDirective} disabled={!newDirective.trim() || savingDirective}>
              {savingDirective ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
