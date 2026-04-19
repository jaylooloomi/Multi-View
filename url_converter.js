window.convertToEmbedUrl = (rawText, frameId) => {
    if (!rawText) return null;
    const text = rawText.trim();

    let url = text;
    let embedType = 'generic'; // 'youtube' | 'generic' | 'twitch'

    // ── 1. Detect & convert to embed URL ────────────────────────────────────

    // Generic <iframe src="..."> paste
    const genericIframeMatch = text.match(/src="([^"]+)"/);
    if (genericIframeMatch && genericIframeMatch[1]) {
        url = genericIframeMatch[1];

    // YouTube  (/watch, /live, youtu.be)
    // IMPORTANT: keep watch?v= format — /embed/ triggers Error 153 in the side-panel context.
    } else if (/youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\//i.test(text)) {
        const m = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^?&"'\s/]+)/i);
        if (m) {
            url = `https://www.youtube.com/watch?v=${m[1]}`;
            embedType = 'youtube';
        }

    // NicoNico
    } else if (/nicovideo\.jp\/watch\//i.test(text)) {
        const m = text.match(/nicovideo\.jp\/watch\/((?:sm|so|nm)?\d+)/i);
        if (m) url = `https://embed.nicovideo.jp/watch/${m[1]}`;

    // Vimeo
    } else if (/vimeo\.com\/\d+/i.test(text)) {
        const m = text.match(/vimeo\.com\/(\d+)/i);
        if (m) url = `https://player.vimeo.com/video/${m[1]}`;

    // TikTok  (no embed — use page URL, TikTok blocks iframes anyway)
    } else if (/tiktok\.com\/@?[^/]+\/video\/\d+/i.test(text)) {
        url = text.split('?')[0];

    // PornHub
    } else if (/pornhub\.com\/view_video\.php\?viewkey=/i.test(text)) {
        const m = text.match(/pornhub\.com\/view_video\.php\?viewkey=([a-zA-Z0-9]+)/i);
        if (m) url = `https://www.pornhub.com/embed/${m[1]}`;

    // XHamster  (xhamster.com / xhamster.desi / xhamster.one)
    // Old URL format: /videos/some-title-12345678   (trailing numeric ID)
    // New URL format: /videos/some-title-xhhpJ9Y    (trailing alphanumeric ID, e.g. 6-8 chars mixed)
    // The ID is always the last hyphen-separated segment of the path before any ? or #.
    } else if (/xhamster/i.test(text)) {
        const m = text.match(/xhamster[^/]*\/videos\/[^?#/]*-([A-Za-z0-9]{5,})(?:[/?#]|$)/i);
        if (m) url = `https://xhamster.com/xembed.php?video=${m[1]}`;

    // XVideos — blocked by X-Frame-Options: sameorigin on embedframe too.
    // We convert the URL so users at least get a clear error instead of the wrong page.
    // Format A: /video12345678/title  (numeric)
    // Format B: /video.ALPHANUM/title (newer)
    } else if (/xvideos\.com\/video/i.test(text)) {
        const mNum  = text.match(/xvideos\.com\/video(\d+)\//i);
        const mAlph = text.match(/xvideos\.com\/video\.([A-Za-z0-9]+)\//i);
        if (mNum)  url = `https://www.xvideos.com/embedframe/${mNum[1]}`;
        else if (mAlph) url = `https://www.xvideos.com/embedframe/${mAlph[1]}`;

    // XNXX: https://www.xnxx.com/video-ALPHANUM/title → /embedframe/ALPHANUM
    } else if (/xnxx\.com\/video/i.test(text)) {
        const m = text.match(/xnxx\.com\/video-([A-Za-z0-9]+)\//i);
        if (m) url = `https://www.xnxx.com/embedframe/${m[1]}`;

    // BitChute
    } else if (/bitchute\.com\/video\//i.test(text)) {
        const m = text.match(/bitchute\.com\/video\/([A-Za-z0-9]+)/i);
        if (m) url = `https://www.bitchute.com/embed/${m[1]}/`;

    // Odysee
    } else if (/odysee\.com\//i.test(text) && !/odysee\.com\/\$\//i.test(text)) {
        const m = text.match(/odysee\.com\/(.+)/i);
        if (m) url = `https://odysee.com/$/embed/${m[1]}`;

    // Rule34Video — embed format: rule34video.com/embed/VIDEO_ID
    // Video page:  rule34video.com/videos/VIDEO_ID/title/
    } else if (/rule34video\.com\/videos\/\d+/i.test(text)) {
        const m = text.match(/rule34video\.com\/videos\/(\d+)/i);
        if (m) url = `https://rule34video.com/embed/${m[1]}`;

    // Twitch — use plain iframe.src with parent=localhost for extension contexts
    } else if (/twitch\.tv\/|clips\.twitch\.tv\//i.test(text)) {
        embedType = 'twitch';
        // Clip: clips.twitch.tv/SLUG  OR  twitch.tv/CHANNEL/clip/SLUG
        const clipM = text.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/[^/]+\/clip\/)([^?&"'\s/]+)/i);
        if (clipM) { url = `https://clips.twitch.tv/embed?clip=${clipM[1]}&parent=localhost&autoplay=false`; }
        else {
            // VOD: twitch.tv/videos/ID
            const vodM = text.match(/twitch\.tv\/videos\/(\d+)/i);
            if (vodM) { url = `https://player.twitch.tv/?video=${vodM[1]}&parent=localhost&autoplay=false`; }
            else {
                // Channel (live stream): twitch.tv/CHANNELNAME
                const chM = text.match(/twitch\.tv\/([A-Za-z0-9_]+)/i);
                if (chM) {
                    const reserved = ['videos','clips','directory','downloads','jobs','p','settings','subscriptions','wallet'];
                    if (!reserved.includes(chM[1].toLowerCase())) {
                        url = `https://player.twitch.tv/?channel=${chM[1]}&parent=localhost&autoplay=false`;
                    }
                }
            }
        }
    }

    // Prepend https:// if scheme is missing
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;

    // ── 2. Append parameters ─────────────────────────────────────────────────
    // Only YouTube gets enablejsapi / origin (they are YouTube-IFrame-API params).
    // Other embeds must NOT receive origin=chrome-extension://... — it causes them
    // to detect a non-allowlisted host and fall back to opening the video page.
    try {
        const urlObj = new URL(url);

        // Marker so the embedded page knows it's inside Multi-View
        urlObj.searchParams.set('subscreen', '1');

        if (frameId) urlObj.searchParams.set('frameId', frameId);

        if (embedType === 'youtube') {
            urlObj.searchParams.set('enablejsapi', '1');
            urlObj.searchParams.set('origin', window.location.origin);
            urlObj.searchParams.set('autoplay', '0');
        }
        // Twitch: add subscreen=1 so content_script.js suppresses the toolbar injection.
        // The other extra params (enablejsapi, origin, autoplay) are NOT added because
        // Twitch does not recognise them and they do not break the URL.
        // autoplay=false is already embedded in the URL string itself.
        // For generic / xhamster / pornhub etc., don't add autoplay either —
        // their embed players default to click-to-play which is the desired behaviour.

        return urlObj.toString();
    } catch (e) {
        console.error('[Multi-View] Invalid embed URL:', url, e);
        return url;
    }
};
