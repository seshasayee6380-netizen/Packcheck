# QR v28 Fix

Fixed the public passport verification hang caused by an early return in `App` occurring before the passport verification `useEffect` was registered.

The passport route now registers all React hooks first, then renders the loading/passport state. Direct LAN backend lookup and same-origin fallback remain enabled, each with its own timeout controller.
