/** WCAG relative luminance, used for text on user-selected club colors. */
export function luminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const n = parseInt(hex.slice(i, i + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function foreground(background: string) {
  const candidates = ["#14251d", "#ffffff", "#000000"];
  return (
    candidates.find((c) => contrastRatio(c, background) >= 4.5) || "#000000"
  );
}
