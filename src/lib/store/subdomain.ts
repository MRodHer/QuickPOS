/**
 * SPEC-SAAS-001: Subdomain Detection Utilities
 *
 * Utilities for detecting store from subdomain
 */

/**
 * Main domain configuration
 * Update these values based on your deployment
 */
export const DOMAIN_CONFIG = {
  // Main domain for store subdomains (e.g., acme.avierp.com)
  mainDomain: import.meta.env.VITE_MAIN_DOMAIN || 'avierp.com',

  // Custom base domains (for future multi-region support)
  baseDomains: [
    'avierp.com',
    'avierp.app',
    'localhost', // For local development
  ],

  // Reserved subdomains that cannot be used for stores
  reservedSubdomains: [
    'www',
    'api',
    'admin',
    'app',
    'dashboard',
    'mail',
    'email',
    'ftp',
    'ssh',
    'cdn',
    'static',
    'assets',
    'staging',
    'dev',
    'test',
    'demo',
    'blog',
    'docs',
    'help',
    'support',
    'status',
    'billing',
    'accounts',
    'auth',
    'login',
    'signup',
    'register',
    'portal',
    'secure',
    'vpn',
    'ns1',
    'ns2',
    'mx',
    'smtp',
    'pop',
    'imap',
  ],
};

/**
 * Extract subdomain information from current hostname
 */
export function extractSubdomainInfo(): {
  subdomain: string | null;
  isCustomDomain: boolean;
  isMainDomain: boolean;
  baseUrl: string;
} {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Local development handling
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      subdomain: null,
      isCustomDomain: false,
      isMainDomain: true,
      baseUrl: hostname,
    };
  }

  // IP address handling
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return {
      subdomain: null,
      isCustomDomain: false,
      isMainDomain: true,
      baseUrl: hostname,
    };
  }

  // Check if using a custom domain
  const isCustomDomain = !DOMAIN_CONFIG.baseDomains.some((domain) =>
    hostname.endsWith(`.${domain}`) || hostname === domain
  );

  if (isCustomDomain) {
    // Custom domain - no subdomain extraction
    return {
      subdomain: null,
      isCustomDomain: true,
      isMainDomain: false,
      baseUrl: hostname,
    };
  }

  // Check if on main domain (no subdomain)
  if (parts.length <= 2) {
    return {
      subdomain: null,
      isCustomDomain: false,
      isMainDomain: true,
      baseUrl: hostname,
    };
  }

  // Extract subdomain
  const subdomain = parts[0];
  const isReserved = DOMAIN_CONFIG.reservedSubdomains.includes(subdomain);

  return {
    subdomain: isReserved ? null : subdomain,
    isCustomDomain: false,
    isMainDomain: isReserved,
    baseUrl: hostname,
  };
}

/**
 * Get store slug from current URL
 */
export function getStoreSlug(): string | null {
  const { subdomain, isCustomDomain } = extractSubdomainInfo();

  if (isCustomDomain) {
    // For custom domains, store will be resolved by backend
    return null;
  }

  return subdomain;
}

/**
 * Check if current request is on the main domain
 */
export function isMainDomain(): boolean {
  return extractSubdomainInfo().isMainDomain;
}

/**
 * Check if current request is on a custom domain
 */
export function isCustomDomain(): boolean {
  return extractSubdomainInfo().isCustomDomain;
}

/**
 * Validate if a slug is valid for store creation
 */
export function validateStoreSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  // Check length
  if (slug.length < 3 || slug.length > 50) {
    return {
      valid: false,
      error: 'El slug debe tener entre 3 y 50 caracteres',
    };
  }

  // Check format (alphanumeric and hyphens only)
  const validFormat = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/i;
  if (!validFormat.test(slug)) {
    return {
      valid: false,
      error: 'El slug solo puede contener letras, números y guiones',
    };
  }

  // Check if reserved
  if (DOMAIN_CONFIG.reservedSubdomains.includes(slug.toLowerCase())) {
    return {
      valid: false,
      error: 'Este slug está reservado y no puede usarse',
    };
  }

  return { valid: true };
}

/**
 * Generate a valid slug from company name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .substring(0, 50);
}

/**
 * Build URL for a store
 */
export function buildStoreUrl(slug: string): string {
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';

  if (isMainDomain()) {
    return `${protocol}//${slug}.${DOMAIN_CONFIG.mainDomain}${port}`;
  }

  return window.location.origin;
}

/**
 * Parse store from custom domain via API call
 * This function returns the promise that should be called to resolve store by custom domain
 */
export function resolveStoreByCustomDomain(domain: string): Promise<string | null> {
  // This will be implemented with the API
  // For now, return the domain to be resolved
  return Promise.resolve(domain);
}

/**
 * Detect environment info for debugging
 */
export function getEnvironmentInfo(): {
  hostname: string;
  protocol: string;
  port: string;
  origin: string;
  subdomainInfo: ReturnType<typeof extractSubdomainInfo>;
} {
  return {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    port: window.location.port,
    origin: window.location.origin,
    subdomainInfo: extractSubdomainInfo(),
  };
}
