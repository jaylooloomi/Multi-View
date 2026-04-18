// YouTube Multi Auto Playlist - Side Panel Logic

let videoList = [];
let nextGlobalIndex = 0; // The list index to be assigned next
let screenCount = 4;
let isAutoPlay = true;
let savedGroups = [];

// State management for each frame
const frameStates = {
    1: { videoId: null, listIndex: -1, isProcessing: false },
    2: { videoId: null, listIndex: -1, isProcessing: false },
    3: { videoId: null, listIndex: -1, isProcessing: false },
    4: { videoId: null, listIndex: -1, isProcessing: false },
    5: { videoId: null, listIndex: -1, isProcessing: false },
    6: { videoId: null, listIndex: -1, isProcessing: false },
    7: { videoId: null, listIndex: -1, isProcessing: false },
    8: { videoId: null, listIndex: -1, isProcessing: false },
    9: { videoId: null, listIndex: -1, isProcessing: false },
    10: { videoId: null, listIndex: -1, isProcessing: false },
    11: { videoId: null, listIndex: -1, isProcessing: false },
    12: { videoId: null, listIndex: -1, isProcessing: false },
    13: { videoId: null, listIndex: -1, isProcessing: false },
    14: { videoId: null, listIndex: -1, isProcessing: false },
    15: { videoId: null, listIndex: -1, isProcessing: false },
    16: { videoId: null, listIndex: -1, isProcessing: false }
};

