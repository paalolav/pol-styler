export function parseAllowedCssHosts(allowedHosts?: string): string[] {
  if (!allowedHosts) return [];

  const origins = allowedHosts
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(entry) ? entry : `https://${entry}`;

      try {
        const url = new URL(withScheme);
        if (url.protocol !== 'https:' || url.username || url.password) return undefined;
        return url.origin;
      } catch {
        return undefined;
      }
    })
    .filter((origin): origin is string => origin !== undefined);

  return Array.from(new Set(origins));
}

export function resolveCssUrl(
  cssFilePath: string,
  pageOrigin: string,
  allowedHosts?: string
): string {
  const trimmedPath = (cssFilePath || '').trim();
  if (!trimmedPath) throw new Error('No CSS file path is configured.');

  let base: URL;
  let resolved: URL;
  try {
    base = new URL(pageOrigin);
    resolved = new URL(trimmedPath, `${base.origin}/`);
  } catch {
    throw new Error('The CSS file path is not a valid URL.');
  }

  if (resolved.protocol !== 'https:') {
    throw new Error('Only HTTPS CSS sources are allowed.');
  }
  if (resolved.username || resolved.password) {
    throw new Error('CSS source URLs must not contain credentials.');
  }
  if (!/\.css$/i.test(resolved.pathname)) {
    throw new Error('The CSS source path must end in .css.');
  }

  const permittedOrigins = [base.origin].concat(parseAllowedCssHosts(allowedHosts));
  if (permittedOrigins.indexOf(resolved.origin) === -1) {
    throw new Error(`"${resolved.origin}" is not an allowed CSS host.`);
  }

  return resolved.href;
}
