// i18n.js — Multi-View runtime language switching

const MESSAGES = {
  zh_TW: {
    btn_copy:            '複製',
    btn_paste:           '貼上',
    btn_compact:         '重排',
    btn_save_quick:      '儲存',
    btn_pause_all:       '暫停',
    btn_resume_all:      '繼續',
    btn_mute_all:        '靜音',
    btn_unmute_all:      '取消靜音',
    btn_open_tab:        '⧉ 分頁',
    btn_open_tab_title:  '在新分頁開啟',
    btn_save_group:      '記憶',
    btn_clear_all:       '清空',
    cell_label:          '格 {0}',
    input_placeholder:   '貼上 URL 或影片 ID',
    btn_load:            '播放',
    btn_cancel_input:    '取消',
    toast_copy_none:     '目前沒有影片可複製',
    toast_copy_ok:       '已複製 {0} 個網址',
    toast_copy_error:    '無法寫入剪貼簿',
    toast_save_no_group: '請先載入一個群組，再按儲存',
    toast_save_none:     '目前沒有影片可儲存',
    toast_save_ok:       '已儲存「{0}」',
    toast_compact_no_gap:'沒有空隙，不需要重排',
    toast_compact_ok:    '已重排影片框',
    toast_pause_ok:      '已暫停所有影片',
    toast_resume_ok:     '已繼續播放所有影片',
    toast_mute_ok:       '已靜音所有影片',
    toast_unmute_ok:     '已取消靜音',
    toast_paste_empty:   '剪貼簿中沒有有效的網址',
    toast_paste_full:    '所有影片框已有內容',
    toast_paste_ok:      '已貼上 {0} 個網址',
    toast_paste_error:   '無法讀取剪貼簿，請確認瀏覽器已授權',
    alert_group_limit:   '最多只能儲存 20 組記憶，請先刪除一組',
    alert_group_none:    '目前沒有影片可以記憶',
    default_group_name:  '群組 {0}',
    edit_btn_title:      '編輯',
    delete_btn_title:    '刪除',
    modal_edit_title:    '編輯群組',
    modal_name_placeholder: '備註（可留空）',
    modal_add_url:       '+ 新增網址',
    modal_save:          '儲存',
    modal_cancel:        '取消'
  },
  zh_CN: {
    btn_copy:            '复制',
    btn_paste:           '粘贴',
    btn_compact:         '重排',
    btn_save_quick:      '保存',
    btn_pause_all:       '暂停',
    btn_resume_all:      '继续',
    btn_mute_all:        '静音',
    btn_unmute_all:      '取消静音',
    btn_open_tab:        '⧉ 新标签',
    btn_open_tab_title:  '在新标签页开启',
    btn_save_group:      '记忆',
    btn_clear_all:       '清空',
    cell_label:          '格 {0}',
    input_placeholder:   '粘贴 URL 或视频 ID',
    btn_load:            '播放',
    btn_cancel_input:    '取消',
    toast_copy_none:     '当前没有视频可复制',
    toast_copy_ok:       '已复制 {0} 个链接',
    toast_copy_error:    '无法写入剪贴板',
    toast_save_no_group: '请先加载群组再保存',
    toast_save_none:     '当前没有视频可保存',
    toast_save_ok:       '已保存「{0}」',
    toast_compact_no_gap:'没有空隙，无需重排',
    toast_compact_ok:    '已重排视频框',
    toast_pause_ok:      '已暂停所有视频',
    toast_resume_ok:     '已继续播放所有视频',
    toast_mute_ok:       '已静音所有视频',
    toast_unmute_ok:     '已取消静音',
    toast_paste_empty:   '剪贴板中没有有效链接',
    toast_paste_full:    '所有视频框已有内容',
    toast_paste_ok:      '已粘贴 {0} 个链接',
    toast_paste_error:   '无法读取剪贴板，请确认浏览器已授权',
    alert_group_limit:   '最多保存20组，请先删除一组',
    alert_group_none:    '当前没有视频可以记忆',
    default_group_name:  '群组 {0}',
    edit_btn_title:      '编辑',
    delete_btn_title:    '删除',
    modal_edit_title:    '编辑群组',
    modal_name_placeholder: '备注（可留空）',
    modal_add_url:       '+ 添加链接',
    modal_save:          '保存',
    modal_cancel:        '取消'
  },
  en: {
    btn_copy:            'Copy',
    btn_paste:           'Paste',
    btn_compact:         'Compact',
    btn_save_quick:      'Save',
    btn_pause_all:       'Pause',
    btn_resume_all:      'Resume',
    btn_mute_all:        'Mute',
    btn_unmute_all:      'Unmute',
    btn_open_tab:        '⧉ New Tab',
    btn_open_tab_title:  'Open in new tab',
    btn_save_group:      'Save Group',
    btn_clear_all:       'Clear All',
    cell_label:          'Cell {0}',
    input_placeholder:   'Paste URL or Video ID',
    btn_load:            'Load',
    btn_cancel_input:    'Cancel',
    toast_copy_none:     'No videos to copy',
    toast_copy_ok:       'Copied {0} URLs',
    toast_copy_error:    'Failed to write clipboard',
    toast_save_no_group: 'Load a group first',
    toast_save_none:     'No videos to save',
    toast_save_ok:       'Saved "{0}"',
    toast_compact_no_gap:'No gaps, nothing to compact',
    toast_compact_ok:    'Frames compacted',
    toast_pause_ok:      'All videos paused',
    toast_resume_ok:     'All videos resumed',
    toast_mute_ok:       'All videos muted',
    toast_unmute_ok:     'All videos unmuted',
    toast_paste_empty:   'No valid URLs in clipboard',
    toast_paste_full:    'All frames are occupied',
    toast_paste_ok:      'Pasted {0} URLs',
    toast_paste_error:   'Cannot read clipboard, check permissions',
    alert_group_limit:   'Max 20 groups reached, delete one first',
    alert_group_none:    'No videos loaded to save',
    default_group_name:  'Group {0}',
    edit_btn_title:      'Edit',
    delete_btn_title:    'Delete',
    modal_edit_title:    'Edit Group',
    modal_name_placeholder: 'Note (optional)',
    modal_add_url:       '+ Add URL',
    modal_save:          'Save',
    modal_cancel:        'Cancel'
  }
};

let _locale = 'zh_TW';

function t(key) {
  const args = Array.prototype.slice.call(arguments, 1);
  let msg = (MESSAGES[_locale] && MESSAGES[_locale][key])
            || (MESSAGES['zh_TW'][key])
            || key;
  args.forEach(function(arg, i) { msg = msg.replace('{' + i + '}', arg); });
  return msg;
}

function setLocale(locale) {
  _locale = locale;
  chrome.storage.local.set({ locale: locale });
  applyI18n();
  // Re-render dynamic group chips if sidepanel.js has loaded renderGroups
  if (typeof renderGroups === 'function') renderGroups();
}

function getLocale() { return _locale; }

function initLocale(callback) {
  chrome.storage.local.get(['locale'], function(data) {
    _locale = data.locale || 'zh_TW';
    if (callback) callback();
  });
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.dataset.i18n;
    var arg = el.dataset.i18nArg;
    el.textContent = arg !== undefined ? t(key, arg) : t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    el.title = t(el.dataset.i18nTitle);
  });
  // Update the locale combobox to reflect current selection
  var sel = document.getElementById('locale-select');
  if (sel) sel.value = _locale;
}
