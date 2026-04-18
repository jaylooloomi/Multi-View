// YouTube Multi Auto Playlist - Side Panel Logic

let videoList = [];
let nextGlobalIndex = 0; // 次に割り当てるべきリストのインデックス
let screenCount = 4;
let isAutoPlay = true;
let savedGroups = [];

// 各フレームの状態管理
const frameStates = {
    1: { videoId: null, listIndex: -1, isProcessing: false },
    2: { videoId: null, listIndex: -1, isProcessing: false },
    3: { videoId: null, listIndex: -1, isProcessing: false },
    4: { videoId: null, listIndex: -1, isProcessing: false },
    5: { videoId: null, listIndex: -1, isProcessing: false },
    6: { videoId: null, listIndex: -1, isProcessing: false },
    7: { videoId: null, listIndex: -1, isProcessing: false },
    8: { videoId: null, listIndex: -1, isProcessing: false },
    9: { videoId: null, listIndex: -1, isProcessing: false }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    // レイアウト切替ボタン
    document.getElementById('layout-2x2').addEventListener('click', () => {
        setLayout(4);
        document.getElementById('layout-2x2').classList.add('active');
        document.getElementById('layout-3x3').classList.remove('active');
    });
    document.getElementById('layout-3x3').addEventListener('click', () => {
        setLayout(9);
        document.getElementById('layout-3x3').classList.add('active');
        document.getElementById('layout-2x2').classList.remove('active');
    });

    // 清空ボタン
    document.getElementById('btn-clear-all').addEventListener('click', stopAllVideos);

    // 記憶ボタン
    document.getElementById('btn-save-group').addEventListener('click', saveGroup);

    // 各フレームのコントロール
    for (let i = 1; i <= 9; i++) {
        // + ボタン: URLオーバーレイを表示
        document.querySelector(`.plus-circle[data-frame="${i}"]`).addEventListener('click', () => {
            showInputOverlay(i);
        });
        // 取消ボタン
        document.querySelector(`.cancel-btn[data-frame="${i}"]`).addEventListener('click', () => {
            hideInputOverlay(i);
        });
        // 播放ボタン
        document.querySelector(`.load-btn[data-frame="${i}"]`).addEventListener('click', () => {
            const input = document.getElementById(`url${i}`);
            loadUrlToFrame(i, input.value);
        });
        // Input Enterキー
        document.getElementById(`url${i}`).addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loadUrlToFrame(i, e.target.value);
        });
        // Nextボタン
        document.querySelector(`.skip-btn[data-frame="${i}"]`).addEventListener('click', () => {
            playNextVideo(i);
        });
        // Playボタン
        document.querySelector(`.play-btn[data-frame="${i}"]`).addEventListener('click', () => {
            sendMessageToFrame(i, 'playVideo');
        });
        // Pauseボタン
        document.querySelector(`.pause-btn[data-frame="${i}"]`).addEventListener('click', () => {
            sendMessageToFrame(i, 'pauseVideo');
        });
        // Reloadボタン
        const reloadBtn = document.querySelector(`.reload-btn[data-frame="${i}"]`);
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                reloadFrame(i);
            });
        }
        // Stopボタン
        document.querySelector(`.stop-btn[data-frame="${i}"]`).addEventListener('click', () => {
            stopFrame(i);
        });

        // ドラッグ&ドロップ
        const card = document.getElementById(`wrapper${i}`);
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');

            // URL を取得（優先順位: uri-list > plain text > html 內的 href）
            let url = e.dataTransfer.getData('text/uri-list') ||
                      e.dataTransfer.getData('text/plain') || '';

            if (!url) {
                const html = e.dataTransfer.getData('text/html');
                const match = html && html.match(/href="([^"]+)"/);
                if (match) url = match[1];
            }

            url = url.trim().split('\n')[0].trim(); // 多行時取第一行
            if (url) loadUrlToFrame(i, url);
        });
    }

    // メッセージ受信 (動画終了検知)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "videoEnded") {
            const frameId = parseInt(request.frameId);
            if (frameId && isAutoPlay) {
                console.log(`[SidePanel] Frame ${frameId} finished. Waiting 3s before playing next.`);
                setTimeout(() => {
                    playNextVideo(frameId);
                }, 3000);
            }
        }
        // Handshake removed
    });

}

