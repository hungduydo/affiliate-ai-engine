/**
 * Replaces {{variableName}} placeholders in a template string with values from a data object.
 * Supported variables: {{name}}, {{description}}, {{price}}, {{commission}}, {{affiliateLink}}, etc.
 */
export function renderPrompt(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}
