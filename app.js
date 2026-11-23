(function () {
    'use strict';

    // Test channels (verified open HLS streams to check Samsung AVPlay hardware decoding)
    var CHANNELS = [
        {
            code: 'НТ',
            name: 'НТВ HD (Прямой CDN)',
            group: 'Новости и общие',
            url: 'https://cdn2.ntv.ru/ntv0_hd/tracks-v1a1/mono.m3u8'
        },
        {
            code: '1К',
            name: 'Первый канал (Тест HTTP)',
            group: 'Новости и общие',
            url: 'http://cdn.ntv.ru/ntv-msk_hd/tracks-v1a1/mono.m3u8'
        },
        {
            code: 'Б2',
            name: 'Беларусь 24 HD',
            group: 'Новости и общие',
            url: 'https://edge59.dc.beltelecom.by/ngtrk/_definst_/smil:belarus24/chunklist_w148744111_b5160000_sleng.m3u8'
        },
        {
            code: 'KS',
            name: 'Kiss TV (1080p)',
            group: 'Музыка',
            url: 'https://tv.broadcasting.ro/kisstv/a629c031-2170-4ee9-a36d-87a891aa3131.m3u8'
        },
        {
            code: 'SR',
            name: 'Stingray Classic Rock',
            group: 'Музыка',
            url: 'https://lotus.stingray.com/manifest/ose-101ads-montreal/samsungtvplus/master.m3u8'
        },
        {
            code: 'DK',
            name: 'Дом кино International',
            group: 'Кино и сериалы',
            url: 'https://fs.uplink.kz/dom_kino/mono.m3u8?token=onlinetv'
        },
        {
            code: 'ML',
            name: 'Mult International',
            group: 'Детские',
            url: 'https://fs.uplink.kz/mult/mono.m3u8?token=onlinetv'
        },
        {
            code: 'TB',
            name: 'Тест 1080p (Mux HLS)',
            group: 'Тест видео',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        }
    ];

    var hasAvPlay = false;
    var currentIndex = 0;
    var focusedIndex = 0;
    var isSideVisible = true;
    var isInfoVisible = false;
    var lastBackPressMs = 0;
    var osdTimer = null;
    var toastTimer = null;
    var diagEntries = [];
    var currentStateText = 'Ожидание';
    var currentResText = '—';

    var elClock, elStatusDot, elStatusText, elSidePanel, elChannelList;
    var elInfoPanel, elInfoCh, elInfoEngine, elInfoRes, elInfoState, elInfoTizen, elDiagLog;
    var elOsdBar, elOsdName, elOsdMeta, elToast, elSplash, elHtml5Player, elAvPlayer;

    function pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function nowTimeStr() {
        var d = new Date();
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }

    function addLog(msg) {
        diagEntries.unshift('[' + nowTimeStr() + '] ' + msg);
        if (diagEntries.length > 14) {
            diagEntries.length = 14;
        }
        if (elDiagLog) {
            elDiagLog.innerHTML = diagEntries.join('<br>');
        }
    }

    function setStatus(text, colorHex) {
        currentStateText = text;
        if (elStatusText) elStatusText.textContent = text;
        if (elStatusDot) elStatusDot.style.backgroundColor = colorHex || '#22C55E';
        if (elInfoState) elInfoState.textContent = 'Состояние: ' + text;
    }

    function showToast(msg, durationMs) {
        if (!elToast) return;
        elToast.textContent = msg;
        elToast.className = '';
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            elToast.className = 'hidden';
        }, durationMs || 2600);
    }

    function showOsd(title, meta) {
        if (!elOsdBar) return;
        elOsdName.textContent = title;
        elOsdMeta.textContent = meta;
        elOsdBar.className = 'panel';
        if (osdTimer) clearTimeout(osdTimer);
        osdTimer = setTimeout(function () {
            elOsdBar.className = 'panel hidden';
        }, 4500);
    }

    function updateClock() {
        var d = new Date();
        if (elClock) {
            elClock.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }
    }

    function detectPlatform() {
        hasAvPlay = (typeof webapis !== 'undefined' && typeof webapis.avplay !== 'undefined');
        var sysDesc = 'Браузер (HTML5)';
        if (hasAvPlay) {
            sysDesc = 'Samsung Tizen (AVPlay)';
            try {
                if (typeof tizen !== 'undefined' && tizen.systeminfo) {
                    var tvModel = tizen.systeminfo.getCapability('http://tizen.org/system/model_name');
                    var tvVer = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version');
                    sysDesc = 'Tizen ' + (tvVer || '?') + ' • ' + (tvModel || 'Samsung TV');
                }
            } catch (e) {}
        }
        if (elInfoEngine) elInfoEngine.textContent = 'Плеер: ' + (hasAvPlay ? 'Samsung AVPlay HW' : 'HTML5 Video');
        if (elInfoTizen) elInfoTizen.textContent = 'Система: ' + sysDesc;
        addLog('Старт: ' + sysDesc);

        if (!hasAvPlay && elHtml5Player && elAvPlayer) {
            elAvPlayer.style.display = 'none';
            elHtml5Player.style.display = 'block';
        }
    }

    function registerSamsungKeys() {
        try {
            if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
                var keys = [
                    'ChannelUp', 'ChannelDown', 'Info',
                    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
                    'MediaPlay', 'MediaPause', 'MediaStop', 'MediaPlayPause'
                ];
                for (var i = 0; i < keys.length; i++) {
                    try {
                        tizen.tvinputdevice.registerKey(keys[i]);
                    } catch (errKey) {}
                }
                addLog('Клавиши пульта Samsung зарегистрированы');
            }
        } catch (e) {
            addLog('Регистрация клавиш: ' + e.message);
        }
    }

    function renderChannelList() {
        if (!elChannelList) return;
        var html = '';
        for (var i = 0; i < CHANNELS.length; i++) {
            var ch = CHANNELS[i];
            var cls = 'ch-item' + (i === focusedIndex ? ' focused' : '');
            var playMark = (i === currentIndex) ? '<span class="ch-playing-mark">▶</span>' : '';
            html += '<div class="' + cls + '" data-idx="' + i + '">' +
                '<span class="ch-badge">' + ch.code + '</span>' +
                playMark + ch.name +
                '</div>';
        }
        elChannelList.innerHTML = html;
    }

    function setSideVisible(visible) {
        isSideVisible = visible;
        if (elSidePanel) {
            elSidePanel.className = visible ? 'panel' : 'panel hidden';
        }
        if (visible) {
            renderChannelList();
        }
    }

    function setInfoVisible(visible) {
        isInfoVisible = visible;
        if (elInfoPanel) {
            elInfoPanel.className = visible ? 'panel' : 'panel hidden';
        }
        updateInfoText();
    }

    function updateInfoText() {
        var ch = CHANNELS[currentIndex];
        if (!ch) return;
        if (elInfoCh) elInfoCh.textContent = 'Канал: ' + ch.name;
        if (elInfoRes) elInfoRes.textContent = 'Разрешение: ' + currentResText;
        if (elInfoState) elInfoState.textContent = 'Состояние: ' + currentStateText;
    }

    function refreshAvPlayResolution() {
        if (!hasAvPlay) return;
        try {
            var tracks = webapis.avplay.getCurrentStreamInfo();
            if (tracks && tracks.length) {
                for (var i = 0; i < tracks.length; i++) {
                    if (tracks[i].type === 'VIDEO' && tracks[i].extra_info) {
                        var info = JSON.parse(tracks[i].extra_info);
                        if (info && info.Width && info.Height) {
                            currentResText = info.Width + 'x' + info.Height;
                            updateInfoText();
                            return;
                        }
                    }
                }
            }
        } catch (e) {}
    }

    function stopPlayback() {
        if (hasAvPlay) {
            try {
                var st = webapis.avplay.getState();
                if (st !== 'NONE' && st !== 'IDLE') {
                    webapis.avplay.stop();
                }
                webapis.avplay.close();
            } catch (e) {}
        } else if (elHtml5Player) {
            try {
                elHtml5Player.pause();
                elHtml5Player.removeAttribute('src');
                elHtml5Player.load();
            } catch (e) {}
        }
    }

    function playChannel(idx) {
        if (idx < 0 || idx >= CHANNELS.length) return;
        currentIndex = idx;
        focusedIndex = idx;
        var ch = CHANNELS[idx];
        currentResText = 'Анализ...';
        renderChannelList();
        updateInfoText();
        setStatus('Буферизация...', '#F59E0B');
        showOsd(ch.name, ch.group + '  •  Подключение...');
        addLog('Пуск: ' + ch.name);

        stopPlayback();

        if (hasAvPlay) {
            try {
                webapis.avplay.open(ch.url);
                try {
                    webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
                } catch (eRect) {}
                try {
                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                } catch (eDisp) {}
                try {
                    webapis.avplay.setTimeoutForBuffering(10);
                } catch (eBuf) {}

                webapis.avplay.setListener({
                    onbufferingstart: function () {
                        setStatus('Буферизация...', '#F59E0B');
                    },
                    onbufferingprogress: function (percent) {
                        setStatus('Буфер ' + percent + '%', '#F59E0B');
                    },
                    onbufferingcomplete: function () {
                        setStatus('Эфир', '#22C55E');
                        refreshAvPlayResolution();
                        showOsd(ch.name, ch.group + '  •  ' + currentResText);
                    },
                    onstreamcompleted: function () {
                        addLog('Поток завершён, перезапуск...');
                        setTimeout(function () { playChannel(currentIndex); }, 800);
                    },
                    oncurrentplaytime: function () {
                        if (currentResText === 'Анализ...') {
                            refreshAvPlayResolution();
                        }
                    },
                    onerror: function (errType) {
                        setStatus('Ошибка: ' + errType, '#EF4444');
                        addLog('AVPlay ERROR: ' + errType);
                        showToast('Ошибка потока: ' + errType, 3000);
                    }
                });

                webapis.avplay.prepareAsync(
                    function () {
                        addLog('OK prepareAsync -> play()');
                        try {
                            webapis.avplay.play();
                            setStatus('Эфир', '#22C55E');
                            refreshAvPlayResolution();
                        } catch (ePlay) {
                            addLog('play() err: ' + ePlay.message);
                            setStatus('Ошибка запуска', '#EF4444');
                        }
                    },
                    function (err) {
                        var msg = (err && err.message) ? err.message : ('' + err);
                        addLog('prepareAsync FAIL: ' + msg);
                        setStatus('Нет сигнала', '#EF4444');
                        showToast('Не удалось открыть канал (' + msg + ')', 3000);
                    }
                );
            } catch (ex) {
                addLog('AVPlay exception: ' + ex.message);
                setStatus('Ошибка плеера', '#EF4444');
            }
        } else if (elHtml5Player) {
            elHtml5Player.src = ch.url;
            elHtml5Player.onplaying = function () {
                currentResText = (elHtml5Player.videoWidth || 0) + 'x' + (elHtml5Player.videoHeight || 0);
                setStatus('Эфир (HTML5)', '#22C55E');
                updateInfoText();
            };
            elHtml5Player.onerror = function () {
                setStatus('Ошибка HTML5', '#EF4444');
                addLog('HTML5 error (нужен ТВ AVPlay для HLS)');
            };
            try { elHtml5Player.play(); } catch (eH) {}
        }
    }

    function exitApp() {
        stopPlayback();
        try {
            if (typeof tizen !== 'undefined' && tizen.application) {
                tizen.application.getCurrentApplication().exit();
            }
        } catch (e) {}
    }

    function handleKeyDown(e) {
        var code = e.keyCode;
        // Samsung TV key codes:
        // Up=38, Down=40, Left=37, Right=39, OK/Enter=13
        // Return/Back=10009 (or Backspace=8 / Esc=27 in browser)
        // Ch+=427, Ch-=428, Info=457, Exit=10182
        if (code === 38) { // UP
            e.preventDefault();
            if (isSideVisible) {
                focusedIndex = (focusedIndex - 1 + CHANNELS.length) % CHANNELS.length;
                renderChannelList();
            } else {
                playChannel((currentIndex - 1 + CHANNELS.length) % CHANNELS.length);
            }
        } else if (code === 40) { // DOWN
            e.preventDefault();
            if (isSideVisible) {
                focusedIndex = (focusedIndex + 1) % CHANNELS.length;
                renderChannelList();
            } else {
                playChannel((currentIndex + 1) % CHANNELS.length);
            }
        } else if (code === 13) { // OK / ENTER
            e.preventDefault();
            if (isSideVisible) {
                playChannel(focusedIndex);
                setSideVisible(false);
            } else {
                setSideVisible(true);
            }
        } else if (code === 39) { // RIGHT
            e.preventDefault();
            if (isSideVisible) {
                setSideVisible(false);
            } else {
                setInfoVisible(!isInfoVisible);
            }
        } else if (code === 37) { // LEFT
            e.preventDefault();
            if (isInfoVisible) {
                setInfoVisible(false);
            } else {
                setSideVisible(!isSideVisible);
            }
        } else if (code === 427) { // CH+
            e.preventDefault();
            playChannel((currentIndex + 1) % CHANNELS.length);
        } else if (code === 428) { // CH-
            e.preventDefault();
            playChannel((currentIndex - 1 + CHANNELS.length) % CHANNELS.length);
        } else if (code === 457 || code === 73) { // INFO or 'i'
            e.preventDefault();
            setInfoVisible(!isInfoVisible);
        } else if (code === 10009 || code === 27 || code === 8) { // RETURN / BACK
            e.preventDefault();
            if (isInfoVisible) {
                setInfoVisible(false);
            } else if (isSideVisible) {
                setSideVisible(false);
            } else {
                var now = new Date().getTime();
                if (now - lastBackPressMs < 2000) {
                    exitApp();
                } else {
                    lastBackPressMs = now;
                    showToast('Нажмите «Назад» ещё раз для выхода', 2000);
                }
            }
        } else if (code === 10182) { // EXIT
            e.preventDefault();
            exitApp();
        }
    }

    function initApp() {
        elClock = document.getElementById('clock-badge');
        elStatusDot = document.getElementById('status-dot');
        elStatusText = document.getElementById('status-text');
        elSidePanel = document.getElementById('side-panel');
        elChannelList = document.getElementById('channel-list');
        elInfoPanel = document.getElementById('info-panel');
        elInfoCh = document.getElementById('info-ch');
        elInfoEngine = document.getElementById('info-engine');
        elInfoRes = document.getElementById('info-res');
        elInfoState = document.getElementById('info-state');
        elInfoTizen = document.getElementById('info-tizen');
        elDiagLog = document.getElementById('diag-log');
        elOsdBar = document.getElementById('osd-bar');
        elOsdName = document.getElementById('osd-channel-name');
        elOsdMeta = document.getElementById('osd-channel-meta');
        elToast = document.getElementById('toast-box');
        elSplash = document.getElementById('splash-overlay');
        elHtml5Player = document.getElementById('html5-player');
        elAvPlayer = document.getElementById('av-player');

        updateClock();
        setInterval(updateClock, 10000);
        detectPlatform();
        registerSamsungKeys();
        renderChannelList();

        document.addEventListener('keydown', handleKeyDown, false);

        // Hide splash after 1.6s and start first test stream
        setTimeout(function () {
            if (elSplash) elSplash.className = 'hidden';
            playChannel(0);
        }, 1600);
    }

    window.addEventListener('load', initApp, false);
})();
