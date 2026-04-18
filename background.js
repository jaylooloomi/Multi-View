async function setupNetRequestRules() {
  const rules = [
    {
      id: 1, // TikTok用
      priority: 100,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Referer", operation: "set", value: "https://www.tiktok.com/" }
        ],
      },
      condition: {
        urlFilter: "|https://www.tiktok.com/*",
        resourceTypes: ["sub_frame"],
      },
    },
    {
      id: 2, // 主要プラットフォーム用
      priority: 100,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "X-Frame-Options", operation: "remove" },
          { header: "Content-Security-Policy", operation: "remove" },
          { header: "Cross-Origin-Embedder-Policy", operation: "remove" },
          { header: "Cross-Origin-Resource-Policy", operation: "remove" },
          { header: "Cross-Origin-Opener-Policy", operation: "remove" },
          { header: "X-WebKit-CSP", operation: "remove" },
          { header: "X-Content-Security-Policy", operation: "remove" }
        ],
      },
      condition: {
        regexFilter: "^https?://.*(youtube\\.com|googlevideo\\.com|nicovideo\\.jp|tiktok\\.com|twitch\\.tv|doubleclick\\.net|pornhub\\.com)/.*",
        resourceTypes: ["sub_frame", "xmlhttprequest"],
      },
    },
    {
      id: 3, // 追加サイト用
      priority: 100,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "X-Frame-Options", operation: "remove" },
          { header: "Content-Security-Policy", operation: "remove" },
          { header: "Cross-Origin-Embedder-Policy", operation: "remove" },
          { header: "Cross-Origin-Resource-Policy", operation: "remove" },
          { header: "Cross-Origin-Opener-Policy", operation: "remove" },
          { header: "X-WebKit-CSP", operation: "remove" },
          { header: "X-Content-Security-Policy", operation: "remove" }
        ],
      },
      condition: {
        regexFilter: "^https?://.*(rule34video\\.com|ashemaletube\\.com|xgroovy\\.com)/.*",
        resourceTypes: ["sub_frame", "xmlhttprequest"],
      },
    }
  ];

  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: rules,
    });
    console.log("DNR rules optimized for side panel.");
  } catch (error) {
    console.error("Failed to update DNR rules:", error.message, error);
  }
}

chrome.runtime.onInstalled.addListener(setupNetRequestRules);
chrome.runtime.onStartup.addListener(setupNetRequestRules);
setupNetRequestRules();

// サイドパネルをアイコンクリックで開くように設定
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// content_script からの URL 送信を受け取り、面板を開いてから URL を渡す
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "loadUrlsToPanel") {
    const urls = request.urls || [];
    const tabId = sender.tab?.id;

    // pending URL を storage に保存しておき、面板が開いたときに読み込む
    chrome.storage.local.set({ pendingUrls: urls }, () => {
      if (tabId) {
        chrome.sidePanel.open({ tabId }).catch(e => console.error("sidePanel.open failed:", e));
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});
