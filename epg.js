(function () {
    'use strict';

    var STORAGE_CFG_KEY = 'tivilook_tizen_v3_epg_cfg';
    var STORAGE_CACHE_KEY = 'tivilook_tizen_v3_epg_cache';
    var VISIBLE_ROWS = 7;
    var MAX_GZIP_BYTES = 8 * 1024 * 1024;
    var WINDOW_PAST_MS = 2 * 3600 * 1000;
    var WINDOW_FUTURE_MS = 26 * 3600 * 1000;
    var CACHE_TTL_MS = 18 * 3600 * 1000;

    var DEFAULT_EPG_SOURCES = [
        'https://iptvx.one/epg/epg_lite.xml.gz',
        'http://iptvx.one/epg/epg_lite.xml.gz',
        'http://epg.it999.ru/epg.xml.gz',
        'https://epg.it999.ru/epg.xml.gz',
        'http://teleguide.info/download/new3/xmltv.xml.gz'
    ];

    // Inflate tables (RFC 1951)
    var LEN_BASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    var LEN_EXTRA = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    var DIST_BASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    var DIST_EXTRA = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    var CL_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

    var FIXED_LIT_TREE = null;
    var FIXED_DIST_TREE = null;

    // EPG data & state
    var customEpgUrl = '';
    var playlistEpgUrl = '';
    var lastUpdatedMs = 0;
    var lastSourceLabel = '';
    var programsByKey = {}; // normalized channel key -> [{ s, e, t, d }]
    var loadedChannelsCount = 0;
    var loadedProgramsCount = 0;

    var isLoading = false;
    var loadSessionId = 0;
    var activeXhr = null;

    // Modal state
    var isOpenFlag = false;
    var subView = 'guide'; // 'guide' | 'url_input'
    var focusArea = 'list'; // 'buttons' | 'list'
    var focusedBtnIdx = 0;
    var focusedRowIdx = 0;
    var guideChannel = null;
    var guideChannelIdx = 0;

    // URL input modal state
    var urlRow = 0; // 0=input, 1=presets, 2=actions
    var urlPresetCol = 0;
    var urlActionCol = 0;

    // DOM refs
    var elModal = null;
    var elTitle = null;
    var elSubtitle = null;
    var elButtons = null;
    var elList = null;
    var elDesc = null;
    var elUrlModal = null;
    var elUrlWrap = null;
    var elUrlInput = null;
    var elUrlPresets = null;
    var elUrlBtnSave = null;
    var elUrlBtnCancel = null;
    var elUrlStatus = null;

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function trimStr(str) { return ('' + (str || '')).replace(/^\s+|\s+$/g, ''); }

    function escapeHtml(str) {
        return ('' + (str || '')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function unescapeXml(str) {
        if (!str) return '';
        return str
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    function formatHm(ms) {
        var d = new Date(ms);
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function formatDayPrefix(ms) {
        var now = new Date();
        var d = new Date(ms);
        if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) return '';
        return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + ' ';
    }

    function normalizeMatchKey(raw) {
        var s = trimStr((raw || '').toLowerCase());
        s = s.replace(/[\(\[][^\)\]]*[\)\]]/g, ' ');
        s = s.replace(/(?:^|[\s\-_|\/])(2160p?|1440p?|1080[pi]?|720p?|576[pi]?|540p?|480p?|4k|2k|uhd|fhd|full\s*hd|hd|хд|hq|sd|orig|оригинал|резерв|тв|tv)(?=$|[\s\-_|\/])/gi, ' ');
        s = s.replace(/[^a-zа-яё0-9]+/g, '');
        return s;
    }

    function exactIdKey(raw) {
        return trimStr((raw || '').toLowerCase());
    }

    // =========================================================================
    // Storage
    // =========================================================================
    function loadConfig() {
        try {
            if (window.localStorage) {
                var raw = window.localStorage.getItem(STORAGE_CFG_KEY);
                if (raw) {
                    var obj = JSON.parse(raw);
                    if (obj && typeof obj.customUrl === 'string') customEpgUrl = trimStr(obj.customUrl);
                }
            }
        } catch (e) {}
    }

    function saveConfig() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(STORAGE_CFG_KEY, JSON.stringify({ customUrl: customEpgUrl }));
            }
        } catch (e) {}
    }

    function loadCache() {
        try {
            if (window.localStorage) {
                var raw = window.localStorage.getItem(STORAGE_CACHE_KEY);
                if (!raw) return false;
                var obj = JSON.parse(raw);
                if (!obj || !obj.ts || !obj.data) return false;
                if (new Date().getTime() - obj.ts > CACHE_TTL_MS) return false;
                programsByKey = obj.data;
                lastUpdatedMs = obj.ts;
                lastSourceLabel = obj.src || 'Кэш';
                recountLoadedStats();
                return loadedProgramsCount > 0;
            }
        } catch (e) {}
        return false;
    }

    function saveCache() {
        try {
            if (!window.localStorage) return;
            var now = new Date().getTime();
            // Save a compact slice (up to 160 channels, max 16 programmes each) to stay well within Tizen 2.4 localStorage quota
            var compact = {};
            var chSaved = 0;
            for (var k in programsByKey) {
                if (!programsByKey.hasOwnProperty(k)) continue;
                var arr = programsByKey[k];
                if (!arr || !arr.length) continue;
                var sliced = [];
                for (var i = 0; i < arr.length && sliced.length < 16; i++) {
                    if (arr[i].e >= now - 3600000) {
                        sliced.push({ s: arr[i].s, e: arr[i].e, t: arr[i].t });
                    }
                }
                if (sliced.length > 0) {
                    compact[k] = sliced;
                    chSaved++;
                    if (chSaved >= 160) break;
                }
            }
            window.localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify({
                ts: lastUpdatedMs,
                src: lastSourceLabel,
                data: compact
            }));
        } catch (e) {
            // Storage tight: ignore cache error, keep full data in RAM
        }
    }

    function recountLoadedStats() {
        var chCnt = 0;
        var prCnt = 0;
        for (var k in programsByKey) {
            if (programsByKey.hasOwnProperty(k) && programsByKey[k] && programsByKey[k].length) {
                chCnt++;
                prCnt += programsByKey[k].length;
            }
        }
        loadedChannelsCount = chCnt;
        loadedProgramsCount = prCnt;
    }

    // =========================================================================
    // Pure-ES5 Non-Blocking Streaming RFC 1951/1952 Gunzip (zero OOM on TV)
    // =========================================================================
    function buildHuffTree(lengths, offset, count) {
        var maxLen = 0;
        var i, l;
        for (i = 0; i < count; i++) {
            l = lengths[offset + i];
            if (l > maxLen) maxLen = l;
        }
        if (maxLen === 0) return null;
        var counts = [];
        var offsets = [];
        var pos = [];
        for (i = 0; i <= maxLen + 1; i++) {
            counts[i] = 0;
            offsets[i] = 0;
            pos[i] = 0;
        }
        for (i = 0; i < count; i++) {
            l = lengths[offset + i];
            if (l > 0) counts[l]++;
        }
        for (i = 1; i <= maxLen; i++) {
            offsets[i + 1] = offsets[i] + counts[i];
            pos[i] = offsets[i];
        }
        var syms = new Array(offsets[maxLen + 1]);
        for (i = 0; i < count; i++) {
            l = lengths[offset + i];
            if (l > 0) {
                syms[pos[l]] = i;
                pos[l]++;
            }
        }
        return { counts: counts, syms: syms, maxLen: maxLen };
    }

    function initFixedTrees() {
        if (FIXED_LIT_TREE) return;
        var lit = [];
        var i;
        for (i = 0; i < 144; i++) lit.push(8);
        for (i = 144; i < 256; i++) lit.push(9);
        for (i = 256; i < 280; i++) lit.push(7);
        for (i = 280; i < 288; i++) lit.push(8);
        FIXED_LIT_TREE = buildHuffTree(lit, 0, 288);
        var dist = [];
        for (i = 0; i < 32; i++) dist.push(5);
        FIXED_DIST_TREE = buildHuffTree(dist, 0, 32);
    }

    function decodeUtf8Bytes(bytes, len, carry) {
        var src = bytes;
        var totalLen = len;
        if (carry && carry.length > 0) {
            var merged = new Uint8Array(carry.length + len);
            merged.set(carry, 0);
            merged.set(bytes.subarray(0, len), carry.length);
            src = merged;
            totalLen = merged.length;
        }
        var out = [];
        var i = 0;
        var nextCarry = [];
        while (i < totalLen) {
            var b0 = src[i];
            if (b0 < 0x80) {
                out.push(String.fromCharCode(b0));
                i++;
            } else if ((b0 & 0xE0) === 0xC0) {
                if (i + 1 >= totalLen) { nextCarry = [b0]; break; }
                var cp2 = ((b0 & 0x1F) << 6) | (src[i + 1] & 0x3F);
                out.push(String.fromCharCode(cp2));
                i += 2;
            } else if ((b0 & 0xF0) === 0xE0) {
                if (i + 2 >= totalLen) {
                    for (var k3 = i; k3 < totalLen; k3++) nextCarry.push(src[k3]);
                    break;
                }
                var cp3 = ((b0 & 0x0F) << 12) | ((src[i + 1] & 0x3F) << 6) | (src[i + 2] & 0x3F);
                out.push(String.fromCharCode(cp3));
                i += 3;
            } else if ((b0 & 0xF8) === 0xF0) {
                if (i + 3 >= totalLen) {
                    for (var k4 = i; k4 < totalLen; k4++) nextCarry.push(src[k4]);
                    break;
                }
                var cp4 = ((b0 & 0x07) << 18) | ((src[i + 1] & 0x3F) << 12) | ((src[i + 2] & 0x3F) << 6) | (src[i + 3] & 0x3F);
                cp4 -= 0x10000;
                out.push(String.fromCharCode(0xD800 + (cp4 >> 10), 0xDC00 + (cp4 & 0x3FF)));
                i += 4;
            } else {
                i++;
            }
        }
        return { text: out.join(''), carry: nextCarry };
    }

    function gunzipAsyncChunked(u8, mySid, onTextChunk, onDone) {
        initFixedTrees();
        if (!u8 || u8.length < 18 || u8[0] !== 0x1F || u8[1] !== 0x8B || u8[2] !== 8) {
            onDone('not_gzip');
            return;
        }
        var flg = u8[3];
        var pos = 10;
        if (flg & 4) {
            if (pos + 2 > u8.length) { onDone('bad_hdr'); return; }
            var xlen = u8[pos] | (u8[pos + 1] << 8);
            pos += 2 + xlen;
        }
        if (flg & 8) {
            while (pos < u8.length && u8[pos] !== 0) pos++;
            pos++;
        }
        if (flg & 16) {
            while (pos < u8.length && u8[pos] !== 0) pos++;
            pos++;
        }
        if (flg & 2) pos += 2;
        if (pos >= u8.length) { onDone('bad_hdr'); return; }

        var bitbuf = 0;
        var bitcnt = 0;
        var win = new Uint8Array(32768);
        var wpos = 0;
        var outBuf = new Uint8Array(52000);
        var outLen = 0;
        var utf8Carry = [];

        var inBlock = false;
        var bfinal = 0;
        var lt = null;
        var dt = null;

        function readBits(n) {
            while (bitcnt < n) {
                if (pos >= u8.length) throw new Error('eof');
                bitbuf |= (u8[pos++] << bitcnt);
                bitcnt += 8;
            }
            var v = bitbuf & ((1 << n) - 1);
            bitbuf >>>= n;
            bitcnt -= n;
            return v;
        }

        function decodeSym(tree) {
            var counts = tree.counts;
            var syms = tree.syms;
            var maxLen = tree.maxLen;
            var code = 0;
            var first = 0;
            var idx = 0;
            for (var bits = 1; bits <= maxLen; bits++) {
                code = (code << 1) | readBits(1);
                var cnt = counts[bits];
                if (code - cnt < first) {
                    return syms[idx + (code - first)];
                }
                idx += cnt;
                first = (first + cnt) << 1;
            }
            throw new Error('bad_huff');
        }

        function flushChunk() {
            if (outLen <= 0) return;
            var dec = decodeUtf8Bytes(outBuf, outLen, utf8Carry);
            utf8Carry = dec.carry;
            outLen = 0;
            if (dec.text) onTextChunk(dec.text);
        }

        function stepSlice() {
            if (mySid !== loadSessionId) return;
            var nowMs = new Date().getTime();
            var lastKey = (window.TiViApp && window.TiViApp.getLastUserKeyMs) ? window.TiViApp.getLastUserKeyMs() : 0;
            if (nowMs - lastKey < 500) {
                setTimeout(stepSlice, 300);
                return;
            }
            var sliceStart = nowMs;
            var ops = 0;
            try {
                while (ops < 10000) {
                    if (!inBlock) {
                        bfinal = readBits(1);
                        var btype = readBits(2);
                        if (btype === 0) {
                            bitbuf = 0;
                            bitcnt = 0;
                            if (pos + 4 > u8.length) throw new Error('eof');
                            var ln = u8[pos] | (u8[pos + 1] << 8);
                            pos += 4;
                            for (var k = 0; k < ln; k++) {
                                var b = u8[pos++];
                                win[wpos] = b;
                                wpos = (wpos + 1) & 32767;
                                outBuf[outLen++] = b;
                                if (outLen >= 24000) flushChunk();
                            }
                            ops += ln + 16;
                            if (bfinal) {
                                flushChunk();
                                onDone(null);
                                return;
                            }
                            continue;
                        } else if (btype === 1) {
                            lt = FIXED_LIT_TREE;
                            dt = FIXED_DIST_TREE;
                            inBlock = true;
                        } else if (btype === 2) {
                            var hlit = readBits(5) + 257;
                            var hdist = readBits(5) + 1;
                            var hclen = readBits(4) + 4;
                            var clLens = [];
                            var ci;
                            for (ci = 0; ci < 19; ci++) clLens[ci] = 0;
                            for (ci = 0; ci < hclen; ci++) clLens[CL_ORDER[ci]] = readBits(3);
                            var clTree = buildHuffTree(clLens, 0, 19);
                            var lens = [];
                            var total = hlit + hdist;
                            while (lens.length < total) {
                                var cs = decodeSym(clTree);
                                var rep, val, r;
                                if (cs < 16) {
                                    lens.push(cs);
                                } else if (cs === 16) {
                                    rep = readBits(2) + 3;
                                    val = lens[lens.length - 1] || 0;
                                    for (r = 0; r < rep; r++) lens.push(val);
                                } else if (cs === 17) {
                                    rep = readBits(3) + 3;
                                    for (r = 0; r < rep; r++) lens.push(0);
                                } else {
                                    rep = readBits(7) + 11;
                                    for (r = 0; r < rep; r++) lens.push(0);
                                }
                            }
                            lt = buildHuffTree(lens, 0, hlit);
                            dt = buildHuffTree(lens, hlit, hdist);
                            inBlock = true;
                            ops += 200;
                        } else {
                            throw new Error('bad_btype');
                        }
                    }

                    var sym = decodeSym(lt);
                    ops++;
                    if (sym < 256) {
                        win[wpos] = sym;
                        wpos = (wpos + 1) & 32767;
                        outBuf[outLen++] = sym;
                    } else if (sym === 256) {
                        inBlock = false;
                        if (bfinal) {
                            flushChunk();
                            onDone(null);
                            return;
                        }
                    } else {
                        var lidx = sym - 257;
                        var length = LEN_BASE[lidx] + (LEN_EXTRA[lidx] ? readBits(LEN_EXTRA[lidx]) : 0);
                        var dsym = decodeSym(dt);
                        var dist = DIST_BASE[dsym] + (DIST_EXTRA[dsym] ? readBits(DIST_EXTRA[dsym]) : 0);
                        for (var m = 0; m < length; m++) {
                            var wb = win[(wpos - dist) & 32767];
                            win[wpos] = wb;
                            wpos = (wpos + 1) & 32767;
                            outBuf[outLen++] = wb;
                        }
                        ops += length;
                    }

                    if (outLen >= 24000) {
                        flushChunk();
                        break;
                    }
                    if ((ops & 511) === 0 && (new Date().getTime() - sliceStart) >= 14) {
                        break;
                    }
                }
            } catch (ex) {
                flushChunk();
                onDone(ex.message || 'inflate_err');
                return;
            }
            setTimeout(stepSlice, 45);
        }

        setTimeout(stepSlice, 10);
    }

    // =========================================================================
    // Incremental XMLTV Streaming Parser (filters ONLY user's channels & 26h window)
    // =========================================================================
    function parseXmltvTimeMs(ts) {
        if (!ts || ts.length < 12) return 0;
        var y = parseInt(ts.substr(0, 4), 10);
        var mo = parseInt(ts.substr(4, 2), 10) - 1;
        var d = parseInt(ts.substr(6, 2), 10);
        var h = parseInt(ts.substr(8, 2), 10);
        var mi = parseInt(ts.substr(10, 2), 10);
        var s = ts.length >= 14 ? parseInt(ts.substr(12, 2), 10) : 0;
        var tzMatch = ts.match(/([+-])(\d{2})(\d{2})/);
        if (tzMatch) {
            var sign = tzMatch[1] === '-' ? -1 : 1;
            var offMin = sign * (parseInt(tzMatch[2], 10) * 60 + parseInt(tzMatch[3], 10));
            return Date.UTC(y, mo, d, h, mi, s) - offMin * 60000;
        }
        return new Date(y, mo, d, h, mi, s).getTime();
    }

    function buildWantedChannelLookup() {
        var all = (window.TiViApp && window.TiViApp.getAllChannels) ? window.TiViApp.getAllChannels() : [];
        var wantedByNorm = {};
        var wantedById = {};
        for (var i = 0; i < all.length; i++) {
            var ch = all[i];
            var nk = normalizeMatchKey(ch.name);
            if (nk) wantedByNorm[nk] = nk;
            if (ch.tvgName) {
                var tnk = normalizeMatchKey(ch.tvgName);
                if (tnk) wantedByNorm[tnk] = nk || tnk;
            }
            if (ch.tvgId) {
                var ik = exactIdKey(ch.tvgId);
                if (ik) wantedById[ik] = nk || ik;
            }
        }
        return { byNorm: wantedByNorm, byId: wantedById };
    }

    function createStreamingXmltvParser(wanted) {
        var nowMs = new Date().getTime();
        var minMs = nowMs - WINDOW_PAST_MS;
        var maxMs = nowMs + WINDOW_FUTURE_MS;

        var carry = '';
        var epgIdToTargetKey = {};
        var outMap = {};

        // Pre-map direct tvg-ids
        for (var idKey in wanted.byId) {
            if (wanted.byId.hasOwnProperty(idKey)) {
                epgIdToTargetKey[idKey] = wanted.byId[idKey];
            }
        }

        function processChannelTag(block) {
            var idM = block.match(/id="([^"]+)"/i);
            if (!idM || !idM[1]) return;
            var rawId = exactIdKey(idM[1]);
            if (wanted.byId[rawId]) {
                epgIdToTargetKey[rawId] = wanted.byId[rawId];
            }
            var dnRe = /<display-name[^>]*>([^<]+)<\/display-name>/gi;
            var m;
            while ((m = dnRe.exec(block)) !== null) {
                var dnNorm = normalizeMatchKey(unescapeXml(m[1]));
                if (dnNorm && wanted.byNorm[dnNorm]) {
                    epgIdToTargetKey[rawId] = wanted.byNorm[dnNorm];
                    break;
                }
            }
        }

        function processProgrammeTag(block) {
            var chM = block.match(/channel="([^"]+)"/i);
            if (!chM || !chM[1]) return;
            var rawId = exactIdKey(chM[1]);
            var targetKey = epgIdToTargetKey[rawId];
            if (!targetKey) {
                var idNorm = normalizeMatchKey(chM[1]);
                if (idNorm && wanted.byNorm[idNorm]) targetKey = wanted.byNorm[idNorm];
            }
            if (!targetKey) return;

            var sM = block.match(/start="([^"]+)"/i);
            var eM = block.match(/stop="([^"]+)"/i);
            if (!sM) return;
            var startMs = parseXmltvTimeMs(sM[1]);
            var stopMs = eM ? parseXmltvTimeMs(eM[1]) : (startMs + 3600000);
            if (!startMs || stopMs < minMs || startMs > maxMs) return;

            var tM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (!tM || !tM[1]) return;
            var title = trimStr(unescapeXml(tM[1].replace(/<[^>]+>/g, '')));
            if (!title) return;

            var desc = '';
            var dM = block.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
            if (dM && dM[1]) {
                desc = trimStr(unescapeXml(dM[1].replace(/<[^>]+>/g, ''))).substr(0, 220);
            }

            if (!outMap[targetKey]) outMap[targetKey] = [];
            if (outMap[targetKey].length < 40) {
                outMap[targetKey].push({ s: startMs, e: stopMs, t: title, d: desc });
            }
        }

        return {
            feed: function (chunk) {
                var buf = carry + chunk;
                var pos = 0;
                var len = buf.length;
                while (pos < len) {
                    var nextCh = buf.indexOf('<channel', pos);
                    var nextPr = buf.indexOf('<programme', pos);
                    if (nextCh === -1 && nextPr === -1) {
                        carry = buf.length > 24 ? buf.substr(buf.length - 24) : buf;
                        return;
                    }
                    var isCh = (nextCh !== -1 && (nextPr === -1 || nextCh < nextPr));
                    var startPos = isCh ? nextCh : nextPr;
                    var closeTag = isCh ? '</channel>' : '</programme>';
                    var endPos = buf.indexOf(closeTag, startPos);
                    if (endPos === -1) {
                        carry = buf.substr(startPos);
                        if (carry.length > 16384) carry = '';
                        return;
                    }
                    var block = buf.substring(startPos, endPos + closeTag.length);
                    if (isCh) processChannelTag(block);
                    else processProgrammeTag(block);
                    pos = endPos + closeTag.length;
                }
                carry = '';
            },
            finish: function () {
                for (var k in outMap) {
                    if (outMap.hasOwnProperty(k)) {
                        outMap[k].sort(function (a, b) { return a.s - b.s; });
                    }
                }
                return outMap;
            }
        };
    }

    // =========================================================================
    // EPG Downloading & Parsing Pipeline
    // =========================================================================
    function buildEpgSourceQueue() {
        var list = [];
        function pushUnique(u) {
            var clean = trimStr(u);
            if (clean && list.indexOf(clean) === -1) list.push(clean);
        }
        if (customEpgUrl) {
            pushUnique(customEpgUrl);
            if (customEpgUrl.indexOf('https://') === 0) pushUnique('http://' + customEpgUrl.substr(8));
        }
        if (playlistEpgUrl) {
            pushUnique(playlistEpgUrl);
            if (playlistEpgUrl.indexOf('https://') === 0) pushUnique('http://' + playlistEpgUrl.substr(8));
        }
        for (var i = 0; i < DEFAULT_EPG_SOURCES.length; i++) {
            pushUnique(DEFAULT_EPG_SOURCES[i]);
        }
        return list;
    }

    function downloadAndParseEpg(forceRefresh) {
        if (isLoading && !forceRefresh) return;
        if (!forceRefresh && lastUpdatedMs > 0 && (new Date().getTime() - lastUpdatedMs) < CACHE_TTL_MS && loadedProgramsCount > 0) {
            return;
        }

        if (activeXhr) {
            try { activeXhr.abort(); } catch (e0) {}
            activeXhr = null;
        }

        loadSessionId++;
        var mySid = loadSessionId;
        isLoading = true;

        var queue = buildEpgSourceQueue();
        var qIdx = 0;

        if (forceRefresh && window.TiViApp && window.TiViApp.showToast) {
            window.TiViApp.showToast('Загрузка телепрограммы EPG...', 2400);
        }
        if (window.TiViApp && window.TiViApp.addLog) {
            window.TiViApp.addLog('EPG: старт обновления (' + queue.length + ' ист.)');
        }
        if (isOpenFlag && subView === 'guide') renderGuideModal();

        function tryNextSource() {
            if (mySid !== loadSessionId) return;
            if (qIdx >= queue.length) {
                isLoading = false;
                if (window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog('EPG: ни один источник не ответил');
                if (forceRefresh && window.TiViApp && window.TiViApp.showToast) {
                    window.TiViApp.showToast('Не удалось загрузить EPG — проверьте ссылку или сеть', 3000);
                }
                if (isOpenFlag && subView === 'guide') renderGuideModal();
                return;
            }

            var url = queue[qIdx++];
            var shortUrl = url.replace(/^https?:\/\//i, '').substr(0, 34);
            var wantBinary = /\.gz(\?|$)/i.test(url);

            var reqSettled = false;
            function failSource(logMsg) {
                if (reqSettled || mySid !== loadSessionId) return;
                reqSettled = true;
                activeXhr = null;
                if (logMsg && window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog(logMsg);
                tryNextSource();
            }
            try {
                var xhr = new XMLHttpRequest();
                activeXhr = xhr;
                xhr.open('GET', url, true);
                xhr.timeout = 18000;
                if (wantBinary) {
                    try { xhr.responseType = 'arraybuffer'; } catch (eRt) {}
                }
                xhr.onreadystatechange = function () {
                    if (reqSettled || mySid !== loadSessionId) return;
                    if (xhr.readyState !== 4) return;
                    reqSettled = true;
                    activeXhr = null;

                    if (xhr.status < 200 || xhr.status >= 300) {
                        if (window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog('EPG FAIL ' + shortUrl + ' [HTTP ' + xhr.status + ']');
                        tryNextSource();
                        return;
                    }

                    var wanted = buildWantedChannelLookup();
                    var parser = createStreamingXmltvParser(wanted);

                    function onParseComplete(parseErr) {
                        if (mySid !== loadSessionId) return;
                        if (parseErr) {
                            if (window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog('EPG parse err (' + shortUrl + '): ' + parseErr);
                            tryNextSource();
                            return;
                        }
                        var resultMap = parser.finish();
                        var chFound = 0;
                        var prFound = 0;
                        for (var k in resultMap) {
                            if (resultMap.hasOwnProperty(k) && resultMap[k].length) {
                                chFound++;
                                prFound += resultMap[k].length;
                            }
                        }
                        if (prFound === 0) {
                            if (window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog('EPG 0 совп. (' + shortUrl + ')');
                            tryNextSource();
                            return;
                        }

                        programsByKey = resultMap;
                        lastUpdatedMs = new Date().getTime();
                        lastSourceLabel = shortUrl;
                        loadedChannelsCount = chFound;
                        loadedProgramsCount = prFound;
                        isLoading = false;
                        saveCache();

                        if (window.TiViApp && window.TiViApp.addLog) {
                            window.TiViApp.addLog('EPG OK (' + shortUrl + '): ' + chFound + ' кан., ' + prFound + ' пер.');
                        }
                        if (forceRefresh && window.TiViApp && window.TiViApp.showToast) {
                            window.TiViApp.showToast('EPG загружен: ' + chFound + ' каналов', 2600);
                        }
                        if (window.TiViApp && window.TiViApp.refreshUi) window.TiViApp.refreshUi();
                        if (isOpenFlag && subView === 'guide') renderGuideModal();
                    }

                    if (wantBinary && xhr.response && typeof Uint8Array !== 'undefined') {
                        var u8 = new Uint8Array(xhr.response);
                        if (u8.length > MAX_GZIP_BYTES) {
                            if (window.TiViApp && window.TiViApp.addLog) window.TiViApp.addLog('EPG слишком большой (' + Math.round(u8.length / 1048576) + ' МБ)');
                            tryNextSource();
                            return;
                        }
                        // Check if server returned gzip or plain XML
                        if (u8.length >= 3 && u8[0] === 0x1F && u8[1] === 0x8B && u8[2] === 8) {
                            gunzipAsyncChunked(u8, mySid, function (textChunk) {
                                parser.feed(textChunk);
                            }, onParseComplete);
                        } else {
                            // Server sent plain XML despite .gz URL — decode asynchronously in 24KB chunks
                            feedPlainBytesChunked(u8, mySid, parser, onParseComplete);
                        }
                    } else if (xhr.responseText) {
                        feedPlainXmlChunked(xhr.responseText, mySid, parser, onParseComplete);
                    } else {
                        tryNextSource();
                    }
                };
                xhr.ontimeout = function () {
                    failSource('EPG timeout ' + shortUrl);
                };
                xhr.onerror = function () {
                    failSource('EPG net/ssl ' + shortUrl);
                };
                xhr.send(null);
            } catch (ex) {
                failSource('EPG xhr exc ' + shortUrl);
            }
        }

        tryNextSource();
    }

    function feedPlainBytesChunked(u8, mySid, parser, onDone) {
        var offset = 0;
        var total = u8.length;
        var utf8Carry = [];
        function step() {
            if (mySid !== loadSessionId) return;
            var lastKey = (window.TiViApp && window.TiViApp.getLastUserKeyMs) ? window.TiViApp.getLastUserKeyMs() : 0;
            if (new Date().getTime() - lastKey < 500) {
                setTimeout(step, 300);
                return;
            }
            var end = Math.min(total, offset + 24576);
            var slice = u8.subarray(offset, end);
            var dec = decodeUtf8Bytes(slice, slice.length, utf8Carry);
            utf8Carry = dec.carry;
            if (dec.text) parser.feed(dec.text);
            offset = end;
            if (offset < total) {
                setTimeout(step, 45);
            } else {
                onDone(null);
            }
        }
        setTimeout(step, 20);
    }

    function feedPlainXmlChunked(text, mySid, parser, onDone) {
        var offset = 0;
        var total = text.length;
        function step() {
            if (mySid !== loadSessionId) return;
            var lastKey = (window.TiViApp && window.TiViApp.getLastUserKeyMs) ? window.TiViApp.getLastUserKeyMs() : 0;
            if (new Date().getTime() - lastKey < 500) {
                setTimeout(step, 300);
                return;
            }
            var end = Math.min(total, offset + 24576);
            parser.feed(text.substring(offset, end));
            offset = end;
            if (offset < total) {
                setTimeout(step, 45);
            } else {
                onDone(null);
            }
        }
        setTimeout(step, 20);
    }

    // =========================================================================
    // Public Lookup Helpers (OSD, Info Panel, Full Guide)
    // =========================================================================
    function findProgramListForChannel(ch) {
        if (!ch) return [];
        var nk = normalizeMatchKey(ch.name);
        if (nk && programsByKey[nk]) return programsByKey[nk];
        if (ch.tvgName) {
            var tnk = normalizeMatchKey(ch.tvgName);
            if (tnk && programsByKey[tnk]) return programsByKey[tnk];
        }
        if (ch.tvgId) {
            var ik = exactIdKey(ch.tvgId);
            if (ik && programsByKey[ik]) return programsByKey[ik];
        }
        return [];
    }

    function getCurrentAndNext(ch) {
        var list = findProgramListForChannel(ch);
        if (!list || !list.length) return { now: null, next: null, progressPct: 0 };
        var nowMs = new Date().getTime();
        var cur = null;
        var nxt = null;
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            if (p.s <= nowMs && p.e > nowMs) {
                cur = p;
                if (i + 1 < list.length) nxt = list[i + 1];
                break;
            }
            if (p.s > nowMs) {
                nxt = p;
                break;
            }
        }
        var pct = 0;
        if (cur && cur.e > cur.s) {
            pct = Math.max(0, Math.min(100, Math.round(((nowMs - cur.s) * 100) / (cur.e - cur.s))));
        }
        return { now: cur, next: nxt, progressPct: pct };
    }

    // =========================================================================
    // EPG Guide Modal UI & Navigation
    // =========================================================================
    function getGuideChannelList() {
        var disp = (window.TiViApp && window.TiViApp.getDisplayedChannels) ? window.TiViApp.getDisplayedChannels() : [];
        if (disp && disp.length) return disp;
        return (window.TiViApp && window.TiViApp.getAllChannels) ? window.TiViApp.getAllChannels() : [];
    }

    function buildTopButtons() {
        return [
            { id: 'prev_ch', label: '◀ Пред. канал' },
            { id: 'next_ch', label: 'След. канал ▶' },
            { id: 'refresh', label: isLoading ? '⏳ Загрузка...' : '↻ Обновить EPG', isPrimary: !isLoading },
            { id: 'edit_url', label: '✎ Ссылка EPG' }
        ];
    }

    function selectInitialProgramRow(list) {
        var nowMs = new Date().getTime();
        for (var i = 0; i < list.length; i++) {
            if (list[i].s <= nowMs && list[i].e > nowMs) return i;
            if (list[i].s > nowMs) return i;
        }
        return 0;
    }

    function renderGuideModal() {
        if (!elModal || !elList || !elButtons) return;

        var chName = guideChannel ? guideChannel.name : 'Канал не выбран';
        elTitle.textContent = 'Телепрограмма — ' + chName;
        if (isLoading) {
            elSubtitle.textContent = 'Идёт загрузка и разбор EPG в фоне... Вы можете продолжать просмотр';
        } else if (loadedProgramsCount > 0) {
            elSubtitle.textContent = 'Источник: ' + lastSourceLabel + '   •   Каналов с EPG: ' + loadedChannelsCount;
        } else {
            elSubtitle.textContent = 'Программа ещё не загружена — нажмите «↻ Обновить EPG» или укажите ссылку';
        }

        // Buttons
        var btns = buildTopButtons();
        if (focusedBtnIdx < 0) focusedBtnIdx = 0;
        if (focusedBtnIdx >= btns.length) focusedBtnIdx = btns.length - 1;
        var bHtml = '';
        for (var b = 0; b < btns.length; b++) {
            var btn = btns[b];
            var cls = 'tstat-btn' + (btn.isPrimary ? ' primary-btn' : '') + (focusArea === 'buttons' && b === focusedBtnIdx ? ' focused' : '');
            bHtml += '<span class="' + cls + '">' + escapeHtml(btn.label) + '</span>';
        }
        elButtons.innerHTML = bHtml;

        // Programmes list
        var list = findProgramListForChannel(guideChannel);
        if (!list || list.length === 0) {
            elList.innerHTML = '<div class="empty-hint">' +
                (isLoading ? 'Загрузка программы передач...' : 'Для канала «' + escapeHtml(chName) + '» пока нет программы.<br>Нажмите ◀ / ▶ на кнопках сверху для другого канала или «↻ Обновить EPG».') +
                '</div>';
            if (elDesc) elDesc.textContent = '';
            return;
        }

        if (focusedRowIdx < 0) focusedRowIdx = 0;
        if (focusedRowIdx >= list.length) focusedRowIdx = list.length - 1;

        var nowMs = new Date().getTime();
        var start = Math.max(0, Math.min(focusedRowIdx - Math.floor(VISIBLE_ROWS / 2), list.length - VISIBLE_ROWS));
        if (start < 0) start = 0;
        var end = Math.min(list.length, start + VISIBLE_ROWS);

        var html = '';
        for (var i = start; i < end; i++) {
            var p = list[i];
            var isLive = (p.s <= nowMs && p.e > nowMs);
            var isPast = (p.e <= nowMs);
            var isFoc = (focusArea === 'list' && i === focusedRowIdx);
            var timeStr = formatDayPrefix(p.s) + formatHm(p.s) + '–' + formatHm(p.e);
            var liveTag = isLive ? '<span class="epg-live-pill">ЭФИР</span>' : '';
            var pct = (isLive && p.e > p.s) ? Math.max(2, Math.min(100, Math.round(((nowMs - p.s) * 100) / (p.e - p.s)))) : 0;
            var barHtml = isLive ? ('<span class="epg-row-bar"><span class="epg-row-bar-fill" style="width:' + pct + '%;"></span></span>') : '';

            var rCls = 'epg-row' + (isPast ? ' epg-past' : '') + (isLive ? ' epg-live' : '') + (isFoc ? ' focused' : '');
            html += '<div class="' + rCls + '">' +
                '<span class="epg-time">' + escapeHtml(timeStr) + '</span>' +
                '<span class="epg-prog-title">' + liveTag + escapeHtml(p.t) + '</span>' +
                barHtml +
                '</div>';
        }
        elList.innerHTML = html;

        if (elDesc) {
            var sel = list[focusedRowIdx];
            if (sel) {
                var head = formatHm(sel.s) + '–' + formatHm(sel.e) + ' • ' + sel.t;
                elDesc.textContent = sel.d ? (head + ' — ' + sel.d) : head;
            } else {
                elDesc.textContent = '';
            }
        }
    }

    // =========================================================================
    // Custom EPG URL Sub-Modal
    // =========================================================================
    function openUrlInputModal() {
        subView = 'url_input';
        urlRow = 0;
        urlPresetCol = 0;
        urlActionCol = 0;
        elUrlInput.value = customEpgUrl || playlistEpgUrl || DEFAULT_EPG_SOURCES[0];
        elUrlStatus.textContent = 'Поддерживаются .xml и .xml.gz (нажмите OK на поле для клавиатуры ТВ)';
        elUrlModal.className = 'panel';
        renderUrlInputFocus();
    }

    function closeUrlInputModal() {
        try { if (document.activeElement === elUrlInput) elUrlInput.blur(); } catch (e) {}
        subView = 'guide';
        elUrlModal.className = 'panel hidden';
        renderGuideModal();
    }

    function renderUrlInputFocus() {
        elUrlWrap.className = 'input-wrap' + (urlRow === 0 ? ' focused' : '');
        for (var i = 0; i < elUrlPresets.length; i++) {
            var isClear = elUrlPresets[i].getAttribute('data-val') === 'CLEAR';
            elUrlPresets[i].className = 'preset-btn' + (isClear ? ' preset-clear' : '') + (urlRow === 1 && urlPresetCol === i ? ' focused' : '');
        }
        elUrlBtnSave.className = 'modal-btn primary-btn' + (urlRow === 2 && urlActionCol === 0 ? ' focused' : '');
        elUrlBtnCancel.className = 'modal-btn' + (urlRow === 2 && urlActionCol === 1 ? ' focused' : '');
    }

    function handleUrlInputKey(e) {
        var code = e.keyCode;
        if (document.activeElement === elUrlInput) {
            if (code === 65376 || code === 13) {
                e.preventDefault();
                elUrlInput.blur();
                urlRow = 2;
                renderUrlInputFocus();
            } else if (code === 65385 || code === 10009 || code === 27) {
                e.preventDefault();
                elUrlInput.blur();
                renderUrlInputFocus();
            }
            return true;
        }
        if (code === 10009 || code === 27 || code === 8) {
            e.preventDefault();
            closeUrlInputModal();
            return true;
        }
        if (code === 38) {
            e.preventDefault();
            urlRow = (urlRow + 2) % 3;
            renderUrlInputFocus();
        } else if (code === 40) {
            e.preventDefault();
            urlRow = (urlRow + 1) % 3;
            renderUrlInputFocus();
        } else if (code === 37) {
            e.preventDefault();
            if (urlRow === 1) urlPresetCol = (urlPresetCol - 1 + elUrlPresets.length) % elUrlPresets.length;
            else if (urlRow === 2) urlActionCol = (urlActionCol + 1) % 2;
            renderUrlInputFocus();
        } else if (code === 39) {
            e.preventDefault();
            if (urlRow === 1) urlPresetCol = (urlPresetCol + 1) % elUrlPresets.length;
            else if (urlRow === 2) urlActionCol = (urlActionCol + 1) % 2;
            renderUrlInputFocus();
        } else if (code === 13) {
            e.preventDefault();
            if (urlRow === 0) {
                elUrlInput.focus();
            } else if (urlRow === 1) {
                var val = elUrlPresets[urlPresetCol].getAttribute('data-val');
                elUrlInput.value = (val === 'CLEAR') ? '' : val;
                elUrlStatus.textContent = 'Выбрано: ' + (elUrlInput.value || '(авто)');
            } else if (urlRow === 2) {
                if (urlActionCol === 0) {
                    customEpgUrl = trimStr(elUrlInput.value);
                    saveConfig();
                    closeUrlInputModal();
                    downloadAndParseEpg(true);
                } else {
                    closeUrlInputModal();
                }
            }
        }
        return true;
    }

    function openGuideModal(targetCh) {
        if (!elModal) return;
        isOpenFlag = true;
        subView = 'guide';
        var list = getGuideChannelList();
        var cur = targetCh || (window.TiViApp && window.TiViApp.getCurrentChannel ? window.TiViApp.getCurrentChannel() : null) || list[0] || null;
        guideChannel = cur;
        guideChannelIdx = 0;
        if (cur) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === cur.url) { guideChannelIdx = i; break; }
            }
        }
        var progs = findProgramListForChannel(guideChannel);
        focusedRowIdx = selectInitialProgramRow(progs);
        focusArea = (progs.length > 0) ? 'list' : 'buttons';
        focusedBtnIdx = (progs.length > 0) ? 0 : 2;
        elModal.className = 'panel';
        renderGuideModal();
        if (loadedProgramsCount === 0 && !isLoading) {
            downloadAndParseEpg(false);
        }
    }

    function closeGuideModal() {
        if (!elModal) return;
        if (subView === 'url_input') closeUrlInputModal();
        isOpenFlag = false;
        elModal.className = 'panel hidden';
    }

    function stepGuideChannel(delta) {
        var list = getGuideChannelList();
        if (!list.length) return;
        guideChannelIdx = (guideChannelIdx + delta + list.length) % list.length;
        guideChannel = list[guideChannelIdx];
        var progs = findProgramListForChannel(guideChannel);
        focusedRowIdx = selectInitialProgramRow(progs);
        renderGuideModal();
    }

    function handleKey(e) {
        if (!isOpenFlag) return false;
        if (subView === 'url_input') return handleUrlInputKey(e);

        var code = e.keyCode;
        var btns = buildTopButtons();
        var progs = findProgramListForChannel(guideChannel);

        if (code === 10009 || code === 27 || code === 8) {
            e.preventDefault();
            closeGuideModal();
            return true;
        }
        if (code === 38) { // UP
            e.preventDefault();
            if (focusArea === 'list') {
                if (focusedRowIdx > 0) focusedRowIdx--;
                else focusArea = 'buttons';
            } else if (progs.length > 0) {
                focusArea = 'list';
                focusedRowIdx = progs.length - 1;
            }
            renderGuideModal();
            return true;
        }
        if (code === 40) { // DOWN
            e.preventDefault();
            if (focusArea === 'buttons') {
                if (progs.length > 0) {
                    focusArea = 'list';
                    focusedRowIdx = selectInitialProgramRow(progs);
                }
            } else if (focusedRowIdx + 1 < progs.length) {
                focusedRowIdx++;
            } else {
                focusArea = 'buttons';
            }
            renderGuideModal();
            return true;
        }
        if (code === 37) { // LEFT
            e.preventDefault();
            if (focusArea === 'buttons') {
                focusedBtnIdx = (focusedBtnIdx - 1 + btns.length) % btns.length;
                renderGuideModal();
            } else {
                stepGuideChannel(-1);
            }
            return true;
        }
        if (code === 39) { // RIGHT
            e.preventDefault();
            if (focusArea === 'buttons') {
                focusedBtnIdx = (focusedBtnIdx + 1) % btns.length;
                renderGuideModal();
            } else {
                stepGuideChannel(+1);
            }
            return true;
        }
        if (code === 427) { // CH+
            e.preventDefault();
            stepGuideChannel(+1);
            return true;
        }
        if (code === 428) { // CH-
            e.preventDefault();
            stepGuideChannel(-1);
            return true;
        }
        if (code === 13) { // OK
            e.preventDefault();
            if (focusArea === 'buttons') {
                var bid = btns[focusedBtnIdx] ? btns[focusedBtnIdx].id : '';
                if (bid === 'prev_ch') stepGuideChannel(-1);
                else if (bid === 'next_ch') stepGuideChannel(+1);
                else if (bid === 'refresh') downloadAndParseEpg(true);
                else if (bid === 'edit_url') openUrlInputModal();
            } else if (guideChannel && window.TiViApp && window.TiViApp.playChannelObj) {
                closeGuideModal();
                if (window.TiViApp.closeSidePanel) window.TiViApp.closeSidePanel();
                window.TiViApp.playChannelObj(guideChannel, true);
            }
            return true;
        }
        return true;
    }

    window.TiViEpg = {
        init: function () {
            elModal = document.getElementById('epg-modal');
            elTitle = document.getElementById('epg-title');
            elSubtitle = document.getElementById('epg-subtitle');
            elButtons = document.getElementById('epg-top-buttons');
            elList = document.getElementById('epg-list');
            elDesc = document.getElementById('epg-desc-box');

            elUrlModal = document.getElementById('epg-url-modal');
            elUrlWrap = document.getElementById('epg-url-wrap');
            elUrlInput = document.getElementById('epg-url-input');
            elUrlPresets = document.getElementById('epg-preset-row').getElementsByTagName('span');
            elUrlBtnSave = document.getElementById('btn-epg-save');
            elUrlBtnCancel = document.getElementById('btn-epg-cancel');
            elUrlStatus = document.getElementById('epg-url-status');

            loadConfig();
            loadCache();

            if (window.TiViThemes && window.TiViThemes.registerActionItem) {
                window.TiViThemes.registerActionItem({
                    id: 'open_epg',
                    title: 'Телепрограмма (EPG)',
                    getValue: function () {
                        return loadedChannelsCount > 0 ? ('Каналов: ' + loadedChannelsCount) : 'Открыть ▸';
                    },
                    onAction: function () { openGuideModal(null); }
                });
            }
        },
        setPlaylistEpgUrl: function (url) {
            var clean = trimStr(url);
            if (clean && clean !== playlistEpgUrl) {
                playlistEpgUrl = clean;
                if (window.TiViApp && window.TiViApp.addLog) {
                    window.TiViApp.addLog('EPG из плейлиста: ' + clean.replace(/^https?:\/\//i, '').substr(0, 34));
                }
            }
        },
        maybeRefreshOncePerDay: function () {
            if (!isLoading && (loadedProgramsCount === 0 || (new Date().getTime() - lastUpdatedMs) > CACHE_TTL_MS)) {
                downloadAndParseEpg(false);
            }
        },
        forceRefresh: function () { downloadAndParseEpg(true); },
        open: openGuideModal,
        close: closeGuideModal,
        isOpen: function () { return isOpenFlag; },
        handleKey: handleKey,
        getCurrentAndNext: getCurrentAndNext,
        formatHm: formatHm,
        getLoadedChannelsCount: function () { return loadedChannelsCount; }
    };
})();
