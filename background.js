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
      id: 2, // セキュリティ制限の強制解除 (サイドパネル内iframe用)
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
        // sub_frame限定で適用（通常のタブ再生を邪魔しない）
        regexFilter: "^https?://.*(youtube\\.com|googlevideo\\.com|nicovideo\\.jp|tiktok\\.com|twitch\\.tv|doubleclick\\.net|pornhub\\.com)/.*",
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
    console.error("Failed to update DNR rules:", error);
  }
}

chrome.runtime.onInstalled.addListener(setupNetRequestRules);
chrome.runtime.onStartup.addListener(setupNetRequestRules);
setupNetRequestRules();

// サイドパネルをアイコンクリックで開くように設定
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
