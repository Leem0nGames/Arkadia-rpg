## 2025-05-18 - Input Sanitization & Save Import Key Validation
**Vulnerability:** Unsanitized asset URLs (e.g. `javascript:`, `data:text/html`) could trigger XSS when rendered in UI/SVG image components, and arbitrary JSON keys in save import files could cause prototype property lookups on `SLOT_KEYS`.
**Learning:** `sanitizeAssetUrl` accepted any arbitrary URL string starting with `data:` or external protocols without validating dangerous URI schemes. Save slot imports looked up `SLOT_KEYS[key]` directly without `hasOwnProperty` check.
**Prevention:** Filter out `javascript:`, `vbscript:`, and non-image `data:` URIs in asset url sanitizer functions, and always use `Object.prototype.hasOwnProperty.call(dictionary, key)` when matching dynamic JSON keys against predefined record maps.