function autoSelectLayout(urlCount) {
    let count = 4;
    if (urlCount > 9) count = 16;
    else if (urlCount > 4) count = 9;
    setLayout(count);
    document.getElementById('layout-2x2').classList.toggle('active', count === 4);
    document.getElementById('layout-3x3').classList.toggle('active', count === 9);
    document.getElementById('layout-4x4').classList.toggle('active', count === 16);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    // Layout toggle buttons
    document.getElementById('layout-2x2').addEventListener('click', () => {
        setLayout(4);
        document.getElementById('layout-2x2').classList.add('active');
        document.getElementById('layout-3x3').classList.remove('active');
        document.getElementById('layout-4x4').classList.remove('active');
    });
    document.getElementById('layout-3x3').addEventListener('click', () => {
        setLayout(9);
        document.getElementById('layout-3x3').classList.add('active');
        document.getElementById('layout-2x2').classList.remove('active');
        document.getElementById('layout-4x4').classList.remove('active');
    });
    document.getElementById('layout-4x4').addEventListener('click', () => {
        setLayout(16);
        document.getElementById('layout-4x4').classList.add('active');
        document.getElementById('layout-2x2').classList.remove('active');
        document.getElementById('layout-3x3').classList.remove('active');
    });

    // Clear all button
    document.getElementById('btn-clear-all').addEventListener('click', stopAllVideos);

    // Save group button
    document.getElementById('btn-save-group').addEventListener('click', saveGroup);

    // Copy button: copy the current frame URLs to the clipboard
    document.getElementById('btn-copy-urls').addEventListener('click', async () => {
        const urls = [];
        for (let i = 1; i <= screenCount; i++) {
            const val = document.getElementById(`url${i}`)?.value || '';
            if (val) urls.push(val);
        }
        if (urls.length === 0) {
            alert('目前沒有影片可以複製');
            return;
        }
        try {
            await navigator.clipboard.writeText(urls.join('\n'));
            const btn = document.getElementById('btn-copy-urls');
            const orig = btn.textContent;
            btn.textContent = '已複製!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        } catch (e) {
            alert('無法寫入剪貼簿');
        }
    });

    // Paste button
    document.getElementById('btn-paste-urls').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const urls = text.split('\n')
                .map(u => u.trim())
                .filter(u => u && !u.startsWith('#') && u.startsWith('http'));

            if (urls.length === 0) {
                alert('剪貼簿中沒有找到有效的網址');
                return;
            }

            urls.forEach((url, idx) => {
                const frameId = idx + 1;
                if (frameId <= screenCount) loadUrlToFrame(frameId, url);
            });
        } catch (e) {
            alert('無法讀取剪貼簿，請確認瀏覽器已授權');
        }
    });

    // Controls for each frame
    for (let i = 1; i <= 16; i++) {
        // + button: show URL overlay
        document.querySelector(`.plus-circle[data-frame="${i}"]`).addEventListener('click', () => {
            showInputOverlay(i);
        });
        // Cancel button
        document.querySelector(`.cancel-btn[data-frame="${i}"]`).addEventListener('click', () => {
            hideInputOverlay(i);
        });
        // Play button
        document.querySelector(`.load-btn[data-frame="${i}"]`).addEventListener('click', () => {
            const input = document.getElementById(`url${i}`);
            loadUrlToFrame(i, input.value);
        });
        // Input Enter key
        document.getElementById(`url${i}`).addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loadUrlToFrame(i, e.target.value);
        });
        // Next button
        document.querySelector(`.skip-btn[data-frame="${i}"]`).addEventListener('click', () => {
            playNextVideo(i);
        });
        // Play button
        document.querySelector(`.play-btn[data-frame="${i}"]`).addEventListener('click', () => {
            sendMessageToFrame(i, 'playVideo');
        });
        // Pause button
        document.querySelector(`.pause-btn[data-frame="${i}"]`).addEventListener('click', () => {
            sendMessageToFrame(i, 'pauseVideo');
        });
        // Reload button
        const reloadBtn = document.querySelector(`.reload-btn[data-frame="${i}"]`);
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                reloadFrame(i);
            });
        }
        // Stop button
        document.querySelector(`.stop-btn[data-frame="${i}"]`).addEventListener('click', () => {
            stopFrame(i);
        });

        // Drag & drop
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

            // Retrieve multi-line URLs (text/uri-list may contain multiple URLs separated by newlines)
            console.log('[Drop] types:', [...e.dataTransfer.types]);
            console.log('[Drop] uri-list:', e.dataTransfer.getData('text/uri-list'));
            console.log('[Drop] plain:', e.dataTransfer.getData('text/plain'));
            let raw = e.dataTransfer.getData('text/uri-list') ||
                      e.dataTransfer.getData('text/plain') || '';

            if (!raw) {
                const html = e.dataTransfer.getData('text/html');
                const match = html && html.match(/href="([^"]+)"/);
                if (match) raw = match[1];
            }

            // Build URL list, excluding comment lines starting with # and empty lines
            const urls = raw.split('\n')
                .map(u => u.trim())
                .filter(u => u && !u.startsWith('#'));

            if (urls.length === 0) return;

            // Assign multiple URLs to frames sequentially starting from the dropped frame
            urls.forEach((url, offset) => {
                const targetFrame = i + offset;
                if (targetFrame <= screenCount) {
                    loadUrlToFrame(targetFrame, url);
                }
            });
        });
    }

    // Receive messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Receive multiple URLs from the page and assign them to each frame
        if (request.action === "loadUrlsToPanel") {
            const urls = request.urls || [];
            autoSelectLayout(urls.length);
            urls.forEach((url, idx) => {
                const frameId = idx + 1;
                if (frameId <= screenCount) loadUrlToFrame(frameId, url);
            });
            return;
        }
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
    chrome.storage.local.get(['videoList', 'nextGlobalIndex', 'screenCount', 'savedGroups', 'pendingUrls'], (data) => {
        if (data.videoList) videoList = data.videoList;
        if (data.nextGlobalIndex !== undefined) nextGlobalIndex = data.nextGlobalIndex;
        if (data.screenCount) screenCount = data.screenCount;
        if (data.savedGroups) savedGroups = data.savedGroups;

        document.getElementById('layout-2x2').classList.toggle('active', screenCount === 4);
        document.getElementById('layout-3x3').classList.toggle('active', screenCount === 9);
        document.getElementById('layout-4x4').classList.toggle('active', screenCount === 16);

        setLayout(screenCount);
        renderVideoList();
        renderGroups();

        // If pendingUrls were sent from the page, load them
        if (data.pendingUrls && data.pendingUrls.length > 0) {
            const urls = data.pendingUrls;
            chrome.storage.local.remove('pendingUrls');
            autoSelectLayout(urls.length);
            setTimeout(() => {
                urls.forEach((url, idx) => {
                    const frameId = idx + 1;
                    if (frameId <= screenCount) loadUrlToFrame(frameId, url);
                });
            }, 600);
        }
    });
}

function saveSettings() {
    chrome.storage.local.set({
        videoList: videoList,
        nextGlobalIndex: nextGlobalIndex,
        screenCount: screenCount
    });
}