function loadSettings() {
    chrome.storage.local.get(['videoList', 'nextGlobalIndex', 'screenCount', 'savedGroups'], (data) => {
        if (data.videoList) videoList = data.videoList;
        if (data.nextGlobalIndex !== undefined) nextGlobalIndex = data.nextGlobalIndex;
        if (data.screenCount) screenCount = data.screenCount;
        if (data.savedGroups) savedGroups = data.savedGroups;

        const is3x3 = screenCount === 9;
        document.getElementById('layout-2x2').classList.toggle('active', !is3x3);
        document.getElementById('layout-3x3').classList.toggle('active', is3x3);

        setLayout(screenCount);
        renderVideoList();
        renderGroups();
    });
}

function saveSettings() {
    chrome.storage.local.set({
        videoList: videoList,
        nextGlobalIndex: nextGlobalIndex,
        screenCount: screenCount
    });
}

// ── 記憶グループ ──────────────────────────────

function saveGroup() {
    if (savedGroups.length >= 10) {
        alert('最多只能儲存 10 組記憶，請先刪除一組');
        return;
    }

    const urls = [];
    for (let i = 1; i <= screenCount; i++) {
        urls.push(document.getElementById(`url${i}`)?.value || '');
    }

    if (urls.every(u => !u)) {
        alert('目前沒有影片可以記憶');
        return;
    }

    const group = {
        id: Date.now(),
        name: `群組 ${savedGroups.length + 1}`,
        urls: urls,
        screenCount: screenCount
    };

    savedGroups.push(group);
    chrome.storage.local.set({ savedGroups });
    renderGroups();
}

function loadGroup(id) {
    const group = savedGroups.find(g => g.id === id);
    if (!group) return;

    stopAllVideos();

    // レイアウトが違う場合は切り替え
    if (group.screenCount !== screenCount) {
        const is3x3 = group.screenCount === 9;
        setLayout(group.screenCount);
        document.getElementById('layout-2x2').classList.toggle('active', !is3x3);
        document.getElementById('layout-3x3').classList.toggle('active', is3x3);
    }

    setTimeout(() => {
        group.urls.forEach((url, idx) => {
            const frameId = idx + 1;
            if (url) loadUrlToFrame(frameId, url);
        });
    }, 300);
}

function deleteGroup(id) {
    savedGroups = savedGroups.filter(g => g.id !== id);
    // 名前を振り直す
    savedGroups.forEach((g, idx) => { g.name = `群組 ${idx + 1}`; });
    chrome.storage.local.set({ savedGroups });
    renderGroups();
}

function renderGroups() {
    const bar = document.getElementById('groups-bar');
    bar.innerHTML = '';

    savedGroups.forEach(group => {
        const chip = document.createElement('div');
        chip.className = 'group-chip';

        const loadBtn = document.createElement('button');
        loadBtn.className = 'group-chip-load';
        loadBtn.textContent = group.name;
        loadBtn.title = group.urls.filter(u => u).join('\n');
        loadBtn.addEventListener('click', () => loadGroup(group.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'group-chip-del';
        delBtn.textContent = '×';
        delBtn.title = '刪除';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteGroup(group.id);
        });

        chip.appendChild(loadBtn);
        chip.appendChild(delBtn);
        bar.appendChild(chip);
    });

    bar.style.display = savedGroups.length > 0 ? 'flex' : 'none';
}

// ── Placeholder / Overlay helpers ─────────────────────

function showPlaceholder(frameId) {
    const ph = document.getElementById(`placeholder${frameId}`);
    if (ph) ph.style.display = 'flex';
    const card = document.getElementById(`wrapper${frameId}`);
    if (card) card.classList.remove('has-video');
}

function hidePlaceholder(frameId) {
    const ph = document.getElementById(`placeholder${frameId}`);
    if (ph) ph.style.display = 'none';
    const card = document.getElementById(`wrapper${frameId}`);
    if (card) card.classList.add('has-video');
}

function showInputOverlay(frameId) {
    const overlay = document.getElementById(`input-overlay${frameId}`);
    if (overlay) {
        overlay.classList.add('visible');
        const input = document.getElementById(`url${frameId}`);
        if (input) { input.value = ''; input.focus(); }
    }
}

function hideInputOverlay(frameId) {
    const overlay = document.getElementById(`input-overlay${frameId}`);
    if (overlay) overlay.classList.remove('visible');
}

// Debug logging system removed.

function setLayout(count) {
    screenCount = count;
    const grid = document.getElementById('video-grid');
    grid.className = `video-grid count-${count}`;

    for (let i = 1; i <= 9; i++) {
        const wrapper = document.getElementById(`wrapper${i}`);
        if (i <= count) {
            wrapper.style.display = 'flex';
        } else {
            wrapper.style.display = 'none';
            stopFrame(i);
        }
    }
    saveSettings();
}

// 後方互換性のため
function updateScreenCount(count) {
    setLayout(count);
}

