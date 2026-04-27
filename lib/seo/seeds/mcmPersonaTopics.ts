/**
 * MCM Persona → Primary Topic Mapping
 *
 * This mapping is MCM-workspace-only. It controls which content topics
 * are shown to the user after selecting a target persona in the Create Content flow.
 *
 * Only primary topics are shown. Secondary/all topics are NOT displayed.
 */

// Mapping: persona ID → array of topic IDs (e.g. mcm-t01)
export const MCM_PERSONA_TOPIC_MAP: Record<string, string[]> = {
  'mcm-p01': ['mcm-t01','mcm-t02','mcm-t03','mcm-t04','mcm-t05','mcm-t06','mcm-t07','mcm-t08'],
  'mcm-p02': ['mcm-t03','mcm-t09','mcm-t10','mcm-t11','mcm-t12','mcm-t14','mcm-t15','mcm-t16','mcm-t17','mcm-t18','mcm-t19','mcm-t20'],
  'mcm-p03': ['mcm-t08','mcm-t30','mcm-t31','mcm-t32','mcm-t33','mcm-t34','mcm-t35','mcm-t36','mcm-t37','mcm-t38'],
  'mcm-p04': ['mcm-t10','mcm-t39','mcm-t40','mcm-t41','mcm-t46','mcm-t49'],
  'mcm-p05': ['mcm-t08','mcm-t34','mcm-t36','mcm-t37','mcm-t38','mcm-t41','mcm-t50','mcm-t51','mcm-t52','mcm-t53'],
  'mcm-p06': ['mcm-t09','mcm-t10','mcm-t13','mcm-t30','mcm-t31','mcm-t32','mcm-t33','mcm-t39','mcm-t40','mcm-t60'],
  'mcm-p07': ['mcm-t11','mcm-t12','mcm-t42','mcm-t43','mcm-t44','mcm-t45','mcm-t46','mcm-t49'],
  'mcm-p08': ['mcm-t10','mcm-t14','mcm-t17','mcm-t18','mcm-t19','mcm-t24','mcm-t25','mcm-t26','mcm-t27','mcm-t29','mcm-t30','mcm-t32'],
  'mcm-p09': ['mcm-t11','mcm-t12','mcm-t13','mcm-t15','mcm-t16','mcm-t21','mcm-t22','mcm-t23','mcm-t46','mcm-t59','mcm-t60'],
  'mcm-p10': ['mcm-t13','mcm-t15','mcm-t16','mcm-t20','mcm-t21','mcm-t22','mcm-t28','mcm-t52','mcm-t54','mcm-t57','mcm-t58','mcm-t59'],
  'mcm-p11': ['mcm-t10','mcm-t12','mcm-t13','mcm-t23','mcm-t24','mcm-t27','mcm-t33','mcm-t36','mcm-t38','mcm-t42','mcm-t45','mcm-t60'],
  'mcm-p12': ['mcm-t10','mcm-t11','mcm-t12','mcm-t21','mcm-t23','mcm-t25','mcm-t27','mcm-t42','mcm-t43','mcm-t46','mcm-t49','mcm-t60'],
  'mcm-p13': ['mcm-t14','mcm-t15','mcm-t16','mcm-t17','mcm-t19','mcm-t23','mcm-t24','mcm-t51','mcm-t56','mcm-t58'],
  'mcm-p14': ['mcm-t13','mcm-t15','mcm-t16','mcm-t20','mcm-t21','mcm-t22','mcm-t52','mcm-t54','mcm-t57','mcm-t58','mcm-t59'],
  'mcm-p15': ['mcm-t17','mcm-t18','mcm-t25','mcm-t26','mcm-t27','mcm-t30','mcm-t32','mcm-t47','mcm-t48','mcm-t49'],
  'mcm-p16': ['mcm-t14','mcm-t20','mcm-t28','mcm-t33','mcm-t36','mcm-t50','mcm-t55','mcm-t58','mcm-t59'],
  'mcm-p17': ['mcm-t14','mcm-t29','mcm-t30','mcm-t32','mcm-t36','mcm-t53','mcm-t58'],
  'mcm-p18': ['mcm-t11','mcm-t12','mcm-t25','mcm-t27','mcm-t42','mcm-t43','mcm-t45','mcm-t46','mcm-t47','mcm-t49'],
  'mcm-p19': ['mcm-t10','mcm-t11','mcm-t12','mcm-t27','mcm-t36','mcm-t37','mcm-t38','mcm-t39','mcm-t40','mcm-t41','mcm-t42','mcm-t46'],
  'mcm-p20': ['mcm-t10','mcm-t11','mcm-t13','mcm-t23','mcm-t24','mcm-t27','mcm-t30','mcm-t32','mcm-t33','mcm-t36','mcm-t38','mcm-t60'],
  'mcm-p21': ['mcm-t11','mcm-t12','mcm-t18','mcm-t23','mcm-t25','mcm-t26','mcm-t47','mcm-t48','mcm-t49','mcm-t56','mcm-t57'],
  'mcm-p22': ['mcm-t01','mcm-t02','mcm-t03','mcm-t08','mcm-t09','mcm-t10','mcm-t11','mcm-t12','mcm-t14','mcm-t30','mcm-t31','mcm-t39','mcm-t40','mcm-t46','mcm-t49'],
  'mcm-p23': ['mcm-t11','mcm-t12','mcm-t23','mcm-t25','mcm-t27','mcm-t45','mcm-t46','mcm-t49','mcm-t56'],
  'mcm-p24': ['mcm-t10','mcm-t12','mcm-t24','mcm-t27','mcm-t39','mcm-t40','mcm-t41','mcm-t46','mcm-t49'],
  'mcm-p25': ['mcm-t08','mcm-t09','mcm-t15','mcm-t16','mcm-t17','mcm-t18','mcm-t19','mcm-t20','mcm-t30','mcm-t33','mcm-t34','mcm-t36','mcm-t39','mcm-t41'],
};

/**
 * Get allowed topic IDs for a persona in the MCM workspace.
 * Returns empty array if persona has no mapping (will show "no topics" message).
 */
export function getMCMAllowedTopicIds(personaId: string): string[] {
  return MCM_PERSONA_TOPIC_MAP[personaId] ?? [];
}
