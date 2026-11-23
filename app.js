(function () {
    'use strict';

    var STORAGE_PREFIX = 'tivilook_tizen_v3_';
    var BUILTIN_PLAYLIST_ID = 'BUILTIN_MAIN';
    var VISIBLE_ROWS = 9;
    var SUBLIST_VISIBLE_ROWS = 6;
    var PREPARE_TIMEOUT_MS = 5500;
    var INITIAL_STALL_MS = 9000;
    var MIDSTREAM_STALL_MS = 12000;
    var DEFAULT_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1';

    var DEFAULT_CATEGORIES = [
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

    var BADGE_COLORS = [
        '#2B6ED2', '#18A086', '#EF7540', '#B82A6B',
        '#7C4DFF', '#0284C7', '#D97706', '#059669'
    ];

    // Domains verified to work natively over HTTPS on Tizen 2.4.0 (do not prefer synthetic http:// before them)
    var VERIFIED_TIZEN_HTTPS_HOSTS = [
        'lotus.stingray.com',
        'beltelecom.by',
        'cdn2.ntv.ru',
        'stream8.cinerama.uz',
        'cloudfront.net',
        'amagi.tv',
        'roku.com'
    ];

    var BUILTIN_CHANNELS = [
        // Новости и общие
        { name: 'НТВ HD', category: 'Новости и общие', url: 'http://cdn.ntv.ru/ntv-msk_hd/tracks-v1a1/mono.m3u8' },
        { name: 'НТВ (Прямой CDN)', category: 'Новости и общие', url: 'https://cdn2.ntv.ru/ntv0_hd/tracks-v1a1/mono.m3u8' },
        { name: 'Беларусь 24', category: 'Новости и общие', url: 'http://ott-7.sevstar.net/belarus24/index.m3u8' },
        { name: 'Беларусь 24 HD', category: 'Новости и общие', url: 'https://edge59.dc.beltelecom.by/ngtrk/_definst_/smil:belarus24/chunklist_w148744111_b5160000_sleng.m3u8' },
        { name: 'Беларусь РТР', category: 'Новости и общие', url: 'http://194.158.222.36:6105' },
        { name: 'Первый крымский', category: 'Новости и общие', url: 'http://80.245.112.27:18787/' },

        // Кино и сериалы
        { name: 'Дом кино Премиум', category: 'Кино и сериалы', url: 'http://fs.uplink.kz/dom_kino_premium/tracks-v1a1/mono.ts.m3u8?token=onlinetv' },
        { name: 'Дом кино International', category: 'Кино и сериалы', url: 'http://fs.uplink.kz/dom_kino/mono.m3u8?token=onlinetv' },
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
        { name: 'Киносерия', category: 'Кино и сериалы', url: 'http://fs.uplink.kz/kinoseria/mono.m3u8?token=onlinetv' },

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
        { name: 'Bridge Classic', category: 'Музыка', url: 'http://fs.uplink.kz/bridge_classic/mono.m3u8?token=onlinetv2' },
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
        { name: 'Mult International', category: 'Детские', url: 'http://fs.uplink.kz/mult/mono.m3u8?token=onlinetv' },
        { name: 'Детский мир', category: 'Детские', url: 'https://stream8.cinerama.uz/1033/tracks-v1a1/mono.m3u8' },

        // Познавательные
        { name: 'Бобёр', category: 'Познавательные', url: 'http://dmi3y-tv.online/hls/CH_BOBER.m3u8' },
        { name: 'История', category: 'Познавательные', url: 'https://stream8.cinerama.uz/1266/index.m3u8' },

        // Прочее
        { name: '#КтоКуда', category: 'Прочее', url: 'http://s7.merlive.am/ktokuda/index.m3u8' }
    ];

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

    var RE_SPORT_COUNTRY = /(?:^|[^a-zа-яё0-9])(czechia|czech|germany|deutschland|hungary|italy|italia|romania|spain|espana|united\s+kingdom|england|britain|bulgaria|poland|polska|france|netherlands|holland|greece|portugal|turkey|serbia|croatia|slovenia|slovakia|sweden|norway|denmark|finland|austria|switzerland|belgium|ireland|ukraine|belarus|kazakhstan|georgia|armenia|azerbaijan|estonia|latvia|lithuania|moldova|israel|usa|canada|australia|brazil|mexico|argentina|india|arabia|arabic|mena|europe|international|intl|asia|global|latam|baltic|nordic|balkans|cis|uk|de|pl|it|es|fr|ro|hu|bg|cz|sk|tr|nl|se|no|dk|fi|gr|pt|at|ch|be|ie|ua|by|kz|en|rs|hr|eu|чехия|германия|венгрия|италия|румыния|испания|болгария|польша|франция|турция|сербия|хорватия|греция|португалия|швеция|норвегия|дания|финляндия|австрия|бельгия|украина|беларусь|казахстан|европа)(?=$|[^a-zа-яё0-9])/gi;
    var RE_BRACKET_META = /[\(\[]\s*(\d{1,2}|2160p?|1440p?|1080[pi]?|720p?|576[pi]?|540p?|480p?|360p?|240p?|4k|2k|uhd|fhd|full\s*hd|hd|хд|hq|sd|orig|оригинал|резерв|прямой(?:\s+cdn)?|geo[- ]?blocked|not\s*24\/7)\s*[\)\]]/gi;
    var RE_QUALITY_TOKEN = /(?:^|[\s\-_|\/])(2160p?|1440p?|1080[pi]?|720p?|576[pi]?|540p?|480p?|360p?|240p?|4k|2k|uhd|fhd|full\s*hd|fullhd|hd|хд|hq|sd|orig|оригинал|резерв)(?=$|[\s\-_|\/])/gi;
    var RE_TRAILING_DUP = /\s*[\(\[]\s*\d{1,2}\s*[\)\]]\s*$/g;
    var RE_SAFE_BROADCAST = /broadcast[a-z]*/gi;
    var ARABIC_INDIAN_RE = /[\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/;

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

    // Playlists & Channels State
    var hasAvPlay = false;
    var userPlaylists = []; // [{ id, title, type: 'url'|'usb', source }]
    var activePlaylistId = BUILTIN_PLAYLIST_ID;
    var playlistLoadGen = 0;

    var allChannels = [];
    var currentCategories = DEFAULT_CATEGORIES.slice(0);
    var mirrorsMap = {};
    var favoritesMap = {};
    var lastChannelByPlaylist = {};
    var activeCategory = 'Все каналы';
    var displayedChannels = [];

    // Playback State
    var currentChannel = null;
    var previousChannel = null;
    var activeStreamUrl = '';
    var activeMirrorUrls = [];
    var activeMirrorIdx = 0;
    var playSessionId = 0;
    var hasEverPlayedCurrent = false;
    var retryCount = 0;
    var retryTimer = null;
    var prepareTimer = null;
    var bufferingSinceMs = 0;
    var isCatalogLoading = false;

    // UI State
    var isSideVisible = false;
    var sideTab = 'channels'; // 'playlists' | 'groups' | 'channels'
    var focusedPlaylistRowIdx = 0;
    var focusedGroupIdx = 1;
    var focusedChannelIdx = 0;
    var isInfoVisible = false;

    // Modal State: 'none' | 'add_url' | 'delete_pl' | 'usb_pick'
    var activeModal = 'none';
    var addModalRow = 1;      // 0=title, 1=url, 2=presets, 3=actions
    var addModalPresetCol = 0;
    var addModalActionCol = 0;
    var isAddingUrlBusy = false;

    var sublistItems = [];    // [{ title, sub, payload }]
    var sublistFocusedIdx = 0;

    var lastBackPressMs = 0;
    var osdTimer = null;
    var toastTimer = null;
    var autoHideSideTimer = null;
    var diagEntries = [];
    var currentStateText = 'Ожидание';
    var currentResText = '—';

    // DOM refs
    var elClock, elSignalBars, elStatusText, elSidePanel, elSideCounter;
    var elTabPlaylists, elTabGroups, elTabChannels, elSideGroupCaption, elSideList;
    var elInfoPanel, elInfoPlaylist, elInfoCh, elInfoGroup, elInfoRes, elInfoProto;
    var elInfoState, elInfoCatalog, elInfoEngine, elInfoTizen, elDiagLog;
    var elAddUrlModal, elWrapTitle, elWrapUrl, elInputTitle, elInputUrl, elPresetBtns, elBtnSave, elBtnCancel, elAddUrlStatus;
    var elSublistModal, elSublistTitle, elSublistSubtitle, elSublistItems;
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

    function trimStr(str) {
        return ('' + (str || '')).replace(/^\s+|\s+$/g, '');
    }

    function addLog(msg) {
        diagEntries.unshift('[' + nowTimeStr() + '] ' + escapeHtml(msg));
        if (diagEntries.length > 12) diagEntries.length = 12;
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
        }, durationMs || 2800);
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
        if (isSideVisible && activeModal === 'none') {
            autoHideSideTimer = setTimeout(function () {
                setSideVisible(false);
            }, 16000);
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
                return true;
            }
        } catch (e) {}
        return false;
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

    function removeKey(key) {
        try {
            if (window.localStorage) {
                window.localStorage.removeItem(STORAGE_PREFIX + key);
            }
        } catch (e) {}
    }

    function getActivePlaylistEntry() {
        if (activePlaylistId === BUILTIN_PLAYLIST_ID) {
            return { id: BUILTIN_PLAYLIST_ID, title: 'Основной', type: 'builtin', source: '' };
        }
        for (var i = 0; i < userPlaylists.length; i++) {
            if (userPlaylists[i].id === activePlaylistId) return userPlaylists[i];
        }
        activePlaylistId = BUILTIN_PLAYLIST_ID;
        return { id: BUILTIN_PLAYLIST_ID, title: 'Основной', type: 'builtin', source: '' };
    }

    function isBuiltinActive() {
        return activePlaylistId === BUILTIN_PLAYLIST_ID;
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
    // Filtering, Categorization, Quality & Tizen-HTTP Deduplication
    // =========================================================================
    function isVerifiedTizenHttpsUrl(url) {
        var low = (url || '').toLowerCase();
        for (var i = 0; i < VERIFIED_TIZEN_HTTPS_HOSTS.length; i++) {
            if (low.indexOf(VERIFIED_TIZEN_HTTPS_HOSTS[i]) !== -1) return true;
        }
        return false;
    }

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
        var s = trimStr((rawName || '').toLowerCase());
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

        // Strong HTTP preference for Tizen 2.4.0 compatibility
        if (u.indexOf('http://') === 0) score += 140;
        else if (isVerifiedTizenHttpsUrl(u)) score += 75;
        else score -= 35;

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
            score -= 100;
        }
        return score;
    }

    function cleanDisplayName(raw) {
        var s = trimStr(trimStr(raw).replace(RE_TRAILING_DUP, ''));
        return s || raw || 'Канал';
    }

    function extractTwoLetters(name) {
        var clean = trimStr((name || '').replace(/[^a-zA-Zа-яА-ЯёЁ0-9 ]/g, ' '));
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

    function parseM3uText(text, isUserPlaylist) {
        var result = [];
        var lines = (text || '').split(/\r?\n/);
        var pendingInf = '';
        var pendingGroup = '';
        for (var i = 0; i < lines.length; i++) {
            var line = trimStr(lines[i]);
            if (!line) continue;
            if (line.indexOf('#EXTINF') === 0) {
                pendingInf = line;
                pendingGroup = '';
                var gm = line.match(/group-title="([^"]*)"/i);
                if (gm && gm[1]) pendingGroup = trimStr(gm[1]);
            } else if (line.indexOf('#EXTGRP:') === 0) {
                pendingGroup = trimStr(line.substr(8));
            } else if (line.indexOf('http://') === 0 || line.indexOf('https://') === 0) {
                var cleanUrl = trimStr(line.split('#')[0]);
                if (cleanUrl) {
                    var commaIdx = pendingInf.lastIndexOf(',');
                    var rawName = (pendingInf && commaIdx !== -1) ? trimStr(pendingInf.substr(commaIdx + 1)) : 'Канал ' + (result.length + 1);
                    if (isUserPlaylist) {
                        var origCat = pendingGroup || 'Общие';
                        result.push({
                            name: rawName || 'Канал',
                            category: origCat,
                            url: cleanUrl,
                            canonKey: canonicalDedupKey(rawName, origCat),
                            code: extractTwoLetters(rawName),
                            badgeColor: badgeColorFor(rawName)
                        });
                    } else if (pendingInf && !isBlockedCast(pendingInf, cleanUrl, pendingGroup)) {
                        if (rawName && !isArabicOrIndian(rawName, pendingGroup, cleanUrl)) {
                            var cat = mapCategory(pendingGroup, rawName);
                            if (!isFilteredOther(rawName, cat, cleanUrl)) {
                                result.push({
                                    name: cleanDisplayName(rawName),
                                    category: cat,
                                    url: cleanUrl
                                });
                            }
                        }
                    }
                }
                pendingInf = '';
                pendingGroup = '';
            }
        }
        return result;
    }

    function buildBuiltinCatalog(candidates) {
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

            cleanUrl = trimStr(ch.url.split('#')[0]);
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

    function buildUserCategories(channels) {
        var cats = ['★ Избранное', 'Все каналы'];
        var seen = { '★ Избранное': true, 'Все каналы': true };
        for (var i = 0; i < channels.length; i++) {
            var c = channels[i].category || 'Общие';
            if (!seen[c]) {
                seen[c] = true;
                cats.push(c);
            }
        }
        return cats;
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

    // =========================================================================
    // Network XHR with automatic HTTPS -> HTTP fallback for Tizen 2.4 SSL
    // =========================================================================
    function fetchUrlTextRaw(url, timeoutMs, cb) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = timeoutMs || 9000;
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

    function fetchPlaylistUrlSmart(url, timeoutMs, cb) {
        fetchUrlTextRaw(url, timeoutMs, function (err, text) {
            if (!err && text) {
                cb(null, text, url);
                return;
            }
            if (url.indexOf('https://') === 0) {
                var httpUrl = 'http://' + url.substr(8);
                addLog('Плейлист SSL откат -> HTTP');
                fetchUrlTextRaw(httpUrl, timeoutMs, function (err2, text2) {
                    if (!err2 && text2) {
                        cb(null, text2, httpUrl);
                    } else {
                        cb(err || err2 || 'ошибка сети', null, url);
                    }
                });
            } else {
                cb(err || 'ошибка сети', null, url);
            }
        });
    }

    // =========================================================================
    // Playlist Loading & Switching
    // =========================================================================
    function applyLoadedChannelsAndStart(channels, isUserList, autoPlayLast) {
        allChannels = channels;
        currentCategories = isUserList ? buildUserCategories(channels) : DEFAULT_CATEGORIES.slice(0);

        var saved = lastChannelByPlaylist[activePlaylistId] || null;
        if (saved && saved.category && currentCategories.indexOf(saved.category) !== -1) {
            activeCategory = saved.category;
        } else {
            activeCategory = 'Все каналы';
        }
        rebuildDisplayedChannels();
        if (displayedChannels.length === 0) {
            activeCategory = 'Все каналы';
            rebuildDisplayedChannels();
        }

        var targetCh = displayedChannels[0] || allChannels[0] || null;
        if (autoPlayLast && saved && saved.url) {
            for (var i = 0; i < allChannels.length; i++) {
                if (allChannels[i].url === saved.url) {
                    targetCh = allChannels[i];
                    break;
                }
            }
        }

        if (isSideVisible) renderSideList();
        updateInfoPanel();
        if (targetCh) {
            playChannelObj(targetCh, false);
        } else {
            stopPlayback();
            setSignalStatus('Нет каналов', 1, '#EF4444');
        }
    }

    function loadActivePlaylist(autoPlayLast, manualRefresh) {
        var myGen = ++playlistLoadGen;
        var entry = getActivePlaylistEntry();
        saveJson('active_playlist_id', activePlaylistId);
        updateInfoPanel();

        if (entry.type === 'builtin') {
            var initCandidates = [];
            var i;
            for (i = 0; i < BUILTIN_CHANNELS.length; i++) {
                initCandidates.push({ ch: BUILTIN_CHANNELS[i], curated: true });
            }
            var cachedRaw = loadJson('cached_builtin', []);
            if (cachedRaw && cachedRaw.length) {
                for (i = 0; i < cachedRaw.length; i++) {
                    if (cachedRaw[i] && cachedRaw[i].u && cachedRaw[i].n) {
                        initCandidates.push({
                            ch: { name: cachedRaw[i].n, category: cachedRaw[i].c || 'Прочее', url: cachedRaw[i].u },
                            curated: false
                        });
                    }
                }
            }
            var startupBuiltin = buildBuiltinCatalog(initCandidates);
            applyLoadedChannelsAndStart(startupBuiltin, false, autoPlayLast);
            setTimeout(function () {
                if (myGen === playlistLoadGen && isBuiltinActive()) {
                    loadOpenCatalogInBackground(!!manualRefresh, myGen);
                }
            }, manualRefresh ? 50 : 800);
            return;
        }

        // User playlist (URL or USB)
        mirrorsMap = {};
        var cachedUser = loadJson('pl_cache_' + entry.id, []);
        if (cachedUser && cachedUser.length > 0 && !manualRefresh) {
            var restored = [];
            for (var k = 0; k < cachedUser.length; k++) {
                var r = cachedUser[k];
                if (r && r.u && r.n) {
                    restored.push({
                        name: r.n,
                        category: r.c || 'Общие',
                        url: r.u,
                        canonKey: canonicalDedupKey(r.n, r.c || 'Общие'),
                        code: extractTwoLetters(r.n),
                        badgeColor: badgeColorFor(r.n)
                    });
                }
            }
            if (restored.length > 0) {
                addLog('Лист «' + entry.title + '» из кэша: ' + restored.length + ' кан.');
                applyLoadedChannelsAndStart(restored, true, autoPlayLast);
            }
        }

        if (entry.type === 'url') {
            if (manualRefresh) showToast('Обновление: ' + entry.title + '...', 2200);
            addLog('Загрузка листа: ' + entry.title);
            fetchPlaylistUrlSmart(entry.source, 12000, function (err, text) {
                if (myGen !== playlistLoadGen) return;
                if (err || !text) {
                    addLog('Ошибка загрузки листа: ' + (err || 'пусто'));
                    if (manualRefresh || allChannels.length === 0) {
                        showToast('Не удалось загрузить плейлист (' + (err || 'ошибка') + ')', 3000);
                    }
                    return;
                }
                var parsed = parseM3uText(text, true);
                if (parsed.length === 0) {
                    addLog('Лист пуст или не M3U');
                    showToast('В файле не найдено каналов M3U', 2800);
                    return;
                }
                cacheUserPlaylistChannels(entry.id, parsed);
                addLog('Лист «' + entry.title + '»: ' + parsed.length + ' кан.');
                if (manualRefresh) showToast('Обновлено: ' + parsed.length + ' каналов', 2400);
                // Update list; restart playback only if nothing was playing yet
                var needStart = (!currentChannel || allChannels.length === 0 || manualRefresh);
                if (needStart) {
                    applyLoadedChannelsAndStart(parsed, true, autoPlayLast);
                } else {
                    allChannels = parsed;
                    currentCategories = buildUserCategories(parsed);
                    rebuildDisplayedChannels();
                    if (isSideVisible) renderSideList();
                    updateInfoPanel();
                }
            });
        } else if (entry.type === 'usb' && (!cachedUser || cachedUser.length === 0 || manualRefresh)) {
            readUsbFileByPath(entry.source, function (err, text) {
                if (myGen !== playlistLoadGen) return;
                if (err || !text) {
                    if (manualRefresh) showToast('Флешка не подключена — работает сохранённая копия', 2600);
                    return;
                }
                var parsed = parseM3uText(text, true);
                if (parsed.length > 0) {
                    cacheUserPlaylistChannels(entry.id, parsed);
                    addLog('USB «' + entry.title + '»: ' + parsed.length + ' кан.');
                    applyLoadedChannelsAndStart(parsed, true, autoPlayLast);
                }
            });
        }
    }

    function cacheUserPlaylistChannels(plId, channels) {
        var compact = [];
        for (var i = 0; i < channels.length && i < 1200; i++) {
            compact.push({ n: channels[i].name, c: channels[i].category, u: channels[i].url });
        }
        if (!saveJson('pl_cache_' + plId, compact)) {
            // If storage tight on Tizen 2.4, save first 450 channels
            saveJson('pl_cache_' + plId, compact.slice(0, 450));
        }
    }

    function loadOpenCatalogInBackground(manualTrigger, expectedGen) {
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
            if (expectedGen && expectedGen !== playlistLoadGen) return;
            if (!isBuiltinActive()) return;
            if (fetchedStreams === 0) {
                addLog('Сеть: 0 потоков (работает встроенная база)');
                if (manualTrigger) showToast('Внешние источники недоступны — работает база', 2800);
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
            allChannels = buildBuiltinCatalog(candidates);
            rebuildDisplayedChannels();

            var compact = [];
            for (i = 0; i < allChannels.length && i < 550; i++) {
                compact.push({ n: allChannels[i].name, c: allChannels[i].category, u: allChannels[i].url });
            }
            saveJson('cached_builtin', compact);

            addLog('Каталог: ' + okSources + '/' + OPEN_SOURCES.length + ' ист. -> ' + allChannels.length + ' кан.');
            if (manualTrigger) showToast('Каталог обновлён: ' + allChannels.length + ' каналов', 2500);
            if (isSideVisible) renderSideList();
            updateInfoPanel();
        }

        function requestSource(idx) {
            var srcUrl = OPEN_SOURCES[idx];
            var shortName = srcUrl.replace(/^https?:\/\//, '').substr(0, 28);
            fetchUrlTextRaw(srcUrl, 8500, function (err, text) {
                if (!err && text) {
                    var parsed = parseM3uText(text, false);
                    results[idx] = parsed;
                    if (parsed.length > 0) {
                        okSources++;
                        fetchedStreams += parsed.length;
                    }
                } else {
                    results[idx] = null;
                    addLog('SRC FAIL ' + shortName + ' [' + err + ']');
                }
                completed++;
                if (completed >= OPEN_SOURCES.length) finishAll();
            });
        }

        for (var s = 0; s < OPEN_SOURCES.length; s++) {
            requestSource(s);
        }
    }

    // =========================================================================
    // Playlist Manager Items & Operations
    // =========================================================================
    function buildPlaylistMenuRows() {
        var rows = [];
        rows.push({
            kind: 'select',
            id: BUILTIN_PLAYLIST_ID,
            title: 'Основной (Открытый каталог)',
            rightText: (activePlaylistId === BUILTIN_PLAYLIST_ID) ? 'АКТИВЕН' : ''
        });
        for (var i = 0; i < userPlaylists.length; i++) {
            var p = userPlaylists[i];
            rows.push({
                kind: 'select',
                id: p.id,
                title: p.title,
                rightText: (activePlaylistId === p.id) ? 'АКТИВЕН' : (p.type === 'usb' ? 'USB' : 'URL')
            });
        }
        rows.push({ kind: 'add_url', title: 'Добавить плейлист по ссылке', rightText: 'URL' });
        rows.push({ kind: 'add_usb', title: 'Выбрать файл .m3u с флешки', rightText: 'USB' });
        rows.push({ kind: 'refresh', title: 'Обновить текущий плейлист', rightText: '↻' });
        if (userPlaylists.length > 0) {
            rows.push({ kind: 'delete_menu', title: 'Удалить плейлист', rightText: '' + userPlaylists.length });
        }
        return rows;
    }

    function deleteUserPlaylistById(plId) {
        var idx = -1;
        for (var i = 0; i < userPlaylists.length; i++) {
            if (userPlaylists[i].id === plId) {
                idx = i;
                break;
            }
        }
        if (idx === -1) return;
        var removed = userPlaylists.splice(idx, 1)[0];
        saveJson('user_playlists', userPlaylists);
        removeKey('pl_cache_' + plId);
        delete lastChannelByPlaylist[plId];
        saveJson('last_by_playlist', lastChannelByPlaylist);
        showToast('Плейлист удалён: ' + removed.title, 2400);
        addLog('Удалён плейлист: ' + removed.title);

        if (activePlaylistId === plId) {
            activePlaylistId = BUILTIN_PLAYLIST_ID;
            loadActivePlaylist(true, false);
        }
        if (isSideVisible) renderSideList();
        updateInfoPanel();
    }

    // =========================================================================
    // Add Playlist by URL Modal
    // =========================================================================
    function openAddUrlModal() {
        activeModal = 'add_url';
        isAddingUrlBusy = false;
        addModalRow = 1; // Focus URL field immediately
        addModalPresetCol = 0;
        addModalActionCol = 0;
        if (autoHideSideTimer) clearTimeout(autoHideSideTimer);

        elInputTitle.value = '';
        elInputUrl.value = 'http://';
        elAddUrlStatus.textContent = 'Нажмите OK на поле для клавиатуры ТВ (или вставьте со смартфона)';
        elAddUrlModal.className = 'panel';
        renderAddUrlModalFocus();
    }

    function closeAddUrlModal() {
        blurActiveInput();
        activeModal = 'none';
        isAddingUrlBusy = false;
        elAddUrlModal.className = 'panel hidden';
        if (isSideVisible) {
            renderSideList();
            resetSideAutoHide();
        }
    }

    function blurActiveInput() {
        try {
            if (document.activeElement && (document.activeElement === elInputTitle || document.activeElement === elInputUrl)) {
                document.activeElement.blur();
            }
        } catch (e) {}
    }

    function isTypingInInput() {
        var ae = document.activeElement;
        return (ae === elInputTitle || ae === elInputUrl);
    }

    function renderAddUrlModalFocus() {
        elWrapTitle.className = 'input-wrap' + (addModalRow === 0 ? ' focused' : '');
        elWrapUrl.className = 'input-wrap' + (addModalRow === 1 ? ' focused' : '');

        for (var i = 0; i < elPresetBtns.length; i++) {
            var isClear = elPresetBtns[i].getAttribute('data-val') === 'CLEAR';
            var cls = 'preset-btn' + (isClear ? ' preset-clear' : '') + (addModalRow === 2 && addModalPresetCol === i ? ' focused' : '');
            elPresetBtns[i].className = cls;
        }

        elBtnSave.className = 'modal-btn primary-btn' + (addModalRow === 3 && addModalActionCol === 0 ? ' focused' : '');
        elBtnCancel.className = 'modal-btn' + (addModalRow === 3 && addModalActionCol === 1 ? ' focused' : '');
    }

    function applyUrlPreset(val) {
        var cur = trimStr(elInputUrl.value);
        if (val === 'CLEAR') {
            elInputUrl.value = '';
        } else if (val === 'http://' || val === 'https://') {
            elInputUrl.value = val + cur.replace(/^https?:\/\//i, '');
        } else if (val === 'clck.ru/' || val === 'tinyurl.com/') {
            if (cur.indexOf('http://') === 0 || cur.indexOf('https://') === 0) {
                var proto = cur.indexOf('https://') === 0 ? 'https://' : 'http://';
                elInputUrl.value = proto + val;
            } else {
                elInputUrl.value = 'https://' + val;
            }
        } else {
            elInputUrl.value = cur + val;
        }
        elAddUrlStatus.textContent = 'URL: ' + (elInputUrl.value || '(пусто)');
    }

    function inferPlaylistTitleFromUrl(url) {
        var clean = url.replace(/^https?:\/\//i, '').split('/')[0];
        if (clean && clean.length > 2) return clean.substr(0, 26);
        return 'Мой плейлист ' + (userPlaylists.length + 1);
    }

    function submitAddUrlPlaylist() {
        if (isAddingUrlBusy) return;
        var rawUrl = trimStr(elInputUrl.value);
        if (!rawUrl || rawUrl === 'http://' || rawUrl === 'https://') {
            elAddUrlStatus.textContent = 'Введите адрес плейлиста (.m3u / .m3u8)';
            addModalRow = 1;
            renderAddUrlModalFocus();
            return;
        }
        if (rawUrl.indexOf('http://') !== 0 && rawUrl.indexOf('https://') !== 0) {
            rawUrl = 'http://' + rawUrl;
            elInputUrl.value = rawUrl;
        }

        isAddingUrlBusy = true;
        elAddUrlStatus.textContent = 'Загрузка и проверка плейлиста...';
        addLog('Проверка нового URL: ' + rawUrl.substr(0, 42));

        fetchPlaylistUrlSmart(rawUrl, 13000, function (err, text, workingUrl) {
            isAddingUrlBusy = false;
            if (activeModal !== 'add_url') return;

            if (err || !text) {
                elAddUrlStatus.textContent = 'Ошибка загрузки: ' + (err || 'нет ответа сервера');
                addLog('Новый лист FAIL: ' + (err || 'empty'));
                return;
            }
            var parsed = parseM3uText(text, true);
            if (parsed.length === 0) {
                elAddUrlStatus.textContent = 'Файл скачался, но каналы #EXTINF / http не найдены';
                addLog('Новый лист: 0 каналов');
                return;
            }

            var customTitle = trimStr(elInputTitle.value) || inferPlaylistTitleFromUrl(workingUrl);
            var newId = 'pl_' + (new Date().getTime());
            var newEntry = {
                id: newId,
                title: customTitle,
                type: 'url',
                source: workingUrl
            };
            userPlaylists.push(newEntry);
            saveJson('user_playlists', userPlaylists);
            cacheUserPlaylistChannels(newId, parsed);

            activePlaylistId = newId;
            saveJson('active_playlist_id', activePlaylistId);
            closeAddUrlModal();
            setSideVisible(false);

            showToast('Плейлист добавлен: ' + customTitle + ' (' + parsed.length + ' кан.)', 3200);
            addLog('Добавлен лист «' + customTitle + '»: ' + parsed.length + ' кан.');
            mirrorsMap = {};
            applyLoadedChannelsAndStart(parsed, true, false);
        });
    }

    // =========================================================================
    // Sublist Modal (Delete User Playlist & USB File Picker)
    // =========================================================================
    function openDeletePlaylistModal() {
        if (userPlaylists.length === 0) {
            showToast('Нет добавленных плейлистов', 2000);
            return;
        }
        activeModal = 'delete_pl';
        sublistFocusedIdx = 0;
        sublistItems = [];
        for (var i = 0; i < userPlaylists.length; i++) {
            sublistItems.push({
                title: userPlaylists[i].title,
                sub: userPlaylists[i].type === 'usb' ? 'USB' : 'URL',
                payload: userPlaylists[i].id
            });
        }
        elSublistTitle.textContent = 'Удалить плейлист';
        elSublistSubtitle.textContent = 'Выберите свой плейлист и нажмите OK для удаления';
        elSublistModal.className = 'panel';
        renderSublistModal();
    }

    function openUsbPickerModal() {
        if (typeof tizen === 'undefined' || !tizen.filesystem) {
            showToast('Чтение USB доступно только на телевизоре Samsung', 2600);
            return;
        }
        showToast('Поиск .m3u файлов на USB-флешке...', 2000);
        try {
            tizen.filesystem.listStorages(function (storages) {
                var externalRoots = [];
                for (var i = 0; i < storages.length; i++) {
                    if (storages[i].type === 'EXTERNAL' && storages[i].state === 'MOUNTED') {
                        externalRoots.push(storages[i].label);
                    }
                }
                if (externalRoots.length === 0) {
                    showToast('USB-флешка не найдена. Подключите флешку с файлом .m3u', 3200);
                    return;
                }
                scanUsbStoragesForM3u(externalRoots, function (foundFiles) {
                    if (!foundFiles || foundFiles.length === 0) {
                        showToast('На USB не найдено файлов .m3u / .m3u8', 3200);
                        return;
                    }
                    activeModal = 'usb_pick';
                    sublistFocusedIdx = 0;
                    sublistItems = [];
                    for (var k = 0; k < foundFiles.length; k++) {
                        sublistItems.push({
                            title: foundFiles[k].name,
                            sub: 'USB',
                            payload: foundFiles[k]
                        });
                    }
                    elSublistTitle.textContent = 'Файлы плейлистов на USB';
                    elSublistSubtitle.textContent = 'Найдено файлов: ' + foundFiles.length + ' — нажмите OK для импорта';
                    elSublistModal.className = 'panel';
                    renderSublistModal();
                });
            }, function () {
                showToast('Не удалось прочитать список USB-накопителей', 2800);
            });
        } catch (e) {
            showToast('USB чтение недоступно: ' + e.message, 2800);
        }
    }

    function scanUsbStoragesForM3u(labels, doneCb) {
        var found = [];
        var pending = labels.length;
        function dec() {
            pending--;
            if (pending <= 0) doneCb(found);
        }
        function inspectDir(dirObj, depth) {
            pending++;
            dirObj.listFiles(function (files) {
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    if (f.isDirectory && depth < 1) {
                        inspectDir(f, depth + 1);
                    } else if (!f.isDirectory && /\.(m3u8?|txt)$/i.test(f.name)) {
                        found.push({ name: f.name, fullPath: f.fullPath });
                    }
                }
                dec();
            }, function () { dec(); });
        }
        for (var i = 0; i < labels.length; i++) {
            (function (lbl) {
                try {
                    tizen.filesystem.resolve(lbl, function (dir) {
                        inspectDir(dir, 0);
                        dec();
                    }, function () { dec(); }, 'r');
                } catch (e) { dec(); }
            })(labels[i]);
        }
    }

    function readUsbFileByPath(fullPath, cb) {
        try {
            if (typeof tizen === 'undefined' || !tizen.filesystem) {
                cb('no tizen fs', null);
                return;
            }
            tizen.filesystem.resolve(fullPath, function (fileObj) {
                fileObj.readAsText(function (text) {
                    cb(null, text);
                }, function (err) {
                    cb((err && err.message) || 'read err', null);
                }, 'UTF-8');
            }, function (err) {
                cb((err && err.message) || 'not found', null);
            }, 'r');
        } catch (e) {
            cb(e.message || 'usb err', null);
        }
    }

    function importSelectedUsbFile(fileMeta) {
        readUsbFileByPath(fileMeta.fullPath, function (err, text) {
            if (err || !text) {
                showToast('Ошибка чтения файла с USB', 2800);
                return;
            }
            var parsed = parseM3uText(text, true);
            if (parsed.length === 0) {
                showToast('В выбранном файле не найдено каналов M3U', 2800);
                return;
            }
            var cleanTitle = fileMeta.name.replace(/\.(m3u8?|txt)$/i, '');
            var newId = 'usb_' + (new Date().getTime());
            userPlaylists.push({
                id: newId,
                title: cleanTitle,
                type: 'usb',
                source: fileMeta.fullPath
            });
            saveJson('user_playlists', userPlaylists);
            cacheUserPlaylistChannels(newId, parsed);

            activePlaylistId = newId;
            saveJson('active_playlist_id', activePlaylistId);
            closeSublistModal();
            setSideVisible(false);
            showToast('Импортировано с USB: ' + cleanTitle + ' (' + parsed.length + ' кан.)', 3200);
            addLog('USB лист «' + cleanTitle + '»: ' + parsed.length + ' кан.');
            mirrorsMap = {};
            applyLoadedChannelsAndStart(parsed, true, false);
        });
    }

    function closeSublistModal() {
        activeModal = 'none';
        elSublistModal.className = 'panel hidden';
        if (isSideVisible) {
            renderSideList();
            resetSideAutoHide();
        }
    }

    function renderSublistModal() {
        var html = '';
        var total = sublistItems.length;
        if (sublistFocusedIdx < 0) sublistFocusedIdx = 0;
        if (sublistFocusedIdx >= total) sublistFocusedIdx = Math.max(0, total - 1);

        var start = Math.max(0, Math.min(sublistFocusedIdx - Math.floor(SUBLIST_VISIBLE_ROWS / 2), total - SUBLIST_VISIBLE_ROWS));
        if (start < 0) start = 0;
        var end = Math.min(total, start + SUBLIST_VISIBLE_ROWS);

        for (var i = start; i < end; i++) {
            var it = sublistItems[i];
            var isDanger = (activeModal === 'delete_pl');
            var cls = 'list-row' + (isDanger ? ' danger-row' : '') + (i === sublistFocusedIdx ? ' focused' : '');
            var prefix = isDanger ? '✕  ' : '▸  ';
            html += '<div class="' + cls + '">' +
                prefix + escapeHtml(it.title) +
                '<span class="row-right">' + escapeHtml(it.sub) + '</span>' +
                '</div>';
        }
        elSublistItems.innerHTML = html;
    }

    // =========================================================================
    // Left SIDE Panel Rendering (Playlists / Groups / Channels)
    // =========================================================================
    function renderSideList() {
        if (!elSideList) return;
        elTabPlaylists.className = 'side-tab' + (sideTab === 'playlists' ? ' active' : '');
        elTabGroups.className = 'side-tab' + (sideTab === 'groups' ? ' active' : '');
        elTabChannels.className = 'side-tab' + (sideTab === 'channels' ? ' active' : '');

        var activeEntry = getActivePlaylistEntry();
        elSideGroupCaption.textContent = (sideTab === 'playlists') ? activeEntry.title : activeCategory;

        var html = '';
        var i, start, end;

        if (sideTab === 'playlists') {
            var pRows = buildPlaylistMenuRows();
            if (focusedPlaylistRowIdx < 0) focusedPlaylistRowIdx = 0;
            if (focusedPlaylistRowIdx >= pRows.length) focusedPlaylistRowIdx = pRows.length - 1;
            if (elSideCounter) elSideCounter.textContent = (focusedPlaylistRowIdx + 1) + ' / ' + pRows.length;

            start = Math.max(0, Math.min(focusedPlaylistRowIdx - Math.floor(VISIBLE_ROWS / 2), pRows.length - VISIBLE_ROWS));
            if (start < 0) start = 0;
            end = Math.min(pRows.length, start + VISIBLE_ROWS);

            for (i = start; i < end; i++) {
                var r = pRows[i];
                var isFoc = (i === focusedPlaylistRowIdx);
                var rowCls = 'list-row';
                var iconHtml = '';
                if (r.kind === 'select') {
                    var isAct = (r.id === activePlaylistId);
                    iconHtml = isAct ? '<span class="row-play-mark">●</span>' : '<span class="row-play-mark" style="opacity:0.35;">○</span>';
                } else if (r.kind === 'delete_menu') {
                    rowCls += ' danger-row';
                    iconHtml = '✕  ';
                } else {
                    rowCls += ' action-row';
                    iconHtml = '+  ';
                    if (r.kind === 'refresh') iconHtml = '↻  ';
                }
                if (isFoc) rowCls += ' focused';

                html += '<div class="' + rowCls + '">' +
                    iconHtml + escapeHtml(r.title) +
                    '<span class="row-right">' + escapeHtml(r.rightText) + '</span>' +
                    '</div>';
            }
            elSideList.innerHTML = html;
            return;
        }

        if (sideTab === 'groups') {
            if (focusedGroupIdx < 0) focusedGroupIdx = 0;
            if (focusedGroupIdx >= currentCategories.length) focusedGroupIdx = currentCategories.length - 1;
            if (elSideCounter) elSideCounter.textContent = (focusedGroupIdx + 1) + ' / ' + currentCategories.length;

            start = Math.max(0, Math.min(focusedGroupIdx - Math.floor(VISIBLE_ROWS / 2), currentCategories.length - VISIBLE_ROWS));
            if (start < 0) start = 0;
            end = Math.min(currentCategories.length, start + VISIBLE_ROWS);

            for (i = start; i < end; i++) {
                var catName = currentCategories[i];
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
                ? 'Избранных каналов пока нет.<br>Нажмите жёлтую кнопку (или 0), чтобы добавить канал.'
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
            var chCls = 'list-row' + (i === focusedChannelIdx ? ' focused' : '');
            var playMark = isCur ? '<span class="row-play-mark">▶</span>' : '';
            var favHtml = isFavorite(ch.url) ? '<span class="fav-star">★</span>' : '';
            var proto = (ch.url.indexOf('https://') === 0) ? 'HTTPS' : 'HTTP';
            var badgeStyle = (i === focusedChannelIdx) ? '' : (' style="background-color:' + ch.badgeColor + ';"');

            html += '<div class="' + chCls + '">' +
                '<span class="row-badge"' + badgeStyle + '>' + escapeHtml(ch.code) + '</span>' +
                playMark + escapeHtml(ch.name) +
                '<span class="row-right"><span class="proto-tag">' + proto + '</span>' + favHtml + '</span>' +
                '</div>';
        }
        elSideList.innerHTML = html;
    }

    function setSideVisible(visible, targetTab) {
        isSideVisible = visible;
        if (targetTab) sideTab = targetTab;
        if (elSidePanel) elSidePanel.className = visible ? 'panel' : 'panel hidden';
        if (visible) {
            if (sideTab === 'channels' && currentChannel) {
                for (var i = 0; i < displayedChannels.length; i++) {
                    if (displayedChannels[i].url === currentChannel.url) {
                        focusedChannelIdx = i;
                        break;
                    }
                }
            }
            focusedGroupIdx = Math.max(0, currentCategories.indexOf(activeCategory));
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
        var entry = getActivePlaylistEntry();
        if (elInfoPlaylist) elInfoPlaylist.textContent = 'Плейлист: ' + entry.title;
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
    // Fast Samsung AVPlay Engine: HTTP-First Queue + 5.5s Prepare Timeout + Race Guard
    // =========================================================================
    function buildAttemptQueueForChannel(ch) {
        var list = [];
        function pushUnique(u) {
            if (u && list.indexOf(u) === -1) list.push(u);
        }

        // For user playlists, always try exact playlist URL first (preserves single-session tokens)
        if (!isBuiltinActive()) {
            pushUnique(ch.url);
            if (ch.url.indexOf('https://') === 0) {
                pushUnique('http://' + ch.url.substr(8));
            }
            return list;
        }

        // For builtin catalog on Tizen 2.4.0:
        // 1) Real HTTP mirrors (fastest & immune to Tizen 2.4 SSL errors)
        // 2) Verified Tizen-2.4 HTTPS CDNs (Stingray, Beltelecom, NTV CDN2, Cinerama)
        // 3) Synthetic HTTP fallback for unverified HTTPS URLs
        // 4) Remaining HTTPS URLs
        var mirrors = mirrorsMap[ch.canonKey] || [];
        var allRaw = [ch.url];
        var i;
        for (i = 0; i < mirrors.length; i++) {
            if (allRaw.indexOf(mirrors[i]) === -1) allRaw.push(mirrors[i]);
        }

        // 1. Real HTTP streams first
        for (i = 0; i < allRaw.length; i++) {
            if (allRaw[i].indexOf('http://') === 0) pushUnique(allRaw[i]);
        }
        // 2. Verified classic-SSL HTTPS streams
        for (i = 0; i < allRaw.length; i++) {
            if (allRaw[i].indexOf('https://') === 0 && isVerifiedTizenHttpsUrl(allRaw[i])) {
                pushUnique(allRaw[i]);
            }
        }
        // 3. Synthetic HTTP fallback for other HTTPS streams (try HTTP before slow SSL timeout)
        for (i = 0; i < allRaw.length; i++) {
            if (allRaw[i].indexOf('https://') === 0 && !isVerifiedTizenHttpsUrl(allRaw[i])) {
                pushUnique('http://' + allRaw[i].substr(8));
            }
        }
        // 4. Original unverified HTTPS streams last
        for (i = 0; i < allRaw.length; i++) {
            pushUnique(allRaw[i]);
        }
        return list.slice(0, 6);
    }

    function clearPlayerTimers() {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
        if (prepareTimer) {
            clearTimeout(prepareTimer);
            prepareTimer = null;
        }
    }

    function stopPlayback() {
        playSessionId++;
        clearPlayerTimers();
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
        clearPlayerTimers();
        retryCount++;
        var maxTries = Math.min(Math.max(activeMirrorUrls.length, 2), 6);
        if (retryCount > maxTries) {
            setSignalStatus('Нет сигнала', 1, '#EF4444');
            addLog('Лимит попыток (' + maxTries + ') исчерпан');
            showToast('Канал недоступен (' + reason + ')', 2400);
            return;
        }
        if (activeMirrorIdx + 1 < activeMirrorUrls.length) {
            activeMirrorIdx++;
            var nextUrl = activeMirrorUrls[activeMirrorIdx];
            var tag = (nextUrl.indexOf('http://') === 0) ? 'HTTP' : 'HTTPS';
            addLog('Зеркало #' + (activeMirrorIdx + 1) + ' (' + tag + '): ' + nextUrl.substr(0, 38));
            retryTimer = setTimeout(function () {
                openUrlInPlayer(nextUrl);
            }, 150);
        } else {
            addLog('Повтор потока #' + retryCount + '...');
            retryTimer = setTimeout(function () {
                openUrlInPlayer(activeStreamUrl);
            }, 900);
        }
    }

    function openUrlInPlayer(url) {
        stopPlayback();
        var mySid = playSessionId;
        activeStreamUrl = url;
        hasEverPlayedCurrent = false;
        bufferingSinceMs = new Date().getTime();
        currentResText = 'Анализ...';
        setSignalStatus('Подключение...', 2, '#F59E0B');
        updateInfoPanel();

        if (hasAvPlay) {
            try {
                webapis.avplay.open(url);
                try { webapis.avplay.setDisplayRect(0, 0, 1920, 1080); } catch (e1) {}
                try { webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN'); } catch (e2) {}
                try { webapis.avplay.setStreamingProperty('USER_AGENT', DEFAULT_UA); } catch (e3) {}
                try { webapis.avplay.setTimeoutForBuffering(6); } catch (e4) {}
                try { webapis.avplay.setBufferingParam('PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 2); } catch (e5) {}
                try { webapis.avplay.setBufferingParam('PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', 3); } catch (e6) {}

                webapis.avplay.setListener({
                    onbufferingstart: function () {
                        if (mySid !== playSessionId) return;
                        bufferingSinceMs = new Date().getTime();
                        setSignalStatus('Буферизация...', 2, '#F59E0B');
                    },
                    onbufferingprogress: function (percent) {
                        if (mySid !== playSessionId) return;
                        setSignalStatus('Буфер ' + percent + '%', 2, '#F59E0B');
                    },
                    onbufferingcomplete: function () {
                        if (mySid !== playSessionId) return;
                        clearPlayerTimers();
                        bufferingSinceMs = 0;
                        hasEverPlayedCurrent = true;
                        retryCount = 0;
                        setSignalStatus('Эфир', 4, '#22C55E');
                        refreshAvPlayResolution();
                        showOsd(currentChannel, currentResText);
                    },
                    onstreamcompleted: function () {
                        if (mySid !== playSessionId) return;
                        addLog('Поток завершён, переподключение...');
                        scheduleNextMirrorOrRetry('END');
                    },
                    oncurrentplaytime: function () {
                        if (mySid !== playSessionId) return;
                        bufferingSinceMs = 0;
                        hasEverPlayedCurrent = true;
                        if (currentResText === 'Анализ...') refreshAvPlayResolution();
                    },
                    onerror: function (errType) {
                        if (mySid !== playSessionId) return;
                        addLog('AVPlay ERR: ' + errType);
                        scheduleNextMirrorOrRetry(errType);
                    }
                });

                // Hard fast timeout so dead streams switch mirrors in 5.5s instead of 13s!
                prepareTimer = setTimeout(function () {
                    if (mySid !== playSessionId) return;
                    addLog('Таймаут запуска (5.5с) -> далее');
                    stopPlayback();
                    scheduleNextMirrorOrRetry('TIMEOUT');
                }, PREPARE_TIMEOUT_MS);

                webapis.avplay.prepareAsync(
                    function () {
                        if (mySid !== playSessionId) return;
                        if (prepareTimer) {
                            clearTimeout(prepareTimer);
                            prepareTimer = null;
                        }
                        try {
                            webapis.avplay.play();
                            bufferingSinceMs = 0;
                            hasEverPlayedCurrent = true;
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
                        if (mySid !== playSessionId) return;
                        if (prepareTimer) {
                            clearTimeout(prepareTimer);
                            prepareTimer = null;
                        }
                        var msg = (err && err.message) ? err.message : ('' + err);
                        addLog('prepare FAIL: ' + msg);
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
                if (mySid !== playSessionId) return;
                bufferingSinceMs = 0;
                hasEverPlayedCurrent = true;
                currentResText = (elHtml5Player.videoWidth || 0) + 'x' + (elHtml5Player.videoHeight || 0);
                setSignalStatus('Эфир', 4, '#22C55E');
                updateInfoPanel();
            };
            elHtml5Player.onerror = function () {
                if (mySid !== playSessionId) return;
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
            lastChannelByPlaylist[activePlaylistId] = {
                url: ch.url,
                name: ch.name,
                category: activeCategory
            };
            saveJson('last_by_playlist', lastChannelByPlaylist);
        }

        var firstProto = (activeMirrorUrls[0].indexOf('https://') === 0) ? 'HTTPS' : 'HTTP';
        addLog('Пуск: ' + ch.name + ' [' + firstProto + ', ' + activeMirrorUrls.length + ' пот.]');
        showOsd(ch, 'Подключение...');
        if (isSideVisible && sideTab === 'channels') renderSideList();
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

    function watchdogTick() {
        if (!hasAvPlay || !currentChannel || bufferingSinceMs <= 0) return;
        var limit = hasEverPlayedCurrent ? MIDSTREAM_STALL_MS : INITIAL_STALL_MS;
        var elapsed = new Date().getTime() - bufferingSinceMs;
        if (elapsed > limit) {
            bufferingSinceMs = 0;
            addLog('Watchdog: зависание буфера > ' + Math.round(limit / 1000) + 'с');
            stopPlayback();
            scheduleNextMirrorOrRetry('STALL');
        }
    }

    // =========================================================================
    // Remote Control Handling (Side Panel + Modals + Samsung IME Keyboard)
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

    function handleAddUrlModalKey(e) {
        var code = e.keyCode;
        // Samsung IME Done=65376, Cancel=65385
        if (isTypingInInput()) {
            if (code === 65376 || code === 13) { // Done / Enter
                e.preventDefault();
                blurActiveInput();
                if (addModalRow === 0) addModalRow = 1;
                else if (addModalRow === 1) addModalRow = 3;
                renderAddUrlModalFocus();
            } else if (code === 65385 || code === 10009 || code === 27) { // Cancel / Back
                e.preventDefault();
                blurActiveInput();
                renderAddUrlModalFocus();
            }
            return;
        }

        if (code === 10009 || code === 27 || code === 8) {
            e.preventDefault();
            closeAddUrlModal();
            return;
        }
        if (code === 38) { // UP
            e.preventDefault();
            addModalRow = (addModalRow + 3) % 4;
            renderAddUrlModalFocus();
        } else if (code === 40) { // DOWN
            e.preventDefault();
            addModalRow = (addModalRow + 1) % 4;
            renderAddUrlModalFocus();
        } else if (code === 37) { // LEFT
            e.preventDefault();
            if (addModalRow === 2) {
                addModalPresetCol = (addModalPresetCol - 1 + elPresetBtns.length) % elPresetBtns.length;
                renderAddUrlModalFocus();
            } else if (addModalRow === 3) {
                addModalActionCol = (addModalActionCol + 1) % 2;
                renderAddUrlModalFocus();
            }
        } else if (code === 39) { // RIGHT
            e.preventDefault();
            if (addModalRow === 2) {
                addModalPresetCol = (addModalPresetCol + 1) % elPresetBtns.length;
                renderAddUrlModalFocus();
            } else if (addModalRow === 3) {
                addModalActionCol = (addModalActionCol + 1) % 2;
                renderAddUrlModalFocus();
            }
        } else if (code === 13) { // OK
            e.preventDefault();
            if (addModalRow === 0) {
                elInputTitle.focus();
            } else if (addModalRow === 1) {
                elInputUrl.focus();
            } else if (addModalRow === 2) {
                var val = elPresetBtns[addModalPresetCol].getAttribute('data-val');
                applyUrlPreset(val);
            } else if (addModalRow === 3) {
                if (addModalActionCol === 0) submitAddUrlPlaylist();
                else closeAddUrlModal();
            }
        }
    }

    function handleSublistModalKey(e) {
        var code = e.keyCode;
        if (code === 10009 || code === 27 || code === 8) {
            e.preventDefault();
            closeSublistModal();
            return;
        }
        if (sublistItems.length === 0) return;
        if (code === 38) {
            e.preventDefault();
            sublistFocusedIdx = (sublistFocusedIdx - 1 + sublistItems.length) % sublistItems.length;
            renderSublistModal();
        } else if (code === 40) {
            e.preventDefault();
            sublistFocusedIdx = (sublistFocusedIdx + 1) % sublistItems.length;
            renderSublistModal();
        } else if (code === 13) {
            e.preventDefault();
            var picked = sublistItems[sublistFocusedIdx];
            if (!picked) return;
            if (activeModal === 'delete_pl') {
                deleteUserPlaylistById(picked.payload);
                if (userPlaylists.length > 0) {
                    openDeletePlaylistModal();
                } else {
                    closeSublistModal();
                }
            } else if (activeModal === 'usb_pick') {
                importSelectedUsbFile(picked.payload);
            }
        }
    }

    function handlePlaylistTabOk() {
        var rows = buildPlaylistMenuRows();
        var row = rows[focusedPlaylistRowIdx];
        if (!row) return;
        if (row.kind === 'select') {
            if (row.id !== activePlaylistId) {
                activePlaylistId = row.id;
                setSideVisible(false);
                showToast('Плейлист: ' + row.title, 2200);
                loadActivePlaylist(true, false);
            } else {
                sideTab = 'channels';
                renderSideList();
            }
        } else if (row.kind === 'add_url') {
            openAddUrlModal();
        } else if (row.kind === 'add_usb') {
            openUsbPickerModal();
        } else if (row.kind === 'refresh') {
            setSideVisible(false);
            loadActivePlaylist(true, true);
        } else if (row.kind === 'delete_menu') {
            openDeletePlaylistModal();
        }
    }

    function handleKeyDown(e) {
        if (activeModal === 'add_url') {
            handleAddUrlModalKey(e);
            return;
        }
        if (activeModal === 'delete_pl' || activeModal === 'usb_pick') {
            handleSublistModalKey(e);
            return;
        }

        var code = e.keyCode;
        if (isSideVisible) resetSideAutoHide();

        if (code === 38) { // UP
            e.preventDefault();
            if (isSideVisible) {
                if (sideTab === 'playlists') {
                    var pLen = buildPlaylistMenuRows().length;
                    focusedPlaylistRowIdx = (focusedPlaylistRowIdx - 1 + pLen) % pLen;
                } else if (sideTab === 'groups') {
                    focusedGroupIdx = (focusedGroupIdx - 1 + currentCategories.length) % currentCategories.length;
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
                if (sideTab === 'playlists') {
                    var pLen2 = buildPlaylistMenuRows().length;
                    focusedPlaylistRowIdx = (focusedPlaylistRowIdx + 1) % pLen2;
                } else if (sideTab === 'groups') {
                    focusedGroupIdx = (focusedGroupIdx + 1) % currentCategories.length;
                } else if (displayedChannels.length > 0) {
                    focusedChannelIdx = (focusedChannelIdx + 1) % displayedChannels.length;
                }
                renderSideList();
            } else {
                switchChannelOffset(+1);
            }
        } else if (code === 427) { // CH+
            e.preventDefault();
            if (isSideVisible && sideTab === 'channels' && displayedChannels.length > 0) {
                focusedChannelIdx = Math.max(0, focusedChannelIdx - VISIBLE_ROWS);
                renderSideList();
            } else {
                switchChannelOffset(+1);
            }
        } else if (code === 428) { // CH-
            e.preventDefault();
            if (isSideVisible && sideTab === 'channels' && displayedChannels.length > 0) {
                focusedChannelIdx = Math.min(displayedChannels.length - 1, focusedChannelIdx + VISIBLE_ROWS);
                renderSideList();
            } else {
                switchChannelOffset(-1);
            }
        } else if (code === 13) { // OK / ENTER
            e.preventDefault();
            if (isSideVisible) {
                if (sideTab === 'playlists') {
                    handlePlaylistTabOk();
                } else if (sideTab === 'groups') {
                    activeCategory = currentCategories[focusedGroupIdx];
                    focusedChannelIdx = 0;
                    rebuildDisplayedChannels();
                    sideTab = 'channels';
                    renderSideList();
                } else if (displayedChannels.length > 0) {
                    playChannelObj(displayedChannels[focusedChannelIdx], true);
                    setSideVisible(false);
                }
            } else {
                setInfoVisible(false);
                setSideVisible(true, 'channels');
            }
        } else if (code === 37) { // LEFT
            e.preventDefault();
            if (isInfoVisible) {
                setInfoVisible(false);
            } else if (isSideVisible) {
                if (sideTab === 'channels') {
                    sideTab = 'groups';
                    focusedGroupIdx = Math.max(0, currentCategories.indexOf(activeCategory));
                    renderSideList();
                } else if (sideTab === 'groups') {
                    sideTab = 'playlists';
                    renderSideList();
                } else {
                    setSideVisible(false);
                }
            } else {
                setSideVisible(true, 'channels');
            }
        } else if (code === 39) { // RIGHT
            e.preventDefault();
            if (isSideVisible) {
                if (sideTab === 'playlists') {
                    sideTab = 'groups';
                    renderSideList();
                } else if (sideTab === 'groups') {
                    activeCategory = currentCategories[focusedGroupIdx];
                    focusedChannelIdx = 0;
                    rebuildDisplayedChannels();
                    sideTab = 'channels';
                    renderSideList();
                } else {
                    setSideVisible(false);
                }
            } else {
                setInfoVisible(!isInfoVisible);
            }
        } else if (code === 405 || code === 48) { // YELLOW or 0 -> Favorite
            e.preventDefault();
            var targetFav = (isSideVisible && sideTab === 'channels' && displayedChannels.length > 0)
                ? displayedChannels[focusedChannelIdx]
                : currentChannel;
            if (targetFav) toggleFavorite(targetFav);
        } else if (code === 404) { // GREEN -> Next mirror
            e.preventDefault();
            switchNextMirrorManually();
        } else if (code === 403) { // RED -> Refresh active playlist
            e.preventDefault();
            loadActivePlaylist(true, true);
        } else if (code === 406) { // BLUE -> Open Playlists tab directly
            e.preventDefault();
            setInfoVisible(false);
            setSideVisible(true, 'playlists');
        } else if (code === 457 || code === 73) { // INFO or 'i'
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
        addLog('Старт TiViLook v0.3: ' + sysDesc);

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
        elTabPlaylists = document.getElementById('tab-playlists');
        elTabGroups = document.getElementById('tab-groups');
        elTabChannels = document.getElementById('tab-channels');
        elSideGroupCaption = document.getElementById('side-group-caption');
        elSideList = document.getElementById('side-list');
        elInfoPanel = document.getElementById('info-panel');
        elInfoPlaylist = document.getElementById('info-playlist');
        elInfoCh = document.getElementById('info-ch');
        elInfoGroup = document.getElementById('info-group');
        elInfoRes = document.getElementById('info-res');
        elInfoProto = document.getElementById('info-proto');
        elInfoState = document.getElementById('info-state');
        elInfoCatalog = document.getElementById('info-catalog');
        elInfoEngine = document.getElementById('info-engine');
        elInfoTizen = document.getElementById('info-tizen');
        elDiagLog = document.getElementById('diag-log');

        elAddUrlModal = document.getElementById('add-url-modal');
        elWrapTitle = document.getElementById('field-wrap-title');
        elWrapUrl = document.getElementById('field-wrap-url');
        elInputTitle = document.getElementById('pl-input-title');
        elInputUrl = document.getElementById('pl-input-url');
        elPresetBtns = document.getElementById('preset-row').getElementsByTagName('span');
        elBtnSave = document.getElementById('btn-pl-save');
        elBtnCancel = document.getElementById('btn-pl-cancel');
        elAddUrlStatus = document.getElementById('add-url-status');

        elSublistModal = document.getElementById('sublist-modal');
        elSublistTitle = document.getElementById('sublist-title');
        elSublistSubtitle = document.getElementById('sublist-subtitle');
        elSublistItems = document.getElementById('sublist-items');

        elOsdBar = document.getElementById('osd-bar');
        elOsdName = document.getElementById('osd-channel-name');
        elOsdMeta = document.getElementById('osd-channel-meta');
        elToast = document.getElementById('toast-box');
        elSplash = document.getElementById('splash-overlay');
        elHtml5Player = document.getElementById('html5-player');
        elAvPlayer = document.getElementById('av-player');

        updateClock();
        setInterval(updateClock, 10000);
        setInterval(watchdogTick, 1500);
        detectPlatform();
        registerSamsungKeys();

        // Restore saved state
        favoritesMap = loadJson('favorites', {}) || {};
        userPlaylists = loadJson('user_playlists', []) || [];
        lastChannelByPlaylist = loadJson('last_by_playlist', {}) || {};
        activePlaylistId = loadJson('active_playlist_id', BUILTIN_PLAYLIST_ID) || BUILTIN_PLAYLIST_ID;

        document.addEventListener('keydown', handleKeyDown, false);

        // Hide splash after 1.4s and load active playlist
        setTimeout(function () {
            if (elSplash) elSplash.className = 'hidden';
            loadActivePlaylist(true, false);
        }, 1400);
    }

    window.addEventListener('load', initApp, false);
})();
