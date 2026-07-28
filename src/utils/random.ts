/**
 * Return an unbiased cryptographically secure integer in the inclusive range.
 */
export function secureRandomInt(min: number, max: number): number {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  const range = upper - lower + 1

  if (!Number.isSafeInteger(lower) || !Number.isSafeInteger(upper) || range <= 0) {
    throw new RangeError('Invalid random integer range')
  }
  if (range > 0x1_0000_0000) {
    throw new RangeError('Random integer range is too large')
  }

  const limit = Math.floor(0x1_0000_0000 / range) * range
  const values = new Uint32Array(1)
  do {
    crypto.getRandomValues(values)
  } while (values[0] >= limit)

  return lower + (values[0] % range)
}
