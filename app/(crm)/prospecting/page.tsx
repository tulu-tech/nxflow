"use client"

import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui-crm/button"
import { Input } from "@/components/ui-crm/input"
import { Label } from "@/components/ui-crm/label"
import { Badge } from "@/components/ui-crm/badge"
import { Card, CardContent } from "@/components/ui-crm/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-crm/select"
import { Checkbox } from "@/components/ui-crm/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui-crm/avatar"
import { Separator } from "@/components/ui-crm/separator"
import { FilterCombobox } from "@/components/ui-crm/filter-combobox"
import {
  Search, Loader2, Mail, ChevronDown, ChevronUp, Target, Zap,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Building2,
  MapPin, Briefcase, Users, Filter, X, Phone, Globe,
} from "lucide-react"
import type { LushaContact, LushaSearchFilters } from "@/types"

const COMMON_JOB_TITLES = [
  "CEO","CFO","CTO","CMO","COO","CRO","CHRO","CPO",
  "VP Marketing","VP Sales","VP Engineering","VP Product","VP Finance","VP Operations",
  "Director of Marketing","Director of Sales","Director of Engineering","Director of Product",
  "Director of Business Development","Director of Finance","Director of Operations",
  "Head of Marketing","Head of Sales","Head of Growth","Head of Product","Head of Engineering",
  "Marketing Manager","Sales Manager","Product Manager","Engineering Manager","Brand Manager",
  "Growth Manager","Account Manager","Project Manager","Operations Manager",
  "Senior Marketing Manager","Senior Product Manager","Senior Software Engineer",
  "Marketing Specialist","Sales Representative","Business Development Manager",
  "Content Marketing Manager","Digital Marketing Manager","Social Media Manager",
  "SEO Manager","Performance Marketing Manager","Demand Generation Manager",
  "Partnership Manager","Customer Success Manager","Account Executive",
]

const COMMON_TECHNOLOGIES = [
  "Salesforce","HubSpot","Marketo","Pardot","Eloqua",
  "React","Angular","Vue.js","Next.js","Node.js","TypeScript","Python","Java","Go","Ruby",
  "AWS","Google Cloud","Azure","Kubernetes","Docker","Terraform",
  "Snowflake","Databricks","dbt","Looker","Tableau","Power BI",
  "Stripe","Twilio","Segment","Amplitude","Mixpanel","Intercom","Zendesk",
  "Shopify","Magento","WooCommerce","BigCommerce",
  "WordPress","Webflow","Contentful","Sanity",
  "Slack","Notion","Asana","Jira","Confluence","Linear",
  "GitHub","GitLab","Bitbucket","Jenkins","CircleCI",
  "MySQL","PostgreSQL","MongoDB","Redis","Elasticsearch",
  "Figma","Sketch","Adobe Creative Suite","InVision",
]

// ── Lusha filter taxonomy ────────────────────────────────────────────────────

