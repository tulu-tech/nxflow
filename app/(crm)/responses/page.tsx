"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCrmWorkspaceStore } from "@/store/crmWorkspaceStore"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Textarea } from "@/components/ui-crm/textarea"
import { Badge } from "@/components/ui-crm/badge"
import { Card, CardContent } from "@/components/ui-crm/card"
import { Switch } from "@/components/ui-crm/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui-crm/dialog"
import {
  MessageSquare, Loader2, Plus, Trash2, Edit2, Send,
  AlertCircle, CheckCircle2, Mail, Zap, X, RefreshCw
} from "lucide-react"
import type { ResponseRule, MatchedEmail } from "@/types"
import { format } from "date-fns"

export default function ResponsesPage() {
  const supabase = createClient()
  const activeWorkspaceId = useCrmWorkspaceStore((s) => s.activeWorkspaceId)

  const [rules, setRules] = useState<ResponseRule[]>([])
  const [loading, setLoading] = useState(true)
  const [gmailConnected, setGmailConnected] = useState(false)

  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ResponseRule | null>(null)
  const [ruleName, setRuleName] = useState("")
  const [keywordsInput, setKeywordsInput] = useState("")
  const [claudePrompt, setClaudePrompt] = useState("")
  const [autoSend, setAutoSend] = useState(false)
  const [savingRule, setSavingRule] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [matches, setMatches] = useState<MatchedEmail[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)

  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [draftEmail, setDraftEmail] = useState<MatchedEmail | null>(null)
  const [draftText, setDraftText] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [sendingDraft, setSendingDraft] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [draftSuccess, setDraftSuccess] = useState(false)

  const loadRules = useCallback(async () => {
    if (!activeWorkspaceId) return
    setLoading(true)
    const { data } = await supabase.from("response_rules").select("*").eq("workspace_id", activeWorkspaceId).order("created_at", { ascending: false })
    setRules((data as ResponseRule[]) ?? [])
    setLoading(false)
  }, [supabase, activeWorkspaceId])

  const checkGmail = useCallback(async () => {
    if (!activeWorkspaceId) return
    const { data } = await supabase.from("gmail_tokens").select("id").eq("workspace_id", activeWorkspaceId).limit(1)
    setGmailConnected((data?.length ?? 0) > 0)
  }, [supabase, activeWorkspaceId])

  useEffect(() => { loadRules(); checkGmail() }, [loadRules, checkGmail])

  function openNewRule() {
    setEditingRule(null)
    setRuleName("")
    setKeywordsInput("")
    setClaudePrompt("")
    setAutoSend(false)
    setRuleModalOpen(true)
  }

  function openEditRule(rule: ResponseRule) {
    setEditingRule(rule)
    setRuleName(rule.rule_name)
    setKeywordsInput(rule.keywords.join(", "))
    setClaudePrompt(rule.claude_prompt)
    setAutoSend(rule.auto_send)
    setRuleModalOpen(true)
  }

  async function handleSaveRule() {
    const keywords = keywordsInput.split(",").map((k) => k.trim()).filter(Boolean)
    if (!ruleName.trim() || !keywords.length || !claudePrompt.trim()) return
    setSavingRule(true)
    if (editingRule) {
      await supabase
        .from("response_rules")
        .update({ rule_name: ruleName.trim(), keywords, claude_prompt: claudePrompt.trim(), auto_send: autoSend })
        .eq("id", editingRule.id)
    } else {
      await supabase.from("response_rules").insert({
        rule_name: ruleName.trim(),
        keywords,
        claude_prompt: claudePrompt.trim(),
        auto_send: autoSend,
        is_active: true,
        workspace_id: activeWorkspaceId,
      })
    }
    setSavingRule(false)
    setRuleModalOpen(false)
    await loadRules()
  }

  async function handleToggleRule(id: string, current: boolean) {
    await supabase.from("response_rules").update({ is_active: !current }).eq("id", id)
    await loadRules()
  }

  async function handleDeleteRule(id: string) {
    await supabase.from("response_rules").delete().eq("id", id)
    await loadRules()
  }

  async function handleScan() {
    setScanning(true)
    setScanError(null)
    setHasScanned(false)
    try {
      const res = await fetch("/api/responses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMatches(data.matches ?? [])
      setHasScanned(true)
    } catch (e) {
      setScanError((e as Error).message)
    } finally {
      setScanning(false)
    }
  }

  async function handleDraftReply(email: MatchedEmail) {
    setDraftEmail(email)
    setDraftText("")
    setDraftError(null)
    setDraftSuccess(false)
    setDraftModalOpen(true)
    setDrafting(true)
    try {
      const res = await fetch("/api/responses/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailBody: email.body,
          emailSubject: email.subject,
          fromEmail: email.from,
          ruleId: email.matchedRuleId,
          workspaceId: activeWorkspaceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDraftText(data.draft)
      if (data.autoSent) {
        setDraftSuccess(true)
      }
    } catch (e) {
      setDraftError((e as Error).message)
    } finally {
      setDrafting(false)
    }
  }

  async function handleSendDraft() {
    if (!draftEmail || !draftText) return
    setSendingDraft(true)
    setDraftError(null)
    try {
      const res = await fetch("/api/mailchimp/send-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draftEmail.from,
          subject: `Re: ${draftEmail.subject}`,
          body: draftText,
          workspaceId: activeWorkspaceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDraftSuccess(true)
    } catch (e) {
      setDraftError((e as Error).message)
    } finally {
      setSendingDraft(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Responses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scan Gmail for keywords and draft AI responses</p>
        </div>
        <div className="flex items-center gap-2">
          {!gmailConnected ? (
            <a
              href="/api/auth/gmail"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.8rem] font-medium rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted transition-colors"
            >
              <Mail className="h-4 w-4" /> Connect Gmail
            </a>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Gmail connected
            </Badge>
          )}
          <Button size="sm" onClick={handleScan} disabled={scanning || !gmailConnected} className="gap-1.5">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {scanning ? "Scanning..." : "Scan Gmail"}
          </Button>
          <Button size="sm" variant="outline" onClick={openNewRule} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Rules Panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Response Rules</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No rules yet</p>
                <p className="text-xs mt-1">Add a rule to auto-respond to emails</p>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className={rule.is_active ? "border-primary/30" : "opacity-60"}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{rule.rule_name}</p>
                        {rule.auto_send && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <Zap className="h-2.5 w-2.5" /> AUTO
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rule.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                        {rule.claude_prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleRule(rule.id, rule.is_active)}
                      />
                      <button onClick={() => openEditRule(rule)} className="text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Matched Emails */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Matched Emails
            {hasScanned && <span className="ml-2 text-xs font-normal text-muted-foreground">({matches.length} found)</span>}
          </h2>

          {scanError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4" /> {scanError}
              <button onClick={() => setScanError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {!hasScanned && !scanning ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Scan Gmail to find matching emails</p>
                {!gmailConnected && <p className="text-xs mt-1 text-amber-600">Connect Gmail first</p>}
              </CardContent>
            </Card>
          ) : scanning ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : matches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No matches found in recent emails</p>
              </CardContent>
            </Card>
          ) : (
            matches.map((match) => (
              <Card key={match.messageId}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{match.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{match.from}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{match.matchedRuleName}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.matchedKeywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 line-clamp-2">{match.snippet}</p>
                  <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => handleDraftReply(match)}>
                    <MessageSquare className="h-3.5 w-3.5" /> Draft AI Reply
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Rule Modal */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "New Response Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Rule Name</Label>
              <Input className="h-8 text-sm" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Partnership Inquiry" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keywords (comma-separated)</Label>
              <Input className="h-8 text-sm" value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="partnership, collaborate, work together" />
              {keywordsInput && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {keywordsInput.split(",").map((k) => k.trim()).filter(Boolean).map((k) => (
                    <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Claude Directive</Label>
              <Textarea
                className="text-sm resize-none"
                rows={4}
                value={claudePrompt}
                onChange={(e) => setClaudePrompt(e.target.value)}
                placeholder="You are a professional marketing consultant at Alba Collective. Respond warmly and professionally to partnership inquiries..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-send</p>
                <p className="text-xs text-muted-foreground">Automatically send Claude&apos;s reply without review</p>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>
            {autoSend && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-md px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Auto-send will reply without your review. Use with caution.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRuleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} disabled={!ruleName || !keywordsInput || !claudePrompt || savingRule}>
              {savingRule ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Review Modal */}
      <Dialog open={draftModalOpen} onOpenChange={setDraftModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Draft Reply</DialogTitle>
          </DialogHeader>
          {draftEmail && (
            <div className="space-y-4">
              {/* Original email */}
              <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">ORIGINAL EMAIL</p>
                <p className="text-xs"><span className="font-medium">From:</span> {draftEmail.from}</p>
                <p className="text-xs"><span className="font-medium">Subject:</span> {draftEmail.subject}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{draftEmail.snippet}</p>
              </div>

              {/* Draft */}
              <div className="space-y-1.5">
                <Label className="text-xs">Your Reply</Label>
                {drafting ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating reply with Claude...
                  </div>
                ) : (
                  <Textarea
                    className="text-sm resize-none"
                    rows={8}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="AI draft will appear here..."
                  />
                )}
              </div>

              {draftSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> Reply sent successfully!
                </div>
              )}
              {draftError && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{draftError}</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDraftModalOpen(false)}>Close</Button>
            <Button
              onClick={handleSendDraft}
              disabled={!draftText || drafting || sendingDraft || draftSuccess}
              className="gap-2"
            >
              {sendingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendingDraft ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
