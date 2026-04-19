/**
 * YouTube Multi Auto Playlist - Content Script
 * Roles:
 * 1. Extract video list from subscribed channel pages, etc. (Auto_Playlist feature)
 * 2. Control video playback and remove unnecessary elements in iframes inside the side panel (My_Subscreens feature)
 * 3. Detect video end and notify the background (side panel)
 */

// --- 1. Video list extraction feature (derived from Auto_Playlist) ---

function scrapeSubscriptionVideos() {
    console.log("[MultiPlaylist] Scraping started (Universal Title Recovery Mode)...");

    const isDuration = (text) => /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(text.trim());

    // Broader container selectors
    const itemSelectors = [
        "ytd-rich-grid-media",
        "ytd-rich-grid-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-video-renderer",
        "ytd-playlist-video-renderer",
        "ytd-rich-item-renderer"
    ];

    let videoElements = [];
    itemSelectors.forEach(sel => {
        const found = document.querySelectorAll(sel);
        videoElements = [...videoElements, ...Array.from(found)];
    });

    const videos = [];
    const seenIds = new Set();

    videoElements.forEach((el, index) => {
        // 1. Identify the link and video ID
        const linkEl = el.querySelector("a#video-title-link") ||
            el.querySelector("a[href*='/watch?v=']") ||
            el.querySelector("a[href*='/live/']") ||
            el.querySelector("a#thumbnail");

        if (!linkEl) {
            // Debug log: check which selector failed
            // console.log(`[MultiPlaylist] Video element ${index} skipped: No main link found. Content:`, el.innerHTML.substring(0, 100));
            return;
        }

        let videoId = "";
        const href = linkEl.getAttribute("href") || "";
        if (href.includes("watch?v=")) videoId = href.split("v=")[1]?.split("&")[0];
        else if (href.includes("/live/")) videoId = href.split("/live/")[1]?.split("?")[0];

        if (!videoId) return;
        if (seenIds.has(videoId)) return;

        // 2. Identify the title (Auto_Playlist_Tool logic)
        let title = "";

        // Candidate 1: aria-label
        const ariaLabel = linkEl.getAttribute("aria-label");
        if (ariaLabel) {
            // Remove " by [Channel]" or "による" (Japanese for "by")
            // Japanese "による" = \u306B\u3088\u308B
            title = ariaLabel.split(" \u306B\u3088\u308B")[0];
            title = title.split(" by ")[0];
            title = title.trim();
            if (title && !isDuration(title)) {
                // Success
            } else {
                title = "";
            }
        }

        // Candidate 2: title attribute
        if (!title || title === "No Title") {
            const titleAttr = linkEl.getAttribute("title") ||
                (el.querySelector("#video-title")?.getAttribute("title")) || "";
            if (titleAttr && !isDuration(titleAttr)) {
                title = titleAttr;
            }
        }

        // Candidate 3: innerText
        if (!title || title === "No Title") {
            const titleEl = el.querySelector("#video-title") || el.querySelector("yt-formatted-string");
            if (titleEl) {
                const txt = titleEl.innerText.trim();
                if (txt && !isDuration(txt)) {
                    title = txt;
                }
            }
        }

        // Candidate 4: Last resort (any reasonable text inside the container)
        if (!title || title === "No Title") {
            const allSpans = Array.from(el.querySelectorAll("span, a, yt-formatted-string"));
            for (const s of allSpans) {
                const t = s.innerText.trim();
                if (t.length > 10 && !isDuration(t) && !t.includes("回視聴") && !t.includes("views") && !t.includes("視聴者") && !t.includes("watching")) {
                    title = t;
                    break;
                }
            }
        }

        title = title || "No Title";

        seenIds.add(videoId);
        videos.push({
            id: videoId,
            title: title.trim(),
            url: `https://www.youtube.com/watch?v=${videoId}`,
            timestamp: Date.now(),
            originalIndex: videos.length // Save original order for sorting
        });
    });

    console.log(`[MultiPlaylist] Scraped ${videos.length} videos. Titles verified.`);
    return videos;
}