const INDUSTRIES = [
  "Accounting","Airlines/Aviation","Alternative Dispute Resolution","Alternative Medicine",
  "Animation","Apparel & Fashion","Architecture & Planning","Arts & Crafts","Automotive",
  "Aviation & Aerospace","Banking","Biotechnology","Broadcast Media","Building Materials",
  "Business Supplies & Equipment","Capital Markets","Chemicals","Civic & Social Organization",
  "Civil Engineering","Commercial Real Estate","Computer & Network Security",
  "Computer Games","Computer Hardware","Computer Networking","Computer Software",
  "Construction","Consumer Electronics","Consumer Goods","Consumer Services",
  "Cosmetics","Dairy","Defense & Space","Design","E-Learning","Education Management",
  "Electrical/Electronic Manufacturing","Entertainment","Environmental Services",
  "Events Services","Executive Office","Facilities Services","Farming","Financial Services",
  "Fine Art","Fishery","Food & Beverages","Food Production","Fund-Raising",
  "Furniture","Gambling & Casinos","Glass, Ceramics & Concrete","Government Administration",
  "Government Relations","Graphic Design","Health, Wellness & Fitness","Higher Education",
  "Hospital & Health Care","Hospitality","Human Resources","Import & Export",
  "Individual & Family Services","Industrial Automation","Information Services",
  "Information Technology & Services","Insurance","International Affairs",
  "International Trade & Development","Internet","Investment Banking",
  "Investment Management","Judiciary","Law Enforcement","Law Practice",
  "Legal Services","Legislative Office","Leisure, Travel & Tourism","Libraries",
  "Logistics & Supply Chain","Luxury Goods & Jewelry","Machinery","Management Consulting",
  "Maritime","Market Research","Marketing & Advertising","Mechanical or Industrial Engineering",
  "Media Production","Medical Devices","Medical Practice","Mental Health Care",
  "Military","Mining & Metals","Mobile Games","Motion Pictures & Film","Museums & Institutions",
  "Music","Nanotechnology","Newspapers","Non-Profit Organization Management","Oil & Energy",
  "Online Media","Outsourcing/Offshoring","Package/Freight Delivery","Packaging & Containers",
  "Paper & Forest Products","Performing Arts","Pharmaceuticals","Philanthropy",
  "Photography","Plastics","Political Organization","Primary/Secondary Education",
  "Printing","Professional Training & Coaching","Program Development","Public Policy",
  "Public Relations & Communications","Public Safety","Publishing","Railroad Manufacture",
  "Ranching","Real Estate","Recreational Facilities & Services","Religious Institutions",
  "Renewables & Environment","Research","Restaurants","Retail","Security & Investigations",
  "Semiconductors","Shipbuilding","Sporting Goods","Sports","Staffing & Recruiting",
  "Supermarkets","Telecommunications","Textiles","Think Tanks","Tobacco",
  "Translation & Localization","Transportation/Trucking/Railroad","Utilities",
  "Venture Capital & Private Equity","Veterinary","Warehousing","Wholesale",
  "Wine & Spirits","Wireless","Writing & Editing",
]

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina",
  "Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica",
  "Croatia","Cuba","Czech Republic","Denmark","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece",
  "Guatemala","Honduras","Hong Kong","Hungary","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia",
  "Lebanon","Lithuania","Luxembourg","Malaysia","Mexico","Moldova","Morocco","Myanmar",
  "Nepal","Netherlands","New Zealand","Nicaragua","Nigeria","Norway","Oman","Pakistan",
  "Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia",
  "Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa",
  "South Korea","Spain","Sri Lanka","Sweden","Switzerland","Taiwan","Tanzania","Thailand",
  "Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe",
]

const COMPANY_SIZES = [
  { label: "1–10",       value: "1-10" },
  { label: "11–50",      value: "11-50" },
  { label: "51–200",     value: "51-200" },
  { label: "201–500",    value: "201-500" },
  { label: "501–1,000",  value: "501-1000" },
  { label: "1,001–5,000",value: "1001-5000" },
  { label: "5,001–10,000",value: "5001-10000" },
  { label: "10,000+",    value: "10000+" },
]

const SENIORITY_LEVELS = [
  { label: "C-Level / Owner", value: "C-Level" },
  { label: "VP",              value: "VP" },
  { label: "Director",        value: "Director" },
  { label: "Manager",         value: "Manager" },
  { label: "Senior",          value: "Senior" },
  { label: "Mid-Level",       value: "Mid-Level" },
  { label: "Entry Level",     value: "Entry" },
]

const DEPARTMENTS = [
  "C-Suite","Engineering & Technical","Sales","Marketing","Operations",
  "Finance","Human Resources","Information Technology","Legal",
  "Business Development","Customer Service","Product Management",
  "Design","Research","Education","Medical & Health",
]


