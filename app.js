(function () {
    'use strict';

    var STORAGE_PREFIX = 'tivilook_tizen_v2_';
    var VISIBLE_ROWS = 9;
    var DEFAULT_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1';

    var CATEGORIES = [
        '★ Избранное',
        'Все каналы',
        '2K',
        'Кино и сериалы',
        'Спорт',
        'Детские',
        'Познавательные',
        'Музыка',
        'Новости и общие',
        'Развлечения',
        'Прочее'
    ];

    // Badge palette matching TiViLook Android
    var BADGE_COLORS = [
        '#2B6ED2', '#18A086', '#EF7540', '#B82A6B',
        '#7C4DFF', '#0284C7', '#D97706', '#059669'
    ];

    // Curated starter catalog (prioritizing HTTP & Tizen-2.4-verified streams across all categories)
    var BUILTIN_CHANNELS = [
        // Новости и общие
        { name: 'НТВ HD', category: 'Новости и общие', url: 'http://cdn.ntv.ru/ntv-msk_hd/tracks-v1a1/mono.m3u8' },
        { name: 'НТВ (Прямой CDN)', category: 'Новости и общие', url: 'https://cdn2.ntv.ru/ntv0_hd/tracks-v1a1/mono.m3u8' },
        { name: 'Беларусь 24 HD', category: 'Новости и общие', url: 'https://edge59.dc.beltelecom.by/ngtrk/_definst_/smil:belarus24/chunklist_w148744111_b5160000_sleng.m3u8' },
        { name: 'Беларусь 24', category: 'Новости и общие', url: 'http://ott-7.sevstar.net/belarus24/index.m3u8' },
        { name: 'Беларусь РТР', category: 'Новости и общие', url: 'http://194.158.222.36:6105' },
        { name: 'Первый крымский', category: 'Новости и общие', url: 'http://80.245.112.27:18787/' },

        // Кино и сериалы
        { name: 'Дом кино Премиум', category: 'Кино и сериалы', url: 'http://fs.uplink.kz/dom_kino_premium/tracks-v1a1/mono.ts.m3u8?token=onlinetv' },
        { name: 'Дом кино International', category: 'Кино и сериалы', url: 'https://fs.uplink.kz/dom_kino/mono.m3u8?token=onlinetv' },
        { name: 'Дорама', category: 'Кино и сериалы', url: 'http://109.248.236.51/dorama/video.m3u8' },
        { name: 'Еврокино HD', category: 'Кино и сериалы', url: 'http://85.117.61.97:8000/play/a017/index.m3u8' },
        { name: 'Еврокино', category: 'Кино и сериалы', url: 'http://178.134.1.158:8081/eurokino/index.m3u8' },
        { name: 'Кинеко', category: 'Кино и сериалы', url: 'http://s7.merlive.am/kineko/index.m3u8' },
        { name: 'Киноман HD', category: 'Кино и сериалы', url: 'http://s7.merlive.am/Kinoman/index.m3u8' },
        { name: 'Киноман', category: 'Кино и сериалы', url: 'http://185.121.1.163:8083/Kinoman/index.m3u8' },
        { name: 'Кинопремьера HD', category: 'Кино и сериалы', url: 'http://185.121.1.163:8083/Kinopremyera/index.m3u8' },
        { name: 'Киносемья HD', category: 'Кино и сериалы', url: 'http://185.121.1.163:8083/Kinosemya/index.m3u8' },
        { name: 'Киносвидание', category: 'Кино и сериалы', url: 'http://s7.merlive.am/Kinosvidanie/index.m3u8' },
        { name: 'Киносат HD', category: 'Кино и сериалы', url: 'http://flussonic.mkpnet.ru/tv-e055808223a74709/video.m3u8' },
        { name: 'Кинохит HD', category: 'Кино и сериалы', url: 'http://195.64.140.147:10046/46' },
        { name: 'Кинопоказ HD', category: 'Кино и сериалы', url: 'https://stream8.cinerama.uz/1057/index.m3u8' },
        { name: 'Киносерия', category: 'Кино и сериалы', url: 'https://fs.uplink.kz/kinoseria/mono.m3u8?token=onlinetv' },

        // Спорт
        { name: 'Матч! HD', category: 'Спорт', url: 'http://bl.video.matchtv.ru/media/playlist/free_d46d0cf1712c0542ec7fd4f0808f600a_hd/17_89756005/1080/e6bef86de8a133cd7b27deb040758a00/4796141934.m3u8' },
        { name: 'Eurosport 1 HD', category: 'Спорт', url: 'http://31.148.5.241/Eurosport_1_HD/index.m3u8' },
        { name: 'Eurosport 1 Romania', category: 'Спорт', url: 'http://89.44.231.73:7000/eurosport' },
        { name: 'Setanta Sports 3 HD', category: 'Спорт', url: 'http://85.117.61.84/setanta3/index.m3u8' },
        { name: 'Setanta Sports+ HD', category: 'Спорт', url: 'http://85.117.61.84/setanta2/index.m3u8' },
        { name: 'Беларусь 5 HD', category: 'Спорт', url: 'https://edge59.dc.beltelecom.by/ngtrk/smil:belarus5int.smil/playlist.m3u8' },
        { name: 'КХЛ', category: 'Спорт', url: 'https://stream8.cinerama.uz/1422/index.m3u8' },
        { name: 'АВТО 24', category: 'Спорт', url: 'http://dmi3y-tv.online/hls/CH_AVTO24.m3u8' },
        { name: 'ДРАЙВ', category: 'Спорт', url: 'http://dmi3y-tv.online/hls/CH_DRIVE.m3u8' },
        { name: 'Матч! Боец HD', category: 'Спорт', url: 'http://91.205.196.7:8000/play/a02s' },
        { name: 'Real Madrid TV HD', category: 'Спорт', url: 'http://88.212.15.50/live/real_madrid_tv/index.m3u8' },
        { name: 'Sky Sports 1 HD', category: 'Спорт', url: 'http://45.228.234.9:8000/play/a06b/index.m3u8' },

        // Музыка
        { name: 'Stingray Classic Rock', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/ose-101ads-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray Hit List (1080p)', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/ose-107ads-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray Everything 80s (1080p)', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/ose-128ads-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray Flashback 70s', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/ose-115ads-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray Easy Listening', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/ose-137ads-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray DJAZZ', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/djazz-djaads-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray Classica', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/classica-cla008-montreal/samsungtvplus/master.m3u8' },
        { name: 'Stingray Karaoke (1080p)', category: 'Музыка', url: 'https://lotus.stingray.com/manifest/karaoke-kar000-montreal/samsungtvplus/master.m3u8' },
        { name: 'Europa Plus TV', category: 'Музыка', url: 'http://fs.uplink.kz/europa_plus/tracks-v1a1/mono.ts.m3u8?token=onlinetv' },
        { name: 'Europa Plus (Резерв)', category: 'Музыка', url: 'http://dmi3y-tv.online/hls/CH_EUROPA_PLUS.m3u8' },
        { name: 'BRIDGE TV', category: 'Музыка', url: 'http://178.134.1.158:8081/BRIDGE/index.m3u8' },
        { name: 'BRIDGE Rock', category: 'Музыка', url: 'http://178.134.1.158:8081/BRIDGEROCK/index.m3u8' },
        { name: 'Bridge Classic', category: 'Музыка', url: 'https://fs.uplink.kz/bridge_classic/mono.m3u8?token=onlinetv2' },
        { name: 'Eska TV (1080p)', category: 'Музыка', url: 'http://92.114.85.87:8018/play/a00h/index.m3u8' },
        { name: 'Eska Rock TV (1080p)', category: 'Музыка', url: 'http://92.114.85.87:8016/play/a005/index.m3u8' },
        { name: 'Eska TV Extra (1080p)', category: 'Музыка', url: 'http://92.114.85.87:8016/play/a008/index.m3u8' },
        { name: 'Deluxe Rap', category: 'Музыка', url: 'http://sdn-global-live-streaming-packager-cache.3qsdn.com/65183/65183_264_live.m3u8' },
        { name: 'Retro TV HD', category: 'Музыка', url: 'http://dmi3y-tv.online/hls/CH_RETROTVHD.m3u8' },
        { name: 'Первый музыкальный HD', category: 'Музыка', url: 'http://hz1.teleport.cc/HLS/HD.m3u8' },
        { name: 'О!2 ТВ', category: 'Музыка', url: 'http://s7.merlive.am/o2tv/index.m3u8' },
        { name: 'Шансон ТВ', category: 'Музыка', url: 'http://46.53.200.153:7777/play/Shanson_TV/index.m3u8' },
        { name: 'Музыка Первого', category: 'Музыка', url: 'https://stream8.cinerama.uz/1201/index.m3u8' },

        // Детские
        { name: 'Mult International', category: 'Детские', url: 'https://fs.uplink.kz/mult/mono.m3u8?token=onlinetv' },
        { name: 'Детский мир', category: 'Детские', url: 'https://stream8.cinerama.uz/1033/tracks-v1a1/mono.m3u8' },

        // Познавательные
        { name: 'Бобёр', category: 'Познавательные', url: 'http://dmi3y-tv.online/hls/CH_BOBER.m3u8' },
        { name: 'История', category: 'Познавательные', url: 'https://stream8.cinerama.uz/1266/index.m3u8' },

        // Прочее
        { name: '#КтоКуда', category: 'Прочее', url: 'http://s7.merlive.am/ktokuda/index.m3u8' }
    ];

    // Open M3U sources loaded in background (same curated set as Android TiViLook)
    var OPEN_SOURCES = [
        'https://loganettv.github.io/playlists/all.m3u',
        'https://loganettv.github.io/playlists/movie.m3u',
        'https://loganettv.github.io/playlists/kids.m3u',
        'https://loganettv.github.io/playlists/sport.m3u',
        'https://loganettv.github.io/playlists/music.m3u',
        'https://ngrch.github.io/iptv/ru.m3u',
        'https://ngrch.github.io/iptv/music.m3u',
        'https://spirt007.github.io/Tvru/Rus.m3u',
        'https://cdn.jsdelivr.net/gh/Free-TV/IPTV@master/playlists/playlist_russia.m3u8',
        'https://iptv-org.github.io/iptv/countries/ru.m3u',
        'https://iptv-org.github.io/iptv/countries/by.m3u',
        'https://iptv-org.github.io/iptv/categories/music.m3u',
        'https://iptv-org.github.io/iptv/categories/sports.m3u'
    ];

    // Sport country tokens for deduplication
    var RE_SPORT_COUNTRY = /(?:^|[^a-zа-яё0-9])(czechia|czech|germany|deutschland|hungary|italy|italia|romania|spain|espana|united\s+kingdom|england|britain|bulgaria|poland|polska|france|netherlands|holland|greece|portugal|turkey|serbia|croatia|slovenia|slovakia|sweden|norway|denmark|finland|austria|switzerland|belgium|ireland|ukraine|belarus|kazakhstan|georgia|armenia|azerbaijan|estonia|latvia|lithuania|moldova|israel|usa|canada|australia|brazil|mexico|argentina|india|arabia|arabic|mena|europe|international|intl|asia|global|latam|baltic|nordic|balkans|cis|uk|de|pl|it|es|fr|ro|hu|bg|cz|sk|tr|nl|se|no|dk|fi|gr|pt|at|ch|be|ie|ua|by|kz|en|rs|hr|eu|чехия|германия|венгрия|италия|румыния|испания|болгария|польша|франция|турция|сербия|хорватия|греция|португалия|швеция|норвегия|дания|финляндия|австрия|бельгия|украина|беларусь|казахстан|европа)(?=$|[^a-zа-яё0-9])/gi;
    var RE_BRACKET_META = /[\(\[]\s*(\d{1,2}|2160p?|1440p?|1080[pi]?|720p?|576[pi]?|540p?|480p?|360p?|240p?|4k|2k|uhd|fhd|full\s*hd|hd|хд|hq|sd|orig|оригинал|резерв|прямой(?:\s+cdn)?|geo[- ]?blocked|not\s*24\/7)\s*[\)\]]/gi;
    var RE_QUALITY_TOKEN = /(?:^|[\s\-_|\/])(2160p?|1440p?|1080[pi]?|720p?|576[pi]?|540p?|480p?|360p?|240p?|4k|2k|uhd|fhd|full\s*hd|fullhd|hd|хд|hq|sd|orig|оригинал|резерв)(?=$|[\s\-_|\/])/gi;
    var RE_TRAILING_DUP = /\s*[\(\[]\s*\d{1,2}\s*[\)\]]\s*$/g;
    var RE_SAFE_BROADCAST = /broadcast[a-z]*/gi;

    var POLITICAL_OTHER = [
        'дума', 'госдума', 'совет федерации', 'вместе-рф', 'вместе рф', 'парламент',
        'красная линия', 'кпрф', 'лдпр', 'единая россия', 'полит', 'соловьев', 'соловьёв',
        'царьград', 'россия 24', 'вести', 'известия', 'russia today', 'sputnik', 'спутник',
        'звезда', 'рада', 'свобода', 'дождь', 'euronews', 'bbc', 'cnn', 'al jazeera',
        'france 24', 'bloomberg', 'cnbc', 'fox news', 'sky news', 'новости', 'news',
        'инфо 24', 'инфоканал', 'мир 24', 'рбк', 'отр', 'партия', 'выборы'
    ];

    var REGIONAL_OTHER = [
        'область', 'обл.', ' край', 'республика', 'респ.', 'округ', 'гтрк', 'нвк', 'бст',
        'тнв', 'отв', 'губерния', 'регион', 'местн', 'городск', 'трк ', 'ктв', 'москва',
        'подмосков', 'петербург', 'лентв', 'воронеж', 'белгород', 'курган', 'астрахан',
        'башкортостан', 'уфа', 'татарстан', 'казан', 'самара', 'саратов', 'волгоград',
        'ростов', 'краснодар', 'кубань', 'сочи', 'ставропол', 'крым', 'севастопол',
        'екатеринбург', 'урал', 'челябинск', 'тюмень', 'югра', 'ямал', 'янао', 'хмао',
        'омск', 'новосибирск', 'томск', 'кемерово', 'барнаул', 'алтай', 'красноярск',
        'иркутск', 'байкал', 'бурятия', 'якутия', 'хабаровск', 'владивосток', 'сахалин',
        'перм', 'киров', 'ижевск', 'оренбург', 'пенза', 'ульяновск', 'чебоксар', 'саранск',
        'нижний новгород', 'владимир', 'иваново', 'ярославл', 'костром', 'тверь', 'смоленск',
        'калуга', 'тула', 'рязань', 'тамбов', 'липецк', 'курск', 'брянск', 'псков',
        'новгород', 'вологда', 'архангельск', 'мурманск', 'карел', 'сыктывкар', 'калининград',
        'дагестан', 'чечня', 'грозный', 'осетия', 'нальчик', 'адыгея', 'сигма'
    ];

    var ARABIC_INDIAN_RE = /[\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/;

    // App State
    var hasAvPlay = false;
    var allChannels = [];
    var mirrorsMap = {};
    var favoritesMap = {};
    var activeCategory = 'Все каналы';
    var displayedChannels = [];

    var currentChannel = null;
    var previousChannel = null;
    var activeStreamUrl = '';
    var activeMirrorUrls = [];
    var activeMirrorIdx = 0;
    var retryCount = 0;
    var retryTimer = null;
    var bufferingSinceMs = 0;
    var lastSwitchMs = 0;
    var isCatalogLoading = false;

    // UI State
    var isSideVisible = false;
    var isSideInGroups = false;
    var focusedGroupIdx = 1;
    var focusedChannelIdx = 0;
    var isInfoVisible = false;
    var lastBackPressMs = 0;
    var osdTimer = null;
    var toastTimer = null;
    var autoHideSideTimer = null;
    var diagEntries = [];
    var currentStateText = 'Ожидание';
    var currentResText = '—';

    // DOM refs
    var elClock, elSignalBars, elStatusText, elSidePanel, elSideCounter, elTabGroups, elTabChannels;
    var elSideGroupCaption, elSideList, elInfoPanel, elInfoCh, elInfoGroup, elInfoRes, elInfoProto;
    var elInfoState, elInfoCatalog, elInfoEngine, elInfoTizen, elDiagLog;
    var elOsdBar, elOsdName, elOsdMeta, elToast, elSplash, elHtml5Player, elAvPlayer;

    function pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function nowTimeStr() {
        var d = new Date();
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }

    function escapeHtml(str) {
        return ('' + (str || '')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function addLog(msg) {
        diagEntries.unshift('[' + nowTimeStr() + '] ' + escapeHtml(msg));
        if (diagEntries.length > 13) diagEntries.length = 13;
        if (elDiagLog) elDiagLog.innerHTML = diagEntries.join('<br>');
    }

    function setSignalStatus(text, barsCount, colorHex) {
        currentStateText = text;
        if (elStatusText) elStatusText.textContent = text;
        if (elInfoState) elInfoState.textContent = 'Состояние: ' + text;
        if (elSignalBars) {
            var bars = elSignalBars.getElementsByTagName('span');
            for (var i = 0; i < bars.length; i++) {
                bars[i].style.backgroundColor = (i < barsCount) ? colorHex : 'rgba(255,255,255,0.22)';
            }
        }
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

    function showOsd(ch, extraText) {
        if (!elOsdBar || !ch) return;
        var favMark = isFavorite(ch.url) ? '★ ' : '';
        elOsdName.textContent = favMark + ch.name;
        elOsdMeta.textContent = ch.category + '  •  ' + (extraText || currentResText);
        elOsdBar.className = 'panel';
        if (osdTimer) clearTimeout(osdTimer);
        osdTimer = setTimeout(function () {
            elOsdBar.className = 'panel hidden';
        }, 4200);
    }

    function resetSideAutoHide() {
        if (autoHideSideTimer) clearTimeout(autoHideSideTimer);
        if (isSideVisible) {
            autoHideSideTimer = setTimeout(function () {
                setSideVisible(false);
            }, 15000);
        }
    }

    function updateClock() {
        var d = new Date();
        if (elClock) elClock.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    // =========================================================================
    // Storage helpers
    // =========================================================================
    function saveJson(key, val) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
            }
        } catch (e) {}
    }

    function loadJson(key, fallback) {
        try {
            if (window.localStorage) {
                var raw = window.localStorage.getItem(STORAGE_PREFIX + key);
                if (raw) return JSON.parse(raw);
            }
        } catch (e) {}
        return fallback;
    }

    function isFavorite(url) {
        return !!favoritesMap[url];
    }

    function countFavorites() {
        var c = 0;
        for (var i = 0; i < allChannels.length; i++) {
            if (favoritesMap[allChannels[i].url]) c++;
        }
        return c;
    }

    function toggleFavorite(ch) {
        if (!ch) return;
        if (favoritesMap[ch.url]) {
            delete favoritesMap[ch.url];
            showToast('Убрано из Избранного: ' + ch.name, 2000);
        } else {
            favoritesMap[ch.url] = true;
            showToast('★ В Избранном: ' + ch.name, 2000);
        }
        saveJson('favorites', favoritesMap);
        rebuildDisplayedChannels();
        if (isSideVisible) renderSideList();
        updateInfoPanel();
    }

    // =========================================================================
    // Filtering, Categorization, Quality Deduplication
    // =========================================================================
    function normalizeHomoglyphs(s) {
        return s.replace(/с/g, 'c').replace(/а/g, 'a').replace(/е/g, 'e').replace(/о/g, 'o').replace(/т/g, 't').replace(/к/g, 'k');
    }

    function isBlockedCast(name, url, group) {
        var combined = ((name || '') + ' ' + (url || '') + ' ' + (group || '')).toLowerCase();
        if (combined.indexOf('catcast') !== -1 || combined.indexOf('cat-cast') !== -1 ||
            combined.indexOf('cat_cast') !== -1 || combined.indexOf('каст') !== -1 ||
            combined.indexOf('кэст') !== -1 || combined.indexOf('kast') !== -1) {
            return true;
        }
        var cleaned = combined.replace(RE_SAFE_BROADCAST, ' ');
        if (cleaned.indexOf('cast') !== -1) return true;
        var homo = normalizeHomoglyphs(combined).replace(RE_SAFE_BROADCAST, ' ');
        return homo.indexOf('cast') !== -1;
    }

    function isArabicOrIndian(name, group, url) {
        var s = (name || '') + ' ' + (group || '');
        if (ARABIC_INDIAN_RE.test(s)) return true;
        var low = (s + ' ' + (url || '')).toLowerCase();
        if (low.indexOf('arabic') !== -1 || low.indexOf('bollywood') !== -1 || low.indexOf('bhojpuri') !== -1 ||
            low.indexOf('telugu') !== -1 || low.indexOf('tamil') !== -1 || low.indexOf('punjabi') !== -1 ||
            low.indexOf('urdu') !== -1 || low.indexOf('qatar') !== -1 || low.indexOf('saudi') !== -1) {
            return true;
        }
        return false;
    }

    function isFilteredOther(name, category, url) {
        if (category !== 'Прочее') return false;
        var n = (name || '').toLowerCase();
        var u = (url || '').split('#')[0].toLowerCase();
        if (n.indexOf('|') !== -1) return true;
        var i;
        for (i = 0; i < POLITICAL_OTHER.length; i++) {
            if (n.indexOf(POLITICAL_OTHER[i]) !== -1) return true;
        }
        for (i = 0; i < REGIONAL_OTHER.length; i++) {
            if (n.indexOf(REGIONAL_OTHER[i]) !== -1 || u.indexOf(REGIONAL_OTHER[i]) !== -1) return true;
        }
        return false;
    }

    function mapCategory(rawGroup, name) {
        var g = (rawGroup || '').toLowerCase();
        var n = (name || '').toLowerCase();
        if (n.indexOf('4k') !== -1 || n.indexOf('uhd') !== -1 || n.indexOf('2160') !== -1 || n.indexOf('2k') !== -1 || g.indexOf('4k') !== -1 || g.indexOf('uhd') !== -1) {
            return '2K';
        }
        if (g.indexOf('кино') !== -1 || g.indexOf('movie') !== -1 || g.indexOf('cinema') !== -1 || g.indexOf('сериал') !== -1 || g.indexOf('film') !== -1 ||
            n.indexOf('кино') !== -1 || n.indexOf('cinema') !== -1 || n.indexOf('film') !== -1 || n.indexOf('дорама') !== -1 || n.indexOf('кинеко') !== -1) {
            return 'Кино и сериалы';
        }
        if (g.indexOf('спорт') !== -1 || g.indexOf('sport') !== -1 || g.indexOf('футбол') !== -1 ||
            n.indexOf('матч') !== -1 || n.indexOf('sport') !== -1 || n.indexOf('спорт') !== -1 || n.indexOf('кхл') !== -1 || n.indexOf('футбол') !== -1 || n.indexOf('setanta') !== -1 || n.indexOf('eurosport') !== -1) {
            return 'Спорт';
        }
        if (g.indexOf('детск') !== -1 || g.indexOf('мульт') !== -1 || g.indexOf('kids') !== -1 || g.indexOf('cartoon') !== -1 ||
            n.indexOf('мульт') !== -1 || n.indexOf('детск') !== -1 || n.indexOf('карусель') !== -1 || n.indexOf('disney') !== -1 || n.indexOf('nickelodeon') !== -1 || n.indexOf('gulli') !== -1) {
            return 'Детские';
        }
        if (g.indexOf('музык') !== -1 || g.indexOf('music') !== -1 || g.indexOf('радио') !== -1 ||
            n.indexOf('music') !== -1 || n.indexOf('музык') !== -1 || n.indexOf('mtv') !== -1 || n.indexOf('bridge') !== -1 || n.indexOf('stingray') !== -1 || n.indexOf('eska') !== -1 || n.indexOf('europa plus') !== -1 || n.indexOf('шансон') !== -1 || n.indexOf('ru.tv') !== -1 || n.indexOf('kiss tv') !== -1) {
            return 'Музыка';
        }
        if (g.indexOf('познав') !== -1 || g.indexOf('наук') !== -1 || g.indexOf('докум') !== -1 || g.indexOf('природ') !== -1 || g.indexOf('documentary') !== -1 ||
            n.indexOf('discovery') !== -1 || n.indexOf('national geo') !== -1 || n.indexOf('история') !== -1 || n.indexOf('наука') !== -1 || n.indexOf('живая планета') !== -1 || n.indexOf('бобёр') !== -1 || n.indexOf('бобер') !== -1) {
            return 'Познавательные';
        }
        if (g.indexOf('новост') !== -1 || g.indexOf('общ') !== -1 || g.indexOf('федер') !== -1 || g.indexOf('news') !== -1 || g.indexOf('general') !== -1 ||
            n.indexOf('первый канал') !== -1 || n.indexOf('россия 1') !== -1 || n.indexOf('нтв') !== -1 || n.indexOf('беларусь 24') !== -1 || n.indexOf('рен тв') !== -1 || n.indexOf('пятый канал') !== -1 || n.indexOf('отр') !== -1) {
            return 'Новости и общие';
        }
        if (g.indexOf('развлеч') !== -1 || g.indexOf('юмор') !== -1 || g.indexOf('entertain') !== -1 ||
            n.indexOf('тнт') !== -1 || n.indexOf('стс') !== -1 || n.indexOf('пятница') !== -1 || n.indexOf('тв-3') !== -1 || n.indexOf('тв3') !== -1 || n.indexOf('суббота') !== -1 || n.indexOf('ю ') !== -1) {
            return 'Развлечения';
        }
        return 'Прочее';
    }

    function normalizeKey(str) {
        return (str || '').toLowerCase().replace(/[^a-zа-яё0-9]+/g, '');
    }

    function canonicalDedupKey(rawName, category) {
        var s = (rawName || '').toLowerCase().replace(/^\s+|\s+$/g, '');
        s = s.replace(RE_BRACKET_META, ' ');
        s = s.replace(RE_QUALITY_TOKEN, ' ');
        if (category === 'Спорт') {
            s = s.replace(RE_SPORT_COUNTRY, ' ');
        }
        var key = normalizeKey(s);
        return key || normalizeKey(rawName);
    }

    function scoreChannelForTizen(ch, isCurated) {
        var n = (ch.name || '').toLowerCase();
        var u = (ch.url || '').split('#')[0].toLowerCase();
        var score = 0;

        if (n.indexOf('4k') !== -1 || n.indexOf('uhd') !== -1 || n.indexOf('2160') !== -1) score += 420;
        else if (n.indexOf('1080') !== -1 || n.indexOf('fhd') !== -1 || n.indexOf('full hd') !== -1) score += 320;
        else if (n.indexOf('hd') !== -1 || n.indexOf('хд') !== -1 || n.indexOf('720') !== -1) score += 220;
        else if (n.indexOf('576') !== -1 || n.indexOf('540') !== -1) score += 120;
        else if (n.indexOf('360') !== -1 || n.indexOf('240') !== -1) score -= 40;
        else score += 100;

        // Tizen 2.4.0 SSL preference: HTTP and verified classic-SSL CDNs score higher
        if (u.indexOf('http://') === 0) score += 95;
        if (u.indexOf('beltelecom.by') !== -1 || u.indexOf('lotus.stingray.com') !== -1 ||
            u.indexOf('cdn.ntv.ru') !== -1 || u.indexOf('uplink.kz') !== -1 ||
            u.indexOf('cinerama.uz') !== -1 || u.indexOf('merlive.am') !== -1) {
            score += 60;
        }
        if (u.indexOf('.m3u8') !== -1 || u.indexOf('hls') !== -1) score += 30;
        if (isCurated) score += 70;

        if (ch.category === 'Спорт') {
            var hasCountry = RE_SPORT_COUNTRY.test(n);
            RE_SPORT_COUNTRY.lastIndex = 0;
            if (!hasCountry || n.indexOf('рус') !== -1 || n.indexOf('russia') !== -1) score += 160;
            else if (n.indexOf(' uk') !== -1 || n.indexOf('international') !== -1) score += 50;
            else score -= 45;
        }

        if (u.indexOf('176.118.197.101') !== -1 || u.indexOf('31.210.208.171') !== -1 ||
            u.indexOf('bonus-tv.ru') !== -1 || u.indexOf('stitch.teletarget.ru') !== -1) {
            score -= 90;
        }
        return score;
    }

    function cleanDisplayName(raw) {
        var s = (raw || '').replace(/^\s+|\s+$/g, '').replace(RE_TRAILING_DUP, '').replace(/^\s+|\s+$/g, '');
        return s || raw || 'Канал';
    }

    function extractTwoLetters(name) {
        var clean = (name || '').replace(/[^a-zA-Zа-яА-ЯёЁ0-9 ]/g, ' ').replace(/^\s+|\s+$/g, '');
        var parts = clean.split(/\s+/);
        var raw = 'TV';
        if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
            raw = parts[0].charAt(0) + parts[1].charAt(0);
        } else if (parts.length >= 1 && parts[0].length > 0) {
            raw = parts[0].substr(0, 2);
        }
        return raw.toUpperCase();
    }

    function badgeColorFor(name) {
        var h = 0;
        var s = name || '';
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h = h & h;
        }
        return BADGE_COLORS[Math.abs(h) % BADGE_COLORS.length];
    }

    function parseM3uText(text) {
        var result = [];
        var lines = (text || '').split(/\r?\n/);
        var pendingInf = '';
        var pendingGroup = '';
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/^\s+|\s+$/g, '');
            if (!line) continue;
            if (line.indexOf('#EXTINF') === 0) {
                pendingInf = line;
                pendingGroup = '';
                var gm = line.match(/group-title="([^"]*)"/i);
                if (gm && gm[1]) pendingGroup = gm[1];
            } else if (line.indexOf('#EXTGRP:') === 0) {
                pendingGroup = line.substr(8).replace(/^\s+|\s+$/g, '');
            } else if (line.indexOf('http://') === 0 || line.indexOf('https://') === 0) {
                if (pendingInf && !isBlockedCast(pendingInf, line, pendingGroup)) {
                    var commaIdx = pendingInf.lastIndexOf(',');
                    var rawName = commaIdx !== -1 ? pendingInf.substr(commaIdx + 1).replace(/^\s+|\s+$/g, '') : 'Канал';
                    if (rawName && !isArabicOrIndian(rawName, pendingGroup, line)) {
                        var cat = mapCategory(pendingGroup, rawName);
                        if (!isFilteredOther(rawName, cat, line)) {
                            result.push({
                                name: cleanDisplayName(rawName),
                                category: cat,
                                url: line.split('#')[0].replace(/^\s+|\s+$/g, '')
                            });
                        }
                    }
                }
                pendingInf = '';
                pendingGroup = '';
            }
        }
        return result;
    }

    function buildCatalogFromCandidates(candidates) {
        var bestByKey = {};
        var orderedKeys = [];
        var seenUrls = {};
        var mirrorBucket = {};
        var i, item, ch, isCurated, cleanUrl, urlLow, canonKey, score, dedupKey, existing;

        for (i = 0; i < candidates.length; i++) {
            item = candidates[i];
            ch = item.ch;
            isCurated = !!item.curated;
            if (!ch || !ch.url || !ch.name) continue;
            if (isBlockedCast(ch.name, ch.url, ch.category)) continue;
            if (isFilteredOther(ch.name, ch.category, ch.url)) continue;

            cleanUrl = ch.url.split('#')[0].replace(/^\s+|\s+$/g, '');
            urlLow = cleanUrl.toLowerCase();
            if (!urlLow || seenUrls[urlLow]) continue;
            seenUrls[urlLow] = true;

            canonKey = canonicalDedupKey(ch.name, ch.category);
            score = scoreChannelForTizen(ch, isCurated);

            if (canonKey) {
                if (!mirrorBucket[canonKey]) mirrorBucket[canonKey] = [];
                mirrorBucket[canonKey].push({ url: cleanUrl, score: score });
            }

            dedupKey = canonKey + '_' + ch.category;
            existing = bestByKey[dedupKey];
            if (!existing) {
                bestByKey[dedupKey] = {
                    ch: {
                        name: cleanDisplayName(ch.name),
                        category: ch.category,
                        url: cleanUrl,
                        canonKey: canonKey,
                        code: extractTwoLetters(ch.name),
                        badgeColor: badgeColorFor(ch.name)
                    },
                    score: score
                };
                orderedKeys.push(dedupKey);
            } else if (score > existing.score) {
                existing.ch = {
                    name: cleanDisplayName(ch.name),
                    category: ch.category,
                    url: cleanUrl,
                    canonKey: canonKey,
                    code: extractTwoLetters(ch.name),
                    badgeColor: badgeColorFor(ch.name)
                };
                existing.score = score;
            }
        }

        // Build sorted backup mirrors map (max 6 per channel)
        var newMirrors = {};
        for (var mk in mirrorBucket) {
            if (!mirrorBucket.hasOwnProperty(mk)) continue;
            var arr = mirrorBucket[mk];
            arr.sort(function (a, b) { return b.score - a.score; });
            var urls = [];
            for (var j = 0; j < arr.length && urls.length < 6; j++) {
                if (urls.indexOf(arr[j].url) === -1) urls.push(arr[j].url);
            }
            newMirrors[mk] = urls;
        }
        mirrorsMap = newMirrors;

        var finalList = [];
        for (i = 0; i < orderedKeys.length; i++) {
            finalList.push(bestByKey[orderedKeys[i]].ch);
        }
        return finalList;
    }

    function getChannelsForCategory(catName) {
        var out = [];
        var i;
        if (catName === '★ Избранное') {
            for (i = 0; i < allChannels.length; i++) {
                if (favoritesMap[allChannels[i].url]) out.push(allChannels[i]);
            }
        } else if (catName === 'Все каналы') {
            for (i = 0; i < allChannels.length; i++) out.push(allChannels[i]);
        } else {
            for (i = 0; i < allChannels.length; i++) {
                if (allChannels[i].category === catName) out.push(allChannels[i]);
            }
        }
        return out;
    }

    function rebuildDisplayedChannels() {
        displayedChannels = getChannelsForCategory(activeCategory);
        if (focusedChannelIdx >= displayedChannels.length) {
            focusedChannelIdx = Math.max(0, displayedChannels.length - 1);
        }
    }

    function fetchUrlText(url, timeoutMs, cb) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = timeoutMs || 8000;
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                        cb(null, xhr.responseText);
                    } else {
                        cb('HTTP ' + xhr.status, null);
                    }
                }
            };
            xhr.ontimeout = function () { cb('timeout', null); };
            xhr.onerror = function () { cb('net/ssl', null); };
            xhr.send(null);
        } catch (e) {
            cb(e.message || 'xhr err', null);
        }
    }

    function loadOpenCatalogInBackground(manualTrigger) {
        if (isCatalogLoading) return;
        isCatalogLoading = true;
        if (manualTrigger) showToast('Обновление открытого каталога...', 2200);
        addLog('Загрузка открытых источников (' + OPEN_SOURCES.length + ')...');

        var results = [];
        var completed = 0;
        var okSources = 0;
        var fetchedStreams = 0;

        function finishAll() {
            isCatalogLoading = false;
            if (fetchedStreams === 0) {
                addLog('Сеть: 0 потоков (оставлена встроенная база)');
                if (manualTrigger) showToast('Внешние источники недоступны (Tizen SSL) — работает база', 3000);
                return;
            }
            var candidates = [];
            var i, j;
            for (i = 0; i < BUILTIN_CHANNELS.length; i++) {
                candidates.push({ ch: BUILTIN_CHANNELS[i], curated: true });
            }
            for (i = 0; i < results.length; i++) {
                var list = results[i];
                if (!list) continue;
                for (j = 0; j < list.length; j++) {
                    candidates.push({ ch: list[j], curated: false });
                }
            }
            allChannels = buildCatalogFromCandidates(candidates);
            rebuildDisplayedChannels();

            // Cache compact slice in localStorage (up to 600 channels so Tizen 2.4 storage never overflows)
            var compact = [];
            for (i = 0; i < allChannels.length && i < 600; i++) {
                compact.push({
                    n: allChannels[i].name,
                    c: allChannels[i].category,
                    u: allChannels[i].url
                });
            }
            saveJson('cached_catalog', compact);

            addLog('Каталог: ' + okSources + '/' + OPEN_SOURCES.length + ' ист. -> ' + allChannels.length + ' кан.');
            if (manualTrigger) showToast('Каталог обновлён: ' + allChannels.length + ' каналов', 2600);
            if (isSideVisible) renderSideList();
            updateInfoPanel();
        }

        function requestSource(idx) {
            var srcUrl = OPEN_SOURCES[idx];
            var shortName = srcUrl.replace(/^https?:\/\//, '').substr(0, 30);
            fetchUrlText(srcUrl, 8500, function (err, text) {
                if (!err && text) {
                    var parsed = parseM3uText(text);
                    results[idx] = parsed;
                    if (parsed.length > 0) {
                        okSources++;
                        fetchedStreams += parsed.length;
                    }
                    addLog('SRC OK ' + shortName + ' (' + parsed.length + ')');
                } else {
                    results[idx] = null;
                    addLog('SRC FAIL ' + shortName + ' [' + err + ']');
                }
                completed++;
                if (completed >= OPEN_SOURCES.length) {
                    finishAll();
                }
            });
        }

        for (var s = 0; s < OPEN_SOURCES.length; s++) {
            requestSource(s);
        }
    }

    // =========================================================================
    // Side Panel Rendering (Windowed for instant 60fps on Tizen 2.4)
    // =========================================================================
    function renderSideList() {
        if (!elSideList) return;
        elTabGroups.className = 'side-tab' + (isSideInGroups ? ' active' : '');
        elTabChannels.className = 'side-tab' + (!isSideInGroups ? ' active' : '');
        elSideGroupCaption.textContent = activeCategory;

        var html = '';
        var i, start, end;

        if (isSideInGroups) {
            if (elSideCounter) elSideCounter.textContent = (focusedGroupIdx + 1) + ' / ' + CATEGORIES.length;
            start = Math.max(0, Math.min(focusedGroupIdx - Math.floor(VISIBLE_ROWS / 2), CATEGORIES.length - VISIBLE_ROWS));
            if (start < 0) start = 0;
            end = Math.min(CATEGORIES.length, start + VISIBLE_ROWS);

            for (i = start; i < end; i++) {
                var catName = CATEGORIES[i];
                var cnt = getChannelsForCategory(catName).length;
                var cls = 'list-row' + (i === focusedGroupIdx ? ' focused' : '');
                var mark = (catName === activeCategory) ? '<span class="row-play-mark">●</span>' : '';
                html += '<div class="' + cls + '">' +
                    mark + escapeHtml(catName) +
                    '<span class="row-right">' + cnt + '</span>' +
                    '</div>';
            }
            elSideList.innerHTML = html;
            return;
        }

        var list = displayedChannels;
        if (list.length === 0) {
            if (elSideCounter) elSideCounter.textContent = '0 / 0';
            var msg = (activeCategory === '★ Избранное')
                ? 'Избранных каналов пока нет.<br>Нажмите жёлтую кнопку на пульте (или 0),<br>чтобы добавить канал в ★ Избранное.'
                : 'В этой группе пока нет каналов.<br>Нажмите ◀ чтобы выбрать другую группу.';
            elSideList.innerHTML = '<div class="empty-hint">' + msg + '</div>';
            return;
        }

        if (focusedChannelIdx < 0) focusedChannelIdx = 0;
        if (focusedChannelIdx >= list.length) focusedChannelIdx = list.length - 1;
        if (elSideCounter) elSideCounter.textContent = (focusedChannelIdx + 1) + ' / ' + list.length;

        start = Math.max(0, Math.min(focusedChannelIdx - Math.floor(VISIBLE_ROWS / 2), list.length - VISIBLE_ROWS));
        if (start < 0) start = 0;
        end = Math.min(list.length, start + VISIBLE_ROWS);

        for (i = start; i < end; i++) {
            var ch = list[i];
            var isCur = (currentChannel && currentChannel.url === ch.url);
            var rowCls = 'list-row' + (i === focusedChannelIdx ? ' focused' : '');
            var playMark = isCur ? '<span class="row-play-mark">▶</span>' : '';
            var favHtml = isFavorite(ch.url) ? '<span class="fav-star">★</span>' : '';
            var proto = (ch.url.indexOf('https://') === 0) ? 'HTTPS' : 'HTTP';
            var badgeStyle = (i === focusedChannelIdx) ? '' : (' style="background-color:' + ch.badgeColor + ';"');

            html += '<div class="' + rowCls + '">' +
                '<span class="row-badge"' + badgeStyle + '>' + escapeHtml(ch.code) + '</span>' +
                playMark + escapeHtml(ch.name) +
                '<span class="row-right"><span class="proto-tag">' + proto + '</span>' + favHtml + '</span>' +
                '</div>';
        }
        elSideList.innerHTML = html;
    }

    function setSideVisible(visible, openInGroups) {
        isSideVisible = visible;
        if (typeof openInGroups === 'boolean') isSideInGroups = openInGroups;
        if (elSidePanel) {
            elSidePanel.className = visible ? 'panel' : 'panel hidden';
        }
        if (visible) {
            if (!isSideInGroups && currentChannel) {
                for (var i = 0; i < displayedChannels.length; i++) {
                    if (displayedChannels[i].url === currentChannel.url) {
                        focusedChannelIdx = i;
                        break;
                    }
                }
            }
            focusedGroupIdx = Math.max(0, CATEGORIES.indexOf(activeCategory));
            renderSideList();
            resetSideAutoHide();
        } else if (autoHideSideTimer) {
            clearTimeout(autoHideSideTimer);
        }
    }

    function setInfoVisible(visible) {
        isInfoVisible = visible;
        if (elInfoPanel) elInfoPanel.className = visible ? 'panel' : 'panel hidden';
        if (visible) updateInfoPanel();
    }

    function updateInfoPanel() {
        if (elInfoCh) elInfoCh.textContent = 'Канал: ' + (currentChannel ? currentChannel.name : '—');
        if (elInfoGroup) elInfoGroup.textContent = 'Группа: ' + (currentChannel ? currentChannel.category : '—');
        if (elInfoRes) elInfoRes.textContent = 'Разрешение: ' + currentResText;
        var protoTxt = '—';
        if (activeStreamUrl) {
            var p = (activeStreamUrl.indexOf('https://') === 0) ? 'HTTPS' : 'HTTP';
            var totalMir = activeMirrorUrls.length;
            protoTxt = p + (totalMir > 1 ? ('  •  Поток ' + (activeMirrorIdx + 1) + ' из ' + totalMir) : '');
        }
        if (elInfoProto) elInfoProto.textContent = 'Поток: ' + protoTxt;
        if (elInfoState) elInfoState.textContent = 'Состояние: ' + currentStateText;
        if (elInfoCatalog) {
            elInfoCatalog.textContent = 'Каталог: ' + allChannels.length + ' кан.  •  ★ Избр.: ' + countFavorites();
        }
    }

    // =========================================================================
    // Samsung AVPlay Engine with HTTPS -> HTTP Fallback & Mirror Cycling
    // =========================================================================
    function buildAttemptQueueForChannel(ch) {
        var list = [];
        function pushUnique(u) {
            if (u && list.indexOf(u) === -1) list.push(u);
        }
        pushUnique(ch.url);
        // Immediate HTTP fallback for HTTPS streams (critical on Tizen 2.4.0 SSL)
        if (ch.url.indexOf('https://') === 0) {
            pushUnique('http://' + ch.url.substr(8));
        }
        var mirrors = mirrorsMap[ch.canonKey] || [];
        var i;
        // Prefer HTTP mirrors first, then HTTPS mirrors
        for (i = 0; i < mirrors.length; i++) {
            if (mirrors[i].indexOf('http://') === 0) pushUnique(mirrors[i]);
        }
        for (i = 0; i < mirrors.length; i++) {
            pushUnique(mirrors[i]);
        }
        return list;
    }

    function stopPlayback() {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
        bufferingSinceMs = 0;
        if (hasAvPlay) {
            try {
                var st = webapis.avplay.getState();
                if (st !== 'NONE' && st !== 'IDLE') webapis.avplay.stop();
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
                            updateInfoPanel();
                            return;
                        }
                    }
                }
            }
        } catch (e) {}
    }

    function scheduleNextMirrorOrRetry(reason) {
        if (!currentChannel) return;
        retryCount++;
        var maxTries = Math.min(Math.max(activeMirrorUrls.length, 2), 6);
        if (retryCount > maxTries) {
            setSignalStatus('Нет сигнала', 1, '#EF4444');
            addLog('Лимит попыток (' + maxTries + ') исчерпан');
            showToast('Канал недоступен (' + reason + ')', 2600);
            return;
        }
        if (activeMirrorIdx + 1 < activeMirrorUrls.length) {
            activeMirrorIdx++;
            var nextUrl = activeMirrorUrls[activeMirrorIdx];
            var isHttpFallback = (activeStreamUrl.indexOf('https://') === 0 && nextUrl.indexOf('http://') === 0);
            addLog((isHttpFallback ? 'Откат HTTPS→HTTP: ' : 'Зеркало #' + (activeMirrorIdx + 1) + ': ') + nextUrl.substr(0, 44));
            retryTimer = setTimeout(function () {
                openUrlInPlayer(nextUrl);
            }, 350);
        } else {
            addLog('Повтор потока #' + retryCount + '...');
            retryTimer = setTimeout(function () {
                openUrlInPlayer(activeStreamUrl);
            }, 1200);
        }
    }

    function openUrlInPlayer(url) {
        activeStreamUrl = url;
        lastSwitchMs = new Date().getTime();
        bufferingSinceMs = lastSwitchMs;
        currentResText = 'Анализ...';
        setSignalStatus('Буферизация...', 2, '#F59E0B');
        updateInfoPanel();

        stopPlayback();
        bufferingSinceMs = new Date().getTime();

        if (hasAvPlay) {
            try {
                webapis.avplay.open(url);
                try { webapis.avplay.setDisplayRect(0, 0, 1920, 1080); } catch (e1) {}
                try { webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN'); } catch (e2) {}
                try { webapis.avplay.setStreamingProperty('USER_AGENT', DEFAULT_UA); } catch (e3) {}
                try { webapis.avplay.setTimeoutForBuffering(10); } catch (e4) {}
                try { webapis.avplay.setBufferingParam('PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 3); } catch (e5) {}
                try { webapis.avplay.setBufferingParam('PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4); } catch (e6) {}

                webapis.avplay.setListener({
                    onbufferingstart: function () {
                        bufferingSinceMs = new Date().getTime();
                        setSignalStatus('Буферизация...', 2, '#F59E0B');
                    },
                    onbufferingprogress: function (percent) {
                        setSignalStatus('Буфер ' + percent + '%', 2, '#F59E0B');
                    },
                    onbufferingcomplete: function () {
                        bufferingSinceMs = 0;
                        retryCount = 0;
                        setSignalStatus('Эфир', 4, '#22C55E');
                        refreshAvPlayResolution();
                        showOsd(currentChannel, currentResText);
                    },
                    onstreamcompleted: function () {
                        addLog('Поток завершён, переподключение...');
                        scheduleNextMirrorOrRetry('END');
                    },
                    oncurrentplaytime: function () {
                        bufferingSinceMs = 0;
                        if (currentResText === 'Анализ...') refreshAvPlayResolution();
                    },
                    onerror: function (errType) {
                        addLog('AVPlay ERR: ' + errType);
                        scheduleNextMirrorOrRetry(errType);
                    }
                });

                webapis.avplay.prepareAsync(
                    function () {
                        try {
                            webapis.avplay.play();
                            bufferingSinceMs = 0;
                            retryCount = 0;
                            setSignalStatus('Эфир', 4, '#22C55E');
                            refreshAvPlayResolution();
                            addLog('OK play(): ' + (url.indexOf('https://') === 0 ? 'HTTPS' : 'HTTP'));
                        } catch (ePlay) {
                            addLog('play() err: ' + ePlay.message);
                            scheduleNextMirrorOrRetry('PLAY_ERR');
                        }
                    },
                    function (err) {
                        var msg = (err && err.message) ? err.message : ('' + err);
                        addLog('prepareAsync FAIL: ' + msg);
                        scheduleNextMirrorOrRetry(msg);
                    }
                );
            } catch (ex) {
                addLog('AVPlay exc: ' + ex.message);
                scheduleNextMirrorOrRetry('EXC');
            }
        } else if (elHtml5Player) {
            elHtml5Player.src = url;
            elHtml5Player.onplaying = function () {
                bufferingSinceMs = 0;
                currentResText = (elHtml5Player.videoWidth || 0) + 'x' + (elHtml5Player.videoHeight || 0);
                setSignalStatus('Эфир', 4, '#22C55E');
                updateInfoPanel();
            };
            elHtml5Player.onerror = function () {
                setSignalStatus('Ошибка HTML5', 1, '#EF4444');
                addLog('HTML5 error (нужен ТВ AVPlay)');
            };
            try { elHtml5Player.play(); } catch (eH) {}
        }
    }

    function playChannelObj(ch, saveLast) {
        if (!ch) return;
        if (currentChannel && currentChannel.url !== ch.url) {
            previousChannel = currentChannel;
        }
        currentChannel = ch;
        activeMirrorUrls = buildAttemptQueueForChannel(ch);
        activeMirrorIdx = 0;
        retryCount = 0;

        if (saveLast !== false) {
            saveJson('last_channel', {
                url: ch.url,
                name: ch.name,
                category: activeCategory
            });
        }

        addLog('Пуск: ' + ch.name + ' (зеркал: ' + activeMirrorUrls.length + ')');
        showOsd(ch, 'Подключение...');
        if (isSideVisible && !isSideInGroups) renderSideList();
        openUrlInPlayer(activeMirrorUrls[0]);
    }

    function switchChannelOffset(delta) {
        if (displayedChannels.length === 0) return;
        var idx = -1;
        if (currentChannel) {
            for (var i = 0; i < displayedChannels.length; i++) {
                if (displayedChannels[i].url === currentChannel.url) {
                    idx = i;
                    break;
                }
            }
        }
        var nextIdx = (idx === -1) ? 0 : (idx + delta + displayedChannels.length) % displayedChannels.length;
        focusedChannelIdx = nextIdx;
        playChannelObj(displayedChannels[nextIdx], true);
    }

    function switchNextMirrorManually() {
        if (!currentChannel || activeMirrorUrls.length <= 1) {
            showToast('У этого канала нет других зеркал', 1800);
            return;
        }
        activeMirrorIdx = (activeMirrorIdx + 1) % activeMirrorUrls.length;
        retryCount = 0;
        var nextUrl = activeMirrorUrls[activeMirrorIdx];
        var proto = (nextUrl.indexOf('https://') === 0) ? 'HTTPS' : 'HTTP';
        showToast('Зеркало ' + (activeMirrorIdx + 1) + '/' + activeMirrorUrls.length + ' (' + proto + ')', 2000);
        addLog('Ручное зеркало #' + (activeMirrorIdx + 1) + ': ' + proto);
        openUrlInPlayer(nextUrl);
    }

    // Watchdog for stalled buffering (> 14 seconds)
    function watchdogTick() {
        if (!hasAvPlay || !currentChannel || bufferingSinceMs <= 0) return;
        var now = new Date().getTime();
        if (now - bufferingSinceMs > 14000) {
            bufferingSinceMs = 0;
            addLog('Watchdog: зависание буфера > 14с');
            scheduleNextMirrorOrRetry('STALL');
        }
    }

    // =========================================================================
    // Remote Control Handling
    // =========================================================================
    function registerSamsungKeys() {
        try {
            if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
                var keys = [
                    'ChannelUp', 'ChannelDown', 'Info',
                    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
                    'MediaPlay', 'MediaPause', 'MediaStop', 'MediaPlayPause',
                    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
                ];
                for (var i = 0; i < keys.length; i++) {
                    try { tizen.tvinputdevice.registerKey(keys[i]); } catch (eK) {}
                }
                addLog('Клавиши пульта Samsung подключены');
            }
        } catch (e) {}
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
        // Up=38, Down=40, Left=37, Right=39, OK=13
        // Back=10009 (Esc=27, Backspace=8), Exit=10182, Info=457
        // Ch+=427, Ch-=428, PreCh=10190
        // Red=403, Green=404, Yellow=405, Blue=406, Key0=48
        if (isSideVisible) resetSideAutoHide();

        if (code === 38) { // UP
            e.preventDefault();
            if (isSideVisible) {
                if (isSideInGroups) {
                    focusedGroupIdx = (focusedGroupIdx - 1 + CATEGORIES.length) % CATEGORIES.length;
                } else if (displayedChannels.length > 0) {
                    focusedChannelIdx = (focusedChannelIdx - 1 + displayedChannels.length) % displayedChannels.length;
                }
                renderSideList();
            } else {
                switchChannelOffset(-1);
            }
        } else if (code === 40) { // DOWN
            e.preventDefault();
            if (isSideVisible) {
                if (isSideInGroups) {
                    focusedGroupIdx = (focusedGroupIdx + 1) % CATEGORIES.length;
                } else if (displayedChannels.length > 0) {
                    focusedChannelIdx = (focusedChannelIdx + 1) % displayedChannels.length;
                }
                renderSideList();
            } else {
                switchChannelOffset(+1);
            }
        } else if (code === 427) { // CH+ (Page Up in list / Next channel on live)
            e.preventDefault();
            if (isSideVisible && !isSideInGroups && displayedChannels.length > 0) {
                focusedChannelIdx = Math.max(0, focusedChannelIdx - VISIBLE_ROWS);
                renderSideList();
            } else {
                switchChannelOffset(+1);
            }
        } else if (code === 428) { // CH- (Page Down in list / Prev channel on live)
            e.preventDefault();
            if (isSideVisible && !isSideInGroups && displayedChannels.length > 0) {
                focusedChannelIdx = Math.min(displayedChannels.length - 1, focusedChannelIdx + VISIBLE_ROWS);
                renderSideList();
            } else {
                switchChannelOffset(-1);
            }
        } else if (code === 13) { // OK / ENTER
            e.preventDefault();
            if (isSideVisible) {
                if (isSideInGroups) {
                    activeCategory = CATEGORIES[focusedGroupIdx];
                    focusedChannelIdx = 0;
                    rebuildDisplayedChannels();
                    isSideInGroups = false;
                    renderSideList();
                } else if (displayedChannels.length > 0) {
                    playChannelObj(displayedChannels[focusedChannelIdx], true);
                    setSideVisible(false);
                }
            } else {
                setInfoVisible(false);
                setSideVisible(true, false);
            }
        } else if (code === 37) { // LEFT
            e.preventDefault();
            if (isInfoVisible) {
                setInfoVisible(false);
            } else if (isSideVisible) {
                if (!isSideInGroups) {
                    isSideInGroups = true;
                    focusedGroupIdx = Math.max(0, CATEGORIES.indexOf(activeCategory));
                    renderSideList();
                } else {
                    setSideVisible(false);
                }
            } else {
                setSideVisible(true, false);
            }
        } else if (code === 39) { // RIGHT
            e.preventDefault();
            if (isSideVisible) {
                if (isSideInGroups) {
                    activeCategory = CATEGORIES[focusedGroupIdx];
                    focusedChannelIdx = 0;
                    rebuildDisplayedChannels();
                    isSideInGroups = false;
                    renderSideList();
                } else {
                    setSideVisible(false);
                }
            } else {
                setInfoVisible(!isInfoVisible);
            }
        } else if (code === 405 || code === 48) { // YELLOW or 0 -> Favorite toggle
            e.preventDefault();
            var targetFav = (isSideVisible && !isSideInGroups && displayedChannels.length > 0)
                ? displayedChannels[focusedChannelIdx]
                : currentChannel;
            if (targetFav) toggleFavorite(targetFav);
        } else if (code === 404) { // GREEN -> Switch mirror
            e.preventDefault();
            switchNextMirrorManually();
        } else if (code === 403) { // RED -> Reload open catalog
            e.preventDefault();
            loadOpenCatalogInBackground(true);
        } else if (code === 406 || code === 457 || code === 73) { // BLUE / INFO / 'i'
            e.preventDefault();
            setInfoVisible(!isInfoVisible);
        } else if (code === 10190) { // PRE-CH
            e.preventDefault();
            if (previousChannel) playChannelObj(previousChannel, true);
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
        addLog('Старт TiViLook v0.2: ' + sysDesc);

        if (!hasAvPlay && elHtml5Player && elAvPlayer) {
            elAvPlayer.style.display = 'none';
            elHtml5Player.style.display = 'block';
        }
    }

    function initApp() {
        elClock = document.getElementById('clock-badge');
        elSignalBars = document.getElementById('signal-bars');
        elStatusText = document.getElementById('status-text');
        elSidePanel = document.getElementById('side-panel');
        elSideCounter = document.getElementById('side-counter');
        elTabGroups = document.getElementById('tab-groups');
        elTabChannels = document.getElementById('tab-channels');
        elSideGroupCaption = document.getElementById('side-group-caption');
        elSideList = document.getElementById('side-list');
        elInfoPanel = document.getElementById('info-panel');
        elInfoCh = document.getElementById('info-ch');
        elInfoGroup = document.getElementById('info-group');
        elInfoRes = document.getElementById('info-res');
        elInfoProto = document.getElementById('info-proto');
        elInfoState = document.getElementById('info-state');
        elInfoCatalog = document.getElementById('info-catalog');
        elInfoEngine = document.getElementById('info-engine');
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
        setInterval(watchdogTick, 2000);
        detectPlatform();
        registerSamsungKeys();

        // Restore favorites & cached catalog
        favoritesMap = loadJson('favorites', {}) || {};
        var cachedRaw = loadJson('cached_catalog', []);
        var initCandidates = [];
        var i;
        for (i = 0; i < BUILTIN_CHANNELS.length; i++) {
            initCandidates.push({ ch: BUILTIN_CHANNELS[i], curated: true });
        }
        if (cachedRaw && cachedRaw.length) {
            for (i = 0; i < cachedRaw.length; i++) {
                if (cachedRaw[i] && cachedRaw[i].u && cachedRaw[i].n) {
                    initCandidates.push({
                        ch: { name: cachedRaw[i].n, category: cachedRaw[i].c || 'Прочее', url: cachedRaw[i].u },
                        curated: false
                    });
                }
            }
            addLog('Из кэша загружено: ' + cachedRaw.length + ' кан.');
        }

        allChannels = buildCatalogFromCandidates(initCandidates);

        // Restore last category & last channel
        var lastSaved = loadJson('last_channel', null);
        if (lastSaved && lastSaved.category && CATEGORIES.indexOf(lastSaved.category) !== -1) {
            activeCategory = lastSaved.category;
        }
        rebuildDisplayedChannels();
        if (displayedChannels.length === 0) {
            activeCategory = 'Все каналы';
            rebuildDisplayedChannels();
        }

        var startupCh = displayedChannels[0] || allChannels[0] || null;
        if (lastSaved && lastSaved.url) {
            for (i = 0; i < allChannels.length; i++) {
                if (allChannels[i].url === lastSaved.url) {
                    startupCh = allChannels[i];
                    break;
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown, false);

        // Hide splash after 1.5s, play last channel, and load fresh open catalog in background
        setTimeout(function () {
            if (elSplash) elSplash.className = 'hidden';
            if (startupCh) {
                playChannelObj(startupCh, false);
            }
            setTimeout(function () {
                loadOpenCatalogInBackground(false);
            }, 900);
        }, 1500);
    }

    window.addEventListener('load', initApp, false);
})();
