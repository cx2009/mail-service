import { welcomeTemplate } from "./welcome";
import type { EmailContent } from "./welcome";

export type RenderedEmail = EmailContent;
export type TemplateFn = (data: Record<string, unknown>) => EmailContent;

const templates: Record<string, TemplateFn> = {
  welcome: welcomeTemplate,
};

export function renderTemplate(
  name: string,
  data: Record<string, unknown>,
): RenderedEmail | null {
  const fn = templates[name];
  if (fn === undefined) return null;
  return fn(data);
}

export function listTemplates(): string[] {
  return Object.keys(templates);
}