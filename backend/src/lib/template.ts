import { BadRequestError } from "./errors.js";

/**
 * Pure helpers for message templates. No Prisma import so they can be unit
 * tested without a database.
 *
 * Why variable values are restricted: an admin approves the *shape* of a
 * template ("Your code is {{code}}"). If variables could carry arbitrary text,
 * an approved template becomes a free-form channel — a company could render
 * "Your code is expired, verify at http://evil.example" and it would arrive as
 * a verified message. So variable values must be short, single-line, and may
 * not contain links. Anything that needs a link must be in the approved body.
 */

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export const MAX_VARIABLE_LENGTH = 64;

// Catches scheme URLs, www. hosts, and bare domains like "evil.co/x" or "bit.ly".
const LINK_RE =
  /(?:[a-z][a-z0-9+.-]*:\/\/)|(?:\bwww\.)|(?:\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/:?#]|\b))/i;

/** Pulls `{{placeholder}}` tokens out of a template body (deduplicated, in order). */
export function extractPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(PLACEHOLDER_RE)) found.add(m[1]);
  return [...found];
}

/** Returns a reason string if the value is not allowed, otherwise null. */
export function checkVariableValue(value: string): string | null {
  if (value.length > MAX_VARIABLE_LENGTH) return `longer than ${MAX_VARIABLE_LENGTH} characters`;
  if (/[\r\n]/.test(value)) return "contains a line break";
  if (/\{\{|\}\}/.test(value)) return "contains template braces";
  if (LINK_RE.test(value)) return "contains a link or domain";
  return null;
}

/**
 * Renders an approved template body. Throws BadRequestError if a declared
 * placeholder is missing or a value fails `checkVariableValue`, so we never
 * deliver unresolved `{{…}}` text or unreviewed content.
 */
export function renderBody(body: string, declared: string[], vars: Record<string, string>): string {
  const missing = declared.filter((p) => !Object.hasOwn(vars, p));
  if (missing.length) throw new BadRequestError(`Missing template variables: ${missing.join(", ")}`);

  const invalid: { name: string; reason: string }[] = [];
  for (const name of declared) {
    const reason = checkVariableValue(vars[name]);
    if (reason) invalid.push({ name, reason });
  }
  if (invalid.length) {
    throw new BadRequestError(
      `Invalid template variables: ${invalid.map((i) => `${i.name} (${i.reason})`).join(", ")}`,
      { invalid },
    );
  }

  return body.replace(PLACEHOLDER_RE, (_full, key: string) => (Object.hasOwn(vars, key) ? vars[key] : ""));
}