function sortList(descending) {
    if (videoList.length === 0) return;

    // originalIndex (取得順) を基準にソート
    // 動画にoriginalIndexがない場合（古いバージョンのキャッシュなど）はtimestampを使う
    videoList.sort((a, b) => {
        const idxA = a.originalIndex !== undefined ? a.originalIndex : (a.timestamp || 0);
        const idxB = b.originalIndex !== undefined ? b.originalIndex : (b.timestamp || 0);

        return descending ? idxB - idxA : idxA - idxB;
    });

    nextGlobalIndex = 0;
    renderVideoList();
    saveSettings();
}

function fetchVideoList() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        chrome.tabs.sendMessage(tabs[0].id, { action: "getVideos" }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("Runtime error or script not ready. Injecting content script...", chrome.runtime.lastError.message);
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id, allFrames: true },
                    files: ["content_script.js"]
                }, () => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "getVideos" }, (res2) => {
                        handleVideoListResponse(res2);
                    });
                });
            } else {
                handleVideoListResponse(response);
            }
        });
    });
}

function handleVideoListResponse(response) {
    if (response && response.videos && response.videos.length > 0) {
        videoList = response.videos;
        nextGlobalIndex = 0;
        renderVideoList();
        document.getElementById('list-status').innerText = `Videos: ${videoList.length}`;
        saveSettings();

        // 自動スタートは廃止 (ユーザー要望: 再生する最初の動画はこちらで選びます)
        // distributeVideosToEmptyFrames(); 
    } else {
        console.warn("No videos found in response:", response);
        alert("No videos found. Please check if you are on a YouTube subscription or playlist page.");
    }
}

function renderVideoList() {
    const listContainer = document.getElementById('video-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (videoList.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No videos loaded</div>';
        return;
    }

    videoList.forEach((video, index) => {
        const div = document.createElement('div');
        div.className = 'video-item';
        if (index < nextGlobalIndex) div.classList.add('played');

        Object.values(frameStates).forEach(state => {
            if (state.listIndex === index) div.classList.add('active');
        });

        div.innerText = `${index + 1}. ${video.title}`;
        div.title = video.title;

        // クリック時: どこで再生するか？
        // 空いているフレームがあればそこで再生。なければフレーム1で強制再生。
        div.addEventListener('click', () => {
            playVideoByIndex(index);
        });

        listContainer.appendChild(div);
    });
}

function playVideoByIndex(index) {
    if (index < 0 || index >= videoList.length) return;

    // 空いているフレームを探す
    let targetFrameId = 1;
    let foundEmpty = false;

    // 現在の screenCount の範囲内で探す
    for (let i = 1; i <= screenCount; i++) {
        const iframe = document.getElementById(`screen${i}`);
        if (iframe.src === "about:blank") {
            targetFrameId = i;
            foundEmpty = true;
            break;
        }
    }

    // 空いてなければフレーム1 (デフォルト)
    const video = videoList[index];

    // nextGlobalIndex をクリックした動画のインデックスに設定
    // playNextVideo関数内でこれが使用され、再生後にインクリメントされる
    nextGlobalIndex = index;

    // 直接ロードせず、キューシステムを通すために playNextVideo を使用する
    // これにより、連打しても順番待ちになりフリーズを防げる
    playNextVideo(targetFrameId);

    // リスト自動整理 (一時停止)
    // cleanupPlaylist();
    saveSettings();
}

// ■ 読み込み制御用キューシステム
let videoLoadQueue = []; // 読み込み待ちのフレームIDリスト
let isGlobalLoading = false; // 現在どこかのフレームが読み込み処理中か

function playNextVideo(frameId) {
    // 重複チェック: 既にキューにあるか、処理中なら何もしない
    if (videoLoadQueue.includes(frameId) || frameStates[frameId].isProcessing) {
        console.log(`[Queue] Frame ${frameId} skipped (queued/processing).`);
        return;
    }

    // キューに追加
    console.log(`[Queue] Enqueue Frame ${frameId}`);
    videoLoadQueue.push(frameId);
    updateStatusDisplay(); // 表示更新

    frameStates[frameId].isProcessing = true; // 予約済み状態にする

    // キュー処理開始
    processLoadQueue();
}

function updateStatusDisplay() {
    const statusEl = document.getElementById('list-status');
    if (statusEl) {
        let text = `Videos: ${videoList.length}`;
        if (videoLoadQueue.length > 0 || isGlobalLoading) {
            text += ` | Queue: ${videoLoadQueue.length} (Processing)`;
        }
        statusEl.innerText = text;
    }
}

