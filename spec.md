# Multi-View — Technical Specification

Version 2.0 | Chrome Extension Manifest V3

---

## 1. Architecture Overview

Multi-View is a Chrome MV3 side panel extension. Its core loop is:

1. User clicks the extension icon → `background.js` opens the side panel via `chrome.sidePanel.setPanelBehavior`.
2. `sidepanel.html` renders the grid UI; `sidepanel.js` handles all panel logic.
3. User pastes a URL into a frame cell → `url_converter.js` converts it to an embed URL → an `<iframe>` loads it.
4. `content_script.js` runs inside those iframes (and on supported host pages) to suppress UI chrome, handle playback events, and patch platform-specific embed quirks.
5. `background.js` installs declarativeNetRequest (DNR) rules at startup to strip restrictive response headers and spoof request headers where needed.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chrome Browser                                                       │
│                                                                       │
│  ┌─────────────────┐        ┌──────────────────────────────────────┐ │
│  │  Active Tab      │        │  Side Panel (sidepanel.html)         │ │
│  │                  │        │                                      │ │
│  │  content_script  │◄──────►│  sidepanel.js   url_converter.js    │ │
│  │  (toolbar/select)│ msg    │  i18n.js        sidepanel.css       │ │
│  │                  │        │                                      │ │
│  │  ┌────────────┐  │        │  ┌──────────────────────────────┐   │ │
│  │  │  <iframe>  │  │        │  │  <iframe id="screen1"> …     │   │ │
│  │  │  (embed)   │  │        │  │  content_script (in iframe)  │   │ │
│  │  └────────────┘  │        │  └──────────────────────────────┘   │ │
│  └─────────────────┘        └──────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  background.js (service worker)                               │    │
│  │  - DNR rules setup                                            │    │
│  │  - sidePanel.open() on message from content_script           │    │
│  │  - pendingUrls relay via chrome.storage.local                │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. File Descriptions

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest. Declares permissions, host_permissions, content_script matches, side_panel default_path. |
| `background.js` | Service worker. Installs/updates DNR rules on `onInstalled` and `onStartup`. Configures side panel open-on-click. Relays `loadUrlsToPanel` messages from content_script by saving `pendingUrls` to storage and calling `sidePanel.open()`. |
| `sidepanel.html` | Shell HTML for the side panel and tab mode. Declares all 25 frame wrappers statically. Loads `i18n.js` in `<head>`, loads `url_converter.js` and `sidepanel.js` at end of body. |
| `sidepanel.css` | All styles. CSS custom properties for dark theme; `.theme-light` overrides for light theme. Grid layouts via `.video-grid.count-N` classes (N = 4, 9, 16, 25). |
| `sidepanel.js` | Main panel logic: layout switching, per-frame URL loading, group CRUD, drag-and-drop, global playback controls, tab mode, toast system, storage persistence, message listener. |
| `url_converter.js` | Pure URL transformation. Exports `window.convertToEmbedUrl(rawText, frameId)`. No DOM access. |
| `content_script.js` | Injected into supported domains. Four roles: (1) scrape YouTube subscription/playlist pages, (2) iframe subscreen mode — suppress UI, relay playback events, handle control messages, (3) XHamster embed fix (runs on `isInIframe`, independent of `isSubscreen`), (4) floating selection toolbar on host pages. |
| `i18n.js` | Runtime i18n. `MESSAGES` object with keys for `zh_TW`, `zh_CN`, `en`, `ja`. Functions: `t(key, ...args)`, `setLocale()`, `initLocale()`, `applyI18n()`. |

---

## 3. URL Conversion Logic (`url_converter.js`)

`window.convertToEmbedUrl(rawText, frameId)` is called every time a URL is loaded into a frame. It returns the final URL string to set as `iframe.src`, or `null` on empty input.

After conversion, the function always appends `?subscreen=1&frameId=<N>` via `URLSearchParams` so `content_script.js` can identify the frame. YouTube additionally receives `enablejsapi=1`, `origin=<extension origin>`, and `autoplay=0`.

### Conversion table

