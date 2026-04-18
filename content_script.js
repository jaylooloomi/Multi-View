/**
 * YouTube Multi Auto Playlist - Content Script
 * 役割:
 * 1. 登録チャンネルページ等からの動画リスト抽出 (Auto_Playlist機能)
 * 2. サイドパネル内iframeでの動画再生制御と不要要素の削除 (My_Subscreens機能)
 * 3. 動画終了の検知とバックグラウンド(サイドパネル)への通知
 */

// --- 1. 動画リスト抽出機能 (Auto_Playlist由来) ---

function scrapeSubscriptionVideos() {
    console.log("[MultiPlaylist] Scraping started (Universal Title Recovery Mode)...");

    const isDuration = (text) => /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(text.trim());

    // より広範なコンテナセレクタ
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
        // 1. リンクと動画IDの特定
        const linkEl = el.querySelector("a#video-title-link") ||
            el.querySelector("a[href*='/watch?v=']") ||
            el.querySelector("a[href*='/live/']") ||
            el.querySelector("a#thumbnail");

        if (!linkEl) {
            // デバッグ用ログ: どのセレクタで失敗したか確認
            // console.log(`[MultiPlaylist] Video element ${index} skipped: No main link found. Content:`, el.innerHTML.substring(0, 100));
            return;
        }

        let videoId = "";
        const href = linkEl.getAttribute("href") || "";
        if (href.includes("watch?v=")) videoId = href.split("v=")[1]?.split("&")[0];
        else if (href.includes("/live/")) videoId = href.split("/live/")[1]?.split("?")[0];

        if (!videoId) return;
        if (seenIds.has(videoId)) return;

        // 2. タイトルの特定 (Auto_Playlist_Toolロジック)
        let title = "";

        // 候補1: aria-label
        const ariaLabel = linkEl.getAttribute("aria-label");
        if (ariaLabel) {
            // " by [Channel]" や "による" を削除
            // 日本語の "による" = \u306B\u3088\u308B
            title = ariaLabel.split(" \u306B\u3088\u308B")[0];
            title = title.split(" by ")[0];
            title = title.trim();
            if (title && !isDuration(title)) {
                // Success
            } else {
                title = "";
            }
        }

        // 候補2: title属性
        if (!title || title === "No Title") {
            const titleAttr = linkEl.getAttribute("title") ||
                (el.querySelector("#video-title")?.getAttribute("title")) || "";
            if (titleAttr && !isDuration(titleAttr)) {
                title = titleAttr;
            }
        }

        // 候補3: innerText
        if (!title || title === "No Title") {
            const titleEl = el.querySelector("#video-title") || el.querySelector("yt-formatted-string");
            if (titleEl) {
                const txt = titleEl.innerText.trim();
                if (txt && !isDuration(txt)) {
                    title = txt;
                }
            }
        }

        // 候補4: 最終手段（コンテナ内のまともなテキスト）
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
            originalIndex: videos.length // ソート用に元の並び順を保存
        });
    });

    console.log(`[MultiPlaylist] Scraped ${videos.length} videos. Titles verified.`);
    return videos;
}


// --- 2. サイドパネル内iframe動作モード (My_Subscreens由来 + 追加機能) ---

const params = new URLSearchParams(window.location.search);
const isSubscreen = params.get("subscreen") === "1";
const frameId = params.get("frameId"); // サイドパネルから渡されるフレーム識別子 (1~4)