function processLoadQueue() {
    // 既に他のロードが走っている、またはキューが空なら何もしない
    if (isGlobalLoading || videoLoadQueue.length === 0) {
        updateStatusDisplay();
        return;
    }

    isGlobalLoading = true;
    updateStatusDisplay();

    const frameId = videoLoadQueue.shift(); // 先頭を取り出す
    console.log(`[Queue] Msg: Start processing Frame ${frameId}`);

    if (nextGlobalIndex >= videoList.length) {
        console.log("End of list reached.");
        frameStates[frameId].isProcessing = false;
        isGlobalLoading = false;
        processLoadQueue(); // 次があれば処理
        return;
    }

    // 【強化】リセット処理の3段階化 (ソフトストップ導入) - Timer Reverted
    // 0. まずiframeの中身(YouTube)に「動画リソースを捨てろ」と命令する
    sendMessageToFrame(frameId, 'releaseVideo');

    // 0.8秒待ってから物理リセット (コマンドが届いて処理されるのを待つ - Handshake撤去に伴い固定ウェイト)
    setTimeout(() => {

        // 1. 既存のiframeを空ページに遷移
        const oldIframe = document.getElementById(`screen${frameId}`);
        if (oldIframe) {
            oldIframe.src = "about:blank";
        }

        // 2. 0.2秒待ってからDOM再適用
        setTimeout(() => {
            // iframe再設定
            recreateIframe(frameId);

            // 3. 1.0秒待ってからロード開始
            setTimeout(() => {
                const video = videoList[nextGlobalIndex];
                const currentIndex = nextGlobalIndex;
                nextGlobalIndex++;

                loadVideoToFrame(frameId, video, currentIndex);
                saveSettings();

                // 読み込み完了とみなすまでのインターバル (3秒)
                // YouTubeの初期化負荷が落ち着くまで次のロードを待たせる
                setTimeout(() => {
                    console.log(`[Queue] Frame ${frameId} sequence done. Next?`);

                    frameStates[frameId].isProcessing = false;
                    isGlobalLoading = false;

                    // 次のキューを処理
                    updateStatusDisplay();
                    processLoadQueue();
                }, 3000);

            }, 1000);
        }, 200); // Step 2 (recreate) 待ち時間

    }, 800); // Step 0 (release) 待ち時間
}

// startReleaseWait and proceedToReset removed

// iframeを再利用・リセットするヘルパー (DOM破壊を避ける)
function recreateIframe(frameId) {
    const wrapper = document.getElementById(`wrapper${frameId}`);
    const box = wrapper.querySelector('.screen-box');
    let iframe = document.getElementById(`screen${frameId}`);

    if (!iframe) {
        // 存在しない場合のみ新規作成
        iframe = document.createElement('iframe');
        iframe.id = `screen${frameId}`;
        iframe.allow = "autoplay; encrypted-media; fullscreen";
        // iframe.style.border = "none"; // 必要なら
        box.appendChild(iframe);
    }

    // 念のため属性を再適用（既存の場合も）
    iframe.allow = "autoplay; encrypted-media; fullscreen";

    // srcをリセット (まだblankでなければ)
    // 呼び出し元ですでに blank にされていることが多いが、stopFrame等からの呼び出し用
    if (iframe.src !== "about:blank") {
        iframe.src = "about:blank";
    }
}

function cleanupPlaylist() {
    // nextGlobalIndex が現在の「これから再生する先頭」。
    // 再生済みの動画は 0 ～ nextGlobalIndex-1 にある。
    // 「そこから10個以上古いもの」を削除したい。
    // つまり、nextGlobalIndex - 10 より前のインデックスのものを消す。

    const keepMargin = 10;
    // 削除対象の終端インデックス (これ未満を消す)
    const deleteThreshold = nextGlobalIndex - keepMargin;

    if (deleteThreshold > 0) {
        // 削除実行
        // deleteThreshold 個の要素を先頭から削除
        videoList.splice(0, deleteThreshold);

        console.log(`[Cleanup] Deleted ${deleteThreshold} played videos.`);

        // インデックスの補正
        // nextGlobalIndex も前にずれる
        nextGlobalIndex -= deleteThreshold;
        if (nextGlobalIndex < 0) nextGlobalIndex = 0;

        // 各フレームの再生中インデックスも補正
        Object.keys(frameStates).forEach(key => {
            const state = frameStates[key];
            if (state.listIndex !== -1) {
                state.listIndex -= deleteThreshold;
                // もし削除された範囲に含まれていたら（負になったら）、
                // もうリスト上にはないが、再生中なのでそのままにするか、-1にするか。
                // UI上のハイライトが消えるだけなので許容。
                if (state.listIndex < 0) state.listIndex = -1;
            }
        });

        renderVideoList();
    }
}

