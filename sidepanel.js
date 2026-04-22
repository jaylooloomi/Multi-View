// Multi-View - Side Panel Logic

// ── Porn-mosaic: hostname → local icon path ───────────────────────────────────
const PORN_HOSTS = {
    'pornhub':    'icons/icon-pornhub.png',
    'xvideos':    'icons/icon-xvideos.png',
    'xnxx':       'icons/icon-xnxx.png',
    'xgroovy':    'icons/icon-xgroovy.png',
    'xhamster':   'icons/icon-xhamster.png',
    'rule34video':'icons/icon-rule34video.png',
};

/** Return icon path if url belongs to a porn host, else null */
function getPornIcon(url) {
    if (!url || url === 'about:blank') return null;
    for (const [host, icon] of Object.entries(PORN_HOSTS)) {
        if (url.includes(host)) return icon;
    }
    return null;
}

/**
 * Show or hide the mosaic overlay for a single frame.
 * Rule: mosaic ON  ↔  porn toggle is OFF  AND  iframe src is a porn site.
 */
function updateMosaicForFrame(frameId) {
    const card   = document.getElementById(`wrapper${frameId}`);
    const mosaic = document.getElementById(`porn-mosaic-${frameId}`);
    const iframe = document.getElementById(`screen${frameId}`);
    if (!card || !mosaic || !iframe) return;

    const pornOn = document.getElementById('chk-porn-toggle')?.checked ?? true;
    const icon   = getPornIcon(iframe.src);

    if (!pornOn && icon) {
        const img = mosaic.querySelector('.porn-mosaic-icon');
        if (img) img.src = icon;           // relative path works in extension page
        card.classList.add('porn-blurred');
    } else {
        card.classList.remove('porn-blurred');
    }
}

/** Refresh mosaics for every frame (call on toggle change) */
function updateAllMosaics() {
    for (let i = 1; i <= 25; i++) updateMosaicForFrame(i);
}

// ── Toast notification ────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'info') {
    let el = document.getElementById('mv-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mv-toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'mv-toast mv-toast-' + type + ' mv-toast-show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('mv-toast-show'), 2000);
}

let videoList = [];
let nextGlobalIndex = 0; // The list index to be assigned next
let screenCount = 4;
let isAutoPlay = true;
let savedGroups = [];
let dragSourceFrameId = null;
let currentGroupId = null; // Track which group is currently loaded
let groupsBarCollapsed = false; // Whether the groups-bar is collapsed
let isDarkTheme = true;

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
    16: { videoId: null, listIndex: -1, isProcessing: false },
    17: { videoId: null, listIndex: -1, isProcessing: false },
    18: { videoId: null, listIndex: -1, isProcessing: false },
    19: { videoId: null, listIndex: -1, isProcessing: false },
    20: { videoId: null, listIndex: -1, isProcessing: false },
    21: { videoId: null, listIndex: -1, isProcessing: false },
    22: { videoId: null, listIndex: -1, isProcessing: false },
    23: { videoId: null, listIndex: -1, isProcessing: false },
    24: { videoId: null, listIndex: -1, isProcessing: false },
    25: { videoId: null, listIndex: -1, isProcessing: false }
};

function resetGlobalControls() {
    // Nothing to reset — mute/pause are now independent one-shot buttons
}

function autoSelectLayout(urlCount) {
    let count = 4;
    if (urlCount > 16) count = 25;
    else if (urlCount > 9) count = 16;
    else if (urlCount > 4) count = 9;
    setLayout(count);
    document.getElementById('layout-2x2').classList.toggle('active', count === 4);
    document.getElementById('layout-3x3').classList.toggle('active', count === 9);
    document.getElementById('layout-4x4').classList.toggle('active', count === 16);
    document.getElementById('layout-5x5').classList.toggle('active', count === 25);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    // Mosaics are created inside setupEventListeners' init loop;
    // after loadSettings may have restored iframe srcs, re-evaluate all frames.
    setTimeout(updateAllMosaics, 200);
});