| Platform | Input pattern | Output format | Notes |
|----------|--------------|---------------|-------|
| **Generic iframe paste** | `src="..."` in pasted text | Extracts the `src` value | Highest priority check |
| **YouTube** | `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/live/ID` | `https://www.youtube.com/watch?v=ID` | Keeps `watch?v=` format intentionally — `/embed/` causes Error 153 in extension context |
| **Nicovideo** | `nicovideo.jp/watch/smNNNN` | `https://embed.nicovideo.jp/watch/smNNNN` | ID prefix preserved (sm/so/nm) |
| **Vimeo** | `vimeo.com/NNNN` | `https://player.vimeo.com/video/NNNN` | |
| **TikTok** | `tiktok.com/@user/video/ID` | Strips query string, uses page URL as-is | TikTok does not support third-party iframes |
| **PornHub** | `pornhub.com/view_video.php?viewkey=KEY` | `https://www.pornhub.com/embed/KEY` | |
| **XHamster** | `xhamster[.com/.desi/.one]/videos/title-ID` | `https://xhamster.com/xembed.php?video=ID` | ID is the last hyphen-separated segment (5+ alphanumeric chars); handles both old numeric and new alphanumeric IDs |
| **XVideos** | `xvideos.com/videoNNNN/` or `xvideos.com/video.ALPH/` | `https://www.xvideos.com/embedframe/ID` | Blocked by `X-Frame-Options: sameorigin` on the embed page; converted for clarity but may not play |
| **XNXX** | `xnxx.com/video-ALPH/` | `https://www.xnxx.com/embedframe/ALPH` | Same limitation as XVideos |
| **BitChute** | `bitchute.com/video/ID` | `https://www.bitchute.com/embed/ID/` | |
| **Odysee** | `odysee.com/PATH` (not `odysee.com/$/`) | `https://odysee.com/$/embed/PATH` | Skips URLs already using the `/$/ ` embed path |
| **Twitch clip** | `clips.twitch.tv/SLUG` or `twitch.tv/CH/clip/SLUG` | `https://clips.twitch.tv/embed?clip=SLUG&parent=localhost&autoplay=false` | |
| **Twitch VOD** | `twitch.tv/videos/ID` | `https://player.twitch.tv/?video=ID&parent=localhost&autoplay=false` | |
| **Twitch live** | `twitch.tv/CHANNELNAME` | `https://player.twitch.tv/?channel=CH&parent=localhost&autoplay=false` | Reserved path segments (`videos`, `clips`, `directory`, `downloads`, `jobs`, `p`, `settings`, `subscriptions`, `wallet`) are excluded |

---

## 4. DNR Rule Table (`background.js`)

Rules are registered as dynamic rules via `chrome.declarativeNetRequest.updateDynamicRules`. They are applied on `onInstalled`, `onStartup`, and immediately at service-worker boot.

| Rule ID | Priority | Direction | Condition | Action | Purpose |
|---------|----------|-----------|-----------|--------|---------|
| 1 | 100 | Request headers | `sub_frame` to `https://www.tiktok.com/*` | Set `Referer: https://www.tiktok.com/` | Satisfies TikTok's same-origin referrer check |
| 2 | 100 | Response headers | `sub_frame` or `xmlhttprequest` matching YouTube, Nicovideo, TikTok, Twitch, PornHub, XHamster domains | Remove `X-Frame-Options`, `Content-Security-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, `X-WebKit-CSP`, `X-Content-Security-Policy` | Allows these pages to load inside iframes in the extension context |
| 3 | 100 | Response headers | `sub_frame` or `xmlhttprequest` matching Rule34Video, Ashemaletube, XGroovy | Same removals as Rule 2 | Same purpose for the adult-platform group |
| 4 | 200 | Request headers | `sub_frame` to `^https://player\.twitch\.tv/` | Set `Referer: https://localhost/`, `Origin: https://localhost` | `player.twitch.tv` validates that `document.referrer` matches the `?parent=` parameter. The extension sends `chrome-extension://` as referrer which fails the check. Spoofing to `localhost` matches `parent=localhost`. Priority 200 overrides Rule 2. |
| 5 | 200 | Request headers | `sub_frame`, `xmlhttprequest`, `media` matching `xhamster.(com\|desi\|one)` | Set `Referer: https://xhamster.com/`, `Origin: https://xhamster.com` | XHamster's embed player JS checks `document.referrer`; a `chrome-extension://` referrer blocks playback. Spoofing makes the player believe it is embedded on xhamster.com itself. Priority 200 overrides Rule 2. |

---

## 5. `content_script.js` Behavior

The script runs at `document_start` in all matching frames (`all_frames: true`). Its behavior is gated by three boolean conditions:

```js
const isSubscreen = params.get("subscreen") === "1";   // URL param set by url_converter.js
const isInIframe  = (window.self !== window.top);       // robust after redirects that strip params
```

### 5.1 YouTube subscription/playlist scraper (always active on host pages)