function loadVideoToFrame(frameId, video, listIndex) {
    const iframe = document.getElementById(`screen${frameId}`);
    const finalUrl = window.convertToEmbedUrl(video.url, frameId);

    if (finalUrl) {
        iframe.src = finalUrl;
        frameStates[frameId] = { videoId: video.id, listIndex: listIndex };
        document.getElementById(`url${frameId}`).value = video.url;
        hidePlaceholder(frameId);
        hideInputOverlay(frameId);
        renderVideoList();
    }
}

function loadUrlToFrame(frameId, rawUrl) {
    if (!rawUrl) return;

    const finalUrl = window.convertToEmbedUrl(rawUrl, frameId);
    if (finalUrl) {
        document.getElementById(`screen${frameId}`).src = finalUrl;
        document.getElementById(`url${frameId}`).value = rawUrl;
        frameStates[frameId] = { videoId: null, listIndex: -1 };
        hidePlaceholder(frameId);
        hideInputOverlay(frameId);
        renderVideoList();
    }
}


// clearReleaseState removed

function stopFrame(frameId) {
    frameStates[frameId].isProcessing = false;
    videoLoadQueue = videoLoadQueue.filter(id => id !== frameId);
    console.log(`[Queue] Removed Frame ${frameId} from queue.`);

    recreateIframe(frameId);

    document.getElementById(`url${frameId}`).value = "";
    showPlaceholder(frameId);
    hideInputOverlay(frameId);

    frameStates[frameId] = { videoId: null, listIndex: -1, isProcessing: false };
    renderVideoList();
}

function reloadFrame(frameId) {
    console.log(`[SidePanel] Reloading frame ${frameId}...`);

    // 強制ロック解除 & グローバルロックも解除 (詰まり防止)
    // clearReleaseState(frameId); // Removed
    frameStates[frameId].isProcessing = false;
    // リロード時は強制的に割り込むため、グローバルロックは触らないか、
    // もしくはキューが詰まっているならリセットする等の配慮が必要だが、
    // いったん個別のロック解除のみにする。

    const currentState = frameStates[frameId];
    const currentUrlInput = document.getElementById(`url${frameId}`).value;

    // iframe再生成 (リセット)
    recreateIframe(frameId);

    // 0.1秒待ってから再ロード (DOM反映待ち)
    setTimeout(() => {
        if (currentState.listIndex !== -1 && videoList[currentState.listIndex]) {
            const video = videoList[currentState.listIndex];
            loadVideoToFrame(frameId, video, currentState.listIndex);
        } else if (currentUrlInput) {
            loadUrlToFrame(frameId, currentUrlInput);
        } else {
            showPlaceholder(frameId);
        }
    }, 100);
}

function stopAllVideos() {
    // キューを全消去
    videoLoadQueue = [];
    isGlobalLoading = false;
    console.log("[Queue] Algorithm reset (Stop All).");

    for (let i = 1; i <= 9; i++) {
        stopFrame(i);
    }
}

// ユーザー要望による「再生済みクリア」
function clearPlayedVideos() {
    // nextGlobalIndex より前の動画（既に割り当てられたもの）を全て削除
    if (nextGlobalIndex > 0) {
        const deleteCount = nextGlobalIndex;
        // リストから削除
        const deleted = videoList.splice(0, deleteCount);

        console.log(`[Manual Cleanup] Deleted ${deleted.length} played videos.`);

        // インデックス補正
        // 先頭が「次に再生する動画」になるので、nextGlobalIndex は 0 になる
        nextGlobalIndex = 0;

        // 各フレームで再生中の動画のインデックス情報も補正しないと、UI上のハイライトがズレる
        Object.keys(frameStates).forEach(key => {
            const state = frameStates[key];
            if (state.listIndex !== -1) {
                state.listIndex -= deleteCount;
                // もし削除された範囲に含まれていたら（負になったら）、
                // もうリスト上にはないが、再生中なのでそのままにするか、-1にするか。
                // UI上のハイライトが消えるだけなので許容。
                if (state.listIndex < 0) state.listIndex = -1;
            }
        });

        renderVideoList();
        saveSettings();
    } else {
        alert("No played videos to clear.");
    }
}


// iframe内のYouTubeプレイヤーにコマンドを送信するヘルパー
function sendMessageToFrame(frameId, command, args = []) {
    const iframe = document.getElementById(`screen${frameId}`);
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: command,
            args: args,
            targetFrameId: frameId // 【NEW】宛先フレームIDを指定
        }), '*');
        console.log(`[API] Sent ${command} to Frame ${frameId}`);
    }
}
