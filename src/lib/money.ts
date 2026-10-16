/**
 * Money helpers for the POS screens. The database holds whole rupees; screens add up in
 * integer paise to avoid float drift and convert back at the edges.
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}
