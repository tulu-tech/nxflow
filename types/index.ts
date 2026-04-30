export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  theme: "light" | "dark"
  lusha_api_key?: string
  mailchimp_api_key?: string
  mailchimp_server_prefix?: string
  updated_at?: string
}

export interface Prospect {
  id: string
  user_id: string
  lusha_id?: string
  full_name: string
  company?: string
  position?: string
  industry?: string
  location?: string
  linkedin_url?: string
  email?: string
  email_fetched_at?: string
  credits_used: number
  added_to_leadboard: boolean
  created_at: string
}

export interface LeadboardEntry {
  id: string
  user_id: string
  prospect_id?: string
  full_name: string
  company?: string
  position?: string
  email: string
  phone?: string | null
  relevance_score: number
  scoring_reason?: string
  status: LeadStatus
  notes?: string
  last_contacted_at?: string
  group_id?: string | null
  created_at: string
}

export type LeadStatus = "new" | "contacted" | "replied" | "converted" | "rejected"

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  contacted: { label: "Contacted", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  replied: { label: "Replied", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  converted: { label: "Converted", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
}

export interface ScoringRule {
  id: string
  user_id: string
  directive: string
  is_active: boolean
  created_at: string
}

export type CreditType = "lusha_search" | "lusha_email" | "lusha_phone" | "claude_tokens" | "mailchimp_send"

export interface CreditUsage {
  id: string
  user_id: string
  type: CreditType
  amount: number
  metadata?: Record<string, unknown>
  created_at: string
}

export interface EmailCampaign {
  id: string
  user_id: string
  name: string
  subject?: string
  body?: string
  mailchimp_campaign_id?: string
  status: "draft" | "sent" | "scheduled"
  recipient_count: number
  sent_at?: string
  created_at: string
}

export interface ResponseRule {
  id: string
  user_id: string
  rule_name: string
  keywords: string[]
  claude_prompt: string
  auto_send: boolean
  is_active: boolean
  created_at: string
}

export interface GmailToken {
  id: string
  user_id: string
  access_token: string
  refresh_token?: string
  expires_at?: string
  email?: string
  updated_at: string
}

// Lusha search result (before email reveal)
export interface LushaContact {
  lushaId: string
  personId?: number
  requestId?: string
  fullName: string
  company?: string
  companyId?: number
  position?: string
  industry?: string
  location?: string
  domain?: string
  logoUrl?: string
  hasWorkEmail?: boolean
  hasPhone?: boolean
  hasMobilePhone?: boolean
}

// Lusha search filters — verified supported by Lusha Prospecting API
export interface LushaSearchFilters {
  // Contact filters
  jobTitles?: string      // comma-separated → array
  seniority?: string      // single level → numeric
  departments?: string    // single department
  hasEmail?: boolean
  hasPhone?: boolean
  hasMobilePhone?: boolean
  searchText?: string

  // Contact location
  country?: string
  state?: string
  city?: string

  // Company filters
  companyName?: string    // comma-separated
  companyDomain?: string  // comma-separated
  companySize?: string
  technologies?: string   // comma-separated
  companyCountry?: string

  page?: number
}

// Matched email from Gmail scan
export interface MatchedEmail {
  messageId: string
  subject: string
  from: string
  snippet: string
  body: string
  matchedRuleId: string
  matchedRuleName: string
  matchedKeywords: string[]
}