// --- 2. iframe operation mode inside the side panel (derived from My_Subscreens + additional features) ---

const params = new URLSearchParams(window.location.search);
const isSubscreen = params.get("subscreen") === "1";
const frameId = params.get("frameId"); // Frame identifier passed from the side panel (1~4)

if (isSubscreen) {
    console.log(`[MultiPlaylist] Running in subscreen mode. Frame: ${frameId}`);

    // Style injection: full-screen black background, hide everything except the player
    const injectCSS = (css) => {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    };

    if (location.hostname.includes("youtube.com")) {
        injectCSS(`
            ytd-masthead, #masthead-container, #secondary, ytd-guide-renderer, #guide,
            ytd-mini-guide-renderer, #comments, #footer, #ticket-shelf, #merch-shelf,
            ytd-watch-metadata, #below, #panels, #chat-container, ytd-playlist-panel-renderer,
            .ytp-chrome-top, .ytp-pause-overlay, #reaction-control-panel-overlay,
            #chat, #chat-container, ytd-live-chat-frame, ytd-popup-container,
            tp-yt-iron-overlay-backdrop, .upsell-dialog-renderer, ytd-action-companion-ad-renderer,
            #clarification, #message, #header, #masthead-ad { display: none !important; }

            ytd-page-manager, #page-manager, ytd-watch-flexy, #columns, #primary, #primary-inner {
                margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important;
                display: block !important; position: static !important; max-width: none !important;
            }
            #player, #player-container-outer, #player-container-inner, #player-container, #ytd-player, .ytd-player, #movie_player {
                width: 100vw !important; height: 100vh !important; max-width: none !important; max-height: none !important;
                margin: 0 !important; padding: 0 !important; position: fixed !important; top: 0 !important; left: 0 !important;
                z-index: 2147483647 !important; background: black !important;
            }
            video, .html5-main-video { 
                width: 100vw !important; height: 100vh !important; position: absolute !important; 
                top: 0 !important; left: 0 !important; object-fit: contain !important; 
            }
            html, body, ytd-app { background: black !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
            .ytp-chrome-bottom { width: 100% !important; left: 0 !important; bottom: 0 !important; }
            yt-interaction, .ytp-error-screen { pointer-events: none !important; }
        `);

        // Playback control and end notification
        let hasStarted = false;

        const monitorPlayback = () => {
            const video = document.querySelector('video');
            if (!video) return;

            // Assist autoplay
            if (video.paused && !hasStarted) {
                video.play().then(() => hasStarted = true).catch(() => {
                    // When autoplay is blocked, wait for a click (may be lenient since it's inside the side panel)
                });
            } else if (!video.paused) {
                hasStarted = true;
            }

            // End detection
            if (video.ended) {
                console.log(`[MultiPlaylist] Video ended in Frame ${frameId}. Notifying parent.`);
                // To prevent repeated sends, wait a moment or send a message and wait for transition
                // Here we just fire the message. The side panel handles the transition.
                chrome.runtime.sendMessage({
                    action: "videoEnded",
                    frameId: frameId,
                    videoId: params.get("v")
                });
                // Either remove the listener to avoid re-notifying, or wait for the video state to change
                // However, the same video element may be reused, so using the ended event alone may suffice,
                // but since we are polling, flag management may be needed.
                // For now, video.ended remains true, so repeated sends are possible.
                // Debouncing on the side panel side is safer.
            }
        };

        // Switched to event listener-based approach (lighter than polling)
        const setupVideoListener = () => {
            const video = document.querySelector('video');
            if (video && !video.dataset.listening) {
                video.dataset.listening = "true";
                video.addEventListener("ended", () => {
                    console.log(`[MultiPlaylist] EVENT: Video ended in Frame ${frameId}`);
                    chrome.runtime.sendMessage({
                        action: "videoEnded",
                        frameId: frameId,
                        videoId: params.get("v")
                    });
                });

            }
        };

        setInterval(setupVideoListener, 1000); // Wait for the video tag to be created
    }

    // ── XHamster embed fix ────────────────────────────────────────────────────
    // xembed.php wraps the play button in <a target="_blank" href="gamr.info/...">
    // for affiliate monetisation.  When embedded in our iframe this navigates away
    // instead of playing the video.  Patch: remove the redirect and call video.play().
    if (location.hostname.includes("xhamster")) {
        const patchXHamster = () => {
            // Remove target/_blank from any anchor that contains a play-class element
            // or that itself has a play-related class.
            document.querySelectorAll(
                'a.xp-play, a[class*="play"], a[href*="gamr.info"], a[href*="utm_campaign=embed"]'
            ).forEach(a => {
                if (a.dataset.xhPatched) return;
                a.dataset.xhPatched = '1';
                a.removeAttribute('target');
                a.removeAttribute('href');
                a.style.cursor = 'pointer';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const video = document.querySelector('video');
                    if (video) {
                        video.muted = false;
                        video.play().catch(() => {});
                    }
                });
            });
        };

        // Run once DOM is available, then watch for dynamic changes
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', patchXHamster);
        } else {
            patchXHamster();
        }
        const xhObs = new MutationObserver(patchXHamster);
        const xhStart = () => xhObs.observe(document.documentElement, { childList: true, subtree: true });
        if (document.documentElement) xhStart();
        else document.addEventListener('DOMContentLoaded', xhStart);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Common to all platforms: monitor video ended
    if (!location.hostname.includes("youtube.com")) {
        const setupVideoListenerGeneric = () => {
            const video = document.querySelector('video');
            if (video && !video.dataset.listening) {
                video.dataset.listening = "true";
                video.addEventListener("ended", () => {
                    console.log(`[MultiPlaylist] EVENT: Video ended in Frame ${frameId}`);
                    chrome.runtime.sendMessage({
                        action: "videoEnded",
                        frameId: frameId,
                        videoId: params.get("v")
                    });
                });

                // Unmute because the video may be force-muted in an embedded iframe environment
                video.muted = false;
                video.addEventListener("volumechange", () => {
                    if (video.muted) video.muted = false;
                });
            }
        };
        setInterval(setupVideoListenerGeneric, 1000);
    }

    // Receive control messages from the parent (side panel) — common to all platforms
    window.addEventListener("message", (event) => {
        try {
            const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

            if (data.targetFrameId && String(data.targetFrameId) !== String(frameId)) {
                return;
            }

            if (data.event === 'command' && data.func === 'playVideo') {
                console.log(`[Content Frame ${frameId}] Received playVideo command.`);
                const video = document.querySelector('video');
                if (!video) return;

                // Never played before → click the platform's button
                if (video.played.length === 0) {
                    const platformBtn = document.querySelector('.mgp_playIcon');
                    if (platformBtn) { platformBtn.click(); return; }
                }

                // Already played (paused) → controllable via video.play()
                video.play().catch(e => console.error("Play failed:", e));
            }
            if (data.event === 'command' && data.func === 'pauseVideo') {
                const video = document.querySelector('video');
                if (video) video.pause();
            }
            if (data.event === 'command' && data.func === 'muteVideo') {
                const video = document.querySelector('video');
                if (video) video.muted = true;
            }
            if (data.event === 'command' && data.func === 'unmuteVideo') {
                const video = document.querySelector('video');
                if (video) video.muted = false;
            }
            if (data.event === 'command' && data.func === 'releaseVideo') {
                console.log(`[Content Frame ${frameId}] Releasing video resources...`);
                const video = document.querySelector('video');
                if (video) {
                    try {
                        video.pause();
                        video.removeAttribute('src');
                        video.load();
                    } catch (err) {
                        console.error("Error releasing video:", err);
                    }
                }
            }
        } catch (e) {
            // Ignore
        }
    });
}

