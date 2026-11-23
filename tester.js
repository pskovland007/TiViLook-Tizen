(function () {
    'use strict';

    var STORAGE_HIDDEN_KEY = 'tivilook_tizen_v3_auto_hidden';
    var VISIBLE_ROWS = 7;
    var MAX_CONCURRENCY = 3;
    var PROBE_TIMEOUT_MS = 4500;

    var hiddenUrlsMap = {}; // url -> true (persisted)
    var healthMap = {};     // url -> true | false (session)

    var isOpenFlag = false;
    var viewMode = 'groups'; // 'groups' | 'channels'
    var selectedGroup = 'Все каналы';
    var focusArea = 'list';  // 'buttons' | 'list'
    var focusedBtnIdx = 0;
    var focusedRowIdx = 0;

    var isRunning = false;
    var isRescanMode = false;
    var runSessionId = 0;
    var runQueue = [];
    var runTotal = 0;
    var runDone = 0;
    var runAlive = 0;
    var runDead = 0;
    var activeWorkers = 0;
    var activeXhrs = [];
    var lastUiRefreshMs = 0;
    var bannerHideTimer = null;

    var elModal = null;
    var elTitle = null;
    var elSubtitle = null;
    var elButtons = null;
    var elList = null;
    var elBanner = null;

    function escapeHtml(str) {
        return ('' + (str || '')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function trimStr(str) {
        return ('' + (str || '')).replace(/^\s+|\s+$/g, '');
    }

    function loadHiddenUrls() {
        try {
            if (window.localStorage) {
                var raw = window.localStorage.getItem(STORAGE_HIDDEN_KEY);
                if (raw) {
                    var arr = JSON.parse(raw);
                    hiddenUrlsMap = {};
                    if (arr && arr.length) {
                        for (var i = 0; i < arr.length; i++) {
                            if (arr[i]) hiddenUrlsMap[arr[i]] = true;
                        }
                    }
                }
            }
        } catch (e) {}
    }

    function saveHiddenUrls() {
        try {
            if (window.localStorage) {
                var arr = [];
                for (var u in hiddenUrlsMap) {
                    if (hiddenUrlsMap.hasOwnProperty(u) && hiddenUrlsMap[u]) {
                        arr.push(u);
                    }
                }
                if (arr.length > 2500) arr.length = 2500;
                window.localStorage.setItem(STORAGE_HIDDEN_KEY, JSON.stringify(arr));
            }
        } catch (e) {}
    }

    function getAllChannelsSafe() {
        return (window.TiViApp && window.TiViApp.getAllChannels) ? window.TiViApp.getAllChannels() : [];
    }

    function getCategoriesSafe() {
        var cats = (window.TiViApp && window.TiViApp.getCategories) ? window.TiViApp.getCategories() : [];
        var out = ['Все каналы'];
        for (var i = 0; i < cats.length; i++) {
            var c = cats[i];
            if (c !== '★ Избранное' && c !== 'Все каналы' && out.indexOf(c) === -1) {
                out.push(c);
            }
        }
        return out;
    }

    function getChannelsInGroup(groupName) {
        var all = getAllChannelsSafe();
        if (groupName === 'Все каналы') return all.slice(0);
        var out = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].category === groupName) out.push(all[i]);
        }
        return out;
    }

    function getHiddenInList(list) {
        var out = [];
        for (var i = 0; i < list.length; i++) {
            if (hiddenUrlsMap[list[i].url]) out.push(list[i]);
        }
        return out;
    }

    function countDeadInList(list) {
        var c = 0;
        for (var i = 0; i < list.length; i++) {
            var u = list[i].url;
            if (healthMap[u] === false || (healthMap[u] === undefined && hiddenUrlsMap[u])) c++;
        }
        return c;
    }

    function countAliveInList(list) {
        var c = 0;
        for (var i = 0; i < list.length; i++) {
            if (healthMap[list[i].url] === true) c++;
        }
        return c;
    }

    function showBanner(text, autoHideMs) {
        if (!elBanner) return;
        if (bannerHideTimer) {
            clearTimeout(bannerHideTimer);
            bannerHideTimer = null;
        }
        elBanner.textContent = text;
        elBanner.className = 'panel';
        if (autoHideMs && autoHideMs > 0) {
            bannerHideTimer = setTimeout(function () {
                if (!isRunning && elBanner) elBanner.className = 'panel hidden';
            }, autoHideMs);
        }
    }

    function hideBanner() {
        if (bannerHideTimer) {
            clearTimeout(bannerHideTimer);
            bannerHideTimer = null;
        }
        if (elBanner) elBanner.className = 'panel hidden';
    }

    // =========================================================================
    // Low-RAM Tizen 2.4 Deep Stream Probing (NO Range header, immediate abort)
    // =========================================================================
    function trackXhr(xhr) {
        activeXhrs.push(xhr);
    }

    function untrackXhr(xhr) {
        var idx = activeXhrs.indexOf(xhr);
        if (idx !== -1) activeXhrs.splice(idx, 1);
    }

    function abortAllActiveXhrs() {
        var copy = activeXhrs.slice(0);
        activeXhrs = [];
        for (var i = 0; i < copy.length; i++) {
            try { copy[i].abort(); } catch (e) {}
        }
    }

    function resolveRelativeUrl(baseUrl, rel) {
        var r = trimStr(rel);
        if (!r) return '';
        if (r.indexOf('http://') === 0 || r.indexOf('https://') === 0) return r;
        var m = baseUrl.match(/^(https?:\/\/[^\/]+)(\/.*)?$/i);
        if (!m) return r;
        var origin = m[1];
        var path = m[2] || '/';
        if (r.indexOf('//') === 0) {
            var proto = baseUrl.indexOf('https://') === 0 ? 'https:' : 'http:';
            return proto + r;
        }
        if (r.charAt(0) === '/') return origin + r;
        var lastSlash = path.lastIndexOf('/');
        var dir = lastSlash >= 0 ? path.substr(0, lastSlash + 1) : '/';
        return origin + dir + r;
    }

    function extractFirstHlsUri(body, baseUrl) {
        var lines = (body || '').split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var line = trimStr(lines[i]);
            if (!line || line.charAt(0) === '#') continue;
            return resolveRelativeUrl(baseUrl, line);
        }
        return '';
    }

    function isBadHtmlResponse(text) {
        var low = (text || '').substr(0, 320).toLowerCase();
        return (low.indexOf('<html') !== -1 || low.indexOf('<!doctype html') !== -1 ||
                low.indexOf('404 not found') !== -1 || low.indexOf('access denied') !== -1);
    }

    // Fast header/first-chunk probe: aborts immediately once HTTP 2xx non-HTML is confirmed
    function probeMediaSegmentFast(url, myRunId, cb) {
        var done = false;
        function finish(ok) {
            if (done) return;
            done = true;
            cb(ok);
        }
        try {
            var xhr = new XMLHttpRequest();
            trackXhr(xhr);
            xhr.open('GET', url, true);
            xhr.timeout = PROBE_TIMEOUT_MS;
            xhr.onreadystatechange = function () {
                if (myRunId !== runSessionId) {
                    try { xhr.abort(); } catch (e0) {}
                    untrackXhr(xhr);
                    finish(false);
                    return;
                }
                if (xhr.readyState === 2 || xhr.readyState === 3) {
                    var st = 0;
                    var ct = '';
                    try { st = xhr.status; } catch (e1) {}
                    try { ct = (xhr.getResponseHeader('Content-Type') || '').toLowerCase(); } catch (e2) {}
                    if (st >= 200 && st < 300) {
                        if (ct.indexOf('text/html') !== -1 || ct.indexOf('application/json') !== -1) {
                            try { xhr.abort(); } catch (e3) {}
                            untrackXhr(xhr);
                            finish(false);
                            return;
                        }
                        if (xhr.readyState === 3 || ct.indexOf('video/') !== -1 || ct.indexOf('audio/') !== -1 || ct.indexOf('octet-stream') !== -1 || ct.indexOf('mp2t') !== -1) {
                            try { xhr.abort(); } catch (e4) {}
                            untrackXhr(xhr);
                            finish(true);
                            return;
                        }
                    } else if (st >= 400) {
                        try { xhr.abort(); } catch (e5) {}
                        untrackXhr(xhr);
                        finish(false);
                        return;
                    }
                } else if (xhr.readyState === 4) {
                    untrackXhr(xhr);
                    var okFinal = (xhr.status >= 200 && xhr.status < 300);
                    if (okFinal && xhr.responseText && isBadHtmlResponse(xhr.responseText)) okFinal = false;
                    finish(okFinal);
                }
            };
            xhr.ontimeout = function () { untrackXhr(xhr); finish(false); };
            xhr.onerror = function () { untrackXhr(xhr); finish(false); };
            xhr.send(null);
        } catch (e) {
            finish(false);
        }
    }

    function fetchSmallText(url, myRunId, cb) {
        var done = false;
        function finish(ok, finalUrl, text) {
            if (done) return;
            done = true;
            cb(ok, finalUrl, text);
        }
        try {
            var xhr = new XMLHttpRequest();
            trackXhr(xhr);
            xhr.open('GET', url, true);
            xhr.timeout = PROBE_TIMEOUT_MS;
            xhr.onreadystatechange = function () {
                if (myRunId !== runSessionId) {
                    try { xhr.abort(); } catch (e0) {}
                    untrackXhr(xhr);
                    finish(false, url, '');
                    return;
                }
                if (xhr.readyState === 2) {
                    var ct = '';
                    try { ct = (xhr.getResponseHeader('Content-Type') || '').toLowerCase(); } catch (e1) {}
                    if (ct.indexOf('video/') !== -1 || ct.indexOf('audio/') !== -1 || ct.indexOf('mp2t') !== -1 || ct.indexOf('octet-stream') !== -1) {
                        var st2 = 0;
                        try { st2 = xhr.status; } catch (e2) {}
                        try { xhr.abort(); } catch (e3) {}
                        untrackXhr(xhr);
                        finish(st2 >= 200 && st2 < 300, url, '__BINARY_OK__');
                        return;
                    }
                } else if (xhr.readyState === 4) {
                    untrackXhr(xhr);
                    var ok = (xhr.status >= 200 && xhr.status < 300 && !!xhr.responseText);
                    var fUrl = url;
                    try { if (xhr.responseURL) fUrl = xhr.responseURL; } catch (e4) {}
                    finish(ok, fUrl, ok ? xhr.responseText : '');
                }
            };
            xhr.ontimeout = function () { untrackXhr(xhr); finish(false, url, ''); };
            xhr.onerror = function () { untrackXhr(xhr); finish(false, url, ''); };
            xhr.send(null);
        } catch (e) {
            finish(false, url, '');
        }
    }

    function probeSingleUrlDeep(url, myRunId, cb) {
        var cleanUrl = trimStr((url || '').split('#')[0]);
        var low = cleanUrl.toLowerCase();
        if (low.indexOf('http://') !== 0 && low.indexOf('https://') !== 0) {
            cb(false);
            return;
        }
        var isLikelyHls = (low.indexOf('.m3u') !== -1 || low.indexOf('/hls/') !== -1 ||
                           low.indexOf('playlist') !== -1 || low.indexOf('mono.') !== -1 || low.indexOf('index.') !== -1);
        var isDash = (low.indexOf('.mpd') !== -1);

        if (!isLikelyHls && !isDash) {
            probeMediaSegmentFast(cleanUrl, myRunId, cb);
            return;
        }

        fetchSmallText(cleanUrl, myRunId, function (ok, finalUrl, body) {
            if (myRunId !== runSessionId) { cb(false); return; }
            if (!ok || !body) { cb(false); return; }
            if (body === '__BINARY_OK__') { cb(true); return; }
            if (isBadHtmlResponse(body)) { cb(false); return; }

            var upper = body.toUpperCase();
            if (isDash || upper.indexOf('<MPD') !== -1) {
                if (upper.indexOf('EDEF8BA9') !== -1 || upper.indexOf('WIDEVINE') !== -1 || upper.indexOf('PLAYREADY') !== -1) {
                    cb(false);
                    return;
                }
                cb(upper.indexOf('<SEGMENT') !== -1 || upper.indexOf('<BASEURL') !== -1 || upper.indexOf('<ADAPTATIONSET') !== -1);
                return;
            }

            if (upper.indexOf('#EXTM3U') === -1) {
                cb(false);
                return;
            }
            if (upper.indexOf('SAMPLE-AES') !== -1 || upper.indexOf('WIDEVINE') !== -1 || upper.indexOf('EDEF8BA9') !== -1) {
                cb(false);
                return;
            }

            if (upper.indexOf('#EXT-X-STREAM-INF') !== -1) {
                var variantUrl = extractFirstHlsUri(body, finalUrl);
                if (!variantUrl) { cb(false); return; }
                fetchSmallText(variantUrl, myRunId, function (ok2, finalUrl2, body2) {
                    if (myRunId !== runSessionId || !ok2 || !body2) { cb(false); return; }
                    if (body2 === '__BINARY_OK__') { cb(true); return; }
                    var u2 = body2.toUpperCase();
                    if (u2.indexOf('#EXTM3U') === -1 || u2.indexOf('SAMPLE-AES') !== -1 || u2.indexOf('WIDEVINE') !== -1) {
                        cb(false);
                        return;
                    }
                    var segUrl2 = extractFirstHlsUri(body2, finalUrl2);
                    if (!segUrl2) { cb(false); return; }
                    probeMediaSegmentFast(segUrl2, myRunId, cb);
                });
                return;
            }

            var segUrl = extractFirstHlsUri(body, finalUrl);
            if (!segUrl) { cb(false); return; }
            probeMediaSegmentFast(segUrl, myRunId, cb);
        });
    }

    function probeChannelSmart(ch, myRunId, cb) {
        var primaryUrl = ch.url;
        var isBuiltin = (window.TiViApp && window.TiViApp.isBuiltinActive) ? window.TiViApp.isBuiltinActive() : true;
        probeSingleUrlDeep(primaryUrl, myRunId, function (ok) {
            if (ok || myRunId !== runSessionId) {
                cb(ok);
                return;
            }
            // On Tizen 2.4.0, if HTTPS failed, test HTTP fallback just like AVPlay does!
            if (isBuiltin && primaryUrl.indexOf('https://') === 0) {
                var httpUrl = 'http://' + primaryUrl.substr(8);
                probeSingleUrlDeep(httpUrl, myRunId, cb);
            } else {
                cb(false);
            }
        });
    }

    // =========================================================================
    // Test Runner Engine
    // =========================================================================
    function startTest(channels, rescanHiddenOnly) {
        if (isRunning || !channels || channels.length === 0) return;
        runSessionId++;
        var myRunId = runSessionId;

        isRunning = true;
        isRescanMode = !!rescanHiddenOnly;
        runQueue = channels.slice(0);
        runTotal = runQueue.length;
        runDone = 0;
        runAlive = 0;
        runDead = 0;
        activeWorkers = 0;
        lastUiRefreshMs = 0;

        for (var i = 0; i < runQueue.length; i++) {
            delete healthMap[runQueue[i].url];
        }

        showBanner((isRescanMode ? 'Проверка скрытых: 0 / ' : 'Тест каналов: 0 / ') + runTotal, 0);
        if (window.TiViApp && window.TiViApp.addLog) {
            window.TiViApp.addLog((isRescanMode ? 'Пересканирование скрытых: ' : 'Запуск теста каналов: ') + runTotal);
        }
        if (isOpenFlag) renderModal();

        function finishRun() {
            if (myRunId !== runSessionId) return;
            isRunning = false;
            saveHiddenUrls();
            if (window.TiViApp && window.TiViApp.refreshUi) window.TiViApp.refreshUi();

            var doneMsg = isRescanMode
                ? ('Пересканировано: ✓ вернулось ' + runAlive + '  |  ✕ скрыто: ' + runDead)
                : ('Готово! Рабочих: ✓ ' + runAlive + '  |  Скрыто нерабочих: ✕ ' + runDead);
            showBanner(doneMsg, 6000);
            if (window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog(doneMsg);
            if (isOpenFlag) renderModal();
        }

        function pumpNext() {
            if (!isRunning || myRunId !== runSessionId) return;
            while (activeWorkers < MAX_CONCURRENCY && runQueue.length > 0) {
                var ch = runQueue.shift();
                activeWorkers++;
                (function (targetCh) {
                    probeChannelSmart(targetCh, myRunId, function (isAlive) {
                        if (myRunId !== runSessionId) return;
                        activeWorkers--;
                        healthMap[targetCh.url] = isAlive;
                        if (isAlive) {
                            runAlive++;
                            delete hiddenUrlsMap[targetCh.url];
                        } else {
                            runDead++;
                            hiddenUrlsMap[targetCh.url] = true;
                        }
                        runDone++;

                        var now = new Date().getTime();
                        if (now - lastUiRefreshMs >= 700 || runDone >= runTotal) {
                            lastUiRefreshMs = now;
                            showBanner(
                                (isRescanMode ? 'Скрытые: ' : 'Тест: ') + runDone + ' / ' + runTotal +
                                '   •   ✓ ' + runAlive + '   ✕ ' + runDead,
                                0
                            );
                            if (isOpenFlag) renderModal();
                        }

                        if (runQueue.length === 0 && activeWorkers === 0) {
                            finishRun();
                        } else {
                            pumpNext();
                        }
                    });
                })(ch);
            }
        }

        pumpNext();
    }

    function stopTest(silent) {
        if (!isRunning) return;
        runSessionId++;
        isRunning = false;
        runQueue = [];
        activeWorkers = 0;
        abortAllActiveXhrs();
        saveHiddenUrls();
        if (window.TiViApp && window.TiViApp.refreshUi) window.TiViApp.refreshUi();
        if (!silent) {
            showBanner('Тест остановлен (' + runDone + ' / ' + runTotal + ')', 3500);
        } else {
            hideBanner();
        }
        if (isOpenFlag) renderModal();
    }

    function restoreHiddenForList(list) {
        var count = 0;
        for (var i = 0; i < list.length; i++) {
            var u = list[i].url;
            if (hiddenUrlsMap[u]) {
                delete hiddenUrlsMap[u];
                count++;
            }
            if (healthMap[u] === false) delete healthMap[u];
        }
        saveHiddenUrls();
        if (window.TiViApp && window.TiViApp.refreshUi) window.TiViApp.refreshUi();
        if (window.TiViApp && window.TiViApp.showToast) {
            window.TiViApp.showToast('Возвращено скрытых каналов: ' + count, 2400);
        }
        if (isOpenFlag) renderModal();
    }

    // =========================================================================
    // UI Rendering (Option 3: 3-column aligned progress bars & tabular numbers)
    // =========================================================================
    function buildTopButtons() {
        var btns = [];
        if (viewMode === 'groups') {
            var allChs = getAllChannelsSafe();
            var hiddenAll = getHiddenInList(allChs);
            btns.push({
                id: 'toggle_run',
                label: isRunning ? '■ Стоп' : '▶ Запустить тест',
                isPrimary: !isRunning,
                isDanger: isRunning
            });
            if (isRunning) {
                btns.push({ id: 'bg', label: '▲ В фон' });
            } else if (hiddenAll.length > 0) {
                btns.push({ id: 'rescan', label: '↻ Пересканировать (' + hiddenAll.length + ')' });
                btns.push({ id: 'restore', label: '↺ Вернуть скрытые (' + hiddenAll.length + ')' });
            }
        } else {
            var grpChs = getChannelsInGroup(selectedGroup);
            var hiddenGrp = getHiddenInList(grpChs);
            btns.push({ id: 'back_groups', label: '◀ Группы' });
            btns.push({
                id: 'toggle_run_grp',
                label: isRunning ? '■ Стоп' : '▶ Тест группы',
                isPrimary: !isRunning,
                isDanger: isRunning
            });
            if (isRunning) {
                btns.push({ id: 'bg', label: '▲ В фон' });
            } else if (hiddenGrp.length > 0) {
                btns.push({ id: 'rescan_grp', label: '↻ Пересканировать (' + hiddenGrp.length + ')' });
                btns.push({ id: 'restore_grp', label: '↺ Вернуть (' + hiddenGrp.length + ')' });
            }
        }
        return btns;
    }

    function renderModal() {
        if (!elModal || !elList || !elButtons) return;

        elTitle.textContent = (viewMode === 'groups') ? 'Тест каналов' : selectedGroup;
        if (isRunning) {
            elSubtitle.textContent = (isRescanMode ? 'Пересканирование скрытых: ' : 'Проверка потоков: ') +
                runDone + ' из ' + runTotal + '   •   ✓ ' + runAlive + '   ✕ ' + runDead;
        } else {
            var allNow = getAllChannelsSafe();
            var hidNow = getHiddenInList(allNow).length;
            elSubtitle.textContent = 'Всего каналов: ' + allNow.length + '   •   Скрыто нерабочих: ' + hidNow;
        }

        // Top buttons
        var btns = buildTopButtons();
        if (focusedBtnIdx < 0) focusedBtnIdx = 0;
        if (focusedBtnIdx >= btns.length) focusedBtnIdx = btns.length - 1;

        var bHtml = '';
        for (var b = 0; b < btns.length; b++) {
            var btn = btns[b];
            var bCls = 'tstat-btn';
            if (btn.isPrimary) bCls += ' primary-btn';
            if (btn.isDanger) bCls += ' danger-btn';
            if (focusArea === 'buttons' && b === focusedBtnIdx) bCls += ' focused';
            bHtml += '<span class="' + bCls + '">' + escapeHtml(btn.label) + '</span>';
        }
        elButtons.innerHTML = bHtml;

        // List rows
        var html = '';
        var i, start, end;

        if (viewMode === 'groups') {
            var groups = getCategoriesSafe();
            if (focusedRowIdx < 0) focusedRowIdx = 0;
            if (focusedRowIdx >= groups.length) focusedRowIdx = groups.length - 1;

            start = Math.max(0, Math.min(focusedRowIdx - Math.floor(VISIBLE_ROWS / 2), groups.length - VISIBLE_ROWS));
            if (start < 0) start = 0;
            end = Math.min(groups.length, start + VISIBLE_ROWS);

            for (i = start; i < end; i++) {
                var gName = groups[i];
                var gChans = getChannelsInGroup(gName);
                var total = gChans.length;
                var alive = countAliveInList(gChans);
                var dead = countDeadInList(gChans);
                var greenPct = total > 0 ? Math.min(100, Math.round((alive * 100) / total)) : 0;
                var redPct = total > 0 ? Math.min(100 - greenPct, Math.round((dead * 100) / total)) : 0;
                var isFoc = (focusArea === 'list' && i === focusedRowIdx);

                html += '<div class="tstat-row' + (isFoc ? ' focused' : '') + '">' +
                    '<span class="tstat-left"><span class="tstat-play">▸</span>' + escapeHtml(gName) + '</span>' +
                    '<span class="tstat-mid">' +
                        '<span class="tstat-track">' +
                            '<span class="tstat-fill-green" style="width:' + greenPct + '%;"></span>' +
                            '<span class="tstat-fill-red" style="left:' + greenPct + '%;width:' + redPct + '%;"></span>' +
                        '</span>' +
                    '</span>' +
                    '<span class="tstat-right">' +
                        '<span class="tstat-num-ok">✓ ' + alive + '</span>' +
                        '<span class="tstat-num-err">✕ ' + dead + '</span>' +
                    '</span>' +
                    '</div>';
            }
            elList.innerHTML = html;
            return;
        }

        // Group Channels view
        var chList = getChannelsInGroup(selectedGroup);
        if (chList.length === 0) {
            elList.innerHTML = '<div class="empty-hint">В этой группе нет каналов.</div>';
            return;
        }
        if (focusedRowIdx < 0) focusedRowIdx = 0;
        if (focusedRowIdx >= chList.length) focusedRowIdx = chList.length - 1;

        start = Math.max(0, Math.min(focusedRowIdx - Math.floor(VISIBLE_ROWS / 2), chList.length - VISIBLE_ROWS));
        if (start < 0) start = 0;
        end = Math.min(chList.length, start + VISIBLE_ROWS);

        for (i = start; i < end; i++) {
            var ch = chList[i];
            var u = ch.url;
            var stCls = 'tstat-ch-wait';
            var stTxt = '• Очередь';
            if (healthMap[u] === true) {
                stCls = 'tstat-ch-ok';
                stTxt = '✓ Работает';
            } else if (healthMap[u] === false || hiddenUrlsMap[u]) {
                stCls = 'tstat-ch-err';
                stTxt = '✕ Скрыт';
            }
            var rowFoc = (focusArea === 'list' && i === focusedRowIdx);
            html += '<div class="tstat-row' + (rowFoc ? ' focused' : '') + '">' +
                '<span class="tstat-ch-status ' + stCls + '">' + stTxt + '</span>' +
                '<span class="tstat-ch-name">' + escapeHtml(ch.name) + '</span>' +
                '</div>';
        }
        elList.innerHTML = html;
    }

    function openModal() {
        if (!elModal) return;
        isOpenFlag = true;
        viewMode = 'groups';
        focusArea = 'buttons';
        focusedBtnIdx = 0;
        focusedRowIdx = 0;
        elModal.className = 'panel';
        renderModal();
    }

    function closeModal() {
        if (!elModal) return;
        isOpenFlag = false;
        elModal.className = 'panel hidden';
    }

    function handleButtonAction(btnId) {
        if (btnId === 'toggle_run') {
            if (isRunning) stopTest(false);
            else startTest(getAllChannelsSafe(), false);
        } else if (btnId === 'toggle_run_grp') {
            if (isRunning) stopTest(false);
            else startTest(getChannelsInGroup(selectedGroup), false);
        } else if (btnId === 'bg') {
            closeModal();
            if (window.TiViApp && window.TiViApp.closeSidePanel) window.TiViApp.closeSidePanel();
            if (window.TiViApp && window.TiViApp.showToast) {
                window.TiViApp.showToast('Тест продолжается в фоне — нажмите 2 чтобы вернуться', 2600);
            }
        } else if (btnId === 'rescan') {
            startTest(getHiddenInList(getAllChannelsSafe()), true);
        } else if (btnId === 'restore') {
            restoreHiddenForList(getAllChannelsSafe());
        } else if (btnId === 'rescan_grp') {
            startTest(getHiddenInList(getChannelsInGroup(selectedGroup)), true);
        } else if (btnId === 'restore_grp') {
            restoreHiddenForList(getChannelsInGroup(selectedGroup));
        } else if (btnId === 'back_groups') {
            viewMode = 'groups';
            focusArea = 'list';
            focusedRowIdx = 0;
            renderModal();
        }
    }

    function handleKey(e) {
        if (!isOpenFlag) return false;
        var code = e.keyCode;
        var btns = buildTopButtons();
        var itemCount = (viewMode === 'groups') ? getCategoriesSafe().length : getChannelsInGroup(selectedGroup).length;

        if (code === 10009 || code === 27 || code === 8) { // BACK
            e.preventDefault();
            if (viewMode === 'channels') {
                viewMode = 'groups';
                focusArea = 'list';
                focusedRowIdx = 0;
                renderModal();
            } else {
                closeModal();
            }
            return true;
        }

        if (code === 38) { // UP
            e.preventDefault();
            if (focusArea === 'list') {
                if (focusedRowIdx > 0) {
                    focusedRowIdx--;
                } else {
                    focusArea = 'buttons';
                }
            } else if (itemCount > 0) {
                focusArea = 'list';
                focusedRowIdx = itemCount - 1;
            }
            renderModal();
            return true;
        }

        if (code === 40) { // DOWN
            e.preventDefault();
            if (focusArea === 'buttons') {
                if (itemCount > 0) {
                    focusArea = 'list';
                    focusedRowIdx = 0;
                }
            } else if (focusedRowIdx + 1 < itemCount) {
                focusedRowIdx++;
            } else {
                focusArea = 'buttons';
            }
            renderModal();
            return true;
        }

        if (code === 427 && focusArea === 'list' && itemCount > 0) { // CH+ page up
            e.preventDefault();
            focusedRowIdx = Math.max(0, focusedRowIdx - VISIBLE_ROWS);
            renderModal();
            return true;
        }
        if (code === 428 && focusArea === 'list' && itemCount > 0) { // CH- page down
            e.preventDefault();
            focusedRowIdx = Math.min(itemCount - 1, focusedRowIdx + VISIBLE_ROWS);
            renderModal();
            return true;
        }

        if (code === 37) { // LEFT
            e.preventDefault();
            if (focusArea === 'buttons' && btns.length > 0) {
                focusedBtnIdx = (focusedBtnIdx - 1 + btns.length) % btns.length;
                renderModal();
            } else if (viewMode === 'channels') {
                viewMode = 'groups';
                focusedRowIdx = 0;
                renderModal();
            }
            return true;
        }

        if (code === 39) { // RIGHT
            e.preventDefault();
            if (focusArea === 'buttons' && btns.length > 0) {
                focusedBtnIdx = (focusedBtnIdx + 1) % btns.length;
                renderModal();
            }
            return true;
        }

        if (code === 13) { // OK
            e.preventDefault();
            if (focusArea === 'buttons') {
                if (btns[focusedBtnIdx]) handleButtonAction(btns[focusedBtnIdx].id);
            } else if (viewMode === 'groups') {
                var groups = getCategoriesSafe();
                if (groups[focusedRowIdx]) {
                    selectedGroup = groups[focusedRowIdx];
                    viewMode = 'channels';
                    focusedRowIdx = 0;
                    focusedBtnIdx = 1;
                    renderModal();
                }
            } else {
                var chList = getChannelsInGroup(selectedGroup);
                if (chList[focusedRowIdx] && window.TiViApp && window.TiViApp.playChannelObj) {
                    var picked = chList[focusedRowIdx];
                    // If user explicitly plays a hidden channel, unhide it
                    if (hiddenUrlsMap[picked.url]) {
                        delete hiddenUrlsMap[picked.url];
                        saveHiddenUrls();
                        if (window.TiViApp.refreshUi) window.TiViApp.refreshUi();
                    }
                    closeModal();
                    if (window.TiViApp.closeSidePanel) window.TiViApp.closeSidePanel();
                    window.TiViApp.playChannelObj(picked, true);
                }
            }
            return true;
        }
        return true;
    }

    window.TiViTester = {
        init: function () {
            elModal = document.getElementById('tester-modal');
            elTitle = document.getElementById('tester-title');
            elSubtitle = document.getElementById('tester-subtitle');
            elButtons = document.getElementById('tester-top-buttons');
            elList = document.getElementById('tester-list');
            elBanner = document.getElementById('tester-banner');
            loadHiddenUrls();
            if (window.TiViThemes && window.TiViThemes.registerActionItem) {
                window.TiViThemes.registerActionItem({
                    id: 'open_tester',
                    title: 'Тест каналов (поиск нерабочих)',
                    getValue: function () {
                        var h = getHiddenInList(getAllChannelsSafe()).length;
                        return h > 0 ? ('Скрыто: ' + h) : 'Открыть ▸';
                    },
                    onAction: openModal
                });
            }
        },
        open: openModal,
        close: closeModal,
        isOpen: function () { return isOpenFlag; },
        isRunning: function () { return isRunning; },
        stop: stopTest,
        handleKey: handleKey,
        isUrlHidden: function (url) { return !!hiddenUrlsMap[url]; },
        getHiddenCount: function () { return getHiddenInList(getAllChannelsSafe()).length; }
    };
})();
