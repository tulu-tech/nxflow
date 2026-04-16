import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { leadIds, directive } = await req.json()

  if (!leadIds?.length) return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 })
  if (!directive?.trim()) return NextResponse.json({ error: "No scoring directive provided" }, { status: 400 })

  const { data: leads, error: leadsError } = await supabase
    .from("leadboard")
    .select("id, full_name, company, position, email, industry")
    .in("id", leadIds)
    .eq("user_id", user.id)

  if (leadsError || !leads?.length) {
    return NextResponse.json({ error: "Leads not found" }, { status: 404 })
  }

  const leadsJson = JSON.stringify(
    leads.map((l) => ({
      id: l.id,
      full_name: l.full_name,
      company: l.company ?? "Unknown",
      position: l.position ?? "Unknown",
      email: l.email,
    })),
    null,
    2
  )

  const prompt = `You are a B2B lead relevance scoring assistant for a marketing agency called Alba Collective.

The user's scoring directive is:
"${directive}"

Score each of the following leads from 0 to 100 based on how well they match the directive. Higher score = better match.

Rules:
- Analyze the lead's name, company, position, and email domain
- Apply the directive strictly
- Provide a brief, specific reason in Turkish or English (max 20 words)

Return ONLY a JSON array (no markdown, no explanation outside the array):
[{"id": "uuid-here", "score": 85, "reason": "Short reason here"}]

Leads to score:
${leadsJson}`

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = res.content[0].type === "text" ? res.content[0].text : "[]"

  let scores: { id: string; score: number; reason: string }[] = []
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    scores = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
  }

  // Write scores back
  const updates = scores.map((s) =>
    supabase
      .from("leadboard")
      .update({ relevance_score: Math.round(Math.max(0, Math.min(100, s.score))), scoring_reason: s.reason })
      .eq("id", s.id)
      .eq("user_id", user.id)
  )
  await Promise.all(updates)

  // Log Claude token usage
  const tokens = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0)
  await supabase.from("credit_usage").insert({
    user_id: user.id,
    type: "claude_tokens",
    amount: tokens,
    metadata: { leads_scored: leadIds.length, directive: directive.slice(0, 100) },
  })

  return NextResponse.json({ scores, tokens })
}