function setupEventListeners() {
    // Locale switcher
    document.getElementById('locale-select').addEventListener('change', (e) => {
        setLocale(e.target.value);
    });

    // Theme toggle button
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
        isDarkTheme = !isDarkTheme;
        document.body.classList.toggle('theme-light', !isDarkTheme);
        document.getElementById('btn-theme-toggle').textContent = isDarkTheme ? '☀' : '🌙';
        chrome.storage.local.set({ isDarkTheme });
    });

    // Layout toggle buttons
    const layoutBtns = ['layout-2x2', 'layout-3x3', 'layout-4x4', 'layout-5x5'];
    const setActiveLayout = (activeId) => {
        layoutBtns.forEach(id => document.getElementById(id).classList.toggle('active', id === activeId));
    };
    document.getElementById('layout-2x2').addEventListener('click', () => { setLayout(4);  setActiveLayout('layout-2x2'); resetGlobalControls(); });
    document.getElementById('layout-3x3').addEventListener('click', () => { setLayout(9);  setActiveLayout('layout-3x3'); resetGlobalControls(); });
    document.getElementById('layout-4x4').addEventListener('click', () => { setLayout(16); setActiveLayout('layout-4x4'); resetGlobalControls(); });
    document.getElementById('layout-5x5').addEventListener('click', () => { setLayout(25); setActiveLayout('layout-5x5'); resetGlobalControls(); });

    // Clear all button — also deselect active group
    document.getElementById('btn-clear-all').addEventListener('click', () => {
        stopAllVideos();
        currentGroupId = null;
        renderGroups();
    });

    // Porn toggle — show/hide adult platform icons; state persisted in localStorage
    const pornToggleChk = document.getElementById('chk-porn-toggle');
    const platformsBar  = document.getElementById('platforms-bar');
    const _pornVisible  = localStorage.getItem('pornVisible') === '1';
    pornToggleChk.checked = _pornVisible;
    if (_pornVisible) platformsBar.classList.add('porn-visible');
    pornToggleChk.addEventListener('change', () => {
        const on = pornToggleChk.checked;
        platformsBar.classList.toggle('porn-visible', on);
        localStorage.setItem('pornVisible', on ? '1' : '0');
        updateAllMosaics();   // ← apply/remove mosaics immediately
    });

    // Platform icon bar — click navigates the active tab (not a new tab)
    document.querySelectorAll('.platform-btn[data-url]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = btn.dataset.url;
            if (!url) return;
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.update(tabs[0].id, { url });
                }
            });
        });
    });

    // Import groups — triggered by hidden file input (⬆ button in groups bar)
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                const imported = data.multiview_groups;
                if (!Array.isArray(imported)) throw new Error('bad format');
                // Merge: skip duplicates by id
                const existingIds = new Set(savedGroups.map(g => g.id));
                const newOnes = imported.filter(g => !existingIds.has(g.id));
                savedGroups.push(...newOnes);
                chrome.storage.local.set({ savedGroups });
                renderGroups();
                showToast(t('toast_import_ok', newOnes.length), 'ok');
            } catch {
                showToast(t('toast_import_error'), 'error');
            }
            e.target.value = ''; // reset so same file can be re-selected
        };
        reader.readAsText(file);
    });

    // Groups-bar collapse toggle
    document.getElementById('btn-toggle-groups').addEventListener('click', () => {
        groupsBarCollapsed = !groupsBarCollapsed;
        chrome.storage.local.set({ groupsBarCollapsed });
        renderGroups();
    });

    // Open in new tab button — snapshot current frames, open tab
    // If running in side panel (no ?mode=tab param), also close the panel
    const isTabMode = new URLSearchParams(location.search).get('mode') === 'tab';

    document.getElementById('btn-open-tab').addEventListener('click', () => {
        // Collect all currently loaded URLs in order
        const urls = [];
        for (let i = 1; i <= screenCount; i++) {
            urls.push(document.getElementById(`url${i}`)?.value || '');
        }
        const hasAny = urls.some(u => u);

        const doOpen = () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') + '?mode=tab' });
            if (!isTabMode) window.close(); // only close if we're in the side panel
        };

        if (hasAny) {
            chrome.storage.local.set({ tabSnapshot: { urls, screenCount } }, doOpen);
        } else {
            doOpen();
        }
    });

    // Open in popup window — same URL snapshot logic as tab, but opens a
    // chrome popup window (type:'popup') which has no address bar / bookmark bar.
    document.getElementById('btn-open-popup').addEventListener('click', () => {
        const urls = [];
        for (let i = 1; i <= screenCount; i++) {
            urls.push(document.getElementById(`url${i}`)?.value || '');
        }
        const hasAny = urls.some(u => u);

        const doOpen = () => {
            chrome.windows.create({
                url: chrome.runtime.getURL('sidepanel.html') + '?mode=popup',
                type: 'popup',
                width: Math.max(window.screen.availWidth * 0.8 | 0, 900),
                height: Math.max(window.screen.availHeight * 0.85 | 0, 600),
                focused: true
            }, () => {
                // Close the side panel once the popup is ready
                // (only has effect when running as a side panel, not tab/popup)
                if (!isTabMode) window.close();
            });
        };

        if (hasAny) {
            chrome.storage.local.set({ tabSnapshot: { urls, screenCount } }, doOpen);
        } else {
            doOpen();
        }
    });

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
            showToast(t('toast_copy_none'), 'warn');
            return;
        }
        try {
            await navigator.clipboard.writeText(urls.join('\n'));
            showToast(t('toast_copy_ok', urls.length), 'ok');
        } catch (e) {
            showToast(t('toast_copy_error'), 'error');
        }
    });

    // Quick save button: update the currently loaded group
    document.getElementById('btn-save-quick').addEventListener('click', () => {
        if (!currentGroupId) {
            showToast(t('toast_save_no_group'), 'warn');
            return;
        }
        const group = savedGroups.find(g => g.id === currentGroupId);
        if (!group) return;

        const urls = [];
        for (let i = 1; i <= screenCount; i++) {
            urls.push(document.getElementById(`url${i}`)?.value || '');
        }
        if (urls.every(u => !u)) {
            showToast(t('toast_save_none'), 'warn');
            return;
        }

        group.urls = urls;
        group.screenCount = screenCount;
        chrome.storage.local.set({ savedGroups });
        renderGroups();
        const savedIdx = savedGroups.findIndex(g => g.id === currentGroupId);
        const savedBase = t('default_group_name', savedIdx + 1);
        const savedDisplay = group.nameSuffix ? `${savedBase} (${group.nameSuffix})` : savedBase;
        showToast(t('toast_save_ok', savedDisplay), 'ok');
    });

    // Compact button: move all loaded URLs forward to fill empty frames
    document.getElementById('btn-compact').addEventListener('click', () => {
        const slots = [];
        for (let i = 1; i <= screenCount; i++) {
            slots.push(document.getElementById(`url${i}`)?.value || '');
        }

        // Check if there are any gaps (empty frame followed by a filled frame)
        const hasGap = slots.some((val, idx) => !val && slots.slice(idx + 1).some(v => v));
        if (!hasGap) { showToast(t('toast_compact_no_gap'), 'info'); return; }

        const urls = slots.filter(v => v);
        stopAllVideos();
        setTimeout(() => {
            urls.forEach((url, idx) => loadUrlToFrame(idx + 1, url));
            showToast(t('toast_compact_ok'), 'ok');
        }, 300);
    });

    // Pause all button
    document.getElementById('btn-pause-all').addEventListener('click', () => {
        for (let i = 1; i <= screenCount; i++) sendMessageToFrame(i, 'pauseVideo');
        showToast(t('toast_pause_ok'), 'ok');
    });

    // Resume all button
    document.getElementById('btn-resume-all').addEventListener('click', () => {
        for (let i = 1; i <= screenCount; i++) sendMessageToFrame(i, 'playVideo');
        showToast(t('toast_resume_ok'), 'ok');
    });

    // Mute all button
    document.getElementById('btn-mute-all').addEventListener('click', () => {
        for (let i = 1; i <= screenCount; i++) sendMessageToFrame(i, 'muteVideo');
        showToast(t('toast_mute_ok'), 'ok');
    });

    // Unmute all button
    document.getElementById('btn-unmute-all').addEventListener('click', () => {
        for (let i = 1; i <= screenCount; i++) sendMessageToFrame(i, 'unmuteVideo');
        showToast(t('toast_unmute_ok'), 'ok');
    });

    // Paste button
    document.getElementById('btn-paste-urls').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const urls = text.split('\n')
                .map(u => u.trim())
                .filter(u => u && !u.startsWith('#') && u.startsWith('http'));

            if (urls.length === 0) {
                showToast(t('toast_paste_empty'), 'warn');
                return;
            }

            // Find empty frames
            const emptyFrames = [];
            for (let i = 1; i <= screenCount; i++) {
                const val = document.getElementById(`url${i}`)?.value || '';
                if (!val) emptyFrames.push(i);
            }

            if (emptyFrames.length === 0) {
                showToast(t('toast_paste_full'), 'warn');
                return;
            } else {
                // Fill empty frames sequentially
                let filled = 0;
                urls.forEach((url, idx) => {
                    const frameId = emptyFrames[idx];
                    if (frameId) { loadUrlToFrame(frameId, url); filled++; }
                });
                showToast(t('toast_paste_ok', filled), 'ok');
            }
        } catch (e) {
            showToast(t('toast_paste_error'), 'error');
        }
    });

    // Controls for each frame
    for (let i = 1; i <= 25; i++) {
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

        // Porn mosaic overlay — created once per frame, shown/hidden via updateMosaicForFrame()
        (() => {
            const box = document.querySelector(`#wrapper${i} .screen-box`);
            if (box && !document.getElementById(`porn-mosaic-${i}`)) {
                const mosaic = document.createElement('div');
                mosaic.id        = `porn-mosaic-${i}`;
                mosaic.className = 'porn-mosaic';
                mosaic.innerHTML = `
                    <img class="porn-mosaic-icon" src="" alt="Adult Content">
                    <span class="porn-mosaic-label">成人內容已遮蔽</span>
                    <span class="porn-mosaic-hint">開啟右上角切換按鈕以顯示</span>`;
                box.appendChild(mosaic);
            }
        })();

        // Link button — open this frame's current video in a new popup window
        (() => {
            const linkBtn = document.createElement('button');
            linkBtn.className = 'btn-ctrl btn-link';
            linkBtn.dataset.frame = String(i);
            linkBtn.title = '在新視窗開啟此影片';
            linkBtn.textContent = '↗';
            const skipBtn = document.querySelector(`.skip-btn[data-frame="${i}"]`);
            if (skipBtn) skipBtn.after(linkBtn);
            linkBtn.addEventListener('click', () => {
                const iframe = document.getElementById(`screen${i}`);
                const src = iframe?.src;
                if (!src || src === 'about:blank') return;
                chrome.windows.create({
                    url: src,
                    type: 'popup',
                    width:  Math.max(Math.round(window.screen.availWidth  * 0.65), 800),
                    height: Math.max(Math.round(window.screen.availHeight * 0.72), 560),
                    focused: true
                });
            });
        })();

        // Drag & drop (internal frame-to-frame move + external URL drop)
        const card = document.getElementById(`wrapper${i}`);

        card.addEventListener('dragstart', (e) => {
            const url = document.getElementById(`url${i}`)?.value;
            if (!url) { e.preventDefault(); return; }
            dragSourceFrameId = i;
            e.dataTransfer.effectAllowed = 'move';
            card.style.opacity = '0.4';
            // Disable pointer events on all iframes so drag events reach the cards
            document.querySelectorAll('.screen-box iframe').forEach(f => f.style.pointerEvents = 'none');
        });

        card.addEventListener('dragend', () => {
            card.style.opacity = '';
            dragSourceFrameId = null;
            document.querySelectorAll('.screen-box iframe').forEach(f => f.style.pointerEvents = '');
        });

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

            // Internal: move from one frame to another
            if (dragSourceFrameId !== null && dragSourceFrameId !== i) {
                const sourceUrl = document.getElementById(`url${dragSourceFrameId}`)?.value;
                if (sourceUrl) {
                    loadUrlToFrame(i, sourceUrl);
                    stopFrame(dragSourceFrameId);
                }
                dragSourceFrameId = null;
                return;
            }

            // External: load URLs from drag data
            let raw = e.dataTransfer.getData('text/uri-list') ||
                      e.dataTransfer.getData('text/plain') || '';

            if (!raw) {
                const html = e.dataTransfer.getData('text/html');
                const match = html && html.match(/href="([^"]+)"/);
                if (match) raw = match[1];
            }

            const urls = raw.split('\n')
                .map(u => u.trim())
                .filter(u => u && !u.startsWith('#'));

            if (urls.length === 0) return;

            urls.forEach((url, offset) => {
                const targetFrame = i + offset;
                if (targetFrame <= screenCount) loadUrlToFrame(targetFrame, url);
            });
        });
    }

    // Receive messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Receive multiple URLs from the page and assign them to each frame
        if (request.action === "loadUrlsToPanel") {
            const urls = request.urls || [];

            // Find empty frames (no URL loaded)
            const emptyFrames = [];
            for (let i = 1; i <= screenCount; i++) {
                const val = document.getElementById(`url${i}`)?.value || '';
                if (!val) emptyFrames.push(i);
            }

            if (emptyFrames.length === 0) {
                // All frames occupied — auto-expand layout and fill from frame 1
                autoSelectLayout(urls.length);
                urls.forEach((url, idx) => {
                    const frameId = idx + 1;
                    if (frameId <= screenCount) loadUrlToFrame(frameId, url);
                });
            } else {
                // Fill empty frames sequentially
                urls.forEach((url, idx) => {
                    const frameId = emptyFrames[idx];
                    if (frameId) loadUrlToFrame(frameId, url);
                });
            }
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
    const isTabMode = new URLSearchParams(location.search).get('mode') === 'tab';
    initLocale(() => {
        chrome.storage.local.get(['videoList', 'nextGlobalIndex', 'screenCount', 'savedGroups', 'pendingUrls', 'tabSnapshot', 'groupsBarCollapsed', 'isDarkTheme'], (data) => {
            if (data.videoList) videoList = data.videoList;
            if (data.nextGlobalIndex !== undefined) nextGlobalIndex = data.nextGlobalIndex;
            if (data.screenCount) screenCount = data.screenCount;
            if (data.savedGroups) savedGroups = data.savedGroups;
            if (data.groupsBarCollapsed !== undefined) groupsBarCollapsed = data.groupsBarCollapsed;

            // Restore theme
            if (data.isDarkTheme === false) {
                isDarkTheme = false;
                document.body.classList.add('theme-light');
                document.getElementById('btn-theme-toggle').textContent = '🌙';
            }

            // In tab mode: enforce minimum window width
            if (isTabMode) {
                const MIN_WIDTH = 900;
                chrome.storage.local.get(['tabWindowWidth'], (wData) => {
                    const savedW = wData.tabWindowWidth || window.outerWidth;
                    const targetW = Math.max(savedW, MIN_WIDTH);
                    if (window.outerWidth < targetW) {
                        try { window.resizeTo(targetW, window.outerHeight); } catch(e) {}
                    }
                });
                window.addEventListener('resize', () => {
                    if (window.outerWidth >= 400) {
                        chrome.storage.local.set({ tabWindowWidth: window.outerWidth });
                    }
                });
            }

            document.getElementById('layout-2x2').classList.toggle('active', screenCount === 4);
            document.getElementById('layout-3x3').classList.toggle('active', screenCount === 9);
            document.getElementById('layout-4x4').classList.toggle('active', screenCount === 16);
            document.getElementById('layout-5x5').classList.toggle('active', screenCount === 25);

            setLayout(screenCount);
            renderVideoList();
            renderGroups();
            applyI18n();

            // Restore frame snapshot from "open in new tab" action (takes priority)
            if (data.tabSnapshot && data.tabSnapshot.urls) {
                const { urls, screenCount: snapshotCount } = data.tabSnapshot;
                chrome.storage.local.remove('tabSnapshot');
                setLayout(snapshotCount);
                const layoutBtnId = { 4: 'layout-2x2', 9: 'layout-3x3', 16: 'layout-4x4', 25: 'layout-5x5' }[snapshotCount];
                if (layoutBtnId) {
                    ['layout-2x2','layout-3x3','layout-4x4','layout-5x5'].forEach(id =>
                        document.getElementById(id).classList.toggle('active', id === layoutBtnId));
                }
                setTimeout(() => {
                    urls.forEach((url, idx) => {
                        if (url) loadUrlToFrame(idx + 1, url);
                    });
                }, 600);
                return;
            }

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
    if (savedGroups.length >= 20) {
        showToast(t('alert_group_limit'), 'warn');
        return;
    }

    const urls = [];
    for (let i = 1; i <= screenCount; i++) {
        urls.push(document.getElementById(`url${i}`)?.value || '');
    }

    if (urls.every(u => !u)) {
        showToast(t('alert_group_none'), 'warn');
        return;
    }

    const group = {
        id: Date.now(),
        nameSuffix: '',   // user-editable label inside ()
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

    currentGroupId = id;
    renderGroups(); // update active highlight
    stopAllVideos();
    resetGlobalControls();

    // Switch layout if it differs from the saved group
    if (group.screenCount !== screenCount) {
        setLayout(group.screenCount);
        document.getElementById('layout-2x2').classList.toggle('active', group.screenCount === 4);
        document.getElementById('layout-3x3').classList.toggle('active', group.screenCount === 9);
        document.getElementById('layout-4x4').classList.toggle('active', group.screenCount === 16);
        document.getElementById('layout-5x5').classList.toggle('active', group.screenCount === 25);
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
    // No need to reassign — display names are computed by index at render time
    chrome.storage.local.set({ savedGroups });
    renderGroups();
}

function renderGroups() {
    const bar = document.getElementById('groups-bar');
    bar.innerHTML = '';

    // ── Drag state (scoped to this render) ───────────────────────────────────
    let dragSrcIdx = null;

    savedGroups.forEach((group, idx) => {
        const chip = document.createElement('div');
        chip.className = 'group-chip' + (group.id === currentGroupId ? ' group-chip-active' : '');
        chip.draggable = true;

        const baseName = t('default_group_name', idx + 1);
        const displayName = group.nameSuffix
            ? `${baseName} (${group.nameSuffix})`
            : baseName;

        const loadBtn = document.createElement('button');
        loadBtn.className = 'group-chip-load';
        loadBtn.textContent = displayName;
        loadBtn.title = group.urls.filter(u => u).join('\n');
        loadBtn.addEventListener('click', () => loadGroup(group.id));

        const editBtn = document.createElement('button');
        editBtn.className = 'group-chip-edit';
        editBtn.textContent = '✎';
        editBtn.title = t('edit_btn_title');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openGroupEditModal(group.id);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'group-chip-del';
        delBtn.textContent = '×';
        delBtn.title = t('delete_btn_title');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteGroup(group.id);
        });

        chip.appendChild(loadBtn);
        chip.appendChild(editBtn);
        chip.appendChild(delBtn);

        // ── Drag-to-reorder ─────────────────────────────────────────────────
        chip.addEventListener('dragstart', (e) => {
            dragSrcIdx = idx;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', idx); // required for Firefox
            setTimeout(() => chip.classList.add('group-chip-dragging'), 0);
        });
        chip.addEventListener('dragend', () => {
            chip.classList.remove('group-chip-dragging');
            bar.querySelectorAll('.group-chip').forEach(c => c.classList.remove('group-chip-drag-over'));
        });
        chip.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragSrcIdx !== null && dragSrcIdx !== idx) {
                bar.querySelectorAll('.group-chip').forEach(c => c.classList.remove('group-chip-drag-over'));
                chip.classList.add('group-chip-drag-over');
            }
        });
        chip.addEventListener('dragleave', () => {
            chip.classList.remove('group-chip-drag-over');
        });
        chip.addEventListener('drop', (e) => {
            e.preventDefault();
            chip.classList.remove('group-chip-drag-over');
            if (dragSrcIdx === null || dragSrcIdx === idx) return;
            // Reorder in-place
            const [moved] = savedGroups.splice(dragSrcIdx, 1);
            savedGroups.splice(idx, 0, moved);
            dragSrcIdx = null;
            chrome.storage.local.set({ savedGroups });
            renderGroups();
        });

        bar.appendChild(chip);
    });

    // ── Utility buttons — always shown so users can save their first group ──
    {
        // + : save current frames as a new group (same as btn-save-group)
        const saveGroupBtn = document.createElement('button');
        saveGroupBtn.className = 'group-chip-clear-frames';
        saveGroupBtn.textContent = '+';
        saveGroupBtn.title = t('group_add_new_title');
        saveGroupBtn.addEventListener('click', () => saveGroup());
        bar.appendChild(saveGroupBtn);

        // - : clear all frames so the user can load a fresh set
        const clearFramesBtn = document.createElement('button');
        clearFramesBtn.className = 'group-chip-clear-frames';
        clearFramesBtn.textContent = '-';
        clearFramesBtn.title = t('group_clear_frames_title');
        clearFramesBtn.addEventListener('click', () => {
            stopAllVideos();
            currentGroupId = null;
            renderGroups();
        });
        bar.appendChild(clearFramesBtn);

        // ≡ : compact / reorder frames (same as btn-compact)
        const compactBtn = document.createElement('button');
        compactBtn.className = 'group-chip-clear-frames';
        compactBtn.textContent = '≡';
        compactBtn.title = t('btn_compact');
        compactBtn.addEventListener('click', () => document.getElementById('btn-compact').click());
        bar.appendChild(compactBtn);

        // 💾 : quick-save current group (same as btn-save-quick)
        const quickSaveBtn = document.createElement('button');
        quickSaveBtn.className = 'group-chip-clear-frames';
        quickSaveBtn.textContent = '💾';
        quickSaveBtn.style.fontSize = '11px'; // emoji字型比一般字符大，補償縮小
        quickSaveBtn.title = t('group_save_changes_title');
        quickSaveBtn.addEventListener('click', () => document.getElementById('btn-save-quick').click());
        bar.appendChild(quickSaveBtn);

        // ⬇ : export groups to JSON file
        const exportBtn = document.createElement('button');
        exportBtn.className = 'group-chip-clear-frames';
        exportBtn.textContent = '↓';
        exportBtn.title = t('btn_export_groups');
        exportBtn.addEventListener('click', () => {
            if (savedGroups.length === 0) { showToast(t('toast_export_none'), 'warn'); return; }
            const json = JSON.stringify({ multiview_groups: savedGroups }, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = 'multiview-groups.json'; a.click();
            URL.revokeObjectURL(url);
            showToast(t('toast_export_ok', savedGroups.length), 'ok');
        });
        bar.appendChild(exportBtn);

        // ⬆ : import groups from JSON file
        const importBtn = document.createElement('button');
        importBtn.className = 'group-chip-clear-frames';
        importBtn.textContent = '↑';
        importBtn.title = t('btn_import_groups');
        importBtn.addEventListener('click', () => document.getElementById('import-file-input').click());
        bar.appendChild(importBtn);
    }

    // Groups bar and toggle button are always visible (collapsed state persists)
    bar.style.display = groupsBarCollapsed ? 'none' : 'flex';

    // Update toggle button arrow — always shown
    const toggleBtn = document.getElementById('btn-toggle-groups');
    if (toggleBtn) {
        toggleBtn.style.display = '';   // always visible
        toggleBtn.textContent = groupsBarCollapsed ? '▼' : '▲';
        toggleBtn.title = groupsBarCollapsed ? '展開群組列' : '收合群組列';
    }
}

function openGroupEditModal(id) {
    const group = savedGroups.find(g => g.id === id);
    if (!group) return;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const box = document.createElement('div');
    box.className = 'modal-box';

    // Title
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = t('modal_edit_title');

    // Name row: read-only base name + editable suffix
    const groupIdx = savedGroups.findIndex(g => g.id === id);
    const nameRow = document.createElement('div');
    nameRow.className = 'modal-name-row';

    const baseName = t('default_group_name', groupIdx + 1);
    const baseLabel = document.createElement('span');
    baseLabel.className = 'modal-name-base';
    baseLabel.textContent = baseName;

    const nameSep = document.createElement('span');
    nameSep.className = 'modal-name-sep';
    nameSep.textContent = '(';

    const nameInput = document.createElement('input');
    nameInput.className = 'modal-name-input';
    nameInput.type = 'text';
    nameInput.placeholder = t('modal_name_placeholder');
    nameInput.value = group.nameSuffix || '';

    const nameClose = document.createElement('span');
    nameClose.className = 'modal-name-sep';
    nameClose.textContent = ')';

    nameRow.appendChild(baseLabel);
    nameRow.appendChild(nameSep);
    nameRow.appendChild(nameInput);
    nameRow.appendChild(nameClose);

    // URL list
    const urlList = document.createElement('div');
    urlList.className = 'modal-url-list';

    const addUrlRow = (url = '') => {
        const row = document.createElement('div');
        row.className = 'modal-url-row';

        const input = document.createElement('input');
        input.className = 'modal-url-input';
        input.type = 'text';
        input.value = url;
        input.placeholder = 'https://...';

        const delBtn = document.createElement('button');
        delBtn.className = 'modal-url-del';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
            if (urlList.querySelectorAll('.modal-url-row').length <= 1) return;
            row.remove();
        });

        row.appendChild(input);
        row.appendChild(delBtn);
        urlList.appendChild(row);
    };

    group.urls.filter(u => u).forEach(addUrlRow);

    // Add URL button
    const addBtn = document.createElement('button');
    addBtn.className = 'modal-add-url';
    addBtn.textContent = t('modal_add_url');
    addBtn.addEventListener('click', () => addUrlRow());

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'modal-save';
    saveBtn.textContent = t('modal_save');
    saveBtn.addEventListener('click', () => {
        const newUrls = Array.from(urlList.querySelectorAll('.modal-url-input'))
            .map(i => i.value.trim())
            .filter(u => u);

        group.nameSuffix = nameInput.value.trim(); // empty = no suffix
        group.urls = newUrls;
        chrome.storage.local.set({ savedGroups });
        renderGroups();
        backdrop.remove();

        // If this group is currently loaded, reload frames to reflect changes
        if (group.id === currentGroupId) {
            stopAllVideos();
            setLayout(group.screenCount);
            setTimeout(() => {
                group.urls.forEach((url, idx) => {
                    if (url) loadUrlToFrame(idx + 1, url);
                });
            }, 300);
        }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-cancel';
    cancelBtn.textContent = t('modal_cancel');
    cancelBtn.addEventListener('click', () => backdrop.remove());

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.remove();
    });

    footer.appendChild(saveBtn);
    footer.appendChild(cancelBtn);
    box.appendChild(title);
    box.appendChild(nameRow);
    box.appendChild(urlList);
    box.appendChild(addBtn);
    box.appendChild(footer);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    applyI18n();
    nameInput.focus();
}

