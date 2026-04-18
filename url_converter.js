window.convertToEmbedUrl = (rawText, frameId) => {
    if (!rawText) return null;
    const text = rawText.trim();

    let url = text;

    // 1. 各種埋め込みURLへの変換
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
                        // Twitchなどは省略（必要なら追加）
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

    // http/https補完
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    // 2. パラメータ追加
    // subscreen=1 と frameId を追加して埋め込みモードであることと、どのフレームかを伝える
    // enablejsapi=1 を追加して、postMessageによる制御 (一時停止、画質変更) を可能にする
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('subscreen', '1');
        urlObj.searchParams.set('enablejsapi', '1'); // API有効化
        urlObj.searchParams.set('origin', window.location.origin); // クロスオリジンセキュリティ対策
        urlObj.searchParams.set('autoplay', '0');
        // mute 不設定，讓瀏覽器預設行為決定
        if (frameId) {
            urlObj.searchParams.set('frameId', frameId);
        }
        return urlObj.toString();
    } catch (e) {
        // URL解析失敗時はそのまま返す（またはnull）
        console.error("Invalid URL:", url);
        return url;
    }
};