// --- 3. Selection mode UI (injected into pages outside the side panel) ---
if (!isSubscreen) {
    let selectMode = false;
    let selectedUrls = [];

    // Determine whether the href is a video link
    const isVideoLink = (href) => {
        if (!href) return false;
        return /\/(video|watch|embed|live)\b|viewkey=|\/videos\/\d+/i.test(href);
    };

    // Normalize URL (make it a full URL)
    const resolveUrl = (href) => {
        try { return new URL(href, location.href).href; } catch { return href; }
    };

    // Create floating toolbar
    const toolbar = document.createElement('div');
    toolbar.id = '__mv_toolbar__';
    toolbar.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        display: flex; align-items: center; flex-wrap: nowrap; white-space: nowrap; gap: 8px;
        background: rgba(13,13,13,0.92); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px; padding: 8px 12px;
        font-family: -apple-system, sans-serif; font-size: 12px; color: #f0f0f0;
        backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        user-select: none; cursor: grab;
    `;

    // Drag-to-move logic
    let _dragX = 0, _dragY = 0, _dragging = false;
    toolbar.addEventListener('mousedown', (e) => {
        // Don't start drag if clicking a button
        if (e.target.tagName === 'BUTTON') return;
        _dragging = true;
        _dragX = e.clientX - toolbar.getBoundingClientRect().left;
        _dragY = e.clientY - toolbar.getBoundingClientRect().top;
        toolbar.style.cursor = 'grabbing';
        toolbar.style.right = 'auto'; // switch from right/bottom to left/top positioning
        toolbar.style.bottom = 'auto';
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!_dragging) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const tw = toolbar.offsetWidth, th = toolbar.offsetHeight;
        const x = Math.min(Math.max(e.clientX - _dragX, 0), vw - tw);
        const y = Math.min(Math.max(e.clientY - _dragY, 0), vh - th);
        toolbar.style.left = x + 'px';
        toolbar.style.top  = y + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!_dragging) return;
        _dragging = false;
        toolbar.style.cursor = 'grab';
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '☑ 選擇';
    toggleBtn.style.cssText = `
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
        color: #f0f0f0; border-radius: 5px; padding: 4px 10px; font-size: 11px;
        cursor: pointer; transition: background 0.15s;
    `;

    const countLabel = document.createElement('span');
    countLabel.textContent = '已選 0';
    countLabel.style.cssText = 'color: #a78bfa; font-size: 11px; display: none;';

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '送入面板 →';
    sendBtn.style.cssText = `
        background: #c0392b; border: none; color: #fff; border-radius: 5px;
        padding: 4px 12px; font-size: 11px; cursor: pointer; display: none;
        transition: background 0.15s;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清除';
    clearBtn.style.cssText = `
        background: transparent; border: 1px solid rgba(255,255,255,0.15);
        color: #888; border-radius: 5px; padding: 4px 8px; font-size: 11px;
        cursor: pointer; display: none;
    `;

    toolbar.appendChild(toggleBtn);
    toolbar.appendChild(countLabel);
    toolbar.appendChild(sendBtn);
    toolbar.appendChild(clearBtn);

    // Load locale and set toolbar text
    const _toolbarStrings = {
        zh_TW: { select: '☑ 選擇', send: '送入面板 →', clear: '清除', count: (n) => `已選 ${n}`, reload: '擴充功能已更新，請重新整理此頁面後再試' },
        zh_CN: { select: '☑ 选择', send: '发送到面板 →', clear: '清除', count: (n) => `已选 ${n}`, reload: '扩展已更新，请刷新页面后重试' },
        en:    { select: '☑ Select', send: 'Send to Panel →', clear: 'Clear', count: (n) => `${n} selected`, reload: 'Extension updated, please refresh and try again' },
        ja:    { select: '☑ 選択', send: 'パネルに送る →', clear: 'クリア', count: (n) => `${n}件選択`, reload: '拡張機能が更新されました。ページを更新してから再試行してください' },
    };

    let _toolbarLocale = 'zh_TW';
    const _applyToolbarLocale = () => {
        const s = _toolbarStrings[_toolbarLocale] || _toolbarStrings['zh_TW'];
        toggleBtn.textContent = s.select;
        sendBtn.textContent = s.send;
        clearBtn.textContent = s.clear;
        countLabel.textContent = s.count(selectedUrls.length);
    };

    chrome.storage.local.get(['locale'], (data) => {
        _toolbarLocale = data.locale || 'zh_TW';
        _applyToolbarLocale();
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.locale) {
            _toolbarLocale = changes.locale.newValue || 'zh_TW';
            _applyToolbarLocale();
        }
    });

    const appendToolbar = () => {
        if (document.body) {
            document.body.appendChild(toolbar);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(toolbar));
        }
    };
    appendToolbar();

    // Re-clamp toolbar inside viewport (call after size may have changed)
    const clampToolbar = () => {
        requestAnimationFrame(() => {
            const vw = window.innerWidth, vh = window.innerHeight;
            const rect = toolbar.getBoundingClientRect();
            if (rect.right > vw)  toolbar.style.left = Math.max(0, vw - rect.width)  + 'px';
            if (rect.bottom > vh) toolbar.style.top  = Math.max(0, vh - rect.height) + 'px';
            if (rect.left < 0)    toolbar.style.left = '0px';
            if (rect.top  < 0)    toolbar.style.top  = '0px';
        });
    };

    const updateUI = () => {
        const n = selectedUrls.length;
        const s = _toolbarStrings[_toolbarLocale] || _toolbarStrings['zh_TW'];
        countLabel.textContent = s.count(n);
        countLabel.style.display = n > 0 ? 'inline' : 'none';
        sendBtn.style.display = n > 0 ? 'inline-block' : 'none';
        clearBtn.style.display = n > 0 ? 'inline-block' : 'none';
        toggleBtn.style.background = selectMode
            ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)';
        clampToolbar();
    };

    // Highlight thumbnail — apply to the closest card container for full coverage
    const highlightEl = (el, on) => {
        // Try to find the parent card (e.g. Pornhub: li.pcVideoListItem, YouTube: ytd-rich-item-renderer)
        const card = el.closest('li, ytd-rich-item-renderer, ytd-video-renderer, article, [class*="VideoItem"], [class*="videoItem"]') || el;
        card.style.opacity = on ? '0.35' : '';
        card.style.outline = on ? '2px solid #a78bfa' : '';
        card.style.borderRadius = on ? '6px' : '';
        card.style.transition = 'opacity 0.15s';
    };

    // Intercept clicks on video links within the page
    document.addEventListener('click', (e) => {
        if (!selectMode) return;
        const link = e.target.closest('a[href]');
        if (!link || !isVideoLink(link.getAttribute('href'))) return;

        e.preventDefault();
        e.stopPropagation();

        const url = resolveUrl(link.getAttribute('href'));
        const idx = selectedUrls.indexOf(url);
        if (idx === -1) {
            selectedUrls.push(url);
            highlightEl(link, true);
        } else {
            selectedUrls.splice(idx, 1);
            highlightEl(link, false);
        }
        updateUI();
    }, true);

    toggleBtn.addEventListener('click', () => {
        selectMode = !selectMode;
        if (!selectMode) {
            // Clear highlights when deselecting
            document.querySelectorAll('a[href]').forEach(a => highlightEl(a, false));
        }
        updateUI();
    });

    clearBtn.addEventListener('click', () => {
        document.querySelectorAll('a[href]').forEach(a => highlightEl(a, false));
        selectedUrls = [];
        updateUI();
    });

    sendBtn.addEventListener('click', () => {
        if (selectedUrls.length === 0) return;
        try {
            chrome.runtime.sendMessage({
                action: "loadUrlsToPanel",
                urls: selectedUrls
            });
        } catch (e) {
            // Extension has been reloaded; prompt the user to refresh the page
            const s = _toolbarStrings[_toolbarLocale] || _toolbarStrings['zh_TW'];
            alert(s.reload);
            return;
        }
        // Reset
        document.querySelectorAll('a[href]').forEach(a => highlightEl(a, false));
        selectedUrls = [];
        selectMode = false;
        updateUI();
    });
}

// --- 4. Message handler (for retrieving the video list) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getVideos") {
        const videos = scrapeSubscriptionVideos();
        sendResponse({ videos: videos });
    }
    return true;
});
