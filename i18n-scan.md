# i18n Scan Report — Multi-View

> Generated: 2026-04-19  
> Purpose: List all Traditional Chinese (繁體中文) strings before implementing i18n (zh_TW / zh_CN / en_US)

---

## Planned i18n Key Structure

Each string will get a `messageKey`. Chrome i18n uses `_locales/<locale>/messages.json`.

Planned locales:
| Folder | Language |
|--------|----------|
| `_locales/zh_TW/messages.json` | 繁體中文 (Traditional Chinese) |
| `_locales/zh_CN/messages.json` | 簡體中文 (Simplified Chinese) |
| `_locales/en/messages.json` | English (US) |

---

## `sidepanel.html` — Static UI Strings

### Topbar Buttons — Group 1

| Message Key | zh_TW | Notes |
|-------------|-------|-------|
| `btn_copy` | 複製 | `#btn-copy-urls` label |
| `btn_paste` | 貼上 | `#btn-paste-urls` label |
| `btn_compact` | 重排 | `#btn-compact` label |
| `btn_save_quick` | 儲存 | `#btn-save-quick` label |

### Topbar Buttons — Group 2

| Message Key | zh_TW | Notes |
|-------------|-------|-------|
| `btn_pause_all` | 暫停 | `#btn-pause-all` label |
| `btn_resume_all` | 繼續 | `#btn-resume-all` label |
| `btn_mute_all` | 靜音 | `#btn-mute-all` label |
| `btn_unmute_all` | 取消靜音 | `#btn-unmute-all` label |

### Topbar Buttons — Right

| Message Key | zh_TW | Notes |
|-------------|-------|-------|
| `btn_open_tab` | ⧉ 分頁 | `#btn-open-tab` label |
| `btn_open_tab_title` | 在新分頁開啟 | `title` attribute |
| `btn_save_group` | 記憶 | `#btn-save-group` label |
| `btn_clear_all` | 清空 | `#btn-clear-all` label (currently HTML entity `&#28165;&#31354;`) |

### Per-Screen Cells (×25, same strings repeated)

| Message Key | zh_TW | Notes |
|-------------|-------|-------|
| `cell_label` | 格 {n} | `.cell-label` — `n` = frame number 1–25 |
| `input_placeholder` | 貼上 URL 或影片 ID | `placeholder` on `.url-input` |
| `btn_load` | 播放 | `.load-btn` label |
| `btn_cancel_input` | 取消 | `.cancel-btn` label |

---

## `sidepanel.js` — Dynamic / Toast / Alert Strings

### Toast Messages — Copy Button

| Message Key | zh_TW |
|-------------|-------|
| `toast_copy_none` | 目前沒有影片可複製 |
| `toast_copy_ok` | 已複製 {n} 個網址 |
| `toast_copy_error` | 無法寫入剪貼簿 |

### Toast Messages — Save (儲存) Button

| Message Key | zh_TW |
|-------------|-------|
| `toast_save_no_group` | 請先載入一個群組，再按儲存 |
| `toast_save_none` | 目前沒有影片可儲存 |
| `toast_save_ok` | 已儲存「{name}」 |

### Toast Messages — Compact (重排) Button

| Message Key | zh_TW |
|-------------|-------|
| `toast_compact_no_gap` | 沒有空隙，不需要重排 |
| `toast_compact_ok` | 已重排影片框 |

### Toast Messages — Playback Controls

| Message Key | zh_TW |
|-------------|-------|
| `toast_pause_ok` | 已暫停所有影片 |
| `toast_resume_ok` | 已繼續播放所有影片 |
| `toast_mute_ok` | 已靜音所有影片 |
| `toast_unmute_ok` | 已取消靜音 |

### Toast Messages — Paste Button

| Message Key | zh_TW |
|-------------|-------|
| `toast_paste_empty` | 剪貼簿中沒有有效的網址 |
| `toast_paste_full` | 所有影片框已有內容 |
| `toast_paste_ok` | 已貼上 {n} 個網址 |
| `toast_paste_error` | 無法讀取剪貼簿，請確認瀏覽器已授權 |

### Alert Messages — Save Group (記憶)

| Message Key | zh_TW |
|-------------|-------|
| `alert_group_limit` | 最多只能儲存 20 組記憶，請先刪除一組 |
| `alert_group_none` | 目前沒有影片可以記憶 |

### Dynamically Generated UI Text (JS)

| Message Key | zh_TW | Notes |
|-------------|-------|-------|
| `default_group_name` | 群組 {n} | Default name when saving a new group |
| `edit_btn_title` | 編輯 | Tooltip on group chip edit button |
| `delete_btn_title` | 刪除 | Tooltip on group chip delete button |

### Group Edit Modal

| Message Key | zh_TW |
|-------------|-------|
| `modal_edit_title` | 編輯群組 |
| `modal_name_placeholder` | 群組名稱 |
| `modal_add_url` | + 新增網址 |
| `modal_save` | 儲存 |
| `modal_cancel` | 取消 |

---

## `content_script.js` — Injected Floating Toolbar

| Message Key | zh_TW |
|-------------|-------|
| `toolbar_select` | ☑ 選擇 |
| `toolbar_selected_count` | 已選 {n} |
| `toolbar_send` | 送入面板 → |
| `toolbar_clear` | 清除 |
| `toolbar_reload_alert` | 擴充功能已更新，請重新整理此頁面後再試 |

---

## Summary

| File | Unique Message Keys |
|------|---------------------|
| `sidepanel.html` | 12 (+ `cell_label` ×25 uses same key) |
| `sidepanel.js` | 24 |
| `content_script.js` | 5 |
| **Total** | **41 unique keys** |

---

## Next Steps

1. Create `_locales/zh_TW/messages.json` with all 41 keys (Traditional Chinese — current default)
2. Create `_locales/zh_CN/messages.json` (Simplified Chinese)
3. Create `_locales/en/messages.json` (English US)
4. Add `"default_locale": "zh_TW"` to `manifest.json`
5. Replace all hardcoded strings:
   - HTML: `data-i18n="key"` attribute + JS init loop calling `chrome.i18n.getMessage()`
   - JS: replace string literals with `chrome.i18n.getMessage('key')`
   - `content_script.js`: same — `chrome.i18n.getMessage()` works in content scripts too

---

## Notes

- `cell_label` uses a numeric interpolation (`格 N`) — Chrome i18n supports `$1` substitution via `"placeholders"`
- `toast_copy_ok`, `toast_paste_ok`, `toast_save_ok`, `toolbar_selected_count`, `default_group_name` also use substitution
- `alert()` calls should ideally be replaced with `showToast()` before i18n (for consistency)
- Japanese strings in `content_script.js` (lines 64, 99) are for YouTube scraping logic — **not UI strings, do not translate**
