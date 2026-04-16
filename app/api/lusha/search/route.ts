import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Lusha company size ranges → object format
const COMPANY_SIZE_MAP: Record<string, { from: number; to?: number }> = {
  "1-10":      { from: 1,    to: 10 },
  "11-50":     { from: 11,   to: 50 },
  "51-200":    { from: 51,   to: 200 },
  "201-500":   { from: 201,  to: 500 },
  "501-1000":  { from: 501,  to: 1000 },
  "1001-5000": { from: 1001, to: 5000 },
  "5001-10000":{ from: 5001, to: 10000 },
  "10000+":    { from: 10001 },
}

// Lusha numeric seniority levels
const SENIORITY_MAP: Record<string, number> = {
  "C-Level":   6,
  "VP":        5,
  "Director":  4,
  "Manager":   3,
  "Senior":    2,
  "Mid-Level": 2,
  "Entry":     1,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("lusha_api_key")
    .eq("id", user.id)
    .single()

  if (!profile?.lusha_api_key) {
    return NextResponse.json(
      { error: "Lusha API key not configured. Please add it in Settings → API & Credits." },
      { status: 400 }
    )
  }

  const body = await req.json()
  const {
    // Contact filters (verified supported by Lusha API)
    jobTitles,
    seniority,
    departments,
    hasEmail,
    hasPhone,
    hasMobilePhone,
    searchText,
    // Contact location
    country, state, city,
    // Company filters (verified supported by Lusha API)
    companyName, companyDomain,
    companySize,
    technologies,
    companyCountry,
    page = 1,
  } = body

  // ── Contact filters ─────────────────────────────────────────────────────────
  const contactInclude: Record<string, unknown> = {}

  if (jobTitles?.trim()) {
    contactInclude.jobTitles = jobTitles.split(",").map((s: string) => s.trim()).filter(Boolean)
  }

  // Seniority → numeric array
  if (seniority && SENIORITY_MAP[seniority]) {
    contactInclude.seniority = [SENIORITY_MAP[seniority]]
  }

  // Departments
  const deptValues = Array.isArray(departments)
    ? departments
    : departments?.trim() ? [departments.trim()] : []
  if (deptValues.length > 0) contactInclude.departments = deptValues

  if (searchText?.trim()) contactInclude.searchText = searchText.trim()

  // Contact location
  const locationObj: Record<string, string> = {}
  if (country?.trim()) locationObj.country = country.trim()
  if (state?.trim())   locationObj.state   = state.trim()
  if (city?.trim())    locationObj.city    = city.trim()
  if (Object.keys(locationObj).length > 0) contactInclude.locations = [locationObj]

  // Existing data points
  const dataPoints: string[] = []
  if (hasEmail)       dataPoints.push("work_email")
  if (hasPhone)       dataPoints.push("phone")
  if (hasMobilePhone) dataPoints.push("mobile_phone")
  if (dataPoints.length > 0) contactInclude.existing_data_points = dataPoints

  // ── Company filters ─────────────────────────────────────────────────────────
  const companyInclude: Record<string, unknown> = {}

  if (companyName?.trim()) {
    companyInclude.names = companyName.split(",").map((s: string) => s.trim()).filter(Boolean)
  }
  if (companyDomain?.trim()) {
    companyInclude.domains = companyDomain.split(",").map((s: string) => s.trim()).filter(Boolean)
  }

  // NOTE: 'industries' is not supported by Lusha company filters — removed

  if (companySize && COMPANY_SIZE_MAP[companySize]) {
    companyInclude.sizes = [COMPANY_SIZE_MAP[companySize]]
  }
  if (technologies?.trim()) {
    companyInclude.technologies = technologies.split(",").map((s: string) => s.trim()).filter(Boolean)
  }
  if (companyCountry?.trim()) {
    companyInclude.locations = [{ country: companyCountry.trim() }]
  }

  // Only send filter blocks that have actual content
  const filtersPayload: Record<string, unknown> = {}
  if (Object.keys(contactInclude).length > 0) filtersPayload.contacts = { include: contactInclude }
  if (Object.keys(companyInclude).length > 0) filtersPayload.companies = { include: companyInclude }

  const searchBody = {
    filters: filtersPayload,
    pages: { page: page - 1, size: 25 }, // Lusha is 0-indexed, min size=10
  }

  const lushaFetch = () => fetch("https://api.lusha.com/prospecting/contact/search", {
    method: "POST",
    headers: { "x-api-key": profile.lusha_api_key, "Content-Type": "application/json" },
    body: JSON.stringify(searchBody),
  })

  try {
    let lushaRes = await lushaFetch()

    // Retry once on 5xx (intermittent server errors)
    if (lushaRes.status >= 500) {
      await new Promise((r) => setTimeout(r, 800))
      lushaRes = await lushaFetch()
    }

    if (!lushaRes.ok) {
      const errJson = await lushaRes.json().catch(() => null)
      const errText = errJson?.message ?? `HTTP ${lushaRes.status}`
      console.error("Lusha search error:", lushaRes.status, errText)
      return NextResponse.json(
        { error: `Lusha ${lushaRes.status}: ${errText}` },
        { status: 502 }
      )
    }

    const data = await lushaRes.json()
    const requestId: string = data.requestId ?? ""

    // Track search credit usage (1 credit per search regardless of page size)
    const creditsCharged = (data.billing?.creditsCharged as number) ?? 1
    await supabase.from("credit_usage").insert({
      user_id: user.id,
      type: "lusha_search",
      amount: creditsCharged,
      metadata: { requestId, page, resultsReturned: data.billing?.resultsReturned },
    })

    // ← KEY FIX: Lusha returns array in "data" field, not "contacts"
    const contacts = (data.data ?? []).map((p: Record<string, unknown>) => ({
      lushaId:      p.contactId as string,
      personId:     p.personId,
      requestId,
      fullName:     (p.name as string) ?? "",
      company:      p.companyName as string | undefined,
      companyId:    p.companyId,
      position:     p.jobTitle as string | undefined,
      domain:       p.fqdn as string | undefined,
      logoUrl:      p.logoUrl as string | undefined,
      hasWorkEmail: p.hasWorkEmail as boolean,
      hasPhone:     p.hasPhones as boolean,
      hasMobilePhone: p.hasMobilePhone as boolean,
      // These come from filters (not in response), kept for UI display
      location:     city || state || country || companyCountry || undefined,
    }))

    return NextResponse.json({ contacts, total: data.totalResults ?? contacts.length, requestId })

  } catch (err) {
    console.error("Lusha search network error:", err)
    const mockContacts = generateMockContacts(page)
    return NextResponse.json({ contacts: mockContacts, total: 250, mock: true, lushaError: String(err) })
  }
}

