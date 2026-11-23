(function () {
    'use strict';

    var QR_WEB_SENDER_BASE = 'https://pskovland007.github.io/TiViLook-Tizen/qr.html';
    var POLL_INTERVAL_MS = 2600;
    var PROBE_TIMEOUT_MS = 5000;
    var MAGIC_PREFIX = 'TVLK1:';

    // ISO/IEC 18004 QR Level L specs (Versions 1..10)
    // [ver, totalCw, ecLen, b1, d1, b2, d2]
    var QR_VER_L = [
        null,
        [1,  26,   7, 1, 19, 0, 0],
        [2,  44,  10, 1, 34, 0, 0],
        [3,  70,  15, 1, 55, 0, 0],
        [4, 100,  20, 1, 80, 0, 0],
        [5, 134,  26, 1, 108, 0, 0],
        [6, 172,  18, 2, 68, 0, 0],
        [7, 196,  20, 2, 78, 0, 0],
        [8, 242,  24, 2, 97, 0, 0],
        [9, 292,  30, 2, 116, 0, 0],
        [10, 346, 18, 2, 68, 2, 69]
    ];

    var ALIGN_POS = [
        [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
        [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
    ];
    var VERSION_BITS = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };
    var FORMAT_BITS_L0 = 0x77C4; // EC Level L, Mask 0

    // GF(256) lookup tables for Reed-Solomon
    var GF_EXP = [];
    var GF_LOG = [];
    (function initGf() {
        var x = 1;
        var i;
        for (i = 0; i < 256; i++) GF_LOG[i] = 0;
        for (i = 0; i < 255; i++) {
            GF_EXP[i] = x;
            GF_LOG[x] = i;
            x = x << 1;
            if (x & 0x100) x = x ^ 0x11D;
        }
        for (i = 255; i < 512; i++) {
            GF_EXP[i] = GF_EXP[i - 255];
        }
    })();

    var isOpenFlag = false;
    var sessionNum = 0;
    var focusedBtnIdx = 0; // 0=Refresh QR, 1=Manual URL, 2=Close
    var pollTimer = null;
    var activeXhr = null;

    var curRelay = '';
    var curRoomId = '';
    var curSecretKey = '';
    var curVisualCode = '';
    var curPollUrl = '';
    var isProcessingPayload = false;

    var elModal = null;
    var elCanvas = null;
    var elStatus = null;
    var elRelayInfo = null;
    var elCodeBadge = null;
    var elBtnNew = null;
    var elBtnManual = null;
    var elBtnClose = null;

    function trimStr(str) { return ('' + (str || '')).replace(/^\s+|\s+$/g, ''); }

    function randHex(len) {
        var chars = '0123456789abcdef';
        var out = '';
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    function randAlnum(len) {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        var out = '';
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    // =========================================================================
    // Pure-ES5 UTF-8 + Base64URL + RC4-drop256 Decryptor (matches qr.html 1:1)
    // =========================================================================
    function strToUtf8Bytes(str) {
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 0x80) {
                bytes.push(c);
            } else if (c < 0x800) {
                bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
            } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
                var c2 = str.charCodeAt(++i);
                var cp = 0x10000 + (((c & 0x3FF) << 10) | (c2 & 0x3FF));
                bytes.push(
                    0xF0 | (cp >> 18),
                    0x80 | ((cp >> 12) & 0x3F),
                    0x80 | ((cp >> 6) & 0x3F),
                    0x80 | (cp & 0x3F)
                );
            } else {
                bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
            }
        }
        return bytes;
    }

    function utf8BytesToStr(bytes) {
        var out = [];
        var i = 0;
        var n = bytes.length;
        while (i < n) {
            var b0 = bytes[i++];
            if (b0 < 0x80) {
                out.push(String.fromCharCode(b0));
            } else if ((b0 & 0xE0) === 0xC0 && i < n) {
                out.push(String.fromCharCode(((b0 & 0x1F) << 6) | (bytes[i++] & 0x3F)));
            } else if ((b0 & 0xF0) === 0xE0 && i + 1 < n) {
                var b1 = bytes[i++];
                var b2 = bytes[i++];
                out.push(String.fromCharCode(((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F)));
            } else if ((b0 & 0xF8) === 0xF0 && i + 2 < n) {
                var x1 = bytes[i++];
                var x2 = bytes[i++];
                var x3 = bytes[i++];
                var cp = (((b0 & 0x07) << 18) | ((x1 & 0x3F) << 12) | ((x2 & 0x3F) << 6) | (x3 & 0x3F)) - 0x10000;
                out.push(String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF)));
            }
        }
        return out.join('');
    }

    function base64UrlToBytes(b64) {
        var clean = trimStr(b64).replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
        while (clean.length % 4 !== 0) clean += '=';
        var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var bytes = [];
        var i = 0;
        while (i < clean.length) {
            var e1 = alpha.indexOf(clean.charAt(i++));
            var e2 = alpha.indexOf(clean.charAt(i++));
            var c3 = clean.charAt(i++);
            var c4 = clean.charAt(i++);
            var e3 = (c3 === '=') ? 0 : alpha.indexOf(c3);
            var e4 = (c4 === '=') ? 0 : alpha.indexOf(c4);
            if (e1 < 0 || e2 < 0) break;
            bytes.push((e1 << 2) | (e2 >> 4));
            if (c3 !== '=' && e3 >= 0) bytes.push(((e2 & 15) << 4) | (e3 >> 2));
            if (c4 !== '=' && e4 >= 0) bytes.push(((e3 & 3) << 6) | e4);
        }
        return bytes;
    }

    function rc4Drop256(keyBytes, dataBytes) {
        var S = [];
        var i, j, t;
        for (i = 0; i < 256; i++) S[i] = i;
        j = 0;
        var kLen = keyBytes.length;
        for (i = 0; i < 256; i++) {
            j = (j + S[i] + keyBytes[i % kLen]) & 255;
            t = S[i]; S[i] = S[j]; S[j] = t;
        }
        i = 0; j = 0;
        for (var d = 0; d < 256; d++) {
            i = (i + 1) & 255;
            j = (j + S[i]) & 255;
            t = S[i]; S[i] = S[j]; S[j] = t;
        }
        var out = new Array(dataBytes.length);
        for (var k = 0; k < dataBytes.length; k++) {
            i = (i + 1) & 255;
            j = (j + S[i]) & 255;
            t = S[i]; S[i] = S[j]; S[j] = t;
            out[k] = dataBytes[k] ^ S[(S[i] + S[j]) & 255];
        }
        return out;
    }

    function decryptPayload(b64Cipher, secretKey) {
        try {
            var allBytes = base64UrlToBytes(b64Cipher);
            if (allBytes.length < 16) return null;
            var saltHex = '';
            for (var s = 0; s < 8; s++) {
                var hx = allBytes[s].toString(16);
                saltHex += (hx.length < 2 ? '0' + hx : hx);
            }
            var cipherBytes = allBytes.slice(8);
            var fullKeyBytes = strToUtf8Bytes(secretKey + ':' + saltHex);
            var plainBytes = rc4Drop256(fullKeyBytes, cipherBytes);
            var plainText = utf8BytesToStr(plainBytes);
            if (plainText.indexOf(MAGIC_PREFIX) !== 0) return null;
            return JSON.parse(plainText.substr(MAGIC_PREFIX.length));
        } catch (e) {
            return null;
        }
    }

    // =========================================================================
    // Pure-ES5 ISO/IEC 18004 QR Code Matrix Encoder & Canvas Renderer
    // =========================================================================
    function gfMul(a, b) {
        return (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
    }

    function rsEncode(data, ecLen) {
        var poly = [1];
        var i, j;
        for (i = 0; i < ecLen; i++) {
            var nxt = [];
            for (j = 0; j <= poly.length; j++) nxt[j] = 0;
            var factor = GF_EXP[i];
            for (j = 0; j < poly.length; j++) {
                nxt[j] ^= poly[j];
                nxt[j + 1] ^= gfMul(poly[j], factor);
            }
            poly = nxt;
        }
        var rem = data.slice(0);
        for (i = 0; i < ecLen; i++) rem.push(0);
        for (i = 0; i < data.length; i++) {
            var coef = rem[i];
            if (coef !== 0) {
                for (j = 1; j < poly.length; j++) {
                    rem[i + j] ^= gfMul(poly[j], coef);
                }
            }
        }
        return rem.slice(data.length);
    }

    function buildQrMatrix(text) {
        var raw = strToUtf8Bytes(text);
        var ver = 0;
        var v, spec, totalDataCw, ccBits;
        for (v = 1; v <= 10; v++) {
            spec = QR_VER_L[v];
            totalDataCw = spec[3] * spec[4] + spec[5] * spec[6];
            ccBits = (v <= 9) ? 8 : 16;
            if (4 + ccBits + raw.length * 8 <= totalDataCw * 8) {
                ver = v;
                break;
            }
        }
        if (ver === 0) return null;

        spec = QR_VER_L[ver];
        var ecLen = spec[2];
        var b1 = spec[3], d1 = spec[4], b2 = spec[5], d2 = spec[6];
        totalDataCw = b1 * d1 + b2 * d2;
        ccBits = (ver <= 9) ? 8 : 16;

        var bits = [];
        function pushBits(val, n) {
            for (var k = n - 1; k >= 0; k--) bits.push((val >> k) & 1);
        }

        pushBits(4, 4); // Byte mode
        pushBits(raw.length, ccBits);
        var i, j;
        for (i = 0; i < raw.length; i++) pushBits(raw[i], 8);
        var term = Math.min(4, totalDataCw * 8 - bits.length);
        pushBits(0, term);
        while (bits.length % 8 !== 0) bits.push(0);

        var dataCw = [];
        for (i = 0; i < bits.length; i += 8) {
            var v8 = 0;
            for (j = 0; j < 8; j++) v8 = (v8 << 1) | bits[i + j];
            dataCw.push(v8);
        }
        var pi = 0;
        while (dataCw.length < totalDataCw) {
            dataCw.push(pi === 0 ? 0xEC : 0x11);
            pi ^= 1;
        }

        var dataBlocks = [];
        var ecBlocks = [];
        var pos = 0;
        var blk;
        for (i = 0; i < b1; i++) {
            blk = dataCw.slice(pos, pos + d1); pos += d1;
            dataBlocks.push(blk);
            ecBlocks.push(rsEncode(blk, ecLen));
        }
        for (i = 0; i < b2; i++) {
            blk = dataCw.slice(pos, pos + d2); pos += d2;
            dataBlocks.push(blk);
            ecBlocks.push(rsEncode(blk, ecLen));
        }

        var finalCw = [];
        var maxD = Math.max(d1, d2);
        for (i = 0; i < maxD; i++) {
            for (j = 0; j < dataBlocks.length; j++) {
                if (i < dataBlocks[j].length) finalCw.push(dataBlocks[j][i]);
            }
        }
        for (i = 0; i < ecLen; i++) {
            for (j = 0; j < ecBlocks.length; j++) {
                finalCw.push(ecBlocks[j][i]);
            }
        }

        var size = ver * 4 + 17;
        var mat = [];
        var isFunc = [];
        for (i = 0; i < size; i++) {
            mat[i] = [];
            isFunc[i] = [];
            for (j = 0; j < size; j++) {
                mat[i][j] = 0;
                isFunc[i][j] = false;
            }
        }

        function setFunc(r, c, dark) {
            if (r >= 0 && r < size && c >= 0 && c < size) {
                mat[r][c] = dark ? 1 : 0;
                isFunc[r][c] = true;
            }
        }

        function drawFinder(r0, c0) {
            for (var dr = -1; dr <= 7; dr++) {
                for (var dc = -1; dc <= 7; dc++) {
                    var r = r0 + dr, c = c0 + dc;
                    if (r >= 0 && r < size && c >= 0 && c < size) {
                        var inBox = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6);
                        var dark = inBox && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
                        setFunc(r, c, dark);
                    }
                }
            }
        }

        drawFinder(0, 0);
        drawFinder(0, size - 7);
        drawFinder(size - 7, 0);

        // Alignment patterns (skip only the 3 finder corners)
        var ap = ALIGN_POS[ver];
        for (i = 0; i < ap.length; i++) {
            for (j = 0; j < ap.length; j++) {
                var r0 = ap[i], c0 = ap[j];
                if ((r0 <= 8 && c0 <= 8) || (r0 <= 8 && c0 >= size - 9) || (r0 >= size - 9 && c0 <= 8)) {
                    continue;
                }
                for (var dr = -2; dr <= 2; dr++) {
                    for (var dc = -2; dc <= 2; dc++) {
                        setFunc(r0 + dr, c0 + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
                    }
                }
            }
        }

        // Timing patterns
        for (i = 8; i < size - 8; i++) {
            if (!isFunc[6][i]) setFunc(6, i, (i % 2) === 0);
            if (!isFunc[i][6]) setFunc(i, 6, (i % 2) === 0);
        }

        // Reserve format areas + dark module
        for (i = 0; i < 9; i++) {
            if (i !== 6) {
                isFunc[8][i] = true;
                isFunc[i][8] = true;
            }
        }
        for (i = 0; i < 8; i++) {
            isFunc[8][size - 1 - i] = true;
            isFunc[size - 1 - i][8] = true;
        }
        setFunc(size - 8, 8, true);

        // Version info (v >= 7)
        if (ver >= 7) {
            var vbits = VERSION_BITS[ver];
            for (i = 0; i < 18; i++) {
                var bit = ((vbits >> i) & 1) === 1;
                var vr = Math.floor(i / 3);
                var vc = size - 11 + (i % 3);
                setFunc(vr, vc, bit);
                setFunc(vc, vr, bit);
            }
        }

        // Bit stream
        var bitStream = [];
        for (i = 0; i < finalCw.length; i++) {
            for (j = 7; j >= 0; j--) bitStream.push((finalCw[i] >> j) & 1);
        }

        var bi = 0;
        var col = size - 1;
        var up = true;
        while (col > 0) {
            if (col === 6) col--;
            for (var step = 0; step < size; step++) {
                var r = up ? (size - 1 - step) : step;
                for (var dc = 0; dc >= -1; dc--) {
                    var c = col + dc;
                    if (!isFunc[r][c]) {
                        var db = (bi < bitStream.length) ? bitStream[bi] : 0;
                        bi++;
                        mat[r][c] = db;
                    }
                }
            }
            up = !up;
            col -= 2;
        }

        // Apply Mask 0: (r + c) % 2 === 0
        for (i = 0; i < size; i++) {
            for (j = 0; j < size; j++) {
                if (!isFunc[i][j] && ((i + j) % 2 === 0)) {
                    mat[i][j] ^= 1;
                }
            }
        }

        // Write format info
        var c1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
        var c2 = [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
        for (i = 0; i < 15; i++) {
            var fb = (FORMAT_BITS_L0 >> (14 - i)) & 1;
            mat[c1[i][0]][c1[i][1]] = fb;
            mat[c2[i][0]][c2[i][1]] = fb;
        }

        return mat;
    }

    function drawQrOnCanvas(canvas, text) {
        if (!canvas || !canvas.getContext) return false;
        var mat = buildQrMatrix(text);
        if (!mat) return false;
        var ctx = canvas.getContext('2d');
        var size = mat.length;
        var quiet = 4;
        var totalMod = size + quiet * 2;
        var pxSize = canvas.width;
        var cell = Math.floor(pxSize / totalMod);
        var actual = cell * totalMod;
        var off = Math.floor((pxSize - actual) / 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pxSize, pxSize);
        ctx.fillStyle = '#000000';
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (mat[r][c]) {
                    ctx.fillRect(off + (c + quiet) * cell, off + (r + quiet) * cell, cell, cell);
                }
            }
        }
        return true;
    }

    function clearQrCanvas(canvas) {
        if (!canvas || !canvas.getContext) return;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // =========================================================================
    // Relay Probing & Polling (Auto-selects relay reachable from Tizen 2.4.0)
    // =========================================================================
    function stopRelay() {
        sessionNum++;
        isProcessingPayload = false;
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
        if (activeXhr) {
            try { activeXhr.abort(); } catch (e) {}
            activeXhr = null;
        }
    }

    function setQrStatus(msg, relayText) {
        if (elStatus) elStatus.textContent = msg;
        if (typeof relayText === 'string' && elRelayInfo) elRelayInfo.textContent = relayText;
    }

    function probeAndStartSession() {
        stopRelay();
        var mySid = sessionNum;
        curSecretKey = randAlnum(16);
        curVisualCode = randHex(6).toUpperCase();
        if (elCodeBadge) elCodeBadge.textContent = 'Код сессии: ' + curVisualCode;
        clearQrCanvas(elCanvas);
        setQrStatus('Подключение к каналу обмена...', 'Поиск доступного сервера для Tizen 2.4...');

        // 1) Try ntfy.sh (HTTPS)
        var roomA = 'tvlk_' + randHex(14);
        probeGet('https://ntfy.sh/' + roomA + '/json?poll=1', mySid, function (okA) {
            if (mySid !== sessionNum) return;
            if (okA) {
                activateRelaySession('ntfy', roomA, 'https://ntfy.sh/' + roomA + '/json?poll=1&since=all', 'ntfy.sh (HTTPS)', mySid);
                return;
            }
            // 2) Try jsonblob.com (HTTPS POST creates blob, returns X-jsonblob or Location)
            probeJsonBlob('https://jsonblob.com/api/jsonBlob', mySid, function (blobId) {
                if (mySid !== sessionNum) return;
                if (blobId) {
                    activateRelaySession('jblob', blobId, 'https://jsonblob.com/api/jsonBlob/' + blobId, 'jsonblob.com (HTTPS)', mySid);
                    return;
                }
                // 3) Try kvdb.io (HTTPS POST creates ephemeral bucket)
                probeKvdb('https://kvdb.io/', mySid, function (bucketId) {
                    if (mySid !== sessionNum) return;
                    if (bucketId) {
                        activateRelaySession('kvdb', bucketId, 'https://kvdb.io/' + bucketId + '/tvlk', 'kvdb.io (HTTPS)', mySid);
                        return;
                    }
                    // 4) Last resort: try plain HTTP ntfy.sh on TV (phone still posts over HTTPS)
                    var roomHttp = 'tvlk_' + randHex(14);
                    probeGet('http://ntfy.sh/' + roomHttp + '/json?poll=1', mySid, function (okH) {
                        if (mySid !== sessionNum) return;
                        if (okH) {
                            activateRelaySession('ntfy', roomHttp, 'http://ntfy.sh/' + roomHttp + '/json?poll=1&since=all', 'ntfy.sh (HTTP)', mySid);
                            return;
                        }
                        setQrStatus(
                            'Не удалось подключиться к облачному каналу (ограничение SSL Tizen 2.4). Используйте «Ввести URL вручную» или USB-флешку.',
                            'Нет связи с реле-сервером'
                        );
                        if (window.TiViApp && window.TiViApp.addLog) {
                            window.TiViApp.addLog('QR FAIL: ни один реле-сервер не ответил');
                        }
                    });
                });
            });
        });
    }

    function probeGet(url, mySid, cb) {
        try {
            var xhr = new XMLHttpRequest();
            activeXhr = xhr;
            xhr.open('GET', url, true);
            xhr.timeout = PROBE_TIMEOUT_MS;
            xhr.onreadystatechange = function () {
                if (mySid !== sessionNum || xhr.readyState !== 4) return;
                activeXhr = null;
                cb(xhr.status >= 200 && xhr.status < 300);
            };
            xhr.ontimeout = function () { if (mySid === sessionNum) { activeXhr = null; cb(false); } };
            xhr.onerror = function () { if (mySid === sessionNum) { activeXhr = null; cb(false); } };
            xhr.send(null);
        } catch (e) { cb(false); }
    }

    function probeJsonBlob(url, mySid, cb) {
        try {
            var xhr = new XMLHttpRequest();
            activeXhr = xhr;
            xhr.open('POST', url, true);
            xhr.timeout = PROBE_TIMEOUT_MS;
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onreadystatechange = function () {
                if (mySid !== sessionNum || xhr.readyState !== 4) return;
                activeXhr = null;
                if (xhr.status >= 200 && xhr.status < 300) {
                    var id = '';
                    try { id = trimStr(xhr.getResponseHeader('X-jsonblob') || ''); } catch (e1) {}
                    if (!id) {
                        try {
                            var loc = xhr.getResponseHeader('Location') || '';
                            if (loc) id = trimStr(loc.split('/').pop());
                        } catch (e2) {}
                    }
                    cb(id || '');
                } else {
                    cb('');
                }
            };
            xhr.ontimeout = function () { if (mySid === sessionNum) { activeXhr = null; cb(''); } };
            xhr.onerror = function () { if (mySid === sessionNum) { activeXhr = null; cb(''); } };
            xhr.send('{"w":1}');
        } catch (e) { cb(''); }
    }

    function probeKvdb(url, mySid, cb) {
        try {
            var xhr = new XMLHttpRequest();
            activeXhr = xhr;
            xhr.open('POST', url, true);
            xhr.timeout = PROBE_TIMEOUT_MS;
            xhr.onreadystatechange = function () {
                if (mySid !== sessionNum || xhr.readyState !== 4) return;
                activeXhr = null;
                if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                    var bid = trimStr(xhr.responseText).replace(/[^A-Za-z0-9_-]/g, '');
                    cb(bid.length >= 8 ? bid : '');
                } else {
                    cb('');
                }
            };
            xhr.ontimeout = function () { if (mySid === sessionNum) { activeXhr = null; cb(''); } };
            xhr.onerror = function () { if (mySid === sessionNum) { activeXhr = null; cb(''); } };
            xhr.send(null);
        } catch (e) { cb(''); }
    }

    function activateRelaySession(relayName, roomId, pollUrl, label, mySid) {
        curRelay = relayName;
        curRoomId = roomId;
        curPollUrl = pollUrl;

        var qrUrl = QR_WEB_SENDER_BASE +
            '?r=' + encodeURIComponent(relayName) +
            '&id=' + encodeURIComponent(roomId) +
            '&c=' + encodeURIComponent(curVisualCode) +
            '#' + curSecretKey;

        drawQrOnCanvas(elCanvas, qrUrl);
        setQrStatus('Наведите камеру смартфона на QR-код и отправьте ссылку или файл .m3u', 'Канал: ' + label + '  •  🔒 Шифрование активно');
        if (window.TiViApp && window.TiViApp.addLog) {
            window.TiViApp.addLog('QR готов (' + label + '), код ' + curVisualCode);
        }
        schedulePoll(mySid);
    }

    function schedulePoll(mySid) {
        if (mySid !== sessionNum || !isOpenFlag || isProcessingPayload) return;
        pollTimer = setTimeout(function () {
            pollOnce(mySid);
        }, POLL_INTERVAL_MS);
    }

    function pollOnce(mySid) {
        if (mySid !== sessionNum || !isOpenFlag || isProcessingPayload) return;
        try {
            var xhr = new XMLHttpRequest();
            activeXhr = xhr;
            xhr.open('GET', curPollUrl, true);
            xhr.timeout = 6000;
            xhr.onreadystatechange = function () {
                if (mySid !== sessionNum || xhr.readyState !== 4) return;
                activeXhr = null;
                if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                    handleRelayResponse(xhr.responseText, mySid);
                } else {
                    schedulePoll(mySid);
                }
            };
            xhr.ontimeout = function () { if (mySid === sessionNum) { activeXhr = null; schedulePoll(mySid); } };
            xhr.onerror = function () { if (mySid === sessionNum) { activeXhr = null; schedulePoll(mySid); } };
            xhr.send(null);
        } catch (e) {
            schedulePoll(mySid);
        }
    }

    function handleRelayResponse(respText, mySid) {
        if (mySid !== sessionNum || isProcessingPayload) return;

        if (curRelay === 'ntfy') {
            var lines = respText.split(/\r?\n/);
            for (var i = lines.length - 1; i >= 0; i--) {
                var ln = trimStr(lines[i]);
                if (!ln || ln.charAt(0) !== '{') continue;
                try {
                    var msgObj = JSON.parse(ln);
                    if (msgObj && msgObj.event === 'message') {
                        // Attachment mode (large .m3u file uploaded via PUT)
                        if (msgObj.attachment && msgObj.attachment.url) {
                            fetchEncryptedAttachment(msgObj.attachment.url, mySid);
                            return;
                        }
                        if (msgObj.message) {
                            var dec = decryptPayload(msgObj.message, curSecretKey);
                            if (dec) {
                                applyDecryptedPayload(dec, mySid);
                                return;
                            }
                        }
                    }
                } catch (e) {}
            }
            schedulePoll(mySid);
            return;
        }

        if (curRelay === 'jblob') {
            try {
                var jb = JSON.parse(respText);
                if (jb && jb.d) {
                    var decJb = decryptPayload(jb.d, curSecretKey);
                    if (decJb) {
                        applyDecryptedPayload(decJb, mySid);
                        return;
                    }
                }
            } catch (e2) {}
            schedulePoll(mySid);
            return;
        }

        if (curRelay === 'kvdb') {
            var decKv = decryptPayload(respText, curSecretKey);
            if (decKv) {
                applyDecryptedPayload(decKv, mySid);
                return;
            }
            schedulePoll(mySid);
        }
    }

    function fetchEncryptedAttachment(attUrl, mySid) {
        isProcessingPayload = true;
        setQrStatus('Файл получен со смартфона! Скачивание и расшифровка...', '');
        try {
            var xhr = new XMLHttpRequest();
            activeXhr = xhr;
            xhr.open('GET', attUrl, true);
            xhr.timeout = 14000;
            xhr.onreadystatechange = function () {
                if (mySid !== sessionNum || xhr.readyState !== 4) return;
                activeXhr = null;
                if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                    var dec = decryptPayload(xhr.responseText, curSecretKey);
                    if (dec) {
                        applyDecryptedPayload(dec, mySid);
                        return;
                    }
                }
                isProcessingPayload = false;
                setQrStatus('Не удалось расшифровать файл — попробуйте отправить ещё раз', '');
                schedulePoll(mySid);
            };
            xhr.ontimeout = function () { if (mySid === sessionNum) { isProcessingPayload = false; schedulePoll(mySid); } };
            xhr.onerror = function () { if (mySid === sessionNum) { isProcessingPayload = false; schedulePoll(mySid); } };
            xhr.send(null);
        } catch (e) {
            isProcessingPayload = false;
            schedulePoll(mySid);
        }
    }

    function applyDecryptedPayload(payload, mySid) {
        if (mySid !== sessionNum) return;
        isProcessingPayload = true;
        stopRelay();

        var title = trimStr(payload.title || '');
        var epgUrl = trimStr(payload.epg || '');
        if (epgUrl && window.TiViEpg && window.TiViEpg.setPlaylistEpgUrl) {
            window.TiViEpg.setPlaylistEpgUrl(epgUrl);
        }

        if (payload.kind === 'file' && payload.m3u) {
            setQrStatus('Плейлист расшифрован! Импорт каналов...', '');
            if (window.TiViApp && window.TiViApp.importPlaylistFromQrText) {
                var ok = window.TiViApp.importPlaylistFromQrText(title || 'Лист с телефона', payload.m3u);
                if (ok) {
                    closeModal();
                    if (epgUrl && window.TiViEpg && window.TiViEpg.forceRefresh) {
                        setTimeout(function () { window.TiViEpg.forceRefresh(); }, 1500);
                    }
                    return;
                }
            }
            setQrStatus('Файл получен, но в нём не найдено каналов #EXTINF', '');
            return;
        }

        if (payload.kind === 'url' && payload.url) {
            setQrStatus('Ссылка получена! Загрузка плейлиста...', '');
            if (window.TiViApp && window.TiViApp.importPlaylistFromQrUrl) {
                window.TiViApp.importPlaylistFromQrUrl(title, payload.url, function (ok, msg) {
                    if (ok) {
                        closeModal();
                        if (epgUrl && window.TiViEpg && window.TiViEpg.forceRefresh) {
                            setTimeout(function () { window.TiViEpg.forceRefresh(); }, 1500);
                        }
                    } else if (isOpenFlag) {
                        setQrStatus('Ошибка загрузки ссылки: ' + (msg || 'нет ответа'), '');
                    }
                });
                return;
            }
        }

        setQrStatus('Получены некорректные данные. Нажмите «Новый код» и повторите.', '');
    }

    // =========================================================================
    // Modal UI & Remote Keys
    // =========================================================================
    function renderButtons() {
        if (!elBtnNew || !elBtnManual || !elBtnClose) return;
        elBtnNew.className = 'modal-btn primary-btn' + (focusedBtnIdx === 0 ? ' focused' : '');
        elBtnManual.className = 'modal-btn' + (focusedBtnIdx === 1 ? ' focused' : '');
        elBtnClose.className = 'modal-btn' + (focusedBtnIdx === 2 ? ' focused' : '');
    }

    function openModal() {
        if (!elModal) return;
        isOpenFlag = true;
        focusedBtnIdx = 0;
        elModal.className = 'panel';
        renderButtons();
        probeAndStartSession();
    }

    function closeModal() {
        stopRelay();
        isOpenFlag = false;
        if (elModal) elModal.className = 'panel hidden';
    }

    function handleKey(e) {
        if (!isOpenFlag) return false;
        var code = e.keyCode;
        if (code === 10009 || code === 27 || code === 8) {
            e.preventDefault();
            closeModal();
            return true;
        }
        if (code === 37) {
            e.preventDefault();
            focusedBtnIdx = (focusedBtnIdx + 2) % 3;
            renderButtons();
            return true;
        }
        if (code === 39) {
            e.preventDefault();
            focusedBtnIdx = (focusedBtnIdx + 1) % 3;
            renderButtons();
            return true;
        }
        if (code === 13) {
            e.preventDefault();
            if (focusedBtnIdx === 0) {
                probeAndStartSession();
            } else if (focusedBtnIdx === 1) {
                closeModal();
                if (window.TiViApp && window.TiViApp.openManualUrlModal) {
                    window.TiViApp.openManualUrlModal();
                }
            } else {
                closeModal();
            }
            return true;
        }
        return true;
    }

    window.TiViQr = {
        init: function () {
            elModal = document.getElementById('qr-modal');
            elCanvas = document.getElementById('qr-canvas');
            elStatus = document.getElementById('qr-status-text');
            elRelayInfo = document.getElementById('qr-relay-info');
            elCodeBadge = document.getElementById('qr-session-code');
            elBtnNew = document.getElementById('btn-qr-refresh');
            elBtnManual = document.getElementById('btn-qr-manual');
            elBtnClose = document.getElementById('btn-qr-close');
        },
        open: openModal,
        close: closeModal,
        isOpen: function () { return isOpenFlag; },
        handleKey: handleKey
    };
})();
