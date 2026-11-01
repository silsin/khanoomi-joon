/** Whether virtual try-on (پرو مجازی) is visible on the storefront. */
export function isTryonEnabled(value: string | undefined | null): boolean {
  return value !== "0";
}

export function filterTryonNavLinks<T extends { href: string; children?: T[] }>(links: T[], enabled: boolean): T[] {
  if (enabled) return links;
  const out: T[] = [];
  for (const l of links) {
    const children = Array.isArray(l.children)
      ? l.children.filter(c => !c.href.startsWith("/tryon"))
      : undefined;
    // Drop a parent whose only purpose was a tryon branch.
    if (l.href.startsWith("/tryon") && (!children || children.length === 0)) continue;
    out.push(children !== undefined && children !== l.children ? { ...l, children } : l);
  }
  return out;
}
