/**
 * HOMC Persona → Primary Topic Mapping
 *
 * This mapping is HOMC-workspace-only. It controls which content topics
 * are shown to the user after selecting a target persona in the Create Content flow.
 *
 * Only primary topics are shown. Secondary/all topics are NOT displayed.
 */

// Mapping: persona ID → array of topic IDs (e.g. homc-t01)
export const HOMC_PERSONA_TOPIC_MAP: Record<string, string[]> = {
  // Persona 1 — Bay Area Try-Before-Buy Showroom Shopper
  'homc-p01': ['homc-t01','homc-t02','homc-t03','homc-t04','homc-t05','homc-t06'],
  // Persona 2 — AI Best Massage Chair Recommendation Seeker
  'homc-p02': ['homc-t07','homc-t08','homc-t09','homc-t10','homc-t11','homc-t12'],
  // Persona 3 — Brand Comparison Researcher
  'homc-p03': ['homc-t13','homc-t14','homc-t15','homc-t16','homc-t17','homc-t18','homc-t19'],
  // Persona 4 — Osaki High-Intent Buyer
  'homc-p04': ['homc-t20','homc-t21','homc-t22','homc-t23','homc-t24','homc-t25'],
  // Persona 5 — High-Intent Brand & Model Review Buyer
  'homc-p05': ['homc-t26','homc-t27','homc-t28','homc-t29','homc-t30','homc-t31','homc-t32','homc-t33','homc-t34'],
  // Persona 6 — Price, Value & Financing Evaluator
  'homc-p06': ['homc-t35','homc-t36','homc-t37','homc-t38','homc-t39','homc-t40'],
  // Persona 7 — Zero Gravity & Full-Body Feature Shopper
  'homc-p07': ['homc-t41','homc-t42','homc-t43','homc-t44','homc-t45','homc-t46'],
  // Persona 8 — Back, Neck & Daily Comfort Seeker
  'homc-p08': ['homc-t47','homc-t48','homc-t49','homc-t50','homc-t51','homc-t52'],
  // Persona 9 — Online vs Showroom Risk-Reduction Buyer
  'homc-p09': ['homc-t53','homc-t54','homc-t55','homc-t56','homc-t57','homc-t58'],
  // Persona 10 — Premium Home Wellness / Executive Self-Care Buyer
  'homc-p10': ['homc-t59','homc-t60','homc-t61','homc-t62','homc-t63','homc-t64'],
};

/**
 * Get allowed topic IDs for a persona in the HOMC workspace.
 * Returns empty array if persona has no mapping (will show "no topics" message).
 */
export function getHOMCAllowedTopicIds(personaId: string): string[] {
  return HOMC_PERSONA_TOPIC_MAP[personaId] ?? [];
}
