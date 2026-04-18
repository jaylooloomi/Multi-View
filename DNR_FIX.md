# DNR 規則修復說明

## 問題

部分網站（如 xgroovy.com）在 iframe 中顯示以下錯誤，導致無法嵌入：

```
Refused to display 'https://cn.xgroovy.com/' in a frame
because it set 'X-Frame-Options' to 'sameorigin'.
```

理論上 `background.js` 的 `declarativeNetRequest` 規則應該會移除 `X-Frame-Options` 等安全 header，但實際上沒有生效。

## 原因

Chrome 的 `declarativeNetRequest` 對 `regexFilter` 的 regex 複雜度有限制。

原本的規則把所有網域合併成一條很長的 regex：

```
^https?://.*(youtube\.com|googlevideo\.com|nicovideo\.jp|tiktok\.com|twitch\.tv|doubleclick\.net|pornhub\.com|rule34video\.com|ashemaletube\.com|xgroovy\.com)/.*
```

當 regex 過長時，Chrome 會在 `updateDynamicRules` 時拋出錯誤。  
錯誤雖然被 `catch` 捕獲並印出，但若沒有主動查看 Service Worker Console，很容易忽略。  
結果是**規則完全沒有被註冊**，所有網站的 header 都沒有被移除。

## 解法

將一條長 regex 拆成兩條較短的規則：

- **Rule id:2**：主要平台（YouTube、Nicovideo、Vimeo、TikTok、Twitch、Pornhub）
- **Rule id:3**：追加網站（rule34video、ashemaletube、xgroovy）

每條 regex 長度都在 Chrome 的複雜度限制以內，`updateDynamicRules` 成功執行，header 正確被移除，iframe 嵌入恢復正常。

## 教訓

- `declarativeNetRequest` 的 `regexFilter` 有複雜度上限，新增網域時要注意 regex 長度
- 新增網域後應到 `chrome://extensions/` → Service Worker Console 確認沒有 `Failed to update DNR rules` 錯誤
