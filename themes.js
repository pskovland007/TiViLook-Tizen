(function () {
    'use strict';

    var STORAGE_KEY = 'tivilook_tizen_v3_settings';

    var THEMES = [
        {
            id: 0,
            name: 'Материал Дизайн',
            panelRgb: '36, 44, 61',
            cardRgb: '47, 58, 79',
            accent: '#3B82F6',
            border: '#64748B',
            text: '#F1F5F9',
            muted: '#94A3B8',
            textOnAccent: '#FFFFFF',
            font: '"SamsungOne", "Roboto", "DejaVu Sans", Arial, sans-serif',
            isLight: false
        },
        {
            id: 1,
            name: 'Неон',
            panelRgb: '6, 5, 10',
            cardRgb: '24, 21, 38',
            accent: '#00E5FF',
            border: '#FF7597',
            text: '#FFFFFF',
            muted: '#A5B4FC',
            textOnAccent: '#06050A',
            font: '"SamsungOne", "Roboto", "DejaVu Sans", Arial, sans-serif',
            isLight: false
        },
        {
            id: 2,
            name: 'Амолед Блэк',
            panelRgb: '0, 0, 0',
            cardRgb: '22, 22, 24',
            accent: '#FFFFFF',
            border: '#A1A1AA',
            text: '#FFFFFF',
            muted: '#A1A1AA',
            textOnAccent: '#000000',
            font: '"SamsungOne", "Roboto", "DejaVu Sans", Arial, sans-serif',
            isLight: false
        },
        {
            id: 3,
            name: 'Монохром',
            panelRgb: '244, 244, 245',
            cardRgb: '228, 228, 231',
            accent: '#52525B',
            border: '#A1A1AA',
            text: '#27272A',
            muted: '#52525B',
            textOnAccent: '#FFFFFF',
            font: '"SamsungOne", "Roboto", "DejaVu Sans", Arial, sans-serif',
            isLight: true
        },
        {
            id: 4,
            name: 'Ретро',
            panelRgb: '31, 29, 27',
            cardRgb: '50, 46, 43',
            accent: '#D4892A',
            border: '#277A68',
            text: '#F5E6CC',
            muted: '#C7B89E',
            textOnAccent: '#1F1D1B',
            font: 'Georgia, "Times New Roman", serif',
            isLight: false
        },
        {
            id: 5,
            name: 'Карусель',
            panelRgb: '22, 25, 34',
            cardRgb: '35, 40, 54',
            accent: '#29B6F6',
            border: '#29B6F6',
            text: '#FFFFFF',
            muted: '#94A3B8',
            textOnAccent: '#0B101B',
            font: '"SamsungOne", "Roboto", "DejaVu Sans", Arial, sans-serif',
            isLight: false
        }
    ];

    var ALPHA_LEVELS = [
        { label: 'Плотный (94%)', panelA: 0.94, cardA: 0.86 },
        { label: 'Средний (84%)', panelA: 0.84, cardA: 0.74 },
        { label: 'Стекло (68%)',  panelA: 0.68, cardA: 0.56 }
    ];

    var AMBILIGHT_MODES = [
        'Выключена',
        'Цвет темы',
        'Мягкий спектр'
    ];

    var ASPECT_MODES = [
        { label: 'На весь экран (16:9)', method: 'PLAYER_DISPLAY_MODE_FULL_SCREEN' },
        { label: 'По размеру (Оригинал)', method: 'PLAYER_DISPLAY_MODE_LETTER_BOX' }
    ];

    var AUTOHIDE_MODES = [
        { label: '8 сек', ms: 8000 },
        { label: '16 сек', ms: 16000 },
        { label: '30 сек', ms: 30000 },
        { label: 'Не скрывать', ms: 0 }
    ];

    var SPECTRUM_COLORS = ['#00E5FF', '#22C55E', '#FACC15', '#EF7540', '#B82A6B', '#7C4DFF'];

    var state = {
        themeIndex: 1,
        alphaIndex: 0,
        ambilightMode: 1,
        aspectIndex: 0,
        showClock: true,
        autoHideIndex: 1
    };

    var isModalOpen = false;
    var focusedRow = 0;
    var spectrumStep = 0;
    var spectrumTimer = null;
    var styleTag = null;
    var callbacks = null;
    var extraItems = []; // For Stage 3B (Tester) and Stage 3C (EPG)

    var elModal = null;
    var elList = null;
    var elSwatches = null;

    function loadSettings() {
        try {
            if (window.localStorage) {
                var raw = window.localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (typeof parsed.themeIndex === 'number') state.themeIndex = parsed.themeIndex;
                    if (typeof parsed.alphaIndex === 'number') state.alphaIndex = parsed.alphaIndex;
                    if (typeof parsed.ambilightMode === 'number') state.ambilightMode = parsed.ambilightMode;
                    if (typeof parsed.aspectIndex === 'number') state.aspectIndex = parsed.aspectIndex;
                    if (typeof parsed.showClock === 'boolean') state.showClock = parsed.showClock;
                    if (typeof parsed.autoHideIndex === 'number') state.autoHideIndex = parsed.autoHideIndex;
                }
            }
        } catch (e) {}
        if (state.themeIndex < 0 || state.themeIndex >= THEMES.length) state.themeIndex = 1;
        if (state.alphaIndex < 0 || state.alphaIndex >= ALPHA_LEVELS.length) state.alphaIndex = 0;
        if (state.ambilightMode < 0 || state.ambilightMode >= AMBILIGHT_MODES.length) state.ambilightMode = 1;
        if (state.aspectIndex < 0 || state.aspectIndex >= ASPECT_MODES.length) state.aspectIndex = 0;
        if (state.autoHideIndex < 0 || state.autoHideIndex >= AUTOHIDE_MODES.length) state.autoHideIndex = 1;
    }

    function saveSettings() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            }
        } catch (e) {}
    }

    function getTheme() {
        return THEMES[state.themeIndex] || THEMES[1];
    }

    function ensureStyleTag() {
        if (!styleTag) {
            styleTag = document.getElementById('tivilook-theme-css');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.type = 'text/css';
                styleTag.id = 'tivilook-theme-css';
                document.getElementsByTagName('head')[0].appendChild(styleTag);
            }
        }
        return styleTag;
    }

    function updateClockVisibility() {
        var clk = document.getElementById('clock-badge');
        if (clk) {
            clk.style.display = state.showClock ? 'block' : 'none';
        }
    }

    function applyThemeCss() {
        var t = getTheme();
        var al = ALPHA_LEVELS[state.alphaIndex] || ALPHA_LEVELS[0];
        var panelBg = 'rgba(' + t.panelRgb + ', ' + al.panelA + ')';
        var modalBg = 'rgba(' + t.panelRgb + ', ' + Math.min(0.97, al.panelA + 0.05) + ')';
        var cardBg = 'rgba(' + t.cardRgb + ', ' + al.cardA + ')';
        var badgeBg = 'rgba(' + t.panelRgb + ', ' + Math.max(0.72, al.panelA - 0.12) + ')';
        var borderCol = t.border;
        var shadowCss = 'none';

        if (state.ambilightMode === 1) {
            shadowCss = '0 0 30px ' + t.accent;
            borderCol = t.accent;
        } else if (state.ambilightMode === 2) {
            var spCol = SPECTRUM_COLORS[spectrumStep % SPECTRUM_COLORS.length];
            shadowCss = '0 0 32px ' + spCol;
            borderCol = spCol;
        }

        var dividerCol = t.isLight ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.14)';
        var inputBg = t.isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(8, 12, 22, 0.88)';
        var logBg = t.isLight ? 'rgba(228, 228, 231, 0.92)' : 'rgba(8, 12, 20, 0.88)';
        var actionBg = t.isLight ? 'rgba(212, 212, 216, 0.85)' : cardBg;
        var focusBorder = t.isLight ? '#18181B' : '#FFFFFF';
        var captionCol = t.isLight ? t.accent : '#FFD54F';

        var css = '' +
            'html, body { font-family: ' + t.font + '; color: ' + t.text + '; }\n' +
            '.panel { background-color: ' + panelBg + '; border-color: ' + borderCol + '; box-shadow: ' + shadowCss + '; color: ' + t.text + '; }\n' +
            '#add-url-modal, #sublist-modal, #settings-modal, #tester-modal, #epg-modal, #epg-url-modal, #qr-modal { background-color: ' + modalBg + '; }\n' +
            '#qr-status-text { background-color: ' + logBg + '; color: ' + captionCol + '; }\n' +
            '#qr-session-code { color: ' + t.accent + '; border-color: ' + t.accent + '; }\n' +
            '#qr-relay-info { color: ' + t.muted + '; }\n' +
            '#clock-badge, #status-badge { background-color: ' + badgeBg + '; color: ' + t.text + '; border-color: ' + dividerCol + '; }\n' +
            '.side-brand, .info-title, .modal-title, #osd-channel-name { color: ' + t.accent + '; }\n' +
            '.side-header, .side-footer, .diag-title { border-color: ' + dividerCol + '; }\n' +
            '#side-counter, .modal-subtitle, .side-footer, .modal-footer-hint, .preset-label { color: ' + t.muted + '; }\n' +
            '#side-group-caption { color: ' + captionCol + '; }\n' +
            '.side-tab { color: ' + t.muted + '; background-color: ' + cardBg + '; border-color: ' + dividerCol + '; }\n' +
            '.side-tab.active { background-color: ' + t.accent + '; border-color: ' + focusBorder + '; color: ' + t.textOnAccent + '; }\n' +
            '.list-row, .settings-row, .tstat-row, .epg-row { background-color: ' + cardBg + '; color: ' + t.text + '; }\n' +
            '.list-row.action-row { background-color: ' + actionBg + '; border-color: ' + dividerCol + '; }\n' +
            '.list-row.focused, .list-row.action-row.focused, .settings-row.focused, .tstat-row.focused, .epg-row.focused { background-color: ' + t.accent + '; border-color: ' + focusBorder + '; color: ' + t.textOnAccent + '; }\n' +
            '.epg-time { color: ' + t.muted + '; }\n' +
            '.epg-row.focused .epg-time { color: ' + t.textOnAccent + '; }\n' +
            '#epg-desc-box { background-color: ' + logBg + '; color: ' + t.text + '; }\n' +
            '#osd-epg-title { color: ' + captionCol + '; }\n' +
            '.info-epg-now { color: ' + (t.isLight ? '#15803D' : '#4ADE80') + '; }\n' +
            '.info-epg-next { color: ' + t.muted + '; }\n' +
            '.row-right, .settings-val { color: ' + t.muted + '; }\n' +
            '.list-row.focused .row-right, .settings-row.focused .settings-val { color: ' + t.textOnAccent + '; }\n' +
            '.info-row, #osd-channel-meta, .form-label { color: ' + t.text + '; }\n' +
            '.diag-title { color: ' + captionCol + '; }\n' +
            '#diag-log { background-color: ' + logBg + '; color: ' + t.text + '; }\n' +
            '.input-wrap { background-color: ' + inputBg + '; border-color: ' + dividerCol + '; }\n' +
            '.input-wrap.focused { border-color: ' + t.accent + '; }\n' +
            '.input-wrap input { color: ' + t.text + '; }\n' +
            '.preset-btn, .modal-btn { background-color: ' + cardBg + '; color: ' + t.text + '; border-color: ' + dividerCol + '; }\n' +
            '.preset-btn.focused, .modal-btn.focused, .tstat-btn.focused { background-color: ' + t.accent + '; border-color: ' + focusBorder + '; color: ' + t.textOnAccent + '; }\n' +
            '.tstat-track { background-color: ' + (t.isLight ? '#D4D4D8' : 'rgba(255,255,255,0.16)') + '; }\n' +
            '.tstat-row.focused .tstat-track { background-color: rgba(0, 0, 0, 0.35); }\n' +
            '.tstat-row.focused .tstat-num-ok, .tstat-row.focused .tstat-ch-ok { color: ' + (t.textOnAccent === '#FFFFFF' ? '#86EFAC' : '#065F46') + '; }\n' +
            '.tstat-row.focused .tstat-num-err, .tstat-row.focused .tstat-ch-err { color: ' + (t.textOnAccent === '#FFFFFF' ? '#FCA5A5' : '#991B1B') + '; }\n' +
            '.tstat-row.focused .tstat-ch-wait { color: ' + t.textOnAccent + '; }\n' +
            '#toast-box { background-color: ' + modalBg + '; border-color: ' + t.accent + '; color: ' + t.text + '; }\n';

        ensureStyleTag().textContent = css;
        updateClockVisibility();
    }

    function syncSpectrumTimer() {
        if (spectrumTimer) {
            clearInterval(spectrumTimer);
            spectrumTimer = null;
        }
        if (state.ambilightMode === 2) {
            spectrumTimer = setInterval(function () {
                spectrumStep = (spectrumStep + 1) % SPECTRUM_COLORS.length;
                applyThemeCss();
            }, 2200);
        }
    }

    function buildSettingsRows() {
        var t = getTheme();
        var rows = [
            {
                id: 'theme',
                title: 'Тема оформления',
                val: '◀  ' + t.name + '  ▶'
            },
            {
                id: 'alpha',
                title: 'Прозрачность меню',
                val: '◀  ' + ALPHA_LEVELS[state.alphaIndex].label + '  ▶'
            },
            {
                id: 'ambilight',
                title: 'Подсветка рамки (Ambilight)',
                val: '◀  ' + AMBILIGHT_MODES[state.ambilightMode] + '  ▶'
            },
            {
                id: 'aspect',
                title: 'Формат изображения',
                val: '◀  ' + ASPECT_MODES[state.aspectIndex].label + '  ▶'
            },
            {
                id: 'clock',
                title: 'Часы в левом углу',
                val: state.showClock ? 'Показывать' : 'Скрыты'
            },
            {
                id: 'autohide',
                title: 'Автоскрытие бокового меню',
                val: '◀  ' + AUTOHIDE_MODES[state.autoHideIndex].label + '  ▶'
            }
        ];

        for (var i = 0; i < extraItems.length; i++) {
            rows.push(extraItems[i]);
        }

        rows.push({
            id: 'close',
            title: 'Закрыть настройки',
            val: 'OK / Назад'
        });
        return rows;
    }

    function renderSettingsModal() {
        if (!elList) return;
        var rows = buildSettingsRows();
        if (focusedRow < 0) focusedRow = 0;
        if (focusedRow >= rows.length) focusedRow = rows.length - 1;

        var html = '';
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var cls = 'settings-row' + (i === focusedRow ? ' focused' : '');
            var valText = (typeof r.getValue === 'function') ? r.getValue() : r.val;
            html += '<div class="' + cls + '">' +
                '<span class="settings-label">' + r.title + '</span>' +
                '<span class="settings-val">' + valText + '</span>' +
                '</div>';
        }
        elList.innerHTML = html;

        if (elSwatches) {
            var swHtml = '';
            for (var k = 0; k < THEMES.length; k++) {
                var th = THEMES[k];
                var activeCls = (k === state.themeIndex) ? ' swatch-item active' : ' swatch-item';
                swHtml += '<span class="' + activeCls + '" style="background-color:rgb(' + th.panelRgb + ');border-color:' + th.accent + ';color:' + th.text + ';">' +
                    '<span class="swatch-dot" style="background-color:' + th.accent + ';"></span>' + th.name +
                    '</span>';
            }
            elSwatches.innerHTML = swHtml;
        }
    }

    function stepRowValue(rowId, delta) {
        if (rowId === 'theme') {
            state.themeIndex = (state.themeIndex + delta + THEMES.length) % THEMES.length;
            applyThemeCss();
        } else if (rowId === 'alpha') {
            state.alphaIndex = (state.alphaIndex + delta + ALPHA_LEVELS.length) % ALPHA_LEVELS.length;
            applyThemeCss();
        } else if (rowId === 'ambilight') {
            state.ambilightMode = (state.ambilightMode + delta + AMBILIGHT_MODES.length) % AMBILIGHT_MODES.length;
            syncSpectrumTimer();
            applyThemeCss();
        } else if (rowId === 'aspect') {
            state.aspectIndex = (state.aspectIndex + delta + ASPECT_MODES.length) % ASPECT_MODES.length;
            if (callbacks && callbacks.onAspectChanged) {
                callbacks.onAspectChanged(ASPECT_MODES[state.aspectIndex].method);
            }
        } else if (rowId === 'clock') {
            state.showClock = !state.showClock;
            updateClockVisibility();
        } else if (rowId === 'autohide') {
            state.autoHideIndex = (state.autoHideIndex + delta + AUTOHIDE_MODES.length) % AUTOHIDE_MODES.length;
        }
        saveSettings();
        renderSettingsModal();
    }

    function open() {
        if (!elModal) return;
        isModalOpen = true;
        focusedRow = 0;
        elModal.className = 'panel';
        renderSettingsModal();
    }

    function close() {
        if (!elModal) return;
        isModalOpen = false;
        elModal.className = 'panel hidden';
        if (callbacks && callbacks.onClosed) callbacks.onClosed();
    }

    function handleKey(e) {
        if (!isModalOpen) return false;
        var code = e.keyCode;
        var rows = buildSettingsRows();

        if (code === 10009 || code === 27 || code === 8) {
            e.preventDefault();
            close();
            return true;
        }
        if (code === 38) { // UP
            e.preventDefault();
            focusedRow = (focusedRow - 1 + rows.length) % rows.length;
            renderSettingsModal();
            return true;
        }
        if (code === 40) { // DOWN
            e.preventDefault();
            focusedRow = (focusedRow + 1) % rows.length;
            renderSettingsModal();
            return true;
        }
        var cur = rows[focusedRow];
        if (!cur) return true;

        if (code === 37) { // LEFT
            e.preventDefault();
            if (cur.id !== 'close' && !cur.onAction) stepRowValue(cur.id, -1);
            return true;
        }
        if (code === 39) { // RIGHT
            e.preventDefault();
            if (cur.id !== 'close' && !cur.onAction) stepRowValue(cur.id, +1);
            return true;
        }
        if (code === 13) { // OK
            e.preventDefault();
            if (cur.id === 'close') {
                close();
            } else if (typeof cur.onAction === 'function') {
                close();
                cur.onAction();
            } else {
                stepRowValue(cur.id, +1);
            }
            return true;
        }
        return true;
    }

    window.TiViThemes = {
        init: function (opts) {
            callbacks = opts || {};
            elModal = document.getElementById('settings-modal');
            elList = document.getElementById('settings-list');
            elSwatches = document.getElementById('theme-swatches');
            loadSettings();
            applyThemeCss();
            syncSpectrumTimer();
        },
        open: open,
        close: close,
        isOpen: function () { return isModalOpen; },
        handleKey: handleKey,
        getDisplayMethod: function () {
            return (ASPECT_MODES[state.aspectIndex] || ASPECT_MODES[0]).method;
        },
        getAutoHideMs: function () {
            return (AUTOHIDE_MODES[state.autoHideIndex] || AUTOHIDE_MODES[1]).ms;
        },
        getThemeName: function () {
            return getTheme().name;
        },
        registerActionItem: function (item) {
            if (item && item.id) extraItems.push(item);
        }
    };
})();