const EMPTY_FILTERS: LushaSearchFilters = {
  jobTitles: "", seniority: "", departments: "",
  hasEmail: false, hasPhone: false, hasMobilePhone: false,
  searchText: "", country: "", state: "", city: "",
  companyName: "", companyDomain: "", companySize: "",
  technologies: "", companyCountry: "",
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProspectingPage() {
  const supabase = createClient()

  const [filters, setFilters] = useState<LushaSearchFilters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<LushaContact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isMock, setIsMock] = useState(false)
  const [lushaError, setLushaError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Per-card state
  const [fetchingEmail, setFetchingEmail] = useState<Record<string, boolean>>({})
  const [revealedEmails, setRevealedEmails] = useState<Record<string, string>>({})
  const [addingToBoard, setAddingToBoard] = useState<Record<string, boolean>>({})
  const [addedToBoard, setAddedToBoard] = useState<Set<string>>(new Set())
  const [emailError, setEmailError] = useState<Record<string, string>>({})
  const [emailCredits, setEmailCredits] = useState<number | null>(null)
  const [searchCredits, setSearchCredits] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      supabase.from("credit_usage").select("amount,type").eq("user_id", user.id).gte("created_at", monthStart)
        .then(({ data }) => {
          const rows = data ?? []
          setEmailCredits(rows.filter((r) => r.type === "lusha_email").reduce((s, r) => s + r.amount, 0))
          setSearchCredits(rows.filter((r) => r.type === "lusha_search").reduce((s, r) => s + r.amount, 0))
        })
    })
  }, [])

  const set = (key: keyof LushaSearchFilters, value: unknown) =>
    setFilters((f) => ({ ...f, [key]: value }))

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "page" && v !== "" && v !== false && v !== undefined
  ).length

  const search = useCallback(async (p = 1) => {
    setSearching(true)
    setError(null)
    setHasSearched(true)
    try {
      const res = await fetch("/api/lusha/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, page: p }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.contacts ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setIsMock(!!data.mock)
      setLushaError(data.lushaError ?? null)
      setCurrentRequestId(data.requestId ?? null)
      if (!data.mock) setSearchCredits((c) => (c ?? 0) + 1)
      setRevealedEmails({})
      setAddedToBoard(new Set())
      setEmailError({})
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }, [filters])

  async function handleGetEmail(contact: LushaContact) {
    setFetchingEmail((prev) => ({ ...prev, [contact.lushaId]: true }))
    setEmailError((prev) => { const n = { ...prev }; delete n[contact.lushaId]; return n })
    try {
      const res = await fetch("/api/lusha/get-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lushaPersonId: contact.lushaId,
          prospectData: contact,
          requestId: contact.requestId ?? currentRequestId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRevealedEmails((prev) => ({ ...prev, [contact.lushaId]: data.email }))
      if (!data.mock) setEmailCredits((c) => (c ?? 0) + 1)
    } catch (e) {
      setEmailError((prev) => ({ ...prev, [contact.lushaId]: (e as Error).message }))
    } finally {
      setFetchingEmail((prev) => ({ ...prev, [contact.lushaId]: false }))
    }
  }

  async function handleAddToLeadboard(contact: LushaContact) {
    const email = revealedEmails[contact.lushaId]
    if (!email) return
    setAddingToBoard((prev) => ({ ...prev, [contact.lushaId]: true }))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prospect } = await supabase.from("prospects").insert({
        user_id: user.id,
        lusha_id: contact.lushaId,
        full_name: contact.fullName,
        company: contact.company ?? null,
        position: contact.position ?? null,
        industry: contact.industry ?? null,
        location: contact.location ?? null,
        email,
        email_fetched_at: new Date().toISOString(),
        credits_used: 1,
        added_to_leadboard: true,
      }).select("id").single()

      await supabase.from("leadboard").insert({
        user_id: user.id,
        prospect_id: prospect?.id ?? null,
        full_name: contact.fullName,
        company: contact.company ?? null,
        position: contact.position ?? null,
        email,
        status: "new",
        relevance_score: 0,
      })

      setAddedToBoard((prev) => new Set([...prev, contact.lushaId]))
    } catch (e) {
      console.error("Add to leadboard error:", e)
    } finally {
      setAddingToBoard((prev) => ({ ...prev, [contact.lushaId]: false }))
    }
  }

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Prospecting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Search Lusha's 100M+ B2B contact database</p>
        </div>
        <div className="flex items-center gap-3">
          {(searchCredits !== null || emailCredits !== null) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>
                <b>{(searchCredits ?? 0) + (emailCredits ?? 0)}</b> credits this month
                {" "}
                <span className="text-xs opacity-70">({searchCredits ?? 0} search · {emailCredits ?? 0} email)</span>
              </span>
            </div>
          )}
          {isMock && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
              Demo mode
            </Badge>
          )}
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isMock && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3.5 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">⚠️ DEMO MODE — Lusha API not connected. Results below are fictional.</p>
            {lushaError && <p className="text-xs opacity-70 font-mono break-all">Error: {lushaError}</p>}
          </div>
          <a href="/settings" className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            Settings → API Keys →
          </a>
        </div>
      )}

      {/* ── Filters Panel ──────────────────────────────────────────────────────── */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Search Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="text-xs h-5 px-1.5">{activeFilterCount} active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setFilters(EMPTY_FILTERS) }}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
            {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 pt-1 space-y-5 border-t">

            {/* ── Person ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Person</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Job Title(s)</Label>
                  <FilterCombobox
                    options={COMMON_JOB_TITLES}
                    value={filters.jobTitles ?? ""}
                    onChange={(v) => set("jobTitles", v)}
                    placeholder="CMO, VP Marketing, …"
                    multi
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Seniority</Label>
                  <Select value={filters.seniority ?? ""} onValueChange={(v) => set("seniority", v === "any" ? "" : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any seniority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any seniority</SelectItem>
                      {SENIORITY_LEVELS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Department</Label>
                  <FilterCombobox
                    options={DEPARTMENTS}
                    value={filters.departments ?? ""}
                    onChange={(v) => set("departments", v)}
                    placeholder="Any department"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 lg:col-span-3">
                  <Label className="text-xs">Free-text search</Label>
                  <Input className="h-8 text-sm" placeholder="Search across name, company, keywords…" value={filters.searchText ?? ""} onChange={(e) => set("searchText", e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={!!filters.hasEmail} onCheckedChange={(v) => set("hasEmail", !!v)} />
                  <span className="text-xs text-muted-foreground">Has work email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={!!filters.hasPhone} onCheckedChange={(v) => set("hasPhone", !!v)} />
                  <span className="text-xs text-muted-foreground">Has phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={!!filters.hasMobilePhone} onCheckedChange={(v) => set("hasMobilePhone", !!v)} />
                  <span className="text-xs text-muted-foreground">Has mobile phone</span>
                </label>
              </div>
            </div>

            <Separator />

            {/* ── Person Location ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Person Location</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <FilterCombobox
                    options={COUNTRIES}
                    value={filters.country ?? ""}
                    onChange={(v) => set("country", v)}
                    placeholder="e.g. United States"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State / Region</Label>
                  <Input className="h-8 text-sm" placeholder="e.g. New York" value={filters.state ?? ""} onChange={(e) => set("state", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input className="h-8 text-sm" placeholder="e.g. Manhattan" value={filters.city ?? ""} onChange={(e) => set("city", e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Company ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name(s)</Label>
                  <Input className="h-8 text-sm" placeholder="Google, Salesforce, … (comma-separated)" value={filters.companyName ?? ""} onChange={(e) => set("companyName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Domain(s)</Label>
                  <Input className="h-8 text-sm" placeholder="google.com, salesforce.com, …" value={filters.companyDomain ?? ""} onChange={(e) => set("companyDomain", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Size</Label>
                  <Select value={filters.companySize ?? ""} onValueChange={(v) => set("companySize", v === "any" ? "" : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any size</SelectItem>
                      {COMPANY_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Technologies Used</Label>
                  <FilterCombobox
                    options={COMMON_TECHNOLOGIES}
                    value={filters.technologies ?? ""}
                    onChange={(v) => set("technologies", v)}
                    placeholder="React, AWS, Salesforce, …"
                    multi
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Country</Label>
                  <FilterCombobox
                    options={COUNTRIES}
                    value={filters.companyCountry ?? ""}
                    onChange={(v) => set("companyCountry", v)}
                    placeholder="e.g. Japan"
                  />
                </div>
              </div>
            </div>

            {/* Search button */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">At least one filter is required to search</p>
              <Button onClick={() => search(1)} disabled={searching} className="gap-2 px-6">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? "Searching…" : "Search Lusha"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {hasSearched && !searching && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total > 0 ? (
                <><b className="text-foreground">{total.toLocaleString()}</b> contacts found — page {page} of {totalPages.toLocaleString()}</>
              ) : "No contacts found for these filters"}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => search(page - 1)} className="h-7 gap-1 px-2 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">{page.toLocaleString()} / {totalPages.toLocaleString()}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => search(page + 1)} className="h-7 gap-1 px-2 text-xs">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((contact) => {
              const email  = revealedEmails[contact.lushaId]
              const fetching = fetchingEmail[contact.lushaId]
              const adding   = addingToBoard[contact.lushaId]
              const added    = addedToBoard.has(contact.lushaId)
              const err      = emailError[contact.lushaId]

              return (
                <Card key={contact.lushaId} className="flex flex-col">
                  <CardContent className="pt-4 pb-4 flex flex-col gap-3 h-full">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        {contact.logoUrl && <AvatarImage src={contact.logoUrl} alt={contact.company ?? ""} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials(contact.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground leading-tight">{contact.fullName}</p>
                        {contact.position && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{contact.position}</p>
                        )}
                        {contact.company && (
                          <p className="text-xs text-foreground/70 truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {contact.company}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-1.5">
                      {contact.domain && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto font-normal">
                          <Globe className="h-2.5 w-2.5 mr-1" />{contact.domain}
                        </Badge>
                      )}
                      {contact.industry && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                          <Briefcase className="h-2.5 w-2.5 mr-1" />{contact.industry}
                        </Badge>
                      )}
                      {contact.location && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                          <MapPin className="h-2.5 w-2.5 mr-1" />{contact.location}
                        </Badge>
                      )}
                    </div>

                    {/* Data availability indicators */}
                    <div className="flex gap-2">
                      {contact.hasWorkEmail && (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded px-1.5 py-0.5">
                          <Mail className="h-3 w-3" /> Email
                        </span>
                      )}
                      {contact.hasPhone && (
                        <span className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-1.5 py-0.5">
                          <Phone className="h-3 w-3" /> Phone
                        </span>
                      )}
                    </div>

                    {/* Email section */}
                    <div className="mt-auto space-y-2">
                      {email ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate font-medium">{email}</span>
                          </div>
                          {added ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 justify-center py-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Added to Leadboard
                            </div>
                          ) : (
                            <Button size="sm" className="w-full h-7 text-xs gap-1.5" onClick={() => handleAddToLeadboard(contact)} disabled={adding}>
                              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                              Add to Leadboard
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {err && <p className="text-xs text-destructive text-center">{err}</p>}
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" onClick={() => handleGetEmail(contact)} disabled={fetching}>
                            {fetching ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Fetching…</>
                            ) : (
                              <><Zap className="h-3.5 w-3.5 text-amber-500" />Get Email (1 credit)</>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => search(page - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => search(page + 1)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {!hasSearched && !searching && (
        <div className="text-center py-24 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">Set your filters and search</p>
          <p className="text-sm mt-1">Results will appear here — name, company, and position only until you reveal emails</p>
        </div>
      )}

      {searching && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Searching Lusha database…</span>
        </div>
      )}
    </div>
  )
}
