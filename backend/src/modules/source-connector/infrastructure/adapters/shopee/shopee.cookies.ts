import * as fs from 'fs';

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Reads and normalizes Shopee cookies from a file.
 * Supports three export formats:
 *   1. Standard array:   [{ name, value, domain, ... }, ...]
 *   2. Wrapped object:   { cookies: [...] }
 *   3. Key-value map:    { cookieName: "cookieValue", ... }  (e.g. EditThisCookie export)
 */
export function readShopeeCookies(filePath: string): PlaywrightCookie[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Shopee cookie file not found: ${filePath}. Log in to affiliate.shopee.vn and export cookies.`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
  type RawCookie = Record<string, unknown>;
  let rawCookies: RawCookie[];

  if (Array.isArray(parsed)) {
    rawCookies = parsed as RawCookie[];
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as RawCookie).cookies)) {
    rawCookies = (parsed as RawCookie).cookies as RawCookie[];
  } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    rawCookies = Object.entries(parsed as Record<string, string>).map(([name, value]) => ({
      name,
      value: String(value),
      domain: '.shopee.vn',
      path: '/',
    }));
  } else {
    throw new Error(`Shopee cookie file format not recognized (found: ${typeof parsed})`);
  }

  return rawCookies.map((c) => ({
    name: c.name as string,
    value: c.value as string,
    domain: (c.domain as string | undefined) ?? '.shopee.vn',
    path: (c.path as string | undefined) ?? '/',
    httpOnly: c.httpOnly as boolean | undefined,
    secure: c.secure as boolean | undefined,
    sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
  }));
}
