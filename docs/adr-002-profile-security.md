# ADR-002 — Profile security and storage prototype

Status: implementation decision; feature disabled until applicable verification passes. Date: 2026-09-28.

Use standard Web Crypto PBKDF2-HMAC-SHA256 (600,000 iterations, random 128-bit salt) to derive a wrapping key from a password. Each profile receives a separate random AES-256 data key; authenticated AES-GCM wraps it with profile-bound additional authenticated data. Decrypted data keys are non-extractable CryptoKey objects held only by the active application session. Encrypted records get fresh 96-bit IVs and record/profile-bound authenticated data. No custom cryptographic primitives.

Initial prototype supports passwords of 12–256 characters. PIN/biometric and guest flows remain unimplemented; do not advertise them. Public profile chooser metadata contains only identity/display/timezone/timestamps. Preferences and later private payloads are encrypted. KDF metadata and wrapped key are stored, never raw passwords, derived keys or unwrapped data keys. Full native secure storage/biometric hardening remains a separate gate.

Use profile-scoped IndexedDB stores on web and a SQLite adapter on Android; do not let native fall back silently to IndexedDB. Profile creation must atomically write identity, authentication metadata and preferences. Failed unlocks increment persisted throttling state. Lock invalidates tokens, clears key references and cancels pending unlock results; JavaScript cannot guarantee erasure of all engine copies of secrets.

Offline ciphertext theft still permits password guessing; strong passwords and measured KDF cost are important. This design is not certified hardware-backed security. Production security and device tests remain required.

Sources: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey and https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html .