// ── Saved Groups ──────────────────────────────

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

    // Switch layout if it differs from the saved group
    if (group.screenCount !== screenCount) {
        setLayout(group.screenCount);
        document.getElementById('layout-2x2').classList.toggle('active', group.screenCount === 4);
        document.getElementById('layout-3x3').classList.toggle('active', group.screenCount === 9);
        document.getElementById('layout-4x4').classList.toggle('active', group.screenCount === 16);
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
    // Reassign names
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

    for (let i = 1; i <= 16; i++) {
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

// For backward compatibility
function updateScreenCount(count) {
    setLayout(count);
}

function sortList(descending) {
    if (videoList.length === 0) return;

    // Sort based on originalIndex (acquisition order)
    // If a video has no originalIndex (e.g. old version cache), use timestamp instead
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

        // Auto-start removed (user request: user selects the first video to play)
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

        // On click: where to play?
        // If there is an empty frame, play there. Otherwise force play in frame 1.
        div.addEventListener('click', () => {
            playVideoByIndex(index);
        });

        listContainer.appendChild(div);
    });
}

function playVideoByIndex(index) {
    if (index < 0 || index >= videoList.length) return;

    // Find an empty frame
    let targetFrameId = 1;
    let foundEmpty = false;

    // Search within the current screenCount range
    for (let i = 1; i <= screenCount; i++) {
        const iframe = document.getElementById(`screen${i}`);
        if (iframe.src === "about:blank") {
            targetFrameId = i;
            foundEmpty = true;
            break;
        }
    }

    // If no empty frame, use frame 1 (default)
    const video = videoList[index];

    // Set nextGlobalIndex to the clicked video's index
    // This is used inside playNextVideo and incremented after playback
    nextGlobalIndex = index;

    // Do not load directly; use playNextVideo to go through the queue system
    // This prevents freezing even if the user clicks rapidly, as requests are queued
    playNextVideo(targetFrameId);

    // Auto-cleanup list (paused)
    // cleanupPlaylist();
    saveSettings();
}

// ■ Queue system for load control
let videoLoadQueue = []; // List of frame IDs waiting to be loaded
let isGlobalLoading = false; // Whether any frame is currently being processed

function playNextVideo(frameId) {
    // Duplicate check: skip if already in queue or being processed
    if (videoLoadQueue.includes(frameId) || frameStates[frameId].isProcessing) {
        console.log(`[Queue] Frame ${frameId} skipped (queued/processing).`);
        return;
    }

    // Add to queue
    console.log(`[Queue] Enqueue Frame ${frameId}`);
    videoLoadQueue.push(frameId);
    updateStatusDisplay(); // Update display

    frameStates[frameId].isProcessing = true; // Mark as reserved

    // Start queue processing
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
    // Do nothing if another load is already running or the queue is empty
    if (isGlobalLoading || videoLoadQueue.length === 0) {
        updateStatusDisplay();
        return;
    }

    isGlobalLoading = true;
    updateStatusDisplay();

    const frameId = videoLoadQueue.shift(); // Dequeue the first entry
    console.log(`[Queue] Msg: Start processing Frame ${frameId}`);

    if (nextGlobalIndex >= videoList.length) {
        console.log("End of list reached.");
        frameStates[frameId].isProcessing = false;
        isGlobalLoading = false;
        processLoadQueue(); // Process next item if available
        return;
    }

    // [Enhanced] 3-stage reset process (soft stop introduced) - Timer Reverted
    // 0. First, instruct the iframe content (YouTube) to release video resources
    sendMessageToFrame(frameId, 'releaseVideo');

    // Wait 0.8s before physical reset (wait for the command to arrive and be processed — fixed wait after removing handshake)
    setTimeout(() => {

        // 1. Navigate the existing iframe to a blank page
        const oldIframe = document.getElementById(`screen${frameId}`);
        if (oldIframe) {
            oldIframe.src = "about:blank";
        }

        // 2. Wait 0.2s then re-apply DOM
        setTimeout(() => {
            // Reconfigure iframe
            recreateIframe(frameId);

            // 3. Wait 1.0s then start loading
            setTimeout(() => {
                const video = videoList[nextGlobalIndex];
                const currentIndex = nextGlobalIndex;
                nextGlobalIndex++;

                loadVideoToFrame(frameId, video, currentIndex);
                saveSettings();

                // Interval until load is considered complete (3 seconds)
                // Hold off the next load until YouTube's initialization overhead settles
                setTimeout(() => {
                    console.log(`[Queue] Frame ${frameId} sequence done. Next?`);

                    frameStates[frameId].isProcessing = false;
                    isGlobalLoading = false;

                    // Process next item in queue
                    updateStatusDisplay();
                    processLoadQueue();
                }, 3000);

            }, 1000);
        }, 200); // Step 2 (recreate) wait time

    }, 800); // Step 0 (release) wait time
}

