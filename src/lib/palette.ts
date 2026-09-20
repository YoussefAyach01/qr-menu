/** Accent colours an owner can pick. Every one has >= 4.5:1 contrast with white text (checked in tests). */
export const ACCENTS = [
  { id: 'teal', hex: '#0f766e', label: 'Teal' },
  { id: 'green', hex: '#166534', label: 'Green' },
  { id: 'blue', hex: '#1d4ed8', label: 'Blue' },
  { id: 'indigo', hex: '#4338ca', label: 'Indigo' },
  { id: 'plum', hex: '#86198f', label: 'Plum' },
  { id: 'red', hex: '#b91c1c', label: 'Red' },
  { id: 'orange', hex: '#a3410c', label: 'Rust' },
  { id: 'slate', hex: '#334155', label: 'Slate' },
] as const;

export const DEFAULT_ACCENT = ACCENTS[0].hex;

export function isAccent(hex: string): boolean {
  return ACCENTS.some((a) => a.hex === hex);
}