// ── Placeholder / Overlay helpers ─────────────────────

function showPlaceholder(frameId) {
    const ph = document.getElementById(`placeholder${frameId}`);
    if (ph) ph.style.display = 'flex';
    const card = document.getElementById(`wrapper${frameId}`);
    if (card) {
        card.classList.remove('has-video');
        card.draggable = false;
    }
}

function hidePlaceholder(frameId) {
    const ph = document.getElementById(`placeholder${frameId}`);
    if (ph) ph.style.display = 'none';
    const card = document.getElementById(`wrapper${frameId}`);
    if (card) {
        card.classList.add('has-video');
        card.draggable = true;
    }
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

    for (let i = 1; i <= 25; i++) {
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
    const finalUrl = window.convertToEmbedUrl(video.url, frameId);
    if (finalUrl) {
        document.getElementById(`screen${frameId}`).src = finalUrl;
        frameStates[frameId] = { videoId: video.id, listIndex: listIndex };
        document.getElementById(`url${frameId}`).value = video.url;
        hidePlaceholder(frameId);
        hideInputOverlay(frameId);
        renderVideoList();
        updateMosaicForFrame(frameId);   // ← mosaic check
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
        updateMosaicForFrame(frameId);   // ← mosaic check
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
    updateMosaicForFrame(frameId);   // ← clear mosaic when frame is stopped
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

    for (let i = 1; i <= 25; i++) {
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
