// Minimal no-op service worker to satisfy Chrome's PWA install criteria.
// Offline support is out of scope — the app requires Supabase connectivity.
self.addEventListener('fetch', () => {});
