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
      id: 2, // For major platforms (group A)
      // NOTE: keep this regex SHORT — Chrome RE2 has a 2KB compiled-size limit.
      // Using [^/]* instead of .* before the domain avoids DFA explosion.
      // Split across two rules (id=2 + id=6) so each stays well under the limit.
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
        regexFilter: "^https?://[^/]*(youtube\\.com|googlevideo\\.com|nicovideo\\.jp|tiktok\\.com|twitch\\.tv|doubleclick\\.net)/",
        resourceTypes: ["sub_frame", "xmlhttprequest"],
      },
    },
    {
      id: 6, // For major platforms (group B) — split from id=2 to stay under 2KB RE2 limit
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
        regexFilter: "^https?://[^/]*(pornhub\\.com|xhamster\\.com|xhamster\\.desi|xhamster\\.one)/",
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
    },
    {
      id: 5, // XHamster: spoof Referer/Origin so embed player allows playback
      // XHamster's embed player JS checks document.referrer — if it's not from
      // xhamster.com it blocks video playback. Extension pages send
      // chrome-extension://... which fails the check.
      // Spoofing Referer + Origin to xhamster.com makes the player think the
      // embed is hosted on xhamster itself.
      // Priority 200 so it overrides the generic header-removal rule (id=2/3).
      // Only affects XHamster sub_frame and XHR (video segment) requests.
      priority: 200,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Referer", operation: "set", value: "https://xhamster.com/" },
          { header: "Origin", operation: "set", value: "https://xhamster.com" }
        ],
      },
      condition: {
        regexFilter: "^https?://[a-z.]*xhamster\\.(com|desi|one)/",
        resourceTypes: ["sub_frame", "xmlhttprequest", "media"],
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

// onInstalled: fires when extension is first installed or updated to a new version.
// onStartup:   fires when Chrome starts with the extension already installed.
// Dynamic rules persist across service-worker restarts, so no immediate call is needed.
// Calling setupNetRequestRules() immediately AND inside onInstalled causes a race
// condition (two concurrent getDynamicRules → updateDynamicRules flows) that
// triggers "Failed to update DNR rules".
chrome.runtime.onInstalled.addListener(setupNetRequestRules);
chrome.runtime.onStartup.addListener(setupNetRequestRules);

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