`scrapeSubscriptionVideos()` queries YouTube DOM elements (`ytd-rich-grid-media`, `ytd-video-renderer`, etc.), extracts video IDs from `href` attributes, and resolves titles via a four-candidate waterfall: `aria-label` → `title` attribute → `#video-title` innerText → any `span/a` with length > 10. Deduplicates by video ID. Responds to `chrome.runtime.onMessage` for the `getVideos` action.

### 5.2 Subscreen mode (inside the side panel iframe, `isSubscreen === true`)

**YouTube only:**
- Injects CSS to hide YouTube navigation chrome (`ytd-masthead`, `#secondary`, `#comments`, etc.) and make the player fill 100vw × 100vh.
- Polls every 1 s with `setInterval` to attach an `ended` event listener to the `<video>` element (once only, gated by `video.dataset.listening`).
- On `ended`, sends `chrome.runtime.sendMessage({ action: "videoEnded", frameId, videoId })` to notify the side panel for auto-advance.

**All non-YouTube platforms (in subscreen):**
- Same `ended` listener pattern.
- Additionally sets `video.muted = false` and listens for `volumechange` to counteract forced muting in iframe environments.

**`window.addEventListener("message")` handler (all subscreen frames):**
Accepts postMessage commands from the side panel (`sendMessageToFrame()`). Checks `data.targetFrameId` to discard messages intended for other frames.

| Command (`data.func`) | Behavior |
|-----------------------|----------|
| `playVideo` | If `video.played.length === 0`, tries clicking `.mgp_playIcon` (platform button). Otherwise calls `video.play()`. |
| `pauseVideo` | `video.pause()` |
| `muteVideo` | `video.muted = true` |
| `unmuteVideo` | `video.muted = false` |
| `releaseVideo` | `video.pause()`, remove `src` attribute, `video.load()` — used before frame navigation in the queue system |

### 5.3 XHamster embed fix (`location.hostname.includes("xhamster") && isInIframe`)

Runs independently of `isSubscreen` because `xembed.php` can redirect, dropping `?subscreen=1` from the URL.

**Problem:** XHamster's embed player wraps the play button in `<a class="xp-cta" href="gamr.info/...">` for affiliate monetisation. This overlay sits above `.xp-play` and catches all pointer events, causing navigation away from the iframe instead of playback.

**Fix (three-layer):**
1. CSS injection: `a.xp-cta { display: none !important; pointer-events: none !important; }` and `a.xp-poster { pointer-events: none !important; }` — injected at `document_start` or on `DOMContentLoaded`.
2. Capture-phase click listener on `document`: intercepts clicks on `a[href*="gamr.info"]` and `a[href*="utm_campaign=embed"]`, calling `preventDefault()` + `stopImmediatePropagation()`. Does **not** block bare `.xp-play` clicks — XHamster's own JS must handle them.
3. MutationObserver (`stripRedirects`): watches for `href`/`target` attribute changes and removes those attributes from any `a.xp-play[href*="gamr.info"]` or similar redirect anchors dynamically injected.

### 5.4 Selection toolbar (host pages, not subscreen, not in iframe)

A fixed-position floating toolbar (`#__mv_toolbar__`) is injected into every matched host page. It is hidden on iframes and subscreen pages via the `!isSubscreen && !isInIframe` guard.

- **Select mode:** `document.addEventListener('click', ..., true)` in capture phase intercepts clicks on `a[href]` elements whose `href` matches `/\/(video|watch|embed|live)\b|viewkey=|\/videos\/\d+/i`. Toggles URL in/out of `selectedUrls[]`. Highlights the nearest card ancestor.
- **Send to Panel:** calls `chrome.runtime.sendMessage({ action: "loadUrlsToPanel", urls: selectedUrls })`. Background saves URLs to `chrome.storage.local` as `pendingUrls` and calls `sidePanel.open()`.
- **Drag:** toolbar is draggable via `mousedown`/`mousemove`/`mouseup` listeners. Clamped inside viewport on resize.
- **Locale sync:** reads `locale` from `chrome.storage.local` at inject time and listens for `chrome.storage.onChanged` to keep toolbar strings in sync with the panel's language setting.

---

## 6. Side Panel Logic (`sidepanel.js`)

### 6.1 State variables

