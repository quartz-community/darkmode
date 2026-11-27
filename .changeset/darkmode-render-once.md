---
"@quartz-community/darkmode": patch
---

The theme toggle now switches once per click after a page re-renders (for example after unlocking an encrypted page); previously each `render` event added another click listener, so a click could toggle twice and appear to do nothing.
