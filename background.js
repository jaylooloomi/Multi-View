async function setupNetRequestRules() {
  const rules = [
    {
      id: 1, // For TikTok
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
      id: 2, // For major platforms
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
      id: 4, // Twitch: spoof Referer so parent=localhost check passes
      // player.twitch.tv validates that document.referrer matches the ?parent= param.
      // Chrome extensions send chrome-extension://... as referrer which fails the check.
      // Setting Referer to https://localhost/ makes it match parent=localhost.
      priority: 200,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Referer", operation: "set", value: "https://localhost/" },
          { header: "Origin", operation: "set", value: "https://localhost" }
        ],
      },
      condition: {
        regexFilter: "^https://player\\.twitch\\.tv/",
        resourceTypes: ["sub_frame"],
      },
    },
    {
      id: 3, // For additional sites
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

// Configure the side panel to open when the icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Receive URL submissions from content_script, open the panel, then pass the URLs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "loadUrlsToPanel") {
    const urls = request.urls || [];
    const tabId = sender.tab?.id;

    // Save pending URLs to storage so they can be loaded when the panel opens
    chrome.storage.local.set({ pendingUrls: urls }, () => {
      if (tabId) {
        chrome.sidePanel.open({ tabId }).catch(e => console.error("sidePanel.open failed:", e));
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});