if (isSubscreen) {
    console.log(`[MultiPlaylist] Running in subscreen mode. Frame: ${frameId}`);

    // スタイル注入: 全画面黒背景、プレイヤー以外非表示
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

        // 再生制御と終了通知
        let hasStarted = false;

        const monitorPlayback = () => {
            const video = document.querySelector('video');
            if (!video) return;

            // 自動再生の補助
            if (video.paused && !hasStarted) {
                video.play().then(() => hasStarted = true).catch(() => {
                    // 自動再生ブロック時はクリック待ち (まあサイドパネル内なので緩いかも)
                });
            } else if (!video.paused) {
                hasStarted = true;
            }

            // 終了検知
            if (video.ended) {
                console.log(`[MultiPlaylist] Video ended in Frame ${frameId}. Notifying parent.`);
                // 連続送信を防ぐため、少し待機するか、メッセージを送って遷移を待つ
                // ここではメッセージを投げるだけ。遷移はサイドパネルがやる。
                chrome.runtime.sendMessage({
                    action: "videoEnded",
                    frameId: frameId,
                    videoId: params.get("v")
                });
                // 再度通知しないようにリスナーを解除するか、videoの状態が変わるのを待つ
                // ただし、同じvideo要素が再利用されることもあるので、シンプルにendedイベントのみでも良いが、
                // ポーリングしているのでフラグ管理が必要かも。
                // とりあえず video.ended は true のままなので、連続送信されうる。
                // サイドパネル側でデバウンスした方が安全。
            }
        };

        // イベントリスナーベースに変更（ポーリングより軽い）
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

        setInterval(setupVideoListener, 1000); // videoタグが生成されるのを待つ
    }

    // 全プラットフォーム共通: video ended 監視
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

                // embed iframe 環境で強制ミュートされる場合があるため unmute する
                video.muted = false;
                video.addEventListener("volumechange", () => {
                    if (video.muted) video.muted = false;
                });
            }
        };
        setInterval(setupVideoListenerGeneric, 1000);
    }

    // 親(sidepanel)からの制御メッセージを受け取る (全プラットフォーム共通)
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

                // 一度も再生されていない → プラットフォームのボタンをクリック
                if (video.played.length === 0) {
                    const platformBtn = document.querySelector('.mgp_playIcon');
                    if (platformBtn) { platformBtn.click(); return; }
                }

                // 再生済み（一時停止中）→ video.play() で制御可能
                video.play().catch(e => console.error("Play failed:", e));
            }
            if (data.event === 'command' && data.func === 'pauseVideo') {
                const video = document.querySelector('video');
                if (video) video.pause();
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
            // 無視
        }
    });
}

// --- 3. 選択モード UI (サイドパネル外のページに注入) ---
if (!isSubscreen) {
    let selectMode = false;
    let selectedUrls = [];

    // ビデオリンクかどうか判定
    const isVideoLink = (href) => {
        if (!href) return false;
        return /\/(video|watch|embed|live)\b|viewkey=|\/videos\/\d+/i.test(href);
    };

    // URLを正規化（フルURLにする）
    const resolveUrl = (href) => {
        try { return new URL(href, location.href).href; } catch { return href; }
    };

    // 浮動ツールバーを作成
    const toolbar = document.createElement('div');
    toolbar.id = '__mv_toolbar__';
    toolbar.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        display: flex; align-items: center; gap: 8px;
        background: rgba(13,13,13,0.92); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px; padding: 8px 12px;
        font-family: -apple-system, sans-serif; font-size: 12px; color: #f0f0f0;
        backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        user-select: none;
    `;

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

    const appendToolbar = () => {
        if (document.body) {
            document.body.appendChild(toolbar);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(toolbar));
        }
    };
    appendToolbar();

    const updateUI = () => {
        const n = selectedUrls.length;
        countLabel.textContent = `已選 ${n}`;
        countLabel.style.display = n > 0 ? 'inline' : 'none';
        sendBtn.style.display = n > 0 ? 'inline-block' : 'none';
        clearBtn.style.display = n > 0 ? 'inline-block' : 'none';
        toggleBtn.style.background = selectMode
            ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)';
    };

    // サムネイルのハイライト
    const highlightEl = (el, on) => {
        el.style.outline = on ? '3px solid #a78bfa' : '';
        el.style.outlineOffset = on ? '2px' : '';
        el.style.borderRadius = on ? '4px' : '';
    };

    // ページ内のビデオリンクをクリックインターセプト
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
            // 選択解除時にハイライトをクリア
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
            // 擴充功能已重新載入，提示使用者刷新頁面
            alert('擴充功能已更新，請重新整理此頁面後再試');
            return;
        }
        // リセット
        document.querySelectorAll('a[href]').forEach(a => highlightEl(a, false));
        selectedUrls = [];
        selectMode = false;
        updateUI();
    });
}

// --- 4. メッセージハンドラ (リスト取得用) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getVideos") {
        const videos = scrapeSubscriptionVideos();
        sendResponse({ videos: videos });
    }
    return true;
});
