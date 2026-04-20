let config;

try {
  config = await import('./local.js');
} catch {
  config = await import('./hostinger.js');
}

export const { CLIENT_BASE_URL, API_BASE_URL } = config;