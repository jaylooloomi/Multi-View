window.convertToEmbedUrl = (rawText, frameId) => {
    if (!rawText) return null;
    const text = rawText.trim();

    let url = text;

    // 1. Convert to various embed URLs
    const genericIframeMatch = text.match(/src="([^"]+)"/);
    if (genericIframeMatch && genericIframeMatch[1]) {
        url = genericIframeMatch[1];
    } else {
        const ytMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^?&"'\s/]+)/i);
        if (ytMatch) {
            url = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
        } else {
            const nicoMatch = text.match(/(?:nicovideo\.jp\/watch\/|mosasaur\.nicovideo\.jp\/watch\/)(sm|so|nm)?(\d+)/i);
            if (nicoMatch) {
                url = `https://embed.nicovideo.jp/watch/${nicoMatch[1] || ''}${nicoMatch[2]}`;
            } else {
                const vimeoMatch = text.match(/vimeo\.com\/(\d+)/i);
                if (vimeoMatch) {
                    url = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                } else {
                    const tiktokMatch = text.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?[^\/]+\/video\/(\d+)/i);
                    if (tiktokMatch) {
                        const baseUrl = text.split('?')[0];
                        url = baseUrl;
                    } else {
                        const phMatch = text.match(/pornhub\.com\/view_video\.php\?viewkey=([a-zA-Z0-9]+)/i);
                        if (phMatch) {
                            url = `https://www.pornhub.com/embed/${phMatch[1]}`;
                        }
                        // Twitch etc. omitted (add if needed)
                        const parentParam = 'localhost';
                        const twitchClipMatch = text.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)([^?&"'\s/]+)/i);
                        if (twitchClipMatch) {
                            url = `https://clips.twitch.tv/embed?clip=${twitchClipMatch[1]}&parent=${parentParam}&autoplay=true`;
                        }
                        const twitchVideoMatch = text.match(/twitch\.tv\/videos\/(\d+)/i);
                        if (twitchVideoMatch) {
                            url = `https://player.twitch.tv/?video=${twitchVideoMatch[1]}&parent=${parentParam}&autoplay=true`;
                        }
                    }
                }
            }
        }
    }

    // Prepend http/https if missing
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    // 2. Add parameters
    // Add subscreen=1 and frameId to indicate embed mode and which frame this is
    // Add enablejsapi=1 to enable control via postMessage (pause, quality change, etc.)
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('subscreen', '1');
        urlObj.searchParams.set('enablejsapi', '1'); // Enable API
        urlObj.searchParams.set('origin', window.location.origin); // Cross-origin security measure
        urlObj.searchParams.set('autoplay', '0');
        // mute not set — let the browser's default behavior decide
        if (frameId) {
            urlObj.searchParams.set('frameId', frameId);
        }
        return urlObj.toString();
    } catch (e) {
        // On URL parse failure, return as-is (or null)
        console.error("Invalid URL:", url);
        return url;
    }
};