// startReleaseWait and proceedToReset removed

// Helper to reuse/reset an iframe (avoiding DOM destruction)
function recreateIframe(frameId) {
    const wrapper = document.getElementById(`wrapper${frameId}`);
    const box = wrapper.querySelector('.screen-box');
    let iframe = document.getElementById(`screen${frameId}`);

    if (!iframe) {
        // Only create a new one if it does not exist
        iframe = document.createElement('iframe');
        iframe.id = `screen${frameId}`;
        iframe.allow = "autoplay; encrypted-media; fullscreen";
        // iframe.style.border = "none"; // Add if needed
        box.appendChild(iframe);
    }

    // Re-apply attributes to be safe (even for existing iframes)
    iframe.allow = "autoplay; encrypted-media; fullscreen";

    // Reset src (if not already blank)
    // Often already set to blank by the caller, but this handles calls from stopFrame etc.
    if (iframe.src !== "about:blank") {
        iframe.src = "about:blank";
    }
}

function cleanupPlaylist() {
    // nextGlobalIndex is the current head — the next video to be played.
    // Played videos are at indices 0 to nextGlobalIndex-1.
    // We want to remove those older than 10 positions from there.
    // That means removing items with an index before nextGlobalIndex - 10.

    const keepMargin = 10;
    // End index of items to delete (remove everything before this index)
    const deleteThreshold = nextGlobalIndex - keepMargin;

    if (deleteThreshold > 0) {
        // Execute deletion
        // Remove deleteThreshold elements from the beginning
        videoList.splice(0, deleteThreshold);

        console.log(`[Cleanup] Deleted ${deleteThreshold} played videos.`);

        // Correct indices
        // nextGlobalIndex also shifts forward
        nextGlobalIndex -= deleteThreshold;
        if (nextGlobalIndex < 0) nextGlobalIndex = 0;

        // Also correct the currently-playing index of each frame
        Object.keys(frameStates).forEach(key => {
            const state = frameStates[key];
            if (state.listIndex !== -1) {
                state.listIndex -= deleteThreshold;
                // If it falls within the deleted range (becomes negative),
                // it no longer exists in the list, but it is still playing — leave it or set to -1.
                // Only the UI highlight disappears, which is acceptable.
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

    // Force unlock & also release global lock (prevent stalling)
    // clearReleaseState(frameId); // Removed
    frameStates[frameId].isProcessing = false;
    // On reload we forcibly interrupt, so we could leave the global lock alone,
    // or reset it if the queue is stalled — for now, only release the individual lock.

    const currentState = frameStates[frameId];
    const currentUrlInput = document.getElementById(`url${frameId}`).value;

    // Recreate iframe (reset)
    recreateIframe(frameId);

    // Wait 0.1s then reload (wait for DOM to update)
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
    // Clear the entire queue
    videoLoadQueue = [];
    isGlobalLoading = false;
    console.log("[Queue] Algorithm reset (Stop All).");

    for (let i = 1; i <= 16; i++) {
        stopFrame(i);
    }
}

// "Clear played videos" — user-requested feature
function clearPlayedVideos() {
    // Delete all videos before nextGlobalIndex (those already assigned)
    if (nextGlobalIndex > 0) {
        const deleteCount = nextGlobalIndex;
        // Remove from list
        const deleted = videoList.splice(0, deleteCount);

        console.log(`[Manual Cleanup] Deleted ${deleted.length} played videos.`);

        // Correct indices
        // The head becomes the next video to play, so nextGlobalIndex becomes 0
        nextGlobalIndex = 0;

        // Also correct the index info for currently-playing videos per frame, or the UI highlight will be off
        Object.keys(frameStates).forEach(key => {
            const state = frameStates[key];
            if (state.listIndex !== -1) {
                state.listIndex -= deleteCount;
                // If it falls within the deleted range (becomes negative),
                // it no longer exists in the list, but it is still playing — leave it or set to -1.
                // Only the UI highlight disappears, which is acceptable.
                if (state.listIndex < 0) state.listIndex = -1;
            }
        });

        renderVideoList();
        saveSettings();
    } else {
        alert("No played videos to clear.");
    }
}


// Helper to send commands to the YouTube player inside an iframe
function sendMessageToFrame(frameId, command, args = []) {
    const iframe = document.getElementById(`screen${frameId}`);
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: command,
            args: args,
            targetFrameId: frameId // [NEW] Specify destination frame ID
        }), '*');
        console.log(`[API] Sent ${command} to Frame ${frameId}`);
    }
}
