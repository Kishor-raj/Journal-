export function requestLogger(req, res, next) {
  const start = Date.now()
  const safeUrl = req.originalUrl.replace(/token=[^&]+/g, 'token=***')
  res.on('finish', () => {
    const duration = Date.now() - start
    const id = req.id || '-'
    console.log(`[${id}] ${req.method} ${safeUrl} ${res.statusCode} ${duration}ms`)
  })
  next()
}
