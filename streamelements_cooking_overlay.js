/* =========================================================
   THE GENTLEMEN – THE ESTATE KITCHEN FULL OVERLAY
   Komplettes Kochstream-Szenenoverlay für StreamElements & OBS
   Auflösung: 1920 x 1080 (JavaScript)
   ========================================================= */

(function () {
  'use strict';

  // --- 0. GOLDENE PARTIKEL ENGINE ---
  const pCanvas = document.getElementById('particle-canvas');
  if (pCanvas) {
    pCanvas.width = 1920;
    pCanvas.height = 1080;
    const pCtx = pCanvas.getContext('2d');

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.25 + 0.05,
      drift: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2,
      isBright: Math.random() > 0.45
    }));

    // Exakte 16:9 Kamera-Ausschnitte
    const cutouts = [
      { x: 360, y: 20, w: 1160, h: 652 },
      { x: 360, y: 692, w: 654, h: 368 }
    ];

    function drawParticles() {
      pCtx.clearRect(0, 0, 1920, 1080);
      const now = Date.now() * 0.001;

      particles.forEach(p => {
        const inCam = cutouts.some(c => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
        if (!inCam) {
          const alpha = 0.12 + Math.abs(Math.sin(now * 0.6 + p.phase)) * 0.35;
          pCtx.beginPath();
          pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          pCtx.fillStyle = p.isBright 
            ? `rgba(229, 201, 106, ${alpha.toFixed(2)})` 
            : `rgba(200, 168, 75, ${alpha.toFixed(2)})`;
          pCtx.shadowBlur = p.r * 2.5;
          pCtx.shadowColor = 'rgba(229, 201, 106, 0.4)';
          pCtx.fill();
        }

        p.y -= p.speed;
        p.x += p.drift + Math.sin(now * 0.4 + p.phase) * 0.08;

        if (p.y < -6) {
          p.y = 1086;
          p.x = Math.random() * 1920;
        }
        if (p.x < -6) p.x = 1926;
        if (p.x > 1926) p.x = -6;
      });

      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }

  // --- DOM ELEMENTE ---
  const dishTitleEl = document.getElementById('dish-title');
  const courseNameEl = document.getElementById('course-name');
  const stepsListEl = document.getElementById('steps-list');
  const stepCountLabelEl = document.getElementById('step-count-label');
  const culinaryCardEl = document.getElementById('culinary-card');

  const timerSectionEl = document.getElementById('timer-section');
  const timerDisplayEl = document.getElementById('timer-display');
  const timerLabelEl = document.getElementById('timer-label');
  const timerBadgeEl = document.getElementById('timer-badge');
  const timerProgressBarEl = document.getElementById('timer-progress-bar');

  const ingredientsListEl = document.getElementById('ingredients-list');

  const chatMessagesEl = document.getElementById('chat-messages');

  // --- ALERTS DOM ELEMENTE (ORIGINAL SALON-CARD) ---
  const alertCardEl = document.getElementById('alert-card');
  const alertTypeEl = document.getElementById('alert-type');
  const alertMessageEl = document.getElementById('alert-message');
  const alertSignatureEl = document.getElementById('alert-signature');

  // --- ZUSTAND ---
  let stepsData = [];
  let currentActiveStep = 1;

  let timerTotalSeconds = 0;
  let timerRemainingSeconds = 0;
  let timerInterval = null;
  let timerRunning = false;

  let fieldData = {};
  let alertQueue = [];
  let isPlaying = false;

  // --- GENTLEMEN ALERTS SOUND & HISTORY LOGIK ---
  function extractSoundUrl(val) {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') return (val.url || val.src || val.link || '').trim();
    return '';
  }

  function playAlertSound(type) {
    let soundUrl = '';
    if (type.includes('follower')) soundUrl = extractSoundUrl(fieldData.followerSound);
    else if (type.includes('sub')) soundUrl = extractSoundUrl(fieldData.subscriberSound);
    else if (type.includes('tip')) soundUrl = extractSoundUrl(fieldData.tipSound);
    else if (type.includes('raid')) soundUrl = extractSoundUrl(fieldData.raidSound);
    else if (type.includes('cheer')) soundUrl = extractSoundUrl(fieldData.cheerSound);

    const volumePercent = (fieldData.soundVolume !== undefined) ? fieldData.soundVolume : 60;
    const volume = Math.max(0, Math.min(1, volumePercent / 100));

    if (soundUrl) {
      try {
        const audio = new Audio(soundUrl);
        audio.volume = volume;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('[Gentlemen Alerts] Autoplay blockiert:', err);
          });
        }
      } catch (err) {
        console.error('[Gentlemen Alerts] Audio-Fehler:', err);
      }
    }
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
    } catch (e) {}
  }

  function processAlertQueue() {
    if (isPlaying || alertQueue.length === 0 || !alertCardEl) return;
    isPlaying = true;
    showAlert(alertQueue.shift());
  }

  function showAlert(alert) {
    const data = alert.data || {};
    const name = data.name || data.username || 'A Gentleman';

    recordHistoryEvent(alert.type, data);
    alertCardEl.classList.remove('raid-alert');

    let duration = 6000;
    if (alert.type.includes('follower')) {
      duration = 5000;
    } else if (alert.type.includes('sub')) {
      duration = 8000;
    } else if (alert.type.includes('cheer') || alert.type.includes('bits')) {
      duration = 5000;
    } else if (alert.type.includes('raid')) {
      duration = 11000;
      alertCardEl.classList.add('raid-alert');
    } else if (alert.type.includes('tip') || alert.type.includes('donation')) {
      duration = 7000;
    }

    playAlertSound(alert.type);

    if (alert.type.includes('follower')) {
      alertTypeEl.innerText = 'Ein neuer Verbündeter tritt auf den Plan';
      alertMessageEl.innerHTML = `<span class="alert-name">${name}</span> betritt den inneren Kreis.`;
      alertSignatureEl.innerText = 'Herzlich willkommen im Salon.';
    } else if (alert.type.includes('sub')) {
      const gifter = data.sender || data.gifter || 'Ein nobler Spender';
      const recipient = data.name || data.recipient || 'Ein Mitglied';
      const months = data.amount || data.months || data.streak || 1;

      // 1. Sub-Bombe (Community Gift Bomb)
      if (data.bulkGifted === true || data.isCommunityGiftBomb === true) {
        const count = data.amount || data.count || 5;
        alertTypeEl.innerText = '✦   GROSSZÜGIGE RUNDE FÜR DEN SALON   ✦';
        alertMessageEl.innerHTML = `
          <span class="alert-name">${gifter}</span>
          <span style="font-size: 14px; display:block; margin: 4px 0 6px;">spendiert eine Runde für alle:</span>
          <div class="raid-pill">
            <span class="raid-pill-num">${count}</span>
            <span class="raid-pill-label">GIFT-ABOS VERTEILT</span>
          </div>
        `;
        alertSignatureEl.innerText = 'Höchst generös, mein Bester. Champagner für alle!';
      }
      // 2. Einzelnes verschenktes Abo (Single Gift Sub)
      else if (data.gifted === true) {
        alertTypeEl.innerText = 'EIN NOBLER AKTIONÄR ZEIGT SICH GENERÖS';
        alertMessageEl.innerHTML = `
          <span class="alert-name">${gifter}</span>
          <span style="font-size: 14px; display:block; margin: 4px 0 6px;">schenkt ein Salon-Abo an:</span>
          <span class="alert-name" style="font-size: 19px; color: #f3ebd6;">${recipient}</span>
        `;
        alertSignatureEl.innerText = 'Höflichkeit ist die Kunst der wahren Aristokratie.';
      }
      // 3. Resub (Wiederkehrendes Abo mit Monatsanzahl)
      else if (months > 1) {
        alertTypeEl.innerText = `ERNEUERTE TREUE • MONAT ${months}`;
        alertMessageEl.innerHTML = `
          <span class="alert-name">${name}</span>
          <span style="font-size: 14px; display:block; margin: 4px 0 6px;">verlängert das Abkommen:</span>
          <span style="font-size: 17px; color: #e5c96a; font-weight: bold;">${months} Monate in Folge!</span>
        `;
        alertSignatureEl.innerText = 'Beständigkeit ist das wahre Zeichen von Klasse.';
      }
      // 4. Normaler Erst-Sub
      else {
        alertTypeEl.innerText = 'EIN NEUER GÖNNER IM SALON';
        alertMessageEl.innerHTML = `<span class="alert-name">${name}</span> besiegelt die Partnerschaft.`;
        alertSignatureEl.innerText = 'Geschäfte sind Geschäfte. Willkommen an Bord.';
      }
    } else if (alert.type.includes('tip') || alert.type.includes('donation')) {
      const amount = data.amount || 0;
      alertTypeEl.innerText = 'Eine Zuwendung ist eingegangen';
      alertMessageEl.innerHTML = `<span class="alert-name">${name}</span> steuert ${amount}€ bei.`;
      alertSignatureEl.innerText = 'Höchst generös. Höchst weise.';
    } else if (alert.type.includes('raid')) {
      const viewers = data.amount || data.viewers || '10+';
      alertTypeEl.innerText = '✦   HOCHKARÄTIGER BESUCH IM SALON   ✦';
      alertMessageEl.innerHTML = `
        <span class="alert-name">${name}</span>
        <span style="font-size: 14px; display:block; margin: 4px 0 6px;">erscheint mit Gefolge:</span>
        <div class="raid-pill">
          <span class="raid-pill-num">${viewers}</span>
          <span class="raid-pill-label">GENTLEMEN IM GEFOLGE</span>
        </div>
      `;
      alertSignatureEl.innerText = 'Bereiten Sie den besten Jahrgang vor.';
    } else if (alert.type.includes('cheer') || alert.type.includes('bits')) {
      const bits = data.amount || 0;
      alertTypeEl.innerText = 'Ein Zeichen der Anerkennung';
      alertMessageEl.innerHTML = `<span class="alert-name">${name}</span> entbietet ${bits} Bits.`;
      alertSignatureEl.innerText = "Wohl bekomm's, mein Bester.";
    }

    alertCardEl.classList.add('show');

    setTimeout(() => {
      alertCardEl.classList.remove('show');
      setTimeout(() => {
        alertCardEl.classList.remove('raid-alert');
        isPlaying = false;
        processAlertQueue();
      }, 800);
    }, duration);
  }

  // --- SCHRITTE RENDERN ---
  function renderSteps() {
    stepsListEl.innerHTML = '';
    const activeSteps = stepsData.filter(s => s && s.trim().length > 0);
    const total = activeSteps.length;

    stepCountLabelEl.textContent = `Schritt ${currentActiveStep} / ${total || 1}`;

    activeSteps.forEach((stepText, idx) => {
      const stepNum = idx + 1;
      const item = document.createElement('div');
      item.className = 'step-item';

      if (stepNum < currentActiveStep) {
        item.classList.add('completed');
      } else if (stepNum === currentActiveStep) {
        item.classList.add('active');
      }

      item.innerHTML = `
        <div class="step-num-ring">${stepNum < currentActiveStep ? '✓' : stepNum}</div>
        <div class="step-text">${stepText}</div>
      `;

      stepsListEl.appendChild(item);
    });
  }

  function scrollToActiveStep() {
    const viewport = document.querySelector('.steps-scroll-viewport');
    if (!viewport) return;
    const activeItem = stepsListEl.querySelector('.step-item.active');
    if (!activeItem) return;

    const itemTop = activeItem.offsetTop;
    const itemHeight = activeItem.offsetHeight;
    const viewportHeight = viewport.clientHeight;

    const targetScroll = Math.max(0, itemTop - (viewportHeight / 2) + (itemHeight / 2));
    viewport.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  }

  function setActiveStep(num) {
    const total = stepsData.filter(s => s && s.trim().length > 0).length;
    num = Math.max(1, Math.min(total, parseInt(num, 10)));
    currentActiveStep = num;
    renderSteps();
    scrollToActiveStep();

    culinaryCardEl.style.boxShadow = '0 0 30px rgba(200, 168, 75, 0.5)';
    setTimeout(() => {
      culinaryCardEl.style.boxShadow = '';
    }, 600);
  }

  // --- TIMER LOGIK ---
  function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function startTimer(seconds, label = 'KÜCHEN-TIMER') {
    stopTimer();

    timerTotalSeconds = seconds;
    timerRemainingSeconds = seconds;

    timerLabelEl.textContent = label.toUpperCase();
    timerDisplayEl.textContent = formatTime(timerRemainingSeconds);
    timerBadgeEl.textContent = 'LÄUFT';

    timerSectionEl.classList.remove('finished');
    timerSectionEl.classList.add('running');
    timerProgressBarEl.style.width = '0%';

    timerRunning = true;

    timerInterval = setInterval(() => {
      timerRemainingSeconds--;

      if (timerRemainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerDisplayEl.textContent = '00:00';
        timerBadgeEl.textContent = 'FERTIG!';
        timerSectionEl.classList.remove('running');
        timerSectionEl.classList.add('finished');
        timerProgressBarEl.style.width = '100%';
      } else {
        timerDisplayEl.textContent = formatTime(timerRemainingSeconds);
        const pct = ((timerTotalSeconds - timerRemainingSeconds) / timerTotalSeconds) * 100;
        timerProgressBarEl.style.width = `${pct}%`;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerRunning = false;
    timerSectionEl.classList.remove('running', 'finished');
    timerBadgeEl.textContent = 'STANDBY';
    timerProgressBarEl.style.width = '0%';
  }

  function resetTimerToStandard(mins = 10, label = 'KÜCHEN-TIMER') {
    stopTimer();
    timerTotalSeconds = mins * 60;
    timerRemainingSeconds = timerTotalSeconds;
    timerLabelEl.textContent = label.toUpperCase();
    timerDisplayEl.textContent = formatTime(timerRemainingSeconds);
  }

  // --- ZUTATEN RENDERN ---
  function renderIngredients(items) {
    ingredientsListEl.innerHTML = '';
    items.forEach(ingr => {
      if (!ingr || ingr.trim().length === 0) return;
      const div = document.createElement('div');
      div.className = 'ingr-item';
      div.innerHTML = `<span class="ingr-bullet">✦</span> ${ingr}`;
      ingredientsListEl.appendChild(div);
    });
  }

  // --- CHAT NACHRICHT HINZUFÜGEN ---
  function addChatMessage(user, text, badges = []) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    let badgesHtml = '';
    if (badges.includes('moderator')) badgesHtml += '<span class="chat-badge badge-mod">MOD</span>';
    if (badges.includes('subscriber')) badgesHtml += '<span class="chat-badge badge-sub">SUB</span>';
    if (badges.includes('vip')) badgesHtml += '<span class="chat-badge badge-vip">VIP</span>';

    bubble.innerHTML = `
      <div class="chat-user-row">
        ${badgesHtml}
        <span class="chat-username">${user}</span>
      </div>
      <div class="chat-text">${text}</div>
    `;

    chatMessagesEl.appendChild(bubble);

    while (chatMessagesEl.children.length > 9) {
      chatMessagesEl.removeChild(chatMessagesEl.firstChild);
    }
  }

  // --- STREAMELEMENTS WIDGET LOAD ---
  window.addEventListener('onWidgetLoad', function (obj) {
    const data = obj.detail.fieldData || {};

    if (data.dishTitle) dishTitleEl.textContent = data.dishTitle;
    if (data.courseName) courseNameEl.textContent = data.courseName;

    stepsData = [];
    for (let i = 1; i <= 10; i++) {
      if (data[`step${i}`] && data[`step${i}`].trim().length > 0) {
        stepsData.push(data[`step${i}`]);
      }
    }
    if (stepsData.length === 0) {
      stepsData = [
        'Mise en Place & Kräuter hacken',
        'Pfanne erhitzen & Butterschmalz',
        'Scharf anbraten & mit Rosmarin arrosieren',
        'Sauce reduzieren & Fleisch ruhen lassen',
        'Tranchieren, Anrichten & Tasting'
      ];
    }

    currentActiveStep = parseInt(data.currentStep || 1, 10);
    renderSteps();
    scrollToActiveStep();

    const defMins = parseInt(data.timerMinutes || 10, 10);
    resetTimerToStandard(defMins, data.timerDefaultLabel || 'GARZEIT / RUHEN');

    const ingrs = [
      data.ingr1 || '600g Dry Aged Ribeye (Prime Cut)',
      data.ingr2 || 'Frischer Rosmarin & Thymian',
      data.ingr3 || 'Rohmilchbutter & Schmalz',
      data.ingr4 || 'Schwarzer Périgord-Trüffel',
      data.ingr5 || 'Fleur de Sel & Tellicherry Pfeffer',
      data.ingr6 || '',
      data.ingr7 || ''
    ];
    renderIngredients(ingrs);

    fieldData = data || {};
  });

  // --- STREAMELEMENTS EVENTS (CHAT & ALERTS) ---
  window.addEventListener('onEventReceived', function (obj) {
    const listener = obj.detail.listener;
    const event = obj.detail.event;

    // 1. CHAT MESSAGE
    if (listener === 'message') {
      const rawMsg = (event.data && event.data.text) || event.text || '';
      const user = (event.data && event.data.displayName) || event.nick || 'Gast';
      const badges = (event.data && event.data.badges) ? event.data.badges.map(b => b.type) : [];

      addChatMessage(user, rawMsg, badges);

      const cleanMsg = rawMsg.trim();
      if (!cleanMsg.startsWith('!')) return;

      const parts = cleanMsg.split(' ');
      const cmd = parts[0].toLowerCase();
      const arg1 = parts[1] ? parts[1].toLowerCase() : '';
      const restArgs = parts.slice(2).join(' ');

      if (cmd === '!step' || cmd === '!schritt' || cmd === '!phase') {
        if (!arg1 || arg1 === 'next' || arg1 === 'weiter' || arg1 === 'done' || arg1 === 'check' || arg1 === '+') {
          setActiveStep(currentActiveStep + 1);
        } else if (arg1 === 'prev' || arg1 === 'back' || arg1 === 'zurueck' || arg1 === '-') {
          setActiveStep(currentActiveStep - 1);
        } else if (!isNaN(parseInt(arg1, 10))) {
          setActiveStep(parseInt(arg1, 10));
        }
      } else if (cmd === '!next' || cmd === '!weiter' || cmd === '!done' || cmd === '!fertig') {
        setActiveStep(currentActiveStep + 1);
      } else if (cmd === '!prev' || cmd === '!zurueck') {
        setActiveStep(currentActiveStep - 1);
      }

      if (cmd === '!gericht' || cmd === '!dish') {
        const newTitle = parts.slice(1).join(' ');
        if (newTitle) dishTitleEl.textContent = newTitle;
      }

      if (cmd === '!timer') {
        if (arg1 === 'stop' || arg1 === 'reset' || arg1 === 'aus' || arg1 === 'pause') {
          stopTimer();
        } else if (arg1 && !isNaN(parseInt(arg1, 10))) {
          const mins = parseInt(arg1, 10);
          const label = restArgs || 'GARZEIT';
          startTimer(mins * 60, label);
        } else {
          // Ohne Parameter -> Standard-Timer starten (z. B. 10 Min)
          startTimer(timerTotalSeconds > 0 ? timerTotalSeconds : 600, timerLabelEl ? timerLabelEl.textContent : 'GARZEIT');
        }
      } else if (cmd === '!stoptimer' || cmd === '!timerstop') {
        stopTimer();
      }

      if (cmd === '!rezept' || cmd === '!menu') {
        culinaryCardEl.style.transform = 'scale(1.02)';
        culinaryCardEl.style.boxShadow = '0 0 35px rgba(200, 168, 75, 0.6)';
        setTimeout(() => {
          culinaryCardEl.style.transform = '';
          culinaryCardEl.style.boxShadow = '';
        }, 1500);
      }
    }

    // 2. GENTLEMEN ALERTS (FOLLOWER, SUB, BITS, RAID, TIP)
    else if (['follower', 'subscriber', 'sub', 'tip', 'donation', 'raid', 'cheer', 'bits'].some(k => listener.includes(k))) {
      // Sub-Bomben Deduplikation (Einzelne Gift-Subs überspringen, da Sub-Bombe aktiv ist)
      if (listener.includes('sub') && event.isCommunityGift && !event.bulkGifted) {
        return;
      }

      alertQueue.push({ type: listener, data: event });
      processAlertQueue();
    }
  });

  // Standard-Initialisierung bei Start
  stepsData = [
    'Mise en Place & Kräuter hacken',
    'Gusseisenpfanne erhitzen & Butterschmalz',
    'Scharf anbraten & mit Rosmarin arrosieren',
    'Sauce reduzieren & Fleisch ruhen lassen',
    'Tranchieren, Anrichten & Tasting'
  ];
  currentActiveStep = 1;
  renderSteps();
  scrollToActiveStep();
  resetTimerToStandard(10, 'GARZEIT / RUHEN');

  renderIngredients([
    '600g Dry Aged Ribeye (Prime Cut)',
    'Frischer Rosmarin & Thymian',
    'Rohmilchbutter & Schmalz',
    'Schwarzer Périgord-Trüffel',
    'Fleur de Sel & Tellicherry Pfeffer'
  ]);

  // --- CLOUD & HANDY-CONTROLLER SYNC (FIREBASE + LOCALSTORAGE) ---
  const FB_KITCHEN_URL = 'https://doppelxp-stream-default-rtdb.europe-west1.firebasedatabase.app/kitchen_state.json';
  const LOCAL_KEY = 'gentlemen_kitchen_state_v1';
  let lastAppliedCloudTs = 0;

  function applyCloudKitchenState(st) {
    if (!st) return;
    if (st.dishTitle && dishTitleEl) dishTitleEl.textContent = st.dishTitle;
    if (st.courseName && courseNameEl) courseNameEl.textContent = st.courseName;
    if (Array.isArray(st.steps) && st.steps.length > 0) {
      stepsData = st.steps;
    }
    if (typeof st.activeStep === 'number') {
      currentActiveStep = st.activeStep;
    }
    renderSteps();
    scrollToActiveStep();

    if (Array.isArray(st.ingredients) && st.ingredients.length > 0) {
      renderIngredients(st.ingredients);
    }

    if (st.timer) {
      if (timerInterval) clearInterval(timerInterval);
      timerLabelEl.textContent = (st.timer.label || 'GARZEIT').toUpperCase();
      timerTotalSeconds = Math.max(1, st.timer.totalSeconds || 600);

      if (st.timer.running && st.timer.targetEndTimestamp) {
        timerSectionEl.classList.remove('finished');
        timerSectionEl.classList.add('running');
        timerBadgeEl.textContent = 'LÄUFT';
        timerRunning = true;

        const tickCloud = () => {
          const rem = Math.max(0, Math.round((st.timer.targetEndTimestamp - Date.now()) / 1000));
          timerRemainingSeconds = rem;
          if (rem <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            timerDisplayEl.textContent = '00:00';
            timerBadgeEl.textContent = 'FERTIG!';
            timerSectionEl.classList.remove('running');
            timerSectionEl.classList.add('finished');
            timerProgressBarEl.style.width = '100%';
          } else {
            timerDisplayEl.textContent = formatTime(rem);
            const pct = ((timerTotalSeconds - rem) / timerTotalSeconds) * 100;
            timerProgressBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
          }
        };
        tickCloud();
        timerInterval = setInterval(tickCloud, 500);
      } else {
        const rem = Math.max(0, st.timer.remainingSeconds ?? timerTotalSeconds);
        timerRemainingSeconds = rem;
        timerRunning = false;
        timerSectionEl.classList.remove('running', 'finished');
        timerBadgeEl.textContent = 'STANDBY';
        timerDisplayEl.textContent = formatTime(rem);
        const pct = ((timerTotalSeconds - rem) / timerTotalSeconds) * 100;
        timerProgressBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      }
    }
  }

  async function pollKitchenCloud() {
    try {
      const res = await fetch(FB_KITCHEN_URL);
      if (res.ok) {
        const data = await res.json();
        if (data && data.updatedAt && data.updatedAt !== lastAppliedCloudTs) {
          lastAppliedCloudTs = data.updatedAt;
          applyCloudKitchenState(data);
        }
      }
    } catch (e) {}
  }

  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data) applyCloudKitchenState(data);
      } catch (err) {}
    }
  });

  pollKitchenCloud();
  setInterval(pollKitchenCloud, 1500);

  // Globale Steuerung für Testseite & OBS
  window.CookingOverlay = {
    setActiveStep,
    clearChat: () => {
      if (chatMessagesEl) chatMessagesEl.innerHTML = '';
    },
    setSteps: (arr) => {
      if (Array.isArray(arr) && arr.length > 0) {
        stepsData = arr;
        currentActiveStep = 1;
        renderSteps();
        scrollToActiveStep();
      }
    },
    startTimer,
    stopTimer,
    resetTimerToStandard,
    setDish: (title, course) => {
      if (title) dishTitleEl.textContent = title;
      if (course) courseNameEl.textContent = course;
    },
    addChatMessage,
    setIngredients: renderIngredients,

    // Gentlemen Alert Simulator
    testFollow: (name = 'Lord Pearson') => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'follower-latest', event: { name: name } }
      }));
    },
    testSub: (name = 'Bobby Glass', amount = 1) => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'subscriber-latest', event: { name: name, amount: amount } }
      }));
    },
    testResub: (name = 'Bobby Glass', months = 7) => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'subscriber-latest', event: { name: name, amount: months, months: months } }
      }));
    },
    testGiftSub: (gifter = 'Lord Pearson', recipient = 'Arthur') => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'subscriber-latest', event: { sender: gifter, name: recipient, gifted: true } }
      }));
    },
    testSubBomb: (gifter = 'Lord Pearson', count = 10) => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'subscriber-latest', event: { sender: gifter, amount: count, count: count, bulkGifted: true } }
      }));
    },
    testCheer: (name = 'Lady Danbury', bits = 500) => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'cheer-latest', event: { name: name, amount: bits } }
      }));
    },
    testRaid: (name = 'Lady Danbury', viewers = 48) => {
      window.dispatchEvent(new CustomEvent('onEventReceived', {
        detail: { listener: 'raid-latest', event: { name: name, amount: viewers } }
      }));
    }
  };

})();
