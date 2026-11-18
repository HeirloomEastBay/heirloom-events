/* Heirloom Activities — service worker.
   It's here so phones offer "Install" / "Add to Home Screen" and the app opens full screen.
   It deliberately saves nothing: every page and file still comes fresh from the website,
   so updates show up right away. (Push notifications will be added here later.) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* straight to the network */ });