// ── Mock data fallback ──────────────────────────────────────────────────────
function generateMockContacts(page: number) {
  const firstNames = ["James","Wei","Sakura","Mei","Hiroshi","Yuna","Chen","Aiko","Liu","Kenji","Sophia","Marcus","Elena","David","Priya","Oliver","Yuki","Emma","Liang","Amara","Noah","Hana","Daniel","Jin","Nadia"]
  const lastNames  = ["Zhang","Kim","Nakamura","Chen","Park","Li","Wong","Anderson","Garcia","Smith","Tanaka","Lee","Johnson","Wang","Patel","Yamamoto","Brown","Nguyen","Sato","Williams","Liu","Suzuki","Davis","Choi","Ito"]
  const companies  = ["TechVentures Asia","Pacific Growth Co","Seoul Digital","Horizon Media","Wave Analytics","Momentum Labs","Zenith Solutions","Atlas Partners","Vertex Capital","Nexus Group"]
  const positions  = ["Head of Marketing","VP Growth","CMO","Director of BD","Senior Brand Manager","Marketing Manager","Growth Lead","Director of Marketing","Head of Partnerships","Brand Strategist"]

  const offset = (page - 1) * 25
  return Array.from({ length: 25 }, (_, i) => {
    const idx = (offset + i) % 25
    return {
      lushaId:   `mock-${offset + i + 1}`,
      requestId: `mock-req-${page}`,
      fullName:  `${firstNames[idx]} ${lastNames[idx]}`,
      company:   companies[i % companies.length],
      position:  positions[i % positions.length],
      hasWorkEmail: true,
      hasPhone: i % 2 === 0,
    }
  })
}
