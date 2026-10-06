const TOKENS = /([MmLlHhVvZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g

/**
 * Parses SVG path data made of `M L H V Z` commands (absolute or relative, with implicit repeats) into subpaths of
 * absolute `[x, y]` vertices. This covers both the full catalogs (`M x yL x y ... Z`) and the compact relative
 * encoding of the lite catalogs (`M x y l dx dy dx dy ... z`). Other commands are not used by the catalogs and are
 * ignored. A closing vertex that repeats a subpath's start is kept as written.
 */
export const getPathRings = (path: string): number[][][] => {
  const rings: number[][][] = []
  let ring: number[][] = []
  let command = ''
  let args: number[] = []
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  const flush = () => {
    const lower = command.toLowerCase()
    const relative = command === lower
    const arity = lower === 'm' || lower === 'l' ? 2 : lower === 'h' || lower === 'v' ? 1 : 0
    if (arity === 0) return
    for (let i = 0; i + arity <= args.length; i += arity) {
      if (lower === 'h') x = relative ? x + args[i] : args[i]
      else if (lower === 'v') y = relative ? y + args[i] : args[i]
      else {
        x = relative ? x + args[i] : args[i]
        y = relative ? y + args[i + 1] : args[i + 1]
      }
      if (lower === 'm' && i === 0) {
        if (ring.length) rings.push(ring)
        ring = []
        startX = x
        startY = y
      }
      ring.push([x, y])
    }
  }

  for (const match of path.matchAll(TOKENS)) {
    if (match[1] !== undefined) {
      flush()
      command = match[1]
      args = []
      if (command === 'Z' || command === 'z') {
        x = startX
        y = startY
      }
    } else {
      args.push(Number(match[2]))
    }
  }
  flush()
  if (ring.length) rings.push(ring)
  return rings
}
