/* =========================================================
   THE GENTLEMEN – INTEGRATED VERTICAL ALERTS ENGINE (v2)
   Direkt verbunden mit dem StreamElements Realtime Server von d0ppelxp!
   Empfängt ALLE echten Alerts & alle StreamElements "Emulate"-Tests in Echtzeit.
   ========================================================= */

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const channelName = (params.get('channel') || 'd0ppelxp').toLowerCase().replace('#', '');

    // Euer offizieller StreamElements Overlay API-Key für Kanal d0ppelxp (66654638be356b0a6587f9ab)
    const SE_API_TOKEN = params.get('token') || 'CRQBE-BXXw5s6_3svxRorpLEpGruRwGyZO20Dl8untBOo7D_';

    // Sound standardmäßig DEAKTIVIERT (damit es sich in OBS nicht mit dem Haupt-Alert-Overlay doppelt; nur per ?sound=1 aktivierbar)
    const enableSound = params.get('sound') === '1';
    const SE_SOUNDS = {
        follower: 'https://cdn.streamelements.com/uploads/01m551q9mxg1p402f0eyktn4qh.mp3',
        sub: 'https://cdn.streamelements.com/uploads/01m551q9q5hbzev33nh9vcqd00.mp3',
        raid: 'https://cdn.streamelements.com/uploads/01m551q9r9vkdc4pjbfrsv7vzj.mp3',
        cheer: 'https://cdn.streamelements.com/uploads/01m551w5x1spvs5d6sy7w2t6x9.mp3',
        volume: 0.6
    };

    // --- 1. INJECT ORIGINAL GENTLEMEN ALERT CSS & HTML ---
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Original Gentlemen Alert Card – maßgeschneidert für 9:16 Vertikal-Szenen */
        .gm-vert-alert-wrapper {
            position: absolute;
            left: 50%;
            transform: translateX(-50%) translateY(-28px) scale(0.96);
            width: 860px;
            z-index: 95;
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

    function queueAlert(type, rawData, eventId) {
        const data = Object.assign({}, rawData || {});
        // StreamElements liefert bei echten Events displayName/username, bei Emulate-Tests name
        data.name = data.name || data.displayName || data.username || 'Ein Gentleman';

        const dedupeKey = eventId || `${type}_${data.name}_${data.sender || ''}_${data.amount || ''}_${Math.floor(Date.now() / 3000)}`;
        if (recentDedupe.has(dedupeKey)) return;
        recentDedupe.add(dedupeKey);
        if (recentDedupe.size > 60) {
            const first = recentDedupe.values().next().value;
            recentDedupe.delete(first);
        }

        alertQueue.push({ type: String(type || '').toLowerCase(), data: data });
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

    function playAlertAudio(type) {
        if (!enableSound) return;
        let url = '';
        if (type.includes('follower')) url = SE_SOUNDS.follower;
        else if (type.includes('sub')) url = SE_SOUNDS.sub;
        else if (type.includes('raid')) url = SE_SOUNDS.raid;
        else if (type.includes('cheer') || type.includes('bits')) url = SE_SOUNDS.cheer;

        if (url) {
            try {
                const a = new Audio(url);
                a.volume = SE_SOUNDS.volume;
                a.play().catch(() => {});
            } catch (e) {}
        }
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
        const name = esc(data.name || data.displayName || data.username || 'Ein Gentleman');

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

        playAlertAudio(alert.type);

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

    // --- 3. DIREKTE STREAMELEMENTS REALTIME WEBSOCKET VERBINDUNG (EMULATE & ECHTE ALERTS!) ---
    function connectStreamElementsRealtime() {
        const ws = new WebSocket('wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket');
        let pingInterval = null;
        let authSent = false;

        ws.onopen = () => {
            pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send('2');
            }, 24000);
        };

        ws.onmessage = (e) => {
            const msg = String(e.data || '');

            // Socket.IO Handshake abgeschlossen -> mit d0ppelxp apikey authentifizieren
            if ((msg === '40' || msg.startsWith('0{')) && !authSent) {
                if (msg === '40') {
                    authSent = true;
                    ws.send('42' + JSON.stringify(['authenticate', { method: 'apikey', token: SE_API_TOKEN }]));
                } else {
                    setTimeout(() => {
                        if (!authSent && ws.readyState === WebSocket.OPEN) {
                            authSent = true;
                            ws.send('42' + JSON.stringify(['authenticate', { method: 'apikey', token: SE_API_TOKEN }]));
                        }
                    }, 150);
                }
                return;
            }

            if (msg.startsWith('42')) {
                try {
                    const parsed = JSON.parse(msg.slice(2));
                    const eventName = parsed[0];
                    const payload = parsed[1] || {};

                    if (eventName === 'authenticated') {
                        console.log('[Gentlemen Vertical Alerts] Direkt mit StreamElements verbunden (d0ppelxp)!');
                        return;
                    }

                    // 1. "Emulate" Button in StreamElements (event:test)
                    if (eventName === 'event:test') {
                        const listener = String(payload.listener || '').toLowerCase();
                        const ev = payload.event || {};
                        if (listener.includes('sub') && ev.isCommunityGift && !ev.bulkGifted) return;

                        if (['follower', 'subscriber', 'sub', 'tip', 'donation', 'raid', 'cheer', 'bits'].some(k => listener.includes(k))) {
                            queueAlert(listener, ev, 'test_' + Date.now() + Math.random());
                        }
                    }
                    // 2. Echtes Live-Event von StreamElements (event)
                    else if (eventName === 'event') {
                        const type = String(payload.type || payload.listener || '').toLowerCase();
                        const data = payload.data || payload.event || payload;
                        if (type.includes('sub') && data.isCommunityGift && !data.bulkGifted) return;

                        if (['follower', 'subscriber', 'sub', 'tip', 'donation', 'raid', 'cheer', 'bits'].some(k => type.includes(k))) {
                            queueAlert(type, data, payload._id || ('live_' + Date.now()));
                        }
                    }
                } catch (err) {}
            }
        };

        ws.onclose = () => {
            clearInterval(pingInterval);
            setTimeout(connectStreamElementsRealtime, 4000);
        };
    }

    connectStreamElementsRealtime();

    // --- 4. FALLBACK: NATIVE STREAMELEMENTS & STUDIO POSTMESSAGE ---
    window.addEventListener('onEventReceived', function (obj) {
        if (!obj || !obj.detail || !obj.detail.event) return;
        const listener = obj.detail.listener || '';
        const eventData = obj.detail.event || {};
        if (listener.includes('sub') && eventData.isCommunityGift && !eventData.bulkGifted) return;

        if (['follower', 'subscriber', 'sub', 'tip', 'donation', 'raid', 'cheer', 'bits'].some(k => listener.includes(k))) {
            queueAlert(listener, eventData);
        }
    });

    window.GentlemenVerticalAlerts = {
        trigger: (type, data) => queueAlert(type, data, 'manual_' + Date.now() + Math.random())
    };

    window.addEventListener('message', (e) => {
        if (e && e.data && e.data.action === 'gm_alert') {
            queueAlert(e.data.type, e.data.data, 'msg_' + Date.now() + Math.random());
        }
    });
})();
