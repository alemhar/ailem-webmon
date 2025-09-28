// Central configuration for Web Monitor Pro (placeholders and tuning)
export const BACKEND_ENDPOINT = 'https://example.com/api/logs'; // TODO: replace
export const BACKEND_BEARER_TOKEN = 'Bearer YOUR_API_KEY_HERE'; // TODO: replace

// Queue processing
export const QUEUE_RETRY_INTERVAL_MS = 20000; // periodic retry cadence

// Persistence tuning
export const SAVE_DEBOUNCE_MS = 300; // debounce writes to session storage
