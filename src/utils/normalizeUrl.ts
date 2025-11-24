export function normalizeUrl(url: string): string {
  return url.startsWith("/") ? url : "/" + url;
}