| Variable | Type | Purpose |
|----------|------|---------|
| `videoList` | `Array` | YouTube video objects from subscription scrape `{id, title, url, timestamp, originalIndex}` |
| `nextGlobalIndex` | `number` | Pointer into `videoList` for sequential auto-play |
| `screenCount` | `number` | Active frame count (4 / 9 / 16 / 25) |
| `savedGroups` | `Array` | Persisted group objects |
| `currentGroupId` | `number\|null` | `id` (timestamp) of currently loaded group |
| `frameStates[1..25]` | `Object` | `{ videoId, listIndex, isProcessing }` per frame |
| `dragSourceFrameId` | `number\|null` | Source frame ID during internal drag |
| `groupsBarCollapsed` | `boolean` | Groups bar visibility toggle state |
| `isDarkTheme` | `boolean` | Theme state |

### 6.2 Frame loading

`loadUrlToFrame(frameId, rawUrl)`:
1. Calls `window.convertToEmbedUrl(rawUrl, frameId)`.
2. Sets `iframe.src` to the result.
3. Updates `url<N>` input value to the original raw URL.
4. Hides the placeholder and input overlay, calls `renderVideoList()`.

`loadVideoToFrame(frameId, video, listIndex)` is the queue-system variant — same mechanics but also updates `frameStates[frameId].listIndex`.

### 6.3 Video queue system

Used exclusively for sequential auto-play from the scraped `videoList`. Manual URL pasting bypasses this.

- `videoLoadQueue`: FIFO array of frame IDs waiting for a video.
- `isGlobalLoading`: global mutex preventing concurrent loads (YouTube init overhead).
- `playNextVideo(frameId)`: deduplication check, enqueue, call `processLoadQueue()`.
- `processLoadQueue()`: dequeues one frame ID, runs a 3-stage sequence:
  1. `sendMessageToFrame(frameId, 'releaseVideo')` → wait 800 ms.
  2. `iframe.src = "about:blank"` → wait 200 ms.
  3. `recreateIframe(frameId)` (re-apply attributes) → wait 1000 ms → set `iframe.src` to embed URL.
  4. After 3000 ms (YouTube init settle), release `isGlobalLoading` and process next.

### 6.4 Tab mode

Triggered by `btn-open-tab`. Saves `{ urls, screenCount }` as `tabSnapshot` to storage and opens `sidepanel.html?mode=tab` in a new Chrome tab. The panel detects `?mode=tab`, reads `tabSnapshot` on load, and restores the snapshot. Window width is enforced to a minimum of 900 px; current width is persisted as `tabWindowWidth`.

### 6.5 Drag and drop

- **Internal (frame-to-frame):** `dragstart` stores source frame ID; `drop` on target calls `loadUrlToFrame(target, sourceUrl)` then `stopFrame(source)`. iframes have `pointer-events: none` during drag to prevent consuming events.
- **External (browser → frame):** `drop` reads `text/uri-list` → `text/plain` → parses `href` from `text/html`. Multiple URLs are loaded into consecutive frames starting at the drop target.

### 6.6 Groups system

Each group object:
```js
{
  id: Date.now(),       // unique key, also creation timestamp
  nameSuffix: '',       // optional user label displayed as "(suffix)"
  urls: string[],       // one entry per frame slot (empty string for empty frames)
  screenCount: number   // layout at save time
}
```

Display name is computed at render time as `t('default_group_name', idx + 1)` (e.g. "群組 1"), optionally with `nameSuffix` appended. This means renumbering happens automatically when groups are deleted.

Group edit modal is built programmatically (no HTML template). It allows editing `nameSuffix` and the URL list. Saving while the group is `currentGroupId` triggers a full reload of that group's frames.

Limit: 20 groups. Enforced in `saveGroup()` before push.

---

## 7. Storage Schema (`chrome.storage.local`)

| Key | Type | Description |
|-----|------|-------------|
| `videoList` | `Array<{id, title, url, timestamp, originalIndex}>` | Scraped YouTube video queue |
| `nextGlobalIndex` | `number` | Current queue head |
| `screenCount` | `number` | Last used layout (4/9/16/25) |
| `savedGroups` | `Array<Group>` | All saved groups (see §6.6) |
| `pendingUrls` | `string[]` | Transient: URLs queued by content_script selection toolbar; consumed and removed on panel load |
| `tabSnapshot` | `{urls: string[], screenCount: number}` | Transient: frame snapshot for tab mode handoff; consumed and removed on tab load |
| `tabWindowWidth` | `number` | Last outer window width in tab mode |
| `groupsBarCollapsed` | `boolean` | Groups bar collapse state |
| `isDarkTheme` | `boolean` | Theme preference |
| `locale` | `string` | Active locale (`zh_TW` / `zh_CN` / `en` / `ja`) |

