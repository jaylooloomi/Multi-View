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
    btn_coffee_title:    '請我喝杯咖啡 ☕',
    btn_open_tab:        '❐ 開啟分頁',
    btn_open_tab_title:  '在新分頁開啟',
    btn_open_popup:      '⧉ 開新視窗',
    btn_open_popup_title:'在彈出視窗開啟（無瀏覽器工具列）',
    btn_save_group:      '記憶',
    btn_clear_all:       '清空',
    locale_select_title: '語言',
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
    modal_cancel:        '取消',
    porn_toggle_title:        '顯示／隱藏成人平台',
    group_clear_frames_title: '清空所有影片框，開始新一輪',
    group_add_new_title:      '增加新群組',
    group_save_changes_title: '儲存修改',
    btn_export:               '匯出',
    btn_import:               '匯入',
    btn_export_groups:        '匯出群組備份',
    btn_import_groups:        '匯入群組備份',
    toast_export_none:        '目前沒有群組可匯出',
    toast_export_ok:          '已匯出 {0} 個群組',
    toast_import_ok:          '已匯入 {0} 個群組',
    toast_import_error:       '匯入失敗，請確認檔案格式正確',
    ctrl_play:   '播放',
    ctrl_pause:  '暫停',
    ctrl_reload: '重新載入',
    ctrl_stop:   '停止',
    ctrl_skip:   '下一個',
    ctrl_link:   '在新視窗開啟此影片'
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
    btn_coffee_title:    '请我喝杯咖啡 ☕',
    btn_open_tab:        '❐ 开启标签',
    btn_open_tab_title:  '在新标签页开启',
    btn_open_popup:      '⧉ 新窗口',
    btn_open_popup_title:'在弹出窗口开启（无浏览器工具栏）',
    btn_save_group:      '记忆',
    btn_clear_all:       '清空',
    locale_select_title: '语言',
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
    modal_cancel:        '取消',
    porn_toggle_title:        '显示／隐藏成人平台',
    group_clear_frames_title: '清空所有视频框，开始新一轮',
    group_add_new_title:      '新增群组',
    group_save_changes_title: '保存修改',
    btn_export:               '导出',
    btn_import:               '导入',
    btn_export_groups:        '导出群组备份',
    btn_import_groups:        '导入群组备份',
    toast_export_none:        '当前没有群组可导出',
    toast_export_ok:          '已导出 {0} 个群组',
    toast_import_ok:          '已导入 {0} 个群组',
    toast_import_error:       '导入失败，请确认文件格式正确',
    ctrl_play:   '播放',
    ctrl_pause:  '暂停',
    ctrl_reload: '重新加载',
    ctrl_stop:   '停止',
    ctrl_skip:   '下一个',
    ctrl_link:   '在新窗口打开此视频'
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
    btn_coffee_title:    'Buy me a coffee ☕',
    btn_open_tab:        '❐ Open Tab',
    btn_open_tab_title:  'Open in new tab',
    btn_open_popup:      '⧉ New Window',
    btn_open_popup_title:'Open in popup window (no browser toolbar)',
    btn_save_group:      'Save Group',
    btn_clear_all:       'Clear All',
    locale_select_title: 'Language',
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
    modal_cancel:        'Cancel',
    porn_toggle_title:        'Show / Hide Adult Platforms',
    group_clear_frames_title: 'Clear all frames to start fresh',
    group_add_new_title:      'Add New Group',
    group_save_changes_title: 'Save Changes',
    btn_export:               'Export',
    btn_import:               'Import',
    btn_export_groups:        'Export Groups Backup',
    btn_import_groups:        'Import Groups Backup',
    toast_export_none:        'No groups to export',
    toast_export_ok:          'Exported {0} groups',
    toast_import_ok:          'Imported {0} groups',
    toast_import_error:       'Import failed — please check the file format',
    ctrl_play:   'Play',
    ctrl_pause:  'Pause',
    ctrl_reload: 'Reload',
    ctrl_stop:   'Stop',
    ctrl_skip:   'Next',
    ctrl_link:   'Open in new window'
  },
  ja: {
    btn_copy:            'コピー',
    btn_paste:           '貼り付け',
    btn_compact:         '整列',
    btn_save_quick:      '保存',
    btn_pause_all:       '一時停止',
    btn_resume_all:      '再生',
    btn_mute_all:        'ミュート',
    btn_unmute_all:      'ミュート解除',
    btn_coffee_title:    'コーヒーを奢ってください ☕',
    btn_open_tab:        '❐ タブを開く',
    btn_open_tab_title:  '新しいタブで開く',
    btn_open_popup:      '⧉ 新規ウィンドウ',
    btn_open_popup_title:'ポップアップウィンドウで開く（ツールバーなし）',
    btn_save_group:      '記録',
    btn_clear_all:       'クリア',
    locale_select_title: '言語',
    cell_label:          '{0}枠',
    input_placeholder:   'URLまたは動画IDを貼り付け',
    btn_load:            '再生',
    btn_cancel_input:    'キャンセル',
    toast_copy_none:     'コピーする動画がありません',
    toast_copy_ok:       '{0}個のURLをコピーしました',
    toast_copy_error:    'クリップボードへの書き込みに失敗しました',
    toast_save_no_group: 'グループを読み込んでから保存してください',
    toast_save_none:     '保存する動画がありません',
    toast_save_ok:       '「{0}」を保存しました',
    toast_compact_no_gap:'空きがないため整列不要',
    toast_compact_ok:    '動画枠を整列しました',
    toast_pause_ok:      'すべての動画を一時停止しました',
    toast_resume_ok:     'すべての動画を再生しました',
    toast_mute_ok:       'すべての動画をミュートしました',
    toast_unmute_ok:     'ミュートを解除しました',
    toast_paste_empty:   'クリップボードに有効なURLがありません',
    toast_paste_full:    'すべての動画枠が埋まっています',
    toast_paste_ok:      '{0}個のURLを貼り付けました',
    toast_paste_error:   'クリップボードを読み取れません。ブラウザの権限を確認してください',
    alert_group_limit:   'グループは最大20個まで。1つ削除してください',
    alert_group_none:    '記録する動画がありません',
    default_group_name:  'グループ {0}',
    edit_btn_title:      '編集',
    delete_btn_title:    '削除',
    modal_edit_title:    'グループを編集',
    modal_name_placeholder: 'メモ（省略可）',
    modal_add_url:       '+ URLを追加',
    modal_save:          '保存',
    modal_cancel:        'キャンセル',
    porn_toggle_title:        '成人向けプラットフォームを表示／非表示',
    group_clear_frames_title: 'すべての枠をクリアして新しく始める',
    group_add_new_title:      'グループを追加',
    group_save_changes_title: '変更を保存',
    btn_export:               'エクスポート',
    btn_import:               'インポート',
    btn_export_groups:        'グループをエクスポート',
    btn_import_groups:        'グループをインポート',
    toast_export_none:        'エクスポートするグループがありません',
    toast_export_ok:          '{0}個のグループをエクスポートしました',
    toast_import_ok:          '{0}個のグループをインポートしました',
    toast_import_error:       'インポート失敗。ファイル形式を確認してください',
    ctrl_play:   '再生',
    ctrl_pause:  '一時停止',
    ctrl_reload: '再読み込み',
    ctrl_stop:   '停止',
    ctrl_skip:   '次へ',
    ctrl_link:   '新しいウィンドウで開く'
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

  // Hover-controls: update title on all 25 frames at once via class selectors
  document.querySelectorAll('.play-btn').forEach(function(el)   { el.title = t('ctrl_play');   });
  document.querySelectorAll('.pause-btn').forEach(function(el)  { el.title = t('ctrl_pause');  });
  document.querySelectorAll('.reload-btn').forEach(function(el) { el.title = t('ctrl_reload'); });
  document.querySelectorAll('.stop-btn').forEach(function(el)   { el.title = t('ctrl_stop');   });
  document.querySelectorAll('.skip-btn').forEach(function(el)   { el.title = t('ctrl_skip');   });
  document.querySelectorAll('.btn-link').forEach(function(el)   { el.title = t('ctrl_link');   });
}
