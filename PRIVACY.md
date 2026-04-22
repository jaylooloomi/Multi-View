# Privacy Policy — Multi-View

**Last updated: 2026-04-22**

## Summary

Multi-View does **not** collect, transmit, store on any server, or share any personal data.

---

## Data Storage

All user data (saved video groups and preferences) is stored **locally on your device** using `chrome.storage.local`. This data never leaves your browser and is never sent to any external server or third party.

---

## Permissions Explanation

| Permission | Why it is needed |
|---|---|
| `sidePanel` | Display the Multi-View interface as a Chrome Side Panel |
| `tabs` | Open individual video URLs in a new tab or popup window |
| `storage` | Save and reload user-created video groups locally |
| `declarativeNetRequest` | Remove iframe-blocking response headers so videos can be embedded |
| `declarativeNetRequestWithHostAccess` | Apply header rules to specific supported video platform domains |
| `clipboardRead` | Read clipboard content for the "Paste URLs" bulk-input feature |
| Host permissions (video platform domains) | Required for declarativeNetRequest rules to take effect on those domains |

---

## Third-Party Services

The extension embeds video content from third-party platforms (YouTube, Twitch, Vimeo, TikTok, NicoNico, Pornhub, XVideos, XHamster, etc.) via standard HTML `<iframe>` elements using URLs provided by the user. Multi-View does not inject scripts into those pages, does not read their content, and does not transmit any data to or from them on behalf of the user.

---

## Remote Code

Multi-View does **not** use any remote code. All JavaScript is bundled within the extension package. No external scripts are loaded or executed.

---

## Analytics & Tracking

Multi-View does **not** use any analytics, crash reporting, or tracking services.

---

## Contact

If you have any questions about this privacy policy, please open an issue on the GitHub repository or contact:

**Email:** arthurwang@think4u-tech.com  
**GitHub:** https://github.com/jaylooloomi/Multi-View/issues
