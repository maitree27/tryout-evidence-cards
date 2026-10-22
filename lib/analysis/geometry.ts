export const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const std = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
export const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));

/** Trapezoid score: 0 at/below a, rises to 100 at b, stays 100 until c, falls to 0 at d. */
export function trapezoid(x: number, a: number, b: number, c: number, d: number) {
  if (x <= a || x >= d) return 0;
  if (x < b) return ((x - a) / (b - a)) * 100;
  if (x <= c) return 100;
  return ((d - x) / (d - c)) * 100;
}

/** Score for "within [lo, hi] is ideal, falling to 0 `tol` outside it". */
export const rangeScore = (x: number, lo: number, hi: number, tol: number) =>
  trapezoid(x, lo - tol, lo, hi, hi + tol);

/** Moving average with a 3-sample window. */
export function smooth3(xs: number[]) {
  return xs.map((_, i) => {
    const w = xs.slice(Math.max(0, i - 1), i + 2);
    return mean(w);
  });
}
