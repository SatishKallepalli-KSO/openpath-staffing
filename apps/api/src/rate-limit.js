const buckets = new Map()

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

export function rateLimit({ max = 20, windowSec = 60, key } = {}) {
  return (req, res, next) => {
    const id = `${key || req.path}:${clientIp(req)}`
    const now = Date.now()
    const windowMs = windowSec * 1000
    const row = buckets.get(id) || { count: 0, start: now }
    if (now - row.start > windowMs) {
      row.count = 0
      row.start = now
    }
    row.count += 1
    buckets.set(id, row)
    if (row.count > max) {
      res.status(429).json({ detail: 'Too many attempts. Wait a minute and try again.' })
      return
    }
    next()
  }
}
