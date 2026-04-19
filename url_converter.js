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
    } else if (/youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\//i.test(text)) {
        const m = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^?&"'\s/]+)/i);
        if (m) {
            url = `https://www.youtube.com/embed/${m[1]}`;
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
    // URL format: /videos/some-title-NUMERIC_ID
    } else if (/xhamster/i.test(text)) {
        const m = text.match(/xhamster[^/]*\/videos\/[^?#]*?-(\d{5,})\b/i);
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

    // BitChute
    } else if (/bitchute\.com\/video\//i.test(text)) {
        const m = text.match(/bitchute\.com\/video\/([A-Za-z0-9]+)/i);
        if (m) url = `https://www.bitchute.com/embed/${m[1]}/`;

    // Odysee
    } else if (/odysee\.com\//i.test(text) && !/odysee\.com\/\$\//i.test(text)) {
        const m = text.match(/odysee\.com\/(.+)/i);
        if (m) url = `https://odysee.com/$/embed/${m[1]}`;

    // Twitch clip
    } else if (/clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\//i.test(text)) {
        const m = text.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)([^?&"'\s/]+)/i);
        if (m) {
            url = `https://clips.twitch.tv/embed?clip=${m[1]}&parent=localhost&autoplay=false`;
            embedType = 'twitch';
        }

    // Twitch VOD
    } else if (/twitch\.tv\/videos\/\d+/i.test(text)) {
        const m = text.match(/twitch\.tv\/videos\/(\d+)/i);
        if (m) {
            url = `https://player.twitch.tv/?video=${m[1]}&parent=localhost&autoplay=false`;
            embedType = 'twitch';
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
        // Twitch already has autoplay=false in the URL above; skip to avoid duplication.
        // For generic / xhamster / pornhub etc., don't add autoplay either —
        // their embed players default to click-to-play which is the desired behaviour.

        return urlObj.toString();
    } catch (e) {
        console.error('[Multi-View] Invalid embed URL:', url, e);
        return url;
    }
};
