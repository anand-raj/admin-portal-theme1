export const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://cms-membership.e-anandraj.workers.dev';
export const BOOKS_WORKER_URL = import.meta.env.VITE_BOOKS_WORKER_URL || 'https://cms-books.e-anandraj.workers.dev';
export const EVENTS_WORKER_URL = import.meta.env.VITE_EVENTS_WORKER_URL || 'https://cms-events.e-anandraj.workers.dev';
export const MEDIA_WORKER_URL = import.meta.env.VITE_MEDIA_WORKER_URL || 'https://cms-media.e-anandraj.workers.dev';
export const OAUTH_URL = import.meta.env.VITE_OAUTH_URL || 'https://sveltia-cms-auth.e-anandraj.workers.dev';
// Must match the hostname the Sveltia auth worker was configured with (the Hugo site).
// Stays fixed whether the admin portal runs on localhost or Cloudflare Pages.
export const OAUTH_SITE_ID = import.meta.env.VITE_OAUTH_SITE_ID || 'anand-raj.github.io';
