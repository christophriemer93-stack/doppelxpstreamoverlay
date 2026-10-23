/* =========================================================
   THE GENTLEMEN – INTEGRATED VERTICAL ALERTS ENGINE
   Original Salon-Card Design + Multi-Bridge:
   1. StreamElements Native (onEventReceived)
   2. StreamElements Realtime WebSocket API (?jwt=TOKEN oder ?se_token=TOKEN)
   3. Twitch IRC Live-Listener (#d0ppelxp für Subs, Resubs, Gifts, Sub-Bomben, Raids, Bits)
   4. Firebase Realtime Sync & LocalStorage Broadcast (0ms Sync im selben OBS)
   ========================================================= */

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const channelName = (params.get('channel') || 'd0ppelxp').toLowerCase().replace('#', '');
    const seJwtToken = params.get('jwt') || params.get('se_token') || localStorage.getItem('gentlemen_se_jwt') || '';
    const enableSound = params.get('sound') === '1'; // Standardmäßig stumm im Vertikal-Canvas, damit es im Dual-Stream nicht doppelt mit dem 16:9 Alert klingt!

    if (params.get('jwt') || params.get('se_token')) {
        try { localStorage.setItem('gentlemen_se_jwt', seJwtToken); } catch (e) {}
    }

    // --- 1. INJECT ORIGINAL GENTLEMEN ALERT CSS & HTML ---
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Original Gentlemen Alert Card – maßgeschneidert für 9:16 Vertikal-Szenen */
        .gm-vert-alert-wrapper {
            position: absolute;
            left: 50%;
            transform: translateX(-50%) translateY(-28px) scale(0.96);
            width: 860px;
            z-index: 90;
            pointer-events: none;
            opacity: 0;
            transition: transform 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.45s ease;
        }

        .gm-vert-alert-wrapper.show {
            transform: translateX(-50%) translateY(0) scale(1);
            opacity: 1;
        }

        /* Szenen-spezifische Anker-Positionen (damit nie Gesichter oder Cams verdeckt werden!) */
        /* Gaming: Direkt unterhalb der goldenen Trennleiste (y=608px) im oberen Gameplay-Rand */
        body[data-scene="gaming"] .gm-vert-alert-wrapper {
            top: 634px;
        }
        /* Just Chatting: Im unteren Salon-Drittel (oberhalb der Twitch Mobile Safe-Zone), Gesicht in der Mitte bleibt 100% frei */
        body[data-scene="just_chatting"] .gm-vert-alert-wrapper {
            top: 1235px;
        }
        /* Kochszene: Legt sich passgenau über das untere Rezept-Panel (beide 16:9 Kameras oben & Mitte bleiben 100% frei!) */
        body[data-scene="cooking"] .gm-vert-alert-wrapper {
            top: 1304px;
            width: 920px;
        }
        /* Start, BRB & Ende: Edel im oberen Salon-Bereich (oberhalb des 16:9 BRB-Clips / Timers) */
        body[data-scene="starting"] .gm-vert-alert-wrapper,
        body[data-scene="brb"] .gm-vert-alert-wrapper,
        body[data-scene="end"] .gm-vert-alert-wrapper {
            top: 135px;
        }

        .gm-alert-card {
            width: 100%;
            background: linear-gradient(160deg, rgba(24, 38, 24, 0.97) 0%, rgba(34, 48, 30, 0.97) 45%, rgba(22, 34, 22, 0.98) 100%);
            border: 1.5px solid rgba(200, 168, 75, 0.55);
            border-radius: 4px;
            box-shadow:
                0 0 0 2px rgba(8, 14, 8, 0.92),
                0 0 0 4px rgba(200, 168, 75, 0.22),
                0 18px 55px rgba(0, 0, 0, 0.92),
                inset 0 1px 0 rgba(229, 201, 106, 0.28);
            position: relative;
            overflow: hidden;
        }

        .gm-alert-card::before,
        .gm-alert-card::after {
            content: '';
            display: block;
            height: 3.5px;
            background: linear-gradient(90deg, transparent, rgba(200,168,75,0.35) 10%, #c8a84b 30%, #e5c96a 50%, #c8a84b 70%, rgba(200,168,75,0.35) 90%, transparent);
        }
        .gm-alert-card::after {
            position: absolute;
            bottom: 0; left: 0; right: 0;
        }

        /* Spezial Raid-Optik */
        .gm-alert-card.raid-alert {
            background: linear-gradient(160deg, #172417 0%, #2a3d24 45%, #182617 100%);
            border-color: rgba(229, 201, 106, 0.85);
            animation: gmRaidPulse 2.2s infinite alternate ease-in-out;
        }

        @keyframes gmRaidPulse {
            0% { box-shadow: 0 0 0 2px rgba(0,0,0,0.9), 0 0 25px rgba(200,168,75,0.3), 0 18px 55px rgba(0,0,0,0.92); }
            100% { box-shadow: 0 0 0 3px rgba(229,201,106,0.65), 0 0 50px rgba(229,201,106,0.55), 0 18px 55px rgba(0,0,0,0.95); }
        }

        .gm-raid-shimmer {
            position: absolute;
            top: 0; left: -100%; width: 50%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 235, 170, 0.24), transparent);
            transform: skewX(-25deg);
            pointer-events: none;
            display: none;
        }
        .gm-alert-card.raid-alert .gm-raid-shimmer {
            display: block;
            animation: gmShimmerSweep 3s infinite ease-in-out;
        }
        @keyframes gmShimmerSweep {
            0% { left: -100%; }
            45% { left: 160%; }
            100% { left: 160%; }
        }

        .gm-alert-inner {
            padding: 24px 36px 26px;
            position: relative;
            text-align: center;
        }

        .gm-alert-inner::before {
            content: '✦';
            position: absolute;
            font-size: 150px;
            color: rgba(200, 168, 75, 0.045);
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            font-family: serif;
        }

        .gm-divider {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 12px;
        }
        .gm-divider-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(200,168,75,0.55));
        }
        .gm-divider-line.right {
            background: linear-gradient(90deg, rgba(200,168,75,0.55), transparent);
        }
        .gm-divider-ornament {
            font-size: 16px;
            color: #e5c96a;
        }

        .gm-alert-type {
            font-family: 'Playfair Display', serif;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 5px;
            text-transform: uppercase;
            color: rgba(229, 201, 106, 0.85);
            margin-bottom: 10px;
        }

        .gm-alert-message {
            font-family: 'IM Fell English', serif;
            font-size: 29px;
            color: #f3ebd6;
            line-height: 1.35;
            text-shadow: 0 2px 6px rgba(0,0,0,0.85);
        }

        .gm-alert-name {
            font-family: 'Playfair Display', serif;
            font-weight: 900;
            font-size: 36px;
            color: #e5c96a;
            display: block;
            text-shadow: 0 0 18px rgba(200,168,75,0.38);
            margin-bottom: 2px;
        }

        .gm-raid-pill {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: rgba(10, 16, 10, 0.9);
            border: 1.5px solid rgba(229, 201, 106, 0.65);
            border-radius: 24px;
            padding: 7px 24px;
            margin-top: 10px;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.6);
        }
        .gm-raid-pill-num {
            font-family: 'Playfair Display', serif;
            font-weight: 900;
            font-size: 27px;
            color: #e5c96a;
        }
        .gm-raid-pill-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 2.5px;
            color: #f3ebd6;
            text-transform: uppercase;
        }

        .gm-alert-footer {
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .gm-footer-line {
            flex: 1;
            height: 1px;
            background: rgba(200,168,75,0.25);
        }
        .gm-alert-signature {
            font-family: 'IM Fell English', serif;
            font-style: italic;
            font-size: 17px;
            color: rgba(200,168,75,0.7);
            white-space: nowrap;
        }
    `;
    document.head.appendChild(styleEl);

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'gm-vert-alert-wrapper';
    wrapperEl.id = 'gm-vert-alert-wrapper';
    wrapperEl.innerHTML = `
        <div id="gm-alert-card" class="gm-alert-card">
            <div class="gm-raid-shimmer"></div>
            <div class="gm-alert-inner">
                <div class="gm-divider">
                    <div class="gm-divider-line"></div>
                    <div class="gm-divider-ornament">✦</div>
                    <div class="gm-divider-line right"></div>
                </div>
                <div id="gm-alert-type" class="gm-alert-type">DOPPEL XP &bull; The Gentlemen</div>
                <div id="gm-alert-message" class="gm-alert-message">...</div>
                <div class="gm-alert-footer">
                    <div class="gm-footer-line"></div>
                    <span id="gm-alert-signature" class="gm-alert-signature">With compliments</span>
                    <div class="gm-footer-line"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapperEl);

    // --- 2. QUEUE & DISPLAY LOGIC ---
    let alertQueue = [];
    let isPlaying = false;
    let recentDedupe = new Set();

    function queueAlert(type, data, eventId) {
        const dedupeKey = eventId || `${type}_${(data && (data.name || data.username || data.sender)) || ''}_${(data && data.amount) || ''}_${Math.floor(Date.now() / 4000)}`;
        if (recentDedupe.has(dedupeKey)) return;
        recentDedupe.add(dedupeKey);
        if (recentDedupe.size > 50) {
            const first = recentDedupe.values().next().value;
            recentDedupe.delete(first);
        }

        alertQueue.push({ type: String(type || '').toLowerCase(), data: data || {} });
        processQueue();
    }

    function processQueue() {
        if (isPlaying || alertQueue.length === 0) return;
        isPlaying = true;
        showAlert(alertQueue.shift());
    }

    function recordHistoryEvent(type, data) {
        try {
            const key = 'gentlemen_history_v1';
            let hist = { subs: [], followers: [] };
            const saved = localStorage.getItem(key);
            if (saved) hist = JSON.parse(saved);

            const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
            hist.subs = (hist.subs || []).filter(s => (s.timestamp || 0) >= cutoff);
            hist.followers = (hist.followers || []).filter(f => (f.timestamp || 0) >= cutoff);

            if (type.includes('follower')) {
                const name = data.name || data.username;
                if (name) {
                    const idx = hist.followers.findIndex(f => f.name.toLowerCase() === name.toLowerCase());
                    const entry = { name: name, timestamp: Date.now(), tag: 'Neuer Gefährte' };
                    if (idx >= 0) hist.followers[idx] = entry;
                    else hist.followers.unshift(entry);
                }
            } else if (type.includes('sub')) {
                const subName = data.recipient || data.name || data.username;
                const months = data.amount || data.months || data.streak || 1;
                const isGift = data.gifted === true;
                if (subName) {
                    const idx = hist.subs.findIndex(s => s.name.toLowerCase() === subName.toLowerCase());
                    let tag = isGift ? 'Gift-Abo' : (months > 1 ? `Monat ${months}` : 'Abonnent');
                    const entry = { name: subName, timestamp: Date.now(), tag: tag, months: months };
                    if (idx >= 0) hist.subs[idx] = entry;
                    else hist.subs.unshift(entry);
                }
            }
            localStorage.setItem(key, JSON.stringify(hist));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {}
    }

    function playChimeIfEnabled() {
        if (!enableSound) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.09);
                osc.stop(ctx.currentTime + 1.8);
            });
        } catch (e) {}
    }

    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showAlert(alert) {
        const card = document.getElementById('gm-alert-card');
        const typeEl = document.getElementById('gm-alert-type');
        const messageEl = document.getElementById('gm-alert-message');
        const sigEl = document.getElementById('gm-alert-signature');

        const data = alert.data || {};
        const name = esc(data.name || data.username || 'Ein Gentleman');

        recordHistoryEvent(alert.type, data);
        card.classList.remove('raid-alert');

        let duration = 6000;
        if (alert.type.includes('follower')) duration = 5000;
        else if (alert.type.includes('sub')) duration = 8000;
        else if (alert.type.includes('cheer') || alert.type.includes('bits')) duration = 5000;
        else if (alert.type.includes('raid')) {
            duration = 11000;
            card.classList.add('raid-alert');
        } else if (alert.type.includes('tip') || alert.type.includes('donation')) {
            duration = 7000;
        }

        playChimeIfEnabled();

        if (alert.type.includes('follower')) {
            typeEl.innerText = 'Ein neuer Verbündeter tritt auf den Plan';
            messageEl.innerHTML = `<span class="gm-alert-name">${name}</span> betritt den inneren Kreis.`;
            sigEl.innerText = 'Herzlich willkommen im Salon.';
        } else if (alert.type.includes('sub')) {
            const gifter = esc(data.sender || data.gifter || 'Ein nobler Spender');
            const recipient = esc(data.name || data.recipient || 'Ein Mitglied');
            const months = data.amount || data.months || data.streak || 1;

            if (data.bulkGifted === true || data.isCommunityGiftBomb === true) {
                const count = data.amount || data.count || 5;
                typeEl.innerText = '✦   GROSSZÜGIGE RUNDE FÜR DEN SALON   ✦';
                messageEl.innerHTML = `
                    <span class="gm-alert-name">${gifter}</span>
                    <span style="font-size: 24px; display:block; margin: 4px 0 6px;">spendiert eine Runde für alle:</span>
                    <div class="gm-raid-pill">
                        <span class="gm-raid-pill-num">${esc(count)}</span>
                        <span class="gm-raid-pill-label">GIFT-ABOS VERTEILT</span>
                    </div>
                `;
                sigEl.innerText = 'Höchst generös, mein Bester. Champagner für alle!';
            } else if (data.gifted === true) {
                typeEl.innerText = 'EIN NOBLER AKTIONÄR ZEIGT SICH GENERÖS';
                messageEl.innerHTML = `
                    <span class="gm-alert-name">${gifter}</span>
                    <span style="font-size: 24px; display:block; margin: 4px 0 6px;">schenkt ein Salon-Abo an:</span>
                    <span class="gm-alert-name" style="font-size: 28px; color: #f3ebd6;">${recipient}</span>
                `;
                sigEl.innerText = 'Höflichkeit ist die Kunst der wahren Aristokratie.';
            } else if (months > 1 && months < 500) {
                typeEl.innerHTML = `ERNEUERTE TREUE &bull; MONAT ${esc(months)}`;
                messageEl.innerHTML = `
                    <span class="gm-alert-name">${name}</span>
                    <span style="font-size: 24px; display:block; margin: 4px 0 6px;">verlängert das Abkommen:</span>
                    <span style="font-size: 26px; color: #e5c96a; font-weight: bold;">${esc(months)} Monate in Folge!</span>
                `;
                sigEl.innerText = 'Beständigkeit ist das wahre Zeichen von Klasse.';
            } else {
                typeEl.innerText = 'EIN NEUER GÖNNER IM SALON';
                messageEl.innerHTML = `<span class="gm-alert-name">${name}</span> besiegelt die Partnerschaft.`;
                sigEl.innerText = 'Geschäfte sind Geschäfte. Willkommen an Bord.';
            }
        } else if (alert.type.includes('tip') || alert.type.includes('donation')) {
            const amount = data.amount || 0;
            typeEl.innerText = 'Eine Zuwendung ist eingegangen';
            messageEl.innerHTML = `<span class="gm-alert-name">${name}</span> steuert ${esc(amount)}€ bei.`;
            sigEl.innerText = 'Höchst generös. Höchst weise.';
        } else if (alert.type.includes('raid')) {
            const viewers = data.amount || data.viewers || '10+';
            typeEl.innerText = '✦   HOCHKARÄTIGER BESUCH IM SALON   ✦';
            messageEl.innerHTML = `
                <span class="gm-alert-name">${name}</span>
                <span style="font-size: 24px; display:block; margin: 4px 0 6px;">erscheint mit Gefolge:</span>
                <div class="gm-raid-pill">
                    <span class="gm-raid-pill-num">${esc(viewers)}</span>
                    <span class="gm-raid-pill-label">GENTLEMEN IM GEFOLGE</span>
                </div>
            `;
            sigEl.innerText = 'Bereiten Sie den besten Jahrgang vor.';
        } else if (alert.type.includes('cheer') || alert.type.includes('bits')) {
            const bits = data.amount || 0;
            typeEl.innerText = 'Ein Zeichen der Anerkennung';
            messageEl.innerHTML = `<span class="gm-alert-name">${name}</span> entbietet ${esc(bits)} Bits.`;
            sigEl.innerText = 'Wohl bekomm\'s, mein Bester.';
        }

        wrapperEl.classList.add('show');

        setTimeout(() => {
            wrapperEl.classList.remove('show');
            setTimeout(() => {
                card.classList.remove('raid-alert');
                isPlaying = false;
                processQueue();
            }, 800);
        }, duration);
    }

    // --- 3. EMPFANGSKANAL A: STREAMELEMENTS NATIVE (FALLS IN SE EINGEBUNDEN) ---
    window.addEventListener('onEventReceived', function (obj) {
        if (!obj || !obj.detail || !obj.detail.event) return;
        const listener = obj.detail.listener || '';
        const eventData = obj.detail.event || {};
        if (listener.includes('sub') && eventData.isCommunityGift && !eventData.bulkGifted) return;

        if (['follower', 'subscriber', 'sub', 'tip', 'donation', 'raid', 'cheer', 'bits'].some(k => listener.includes(k))) {
            queueAlert(listener, eventData);
        }
    });

    // --- 4. EMPFANGSKANAL B: STREAMELEMENTS REALTIME WEBSOCKET API (MIT JWT TOKEN) ---
    function connectStreamElementsSocket(jwt) {
        if (!jwt) return;
        const ws = new WebSocket('wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket');
        let pingInterval = null;

        ws.onopen = () => {
            pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send('2');
            }, 25000);
        };

        ws.onmessage = (e) => {
            const msg = e.data || '';
            if (msg === '40') {
                ws.send('42' + JSON.stringify(['authenticate', { method: 'jwt', token: jwt }]));
            } else if (msg.startsWith('42')) {
                try {
                    const parsed = JSON.parse(msg.slice(2));
                    const eventName = parsed[0];
                    const payload = parsed[1] || {};
                    if (eventName === 'event' || eventName === 'event:test') {
                        const type = payload.type || payload.listener || '';
                        const data = payload.data || payload.event || payload;
                        if (type.includes('sub') && data.isCommunityGift && !data.bulkGifted) return;
                        if (['follower', 'subscriber', 'sub', 'tip', 'donation', 'raid', 'cheer', 'bits'].some(k => type.includes(k))) {
                            queueAlert(type, data, payload._id);
                        }
                    }
                } catch (err) {}
            }
        };

        ws.onclose = () => {
            clearInterval(pingInterval);
            setTimeout(() => connectStreamElementsSocket(jwt), 6000);
        };
    }

    if (seJwtToken) {
        connectStreamElementsSocket(seJwtToken);
    }

    // --- 5. EMPFANGSKANAL C: TWITCH IRC LIVE-SOCKET (#d0ppelxp) ---
    // Empfängt Subs, Resubs, Gift-Subs, Sub-Bomben, Raids & Bits komplett ohne API-Token!
    function connectTwitchIrcAlerts(chan) {
        const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        ws.onopen = () => {
            ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            ws.send('PASS SCHMOOPIIE');
            ws.send('NICK justinfan' + Math.floor(Math.random() * 89999 + 10000));
            ws.send('JOIN #' + chan);
        };
        ws.onmessage = (e) => {
            const lines = (e.data || '').split('\r\n');
            for (const line of lines) {
                if (!line) continue;
                if (line.startsWith('PING')) {
                    ws.send('PONG :tmi.twitch.tv');
                    continue;
                }

                // 1. USERNOTICE (Sub, Resub, Subgift, Submysterygift, Raid)
                if (line.includes('USERNOTICE')) {
                    const tagPart = line.split(' :')[0] || '';
                    const getTag = (k) => {
                        const m = tagPart.match(new RegExp('(?:^|;)' + k + '=([^;]*)'));
                        return m ? m[1] : '';
                    };

                    const msgId = getTag('msg-id');
                    const displayName = getTag('display-name') || getTag('login') || 'Ein Gentleman';
                    const id = getTag('id') || String(Date.now());

                    if (msgId === 'sub' || msgId === 'resub') {
                        const months = parseInt(getTag('msg-param-cumulative-months') || '1', 10) || 1;
                        queueAlert('subscriber-latest', { name: displayName, amount: months, months: months }, id);
                    } else if (msgId === 'submysterygift') {
                        const count = parseInt(getTag('msg-param-mass-gift-count') || '5', 10) || 5;
                        queueAlert('subscriber-latest', { sender: displayName, amount: count, count: count, bulkGifted: true }, id);
                    } else if (msgId === 'subgift') {
                        // Prüfen ob Teil einer Sub-Bombe (Community Gift) -> nur Einzel-Gifts anzeigen
                        const originId = getTag('msg-param-origin-id');
                        const recipient = getTag('msg-param-recipient-display-name') || getTag('msg-param-recipient-user-name') || 'Ein Mitglied';
                        queueAlert('subscriber-latest', { sender: displayName, name: recipient, recipient: recipient, gifted: true }, id);
                    } else if (msgId === 'raid') {
                        const viewers = parseInt(getTag('msg-param-viewerCount') || '10', 10) || 10;
                        const raider = getTag('msg-param-displayName') || displayName;
                        queueAlert('raid-latest', { name: raider, amount: viewers, viewers: viewers }, id);
                    }
                }

                // 2. PRIVMSG mit Bits (Cheer)
                else if (line.includes('PRIVMSG') && line.includes('bits=')) {
                    const tagPart = line.split(' :')[0] || '';
                    const bitsMatch = tagPart.match(/(?:^|;)bits=([0-9]+)/);
                    if (bitsMatch) {
                        const bits = parseInt(bitsMatch[1], 10);
                        const nameMatch = tagPart.match(/(?:^|;)display-name=([^;]+)/);
                        const cheeryUser = nameMatch ? nameMatch[1] : 'Ein Gentleman';
                        const idMatch = tagPart.match(/(?:^|;)id=([^;]+)/);
                        queueAlert('cheer-latest', { name: cheeryUser, amount: bits }, idMatch ? idMatch[1] : null);
                    }
                }
            }
        };
        ws.onclose = () => setTimeout(() => connectTwitchIrcAlerts(chan), 5000);
    }
    connectTwitchIrcAlerts(channelName);

    // --- 6. EMPFANGSKANAL D: FIREBASE & LOCALSTORAGE SYNC (VON 16:9 ALERTS) ---
    // Wenn gentlemen_alerts.html im 16:9 Stream einen Alert empfängt (auch Follower!), wird er sofort synchronisiert:
    window.addEventListener('storage', (e) => {
        if (e.key === 'gentlemen_live_alert_sync' && e.newValue) {
            try {
                const payload = JSON.parse(e.newValue);
                if (payload && Date.now() - payload.ts < 8000) {
                    queueAlert(payload.type, payload.data, 'sync_' + payload.ts);
                }
            } catch (err) {}
        }
    });

    // Firebase Polling für Cross-PC / StreamElements Cloud-Sync
    const FB_ALERT_URL = 'https://doppelxp-stream-default-rtdb.europe-west1.firebasedatabase.app/live_alert.json';
    let lastFbAlertTs = Date.now();
    setInterval(async () => {
        try {
            const res = await fetch(FB_ALERT_URL);
            if (!res.ok) return;
            const payload = await res.json();
            if (payload && payload.ts && payload.ts > lastFbAlertTs && (Date.now() - payload.ts < 15000)) {
                lastFbAlertTs = payload.ts;
                queueAlert(payload.type, payload.data, 'fb_' + payload.ts);
            }
        } catch (e) {}
    }, 2500);

    // Globale Test-API (für Studio & Vorschau, inkl. postMessage für lokale file:// Iframes!)
    window.GentlemenVerticalAlerts = {
        trigger: (type, data) => queueAlert(type, data, 'manual_' + Date.now() + Math.random())
    };

    window.addEventListener('message', (e) => {
        if (e && e.data && e.data.action === 'gm_alert') {
            queueAlert(e.data.type, e.data.data, 'msg_' + Date.now() + Math.random());
        }
    });
})();
