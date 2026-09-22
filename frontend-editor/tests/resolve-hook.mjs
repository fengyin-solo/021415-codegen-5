// Test-only ESM resolve hook: the app source uses extensionless relative
// imports (resolved by Vite at build time); teach plain Node to do the same
// so the pure preference modules can be unit-tested without bundling.
export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
  const hasExt = /\.[a-zA-Z0-9]+($|\?)/.test(specifier)
  if (isRelative && !hasExt) {
    try {
      return await nextResolve(`${specifier}.js`, context)
    } catch {
      // fall through to default error
    }
  }
  return nextResolve(specifier, context)
}