---

## 8. i18n System (`i18n.js`)

- `MESSAGES` is a plain object keyed by locale code, each value being a flat key→string map.
- String interpolation: `{0}`, `{1}` positional placeholders replaced by `t(key, arg0, arg1, ...)`.
- `applyI18n()` walks the DOM for `data-i18n`, `data-i18n-placeholder`, and `data-i18n-title` attributes and updates `textContent`, `placeholder`, and `title` respectively.
- `initLocale(callback)` reads `locale` from storage asynchronously before first render; all initial UI setup happens inside the callback.
- `setLocale(locale)` updates `_locale`, persists to storage, calls `applyI18n()`, and calls `renderGroups()` (if defined) to re-render localised group names.
- The content script toolbar maintains its own locale string table (`_toolbarStrings`) independently of `i18n.js` because `i18n.js` is not loaded into host pages.

Supported locales: `zh_TW` (Traditional Chinese, default), `zh_CN` (Simplified Chinese), `en` (English), `ja` (Japanese).

---

## 9. Permissions

| Permission | Why |
|------------|-----|
| `sidePanel` | Open and configure the Chrome side panel |
| `tabs` | Query active tab for content_script injection fallback; `sidePanel.open({ tabId })` |
| `storage` | Persist all user state (groups, settings, queue) |
| `declarativeNetRequest` | Register DNR rules |
| `declarativeNetRequestWithHostAccess` | Modify request/response headers for host_permissions domains |
| `clipboardRead` | "Paste URLs" button reads clipboard via `navigator.clipboard.readText()` |

---

## 10. Known Limitations and Workarounds

### XVideos / XNXX
Both platforms serve `X-Frame-Options: sameorigin` on their embed pages at the network level. The DNR rules remove this header for the domains listed in Rule 2/3 regex, but XVideos and XNXX are not included in those regexes because adding them without a working workaround would be misleading. URLs are converted to `embedframe` format so users see a cleaner error rather than the wrong page, but actual playback is not guaranteed.

**Potential fix path:** Add XVideos/XNXX to the DNR response-header removal rule regex. Test whether playback works after header removal; if their embed JS also checks `document.referrer`, a request-header spoof rule (similar to Rule 5 for XHamster) may be needed.

### TikTok
TikTok does not support third-party iframe embedding. The URL is used as-is (page URL, no `?subscreen=1` param appended to avoid breaking TikTok's own URL parsing) and a Referer spoof (Rule 1) satisfies its sub_frame request check. The player may still show a "Watch on TikTok" prompt or fail entirely depending on TikTok's current policy.

### YouTube `watch?v=` vs `/embed/`
YouTube's `/embed/ID` URL triggers an `Error 153 (Embeds disabled)` when loaded from an extension origin even with `enablejsapi=1`. Using `watch?v=ID` works because content_script.js injects CSS to hide all YouTube chrome and force the player to fill the viewport, effectively creating an embed-like experience without using the embed endpoint.

### XHamster post-redirect `isSubscreen` loss
`xembed.php` can issue a redirect that drops query parameters including `?subscreen=1`. The subscreen detection therefore uses a dual check: `isSubscreen` for parameter-preserving loads, and `isInIframe` (`window.self !== window.top`) as a fallback. The XHamster-specific fix block uses only `isInIframe` so it activates regardless of redirect behavior.

### Twitch `chrome-extension://` referrer failure
`player.twitch.tv` validates that `document.referrer` matches the `?parent=` query parameter. Chrome sends `chrome-extension://<id>/sidepanel.html` as the referrer for iframes loaded inside extensions, which does not match `parent=localhost`. DNR Rule 4 (priority 200) overwrites both `Referer` and `Origin` request headers to `https://localhost/` and `https://localhost` respectively, making the player accept the embed.

### Autoplay blocking
Chrome's autoplay policy may block video autoplay for iframes that have not received a user gesture. The side panel itself counts as a user gesture context for directly-loaded frames. For the sequential queue system, `content_script.js` calls `video.play()` to assist autoplay after the iframe loads.

### Groups bar `renderGroups` / `applyI18n` coupling
`i18n.js` calls `renderGroups()` by name in `setLocale()`. This is a soft dependency — `renderGroups` must be defined as a global function in `sidepanel.js` before locale switching can trigger group re-render. If the panel is ever refactored to use modules, this call will need to be replaced with an event or callback pattern.
