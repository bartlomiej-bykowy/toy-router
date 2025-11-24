export function scrollToElement(hash: string): void {
  const hashValue = hash.startsWith("#") ? hash.slice(1) : hash;
  const element = document.getElementById(hashValue);
  element?.scrollIntoView({ behavior: "smooth" });
}
