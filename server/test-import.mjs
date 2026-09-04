try {
  const mod = await import('./src/modules/manuscripts/files.service.js')
  console.log('imported OK, functions:', Object.keys(mod))
} catch (e) {
  console.log('import failed:', e.message)
}
