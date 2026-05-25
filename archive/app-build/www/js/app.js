    // ============================================================
    // PASSWORD GATE
    // ============================================================
    // Hash of "SixPack2026" — plaintext never stored in file
    const PASS_HASH = '178d4d040861e565d184ca15a07ba53018d386e8a2515403e2c38287ab0503ac';
    const MAX_LOCK_ATTEMPTS = 10;
    let lockAttempts = 0;

    async function hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function attemptUnlock() {
        if (lockAttempts >= MAX_LOCK_ATTEMPTS) return;
        const inputEl = document.getElementById('lockPassword');
        const errorEl = document.getElementById('lockError');
        const password = inputEl.value;
        if (!password) { inputEl.focus(); return; }

        const hash = await hashString(password);

        if (hash === PASS_HASH) {
            localStorage.setItem('app_unlocked', '1');
            const gate = document.getElementById('password-gate');
            gate.classList.add('fade-out');
            setTimeout(() => {
                gate.classList.add('hidden');
                init();
            }, 500);
        } else {
            lockAttempts++;
            inputEl.value = '';
            inputEl.classList.remove('error');
            void inputEl.offsetWidth; // force reflow for animation replay
            inputEl.classList.add('error');
            const remaining = MAX_LOCK_ATTEMPTS - lockAttempts;
            if (remaining <= 0) {
                errorEl.innerText = '🔒 Too many attempts. Reload the page to try again.';
                document.querySelector('.lock-btn').disabled = true;
                inputEl.disabled = true;
            } else {
                errorEl.innerText = `Incorrect password — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
            }
        }
    }

    function checkSession() {
        if (localStorage.getItem('app_unlocked') === '1') {
            document.getElementById('password-gate').classList.add('hidden');
            init();
            return true;
        }
        return false;
    }

    // ============================================================
    // STREAK LOGIC
    // ============================================================
    function updateStreak() {
        const todayStr = new Date().toISOString().split('T')[0];
        let lastLogin = localStorage.getItem('last_login');
        let currentStreak = parseInt(localStorage.getItem('app_streak') || '0');

        if (lastLogin !== todayStr) {
            if (lastLogin) {
                let yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                currentStreak = lastLogin === yesterdayStr ? currentStreak + 1 : 1;
            } else {
                currentStreak = 1;
            }
            localStorage.setItem('last_login', todayStr);
            localStorage.setItem('app_streak', currentStreak);
        }
        document.getElementById('streakBadge').innerText = `🔥 ${currentStreak} Day${currentStreak !== 1 ? 's' : ''}`;
    }

    // ============================================================
    // EXERCISE TIP MODAL
    // ============================================================
    function showExerciseTip(name) {
        const tip = exerciseTips[name] || 'Maintain controlled breathing and focus on mind-muscle connection. Keep form strict.';
        document.getElementById('modalTitle').innerText = name;
        document.getElementById('modalBody').innerText = tip;
        const modal = document.getElementById('exerciseModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    function closeModal(e, force = false) {
        const modal = document.getElementById('exerciseModal');
        if (force || e.target.id === 'exerciseModal') {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    // ============================================================
    // WORKOUT DATA & LOGIC
    // ============================================================
    let workoutPlans = {};
    let exerciseTips = {};
    let PHASES = [];
    let currentSelectedDay = 'Monday';

    async function loadStaticData() {
        const [plans, tips, phases] = await Promise.all([
            fetch('./data/workout-plans.json').then(r => { if (!r.ok) throw new Error('workout-plans.json'); return r.json(); }),
            fetch('./data/exercise-tips.json').then(r => { if (!r.ok) throw new Error('exercise-tips.json'); return r.json(); }),
            fetch('./data/phases.json').then(r => { if (!r.ok) throw new Error('phases.json'); return r.json(); }),
        ]);
        workoutPlans = plans;
        exerciseTips = tips;
        PHASES = phases;
    }

    // Dynamically assigns named workout templates to Mon-Sat based on volleyball day.
    // Rules: day-before VB = light cardio, day-after VB = active recovery, 2-days-after = lower.
    function buildSchedule(vbDay, phase) {
        const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const p = workoutPlans[phase];
        const schedule = { Sunday: p.rest };

        if (!vbDay || !days.includes(vbDay)) {
            // Default no-VB week: balanced strength + cardio distribution
            schedule.Monday    = p.upperStrength;
            schedule.Tuesday   = p.cardioA;
            schedule.Wednesday = p.lowerStrength;
            schedule.Thursday  = p.cardioCore;
            schedule.Friday    = p.upperStrength;
            schedule.Saturday  = p.cardioB;
            return schedule;
        }

        const vbIdx = days.indexOf(vbDay);
        // Volleyball day
        schedule[vbDay] = p.volleyball;
        // Day before: light Peloton/cardio — protect legs
        const beforeDay = days[(vbIdx - 1 + 6) % 6];
        schedule[beforeDay] = Object.assign({}, p.cardioCore, {
            _note: '⚡ Light day — protecting legs for tomorrow\'s volleyball'
        });
        // Day after: active recovery — legs still fatigued
        const afterDay = days[(vbIdx + 1) % 6];
        schedule[afterDay] = Object.assign({}, p.cardioA, {
            _note: '🔄 Active recovery — legs still tired from volleyball'
        });
        // 2 days after: Lower Strength — enough recovery gap
        const lowerDay = days[(vbIdx + 2) % 6];
        schedule[lowerDay] = p.lowerStrength;
        // Remaining 2 days: Upper Strength + Endurance cardio
        const remaining = days.filter(d => !schedule[d]);
        schedule[remaining[0]] = p.upperStrength;
        schedule[remaining[1]] = p.cardioB;

        return schedule;
    }

    function selectDay(dayName) {
        currentSelectedDay = dayName;
        document.querySelectorAll('.day-pill').forEach(pill => {
            pill.classList.toggle('active', pill.innerText.startsWith(dayName.substring(0, 3)));
        });
        renderWorkoutDay();
    }

    function renderWorkoutDay() {
        const week = parseInt(document.getElementById('weekSelect').value, 10);
        const vbDay = document.getElementById('volleyballDay').value;
        localStorage.setItem('sm_week', week);
        localStorage.setItem('vb_day', vbDay);
        const container = document.getElementById('workout-content');
        const schedule = buildSchedule(vbDay, week);
        const dayData = schedule[currentSelectedDay] || workoutPlans[week].rest;
        const isRest = dayData.name && dayData.name.startsWith('REST');

        let html = `
            <div class="workout-hero" style="${isRest ? 'border-color: var(--dim); background: #0f0f1a;' : ''}">
                <div style="color:var(--primary); font-size:0.8rem; font-weight:bold; text-transform:uppercase; margin-bottom:5px;">${currentSelectedDay}</div>
                <div class="workout-hero-title" style="${isRest ? 'color: var(--dim);' : ''}">${dayData.name}</div>
                <div class="workout-hero-meta">
                    <span>⏱ ${dayData.time}</span>
                    <span>📝 ${dayData.details}</span>
                </div>
            </div>`;

        if (dayData._note) {
            html += `<div style="background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.82rem;color:var(--primary);">${dayData._note}</div>`;
        }

        const todayDateStr = new Date().toISOString().split('T')[0];
        const savedState = JSON.parse(localStorage.getItem(`wo_${todayDateStr}_${week}_${currentSelectedDay}`) || '{}');

        dayData.exercises.forEach((ex, idx) => {
            const isCompleted = savedState[idx];
            const cleanExName = ex.split('(')[0].trim();
            const safeExName  = cleanExName.replace(/'/g, "\\'");
            const olData = JSON.parse(localStorage.getItem('ol_' + cleanExName) || '{"sets":"","reps":"","weight":""}');
            const lastLogText = olData.weight ? `Last: ${olData.sets}x${olData.reps} @ ${olData.weight}lbs` : 'No previous log';
            const prData = JSON.parse(localStorage.getItem('pr_' + cleanExName) || 'null');
            const prText = prData ? `🏆 PR: ${prData.sets}x${prData.reps} @ ${prData.weight}lbs` : '';
            const histCount = JSON.parse(localStorage.getItem('ol_hist_' + cleanExName) || '[]').length;

            html += `
                <div class="exercise-item ${isCompleted ? 'completed' : ''}" id="ex-item-${idx}">
                    <div class="check-circle" onclick="toggleExercise(${idx}, '${week}', '${currentSelectedDay}')">
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                    <div class="ex-meta">
                        <div class="ex-header-row">
                            <div class="ex-name" onclick="toggleExercise(${idx}, '${week}', '${currentSelectedDay}')">${ex}</div>
                            <button class="info-btn" onclick="showExerciseTip('${safeExName}')">ⓘ</button>
                        </div>
                        <div class="overload-row" onclick="event.stopPropagation()">
                            <span class="overload-label">S:</span>
                            <input type="number" id="s_${idx}" class="mini-input" placeholder="0" value="${olData.sets}" onchange="saveOverload('${safeExName}', ${idx})">
                            <span class="overload-label">R:</span>
                            <input type="number" id="r_${idx}" class="mini-input" placeholder="0" value="${olData.reps}" onchange="saveOverload('${safeExName}', ${idx})">
                            <span class="overload-label">W:</span>
                            <input type="number" id="w_${idx}" class="mini-input wt" placeholder="lbs" value="${olData.weight}" onchange="saveOverload('${safeExName}', ${idx})">
                        </div>
                        <div class="last-logged">${lastLogText}</div>
                        <div class="pr-record" id="pr-info-${idx}">${prText}</div>
                        <div class="pr-banner" id="pr-banner-${idx}">🔥 New PR!</div>
                        ${histCount > 0 ? `<button class="ol-hist-btn" id="ol-hist-btn-${idx}" onclick="toggleOLHistory('${safeExName}', ${idx})">📋 History (${histCount})</button>` : ''}
                        <div id="ol-hist-${idx}" style="display:none;"></div>
                    </div>
                </div>`;
        });

        if (!isRest) {
            html += `
                <button class="action-btn btn-outline" style="margin-top:10px;" onclick="document.getElementById('restTimerFloat').classList.toggle('show')">⏱ Rest Timer</button>
                <button class="action-btn btn-primary" style="margin-top:10px;" onclick="finishWorkout()">🎉 Complete Workout</button>`;
        }

        container.innerHTML = html;
    }

    function toggleExercise(idx, week, day) {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const key = `wo_${todayDateStr}_${week}_${day}`;
        let state = JSON.parse(localStorage.getItem(key) || '{}');
        state[idx] = !state[idx];
        localStorage.setItem(key, JSON.stringify(state));
        const el = document.getElementById(`ex-item-${idx}`);
        if (state[idx]) el.classList.add('completed');
        else el.classList.remove('completed');
    }

    function saveOverload(exerciseName, idx) {
        const sets   = document.getElementById(`s_${idx}`).value;
        const reps   = document.getElementById(`r_${idx}`).value;
        const weight = parseFloat(document.getElementById(`w_${idx}`).value) || 0;
        localStorage.setItem('ol_' + exerciseName, JSON.stringify({ sets, reps, weight }));

        const today = new Date().toISOString().split('T')[0];

        // Save to per-exercise history (last 5 sessions)
        if (sets && reps && weight) {
            let hist = JSON.parse(localStorage.getItem('ol_hist_' + exerciseName) || '[]');
            hist = hist.filter(h => h.date !== today);
            hist.push({ date: today, sets, reps, weight });
            if (hist.length > 5) hist = hist.slice(-5);
            localStorage.setItem('ol_hist_' + exerciseName, JSON.stringify(hist));

            // Update history panel if visible
            const histEl = document.getElementById(`ol-hist-${idx}`);
            if (histEl && histEl.style.display === 'block') renderOLHistory(exerciseName, idx);
        }

        // PR detection
        if (weight > 0) {
            const prData = JSON.parse(localStorage.getItem('pr_' + exerciseName) || 'null');
            if (!prData || weight > parseFloat(prData.weight)) {
                localStorage.setItem('pr_' + exerciseName, JSON.stringify({ sets, reps, weight, date: today }));
                const banner = document.getElementById(`pr-banner-${idx}`);
                if (banner) {
                    banner.classList.remove('show');
                    void banner.offsetWidth;
                    banner.classList.add('show');
                    setTimeout(() => banner.classList.remove('show'), 4000);
                }
                const prEl = document.getElementById(`pr-info-${idx}`);
                if (prEl) prEl.innerText = `🏆 PR: ${sets}x${reps} @ ${weight}lbs`;
            }
        }
    }

    function renderOLHistory(exerciseName, idx) {
        const hist = JSON.parse(localStorage.getItem('ol_hist_' + exerciseName) || '[]');
        const el = document.getElementById(`ol-hist-${idx}`);
        if (!el) return;
        if (hist.length === 0) { el.innerHTML = '<div style="color:var(--dim); font-size:0.75rem;">No history yet.</div>'; return; }
        const rows = [...hist].reverse().map(h =>
            `<tr><td>${h.date.slice(5)}</td><td>${h.sets}x${h.reps}</td><td style="color:var(--primary); font-weight:800;">${h.weight} lbs</td></tr>`
        ).join('');
        el.innerHTML = `<table class="ol-hist-table"><thead><tr><th>Date</th><th>Sets×Reps</th><th>Weight</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    function toggleOLHistory(exerciseName, idx) {
        const el = document.getElementById(`ol-hist-${idx}`);
        if (!el) return;
        const isOpen = el.style.display === 'block';
        el.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) renderOLHistory(exerciseName, idx);
        const btn = document.getElementById(`ol-hist-btn-${idx}`);
        if (btn) btn.innerText = isOpen ? '📋 History' : '📋 Hide';
    }

    function finishWorkout() {
        alert('Workout Complete! Keep that fire burning. Make sure your logs are filled out.');
    }

    // ============================================================
    // REST TIMER
    // ============================================================
    let restTimerInterval = null;
    let restTimerSecs = 0;

    function startRestTimer(seconds, btnEl) {
        document.querySelectorAll('.rest-preset').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        if (restTimerInterval) clearInterval(restTimerInterval);
        restTimerSecs = seconds;
        const countEl = document.getElementById('restCountdown');
        countEl.classList.remove('go');
        updateRestDisplay();

        restTimerInterval = setInterval(() => {
            restTimerSecs--;
            updateRestDisplay();
            if (restTimerSecs <= 0) {
                clearInterval(restTimerInterval);
                restTimerInterval = null;
                document.querySelectorAll('.rest-preset').forEach(b => b.classList.remove('active'));
                countEl.innerText = 'GO!';
                countEl.classList.add('go');
                playTimerBeep();
                setTimeout(() => {
                    countEl.innerText = '—';
                    countEl.classList.remove('go');
                }, 3000);
            }
        }, 1000);
    }

    function updateRestDisplay() {
        const m = Math.floor(restTimerSecs / 60);
        const s = restTimerSecs % 60;
        document.getElementById('restCountdown').innerText = m > 0
            ? `${m}:${String(s).padStart(2, '0')}`
            : `${restTimerSecs}s`;
    }

    function cancelRestTimer() {
        if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
        document.getElementById('restCountdown').innerText = '—';
        document.getElementById('restCountdown').classList.remove('go');
        document.querySelectorAll('.rest-preset').forEach(b => b.classList.remove('active'));
        document.getElementById('restTimerFloat').classList.remove('show');
    }

    function playTimerBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.15, 0.3].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.12);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.15);
            });
        } catch (e) { /* audio not available */ }
    }

    // ============================================================
    // TREND CHART
    // ============================================================
    function pushProgressHistory(weight, waist) {
        const today = new Date().toISOString().split('T')[0];
        let history = JSON.parse(localStorage.getItem('weight_history') || '[]');
        const idx = history.findIndex(h => h.date === today);
        const entry = { date: today, weight: parseFloat(weight) || 0, waist: parseFloat(waist) || 0 };
        if (idx >= 0) history[idx] = entry;
        else history.push(entry);
        if (history.length > 180) history = history.slice(-180);
        localStorage.setItem('weight_history', JSON.stringify(history));
    }

    // ============================================================
    // PHASE PROGRESS TRACKER
    // ============================================================
    function renderPhaseProgress() {
        const container = document.getElementById('phaseProgressCard');
        if (!container) return;

        const startStr = localStorage.getItem('challenge_start');

        if (!startStr) {
            container.innerHTML = `
                <div style="text-align:center; padding:4px 0 6px;">
                    <div style="font-size:0.85rem; color:var(--primary); font-weight:700; margin-bottom:6px;">📅 6-Month Challenge Tracker</div>
                    <div style="font-size:0.78rem; color:var(--dim); margin-bottom:14px; line-height:1.5;">Set your start date once and the app will track which phase you're in, how many weeks have passed, and when you'll hit your 210 lb goal.</div>
                    <button class="start-challenge-btn" onclick="startChallenge()">🚀 Start Challenge — Day 1 Today</button>
                    <div class="start-challenge-note">Saves to your device · won't reset unless you clear browser data</div>
                </div>`;
            return;
        }

        const start = new Date(startStr);
        const today = new Date();
        const daysSince  = Math.max(0, Math.floor((today - start) / 86400000));
        const weeksSince = Math.floor(daysSince / 7);
        const weekNum    = Math.min(weeksSince + 1, 26);

        // Find current phase
        let curIdx = PHASES.findIndex(p => weeksSince >= p.startWk && weeksSince <= p.endWk);
        if (curIdx === -1) curIdx = weeksSince > 25 ? 5 : 0;
        const curPhase = PHASES[curIdx];

        // Within-phase progress
        const weeksIntoPhase = Math.min(weeksSince - curPhase.startWk, curPhase.endWk - curPhase.startWk);
        const phaseDuration  = curPhase.endWk - curPhase.startWk + 1;
        const phasePct       = Math.round((weeksIntoPhase / phaseDuration) * 100);

        // Format dates
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endDate = new Date(start);
        endDate.setDate(start.getDate() + 26 * 7);

        // Days remaining in challenge
        const daysLeft = Math.max(0, Math.ceil((endDate - today) / 86400000));

        // Phase step dots
        let stepsHtml = '';
        PHASES.forEach((p, i) => {
            const isDone   = i < curIdx;
            const isActive = i === curIdx;
            const cls      = isDone ? 'done' : isActive ? 'active' : '';
            const connector = i < 5 ? `<div class="phase-step-connector"></div>` : '';
            stepsHtml += `
                <div class="phase-step ${cls}" onclick="jumpToPhase('${p.key}')">
                    ${connector}
                    <div class="phase-dot">${isDone ? '✓' : p.num}</div>
                    <div class="phase-step-label">Wk${p.wks}<br>${p.label}</div>
                </div>`;
        });

        // Smart phase-switch nudge
        const selectedPhase = document.getElementById('weekSelect') ? document.getElementById('weekSelect').value : '1';
        const suggestBanner = (selectedPhase !== curPhase.key) ? `
            <div class="phase-suggest-banner">
                <div class="phase-suggest-text">💡 Week ${weekNum} → <strong>Phase ${curPhase.num}</strong> recommended for you</div>
                <button class="phase-switch-btn" onclick="jumpToPhase('${curPhase.key}')">Switch</button>
            </div>` : '';

        container.innerHTML = `
            <div class="phase-tracker-header">
                <div>
                    <strong>📅 Week ${weekNum} of 26 · Phase ${curPhase.num}</strong>
                    <small>Started ${fmt(start)}</small>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.78rem; color:var(--dim);">${daysLeft} days left</div>
                    <div style="font-size:0.68rem; color:var(--dim); margin-top:2px;">Goal: ${fmt(endDate)}</div>
                </div>
            </div>
            <div class="phase-steps">${stepsHtml}</div>
            <div class="phase-bar-wrap">
                <div class="phase-bar-fill" style="width:${phasePct}%"></div>
            </div>
            <div class="phase-bar-meta">
                <span>Phase ${curPhase.num} · ${phasePct}% complete</span>
                <span>Wk ${weeksIntoPhase + 1} of ${phaseDuration}</span>
            </div>
            ${suggestBanner}`;
    }

    function startChallenge() {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('challenge_start', today);
        renderPhaseProgress();
        // Auto-switch workout selector to Phase 1
        const ws = document.getElementById('weekSelect');
        if (ws) { ws.value = '1'; localStorage.setItem('sm_week', '1'); renderWorkoutDay(); }
    }

    function jumpToPhase(phaseKey) {
        const ws = document.getElementById('weekSelect');
        if (ws) { ws.value = phaseKey; localStorage.setItem('sm_week', phaseKey); renderWorkoutDay(); }
        renderPhaseProgress();
    }

    function renderTrendChart() {
        const canvas = document.getElementById('trendCanvas');
        if (!canvas || canvas.offsetWidth === 0) return;

        const history = JSON.parse(localStorage.getItem('weight_history') || '[]');
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.offsetWidth;
        const h = 160;
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = w + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        if (history.length < 2) {
            ctx.fillStyle = '#2e2e3e';
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Log weight to build your trend chart', w / 2, h / 2 - 8);
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillStyle = '#1e1e2c';
            ctx.fillText('Phase target lines will appear once you have 2+ logs', w / 2, h / 2 + 10);
            return;
        }

        // Phase targets and the goal — used for scale calculation
        const PHASE_TARGETS = [250, 242, 235, 228, 223, 216, 210];
        const GOAL = 210;

        // Weight scale: span across all logged + target + goal weights so lines make sense
        const wEntries = history.filter(e => e.weight > 0);
        if (wEntries.length < 2) return;
        const allWeights = wEntries.map(e => e.weight).concat(PHASE_TARGETS);
        const dataMin = Math.min(...allWeights) - 2;
        const dataMax = Math.max(...allWeights) + 4;
        const dataRange = dataMax - dataMin || 1;

        const pad = { t: 14, r: 44, b: 22, l: 10 };
        const cw = w - pad.l - pad.r;
        const ch = h - pad.t - pad.b;
        const n  = history.length;

        const xOf = i => pad.l + (i / Math.max(n - 1, 1)) * cw;
        const yOf = v => pad.t + (1 - (v - dataMin) / dataRange) * ch;

        // Phase target lines (subtle, labeled)
        const phaseLabels = ['Ph1·250', 'Ph2·242', 'Ph3·235', 'Ph4·228', 'Ph5·223', 'Ph6·216'];
        const phaseColors = ['rgba(167,139,250,0.18)', 'rgba(167,139,250,0.18)', 'rgba(167,139,250,0.18)',
                             'rgba(167,139,250,0.18)', 'rgba(167,139,250,0.18)', 'rgba(167,139,250,0.18)'];
        PHASE_TARGETS.slice(0, 6).forEach((target, i) => {
            const y = yOf(target);
            if (y < pad.t || y > pad.t + ch) return; // off-chart, skip
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(167,139,250,0.22)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.moveTo(pad.l, y);
            ctx.lineTo(pad.l + cw, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(167,139,250,0.5)';
            ctx.font = '7.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(phaseLabels[i], pad.l + cw + 3, y + 3);
        });

        // Goal line at 210 (green, prominent dashed)
        const goalY = yOf(GOAL);
        if (goalY >= pad.t && goalY <= pad.t + ch) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(74,222,128,0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.moveTo(pad.l, goalY);
            ctx.lineTo(pad.l + cw, goalY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('🏁 210', pad.l + cw + 3, goalY + 3);
        }

        // Weight area fill under the line
        ctx.beginPath();
        ctx.moveTo(xOf(history.indexOf(wEntries[0])), yOf(wEntries[0].weight));
        history.forEach((entry, i) => {
            if (!entry.weight) return;
            ctx.lineTo(xOf(i), yOf(entry.weight));
        });
        const lastWIdx = history.lastIndexOf(wEntries[wEntries.length - 1]);
        ctx.lineTo(xOf(lastWIdx), pad.t + ch);
        ctx.lineTo(xOf(history.indexOf(wEntries[0])), pad.t + ch);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
        grad.addColorStop(0, 'rgba(167,139,250,0.18)');
        grad.addColorStop(1, 'rgba(167,139,250,0.0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Weight line (purple, solid)
        ctx.beginPath();
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        let wStarted = false;
        history.forEach((entry, i) => {
            if (!entry.weight) return;
            if (!wStarted) { ctx.moveTo(xOf(i), yOf(entry.weight)); wStarted = true; }
            else ctx.lineTo(xOf(i), yOf(entry.weight));
        });
        ctx.stroke();

        // End-point dot + label (weight)
        const lastW = wEntries[wEntries.length - 1];
        const lwi = history.lastIndexOf(lastW);
        const lx = xOf(lwi), ly = yOf(lastW.weight);
        ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#a78bfa'; ctx.fill();
        ctx.fillStyle = '#a78bfa'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(lastW.weight + ' lb', lx - 7, ly - 6);

        // Waist line (blue dashed)
        const qEntries = history.filter(e => e.waist > 0);
        if (qEntries.length >= 2) {
            const qVals = qEntries.map(e => e.waist);
            const qMin = Math.min(...qVals) - 1;
            const qMax = Math.max(...qVals) + 1;
            const qRange = qMax - qMin || 1;
            const yQ = v => pad.t + (1 - (v - qMin) / qRange) * ch;

            ctx.beginPath();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.lineJoin = 'round';
            let qStarted = false;
            history.forEach((entry, i) => {
                if (!entry.waist) return;
                if (!qStarted) { ctx.moveTo(xOf(i), yQ(entry.waist)); qStarted = true; }
                else ctx.lineTo(xOf(i), yQ(entry.waist));
            });
            ctx.stroke();
            ctx.setLineDash([]);

            const lastQ = qEntries[qEntries.length - 1];
            const lqi = history.lastIndexOf(lastQ);
            ctx.beginPath(); ctx.arc(xOf(lqi), yQ(lastQ.waist), 3, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8'; ctx.fill();
        }

        // Date axis labels
        ctx.fillStyle = '#3a3a50'; ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(history[0].date.slice(5), pad.l, h - 5);
        if (n > 4) {
            const midIdx = Math.floor(n / 2);
            ctx.textAlign = 'center';
            ctx.fillText(history[midIdx].date.slice(5), xOf(midIdx), h - 5);
        }
        ctx.textAlign = 'right';
        ctx.fillText(history[n - 1].date.slice(5), pad.l + cw, h - 5);
    }

    // ============================================================
    // BODY FAT ESTIMATOR (US Navy Method)
    // ============================================================
    function updateBF() {
        const waist  = parseFloat(document.getElementById('currentWaist').value)  || 0;
        const neck   = parseFloat(document.getElementById('currentNeck').value)   || 0;
        const height = parseFloat(document.getElementById('currentHeight').value) || 0;

        if (neck   > 0) localStorage.setItem('bf_neck', neck);
        if (height > 0) localStorage.setItem('bf_height', height);

        const card = document.getElementById('bfCard');
        if (waist > neck && neck > 0 && height > 0) {
            const bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
            const bfR = Math.max(3, Math.round(bf * 10) / 10);

            let label = '';
            if (bfR > 25)      label = 'High body fat — deficit is everything';
            else if (bfR > 20) label = 'Above average — keep going';
            else if (bfR > 18) label = 'Getting closer — stay consistent';
            else if (bfR > 15) label = 'Almost there — abs are near!';
            else if (bfR > 12) label = '🎉 Visible abs range — you\'re there!';
            else               label = '🏆 Shredded — elite territory!';

            document.getElementById('bfResult').innerText = bfR + '%';
            document.getElementById('bfLabel').innerText = label;

            // Milestones: achieved = past it, current-target = next goal
            const milestones = [25, 20, 18, 15, 12];
            const nextIdx = milestones.findIndex(m => bfR > m); // first milestone not yet beaten
            document.querySelectorAll('.bf-mile').forEach((el, i) => {
                el.classList.remove('achieved', 'current-target');
                if (i < nextIdx)        el.classList.add('achieved');
                else if (i === nextIdx) el.classList.add('current-target');
            });

            card.style.display = 'block';
        } else if (neck > 0 || height > 0) {
            document.getElementById('bfResult').innerText = '—';
            document.getElementById('bfLabel').innerText = neck > 0 ? 'Enter height to calculate' : 'Enter neck measurement';
            document.querySelectorAll('.bf-mile').forEach(el => el.classList.remove('achieved', 'current-target'));
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    }

    // ============================================================
    // MEAL DATABASE  — populated at runtime from recipes.json
    // ============================================================
    const mealDatabase = {
        staples: [],
        prepRecipes: {
            preworkout: [], postworkout: [], breakfast: [], mains: [], snacks: []
        }
    };

    async function loadRecipes() {
        try {
            const res = await fetch('./data/recipes.json');
            if (!res.ok) throw new Error('recipes.json not found');
            const data = await res.json();
            mealDatabase.staples = data.staples || [];
            Object.assign(mealDatabase.prepRecipes, data.prepRecipes || {});
        } catch (e) {
            console.warn('Could not load recipes.json — using fallback data.', e);
            // Minimal inline fallback so the app never breaks
            mealDatabase.prepRecipes.preworkout  = [{ name: 'Banana + Whey Shot', cal: 200, protein: 20, carbs: 30, fat: 2, desc: 'Fast carbs + light protein.', ingredients: [{ item: 'Banana', qty: '1' }, { item: 'Whey Protein', qty: '1 scoop' }], steps: ['Mix whey with water', 'Eat banana alongside'] }];
            mealDatabase.prepRecipes.postworkout  = [{ name: 'Huel Black Recovery Shake', cal: 400, protein: 40, carbs: 17, fat: 18, desc: 'Immediate post-workout hit.', ingredients: [{ item: 'Huel Black Powder', qty: '2 scoops' }, { item: 'Cold Water', qty: '500ml' }], steps: ['Shake with cold water', 'Drink within 30 min'] }];
            mealDatabase.prepRecipes.breakfast    = [{ name: 'High-Pro Oats Bowl', cal: 370, protein: 32, carbs: 44, fat: 7, desc: 'Slow-release carbs + solid protein.', ingredients: [{ item: 'Oats', qty: '70g' }, { item: 'Whey Protein', qty: '0.75 scoop' }], steps: ['Cook oats in milk', 'Stir in whey once cooled'] }];
            mealDatabase.prepRecipes.mains        = [{ name: 'Chickpea & Lentil Curry', cal: 420, protein: 38, carbs: 48, fat: 9, desc: 'Comfort meal baseline.', ingredients: [{ item: 'Chickpeas', qty: '150g' }, { item: 'Masoor Dal', qty: '100g' }, { item: 'Brown Rice', qty: '100g cooked' }], steps: ['Cook dal', 'Add chickpeas and spices', 'Serve with rice'] }];
            mealDatabase.prepRecipes.snacks       = [{ name: 'Cosmic Shake', cal: 200, protein: 28, carbs: 10, fat: 4, desc: 'Quick protein hit.', ingredients: [{ item: 'Cosmic Protein', qty: '1 scoop' }, { item: 'Almond Milk', qty: '250ml' }], steps: ['Shake all ingredients'] }];
        }
    }

    // Recipe data is now in recipes.json — loaded by loadRecipes() above

    let activeWeeklyPrep = { breakfast: [], mains: [], snacks: [] };

    // ============================================================
    // INITIALIZATION
    // ============================================================
    async function init() {
        await loadStaticData();
        await loadRecipes();
        updateStreak();

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        currentSelectedDay = days[new Date().getDay()];

        const savedWeek = localStorage.getItem('sm_week') || 1;
        document.getElementById('weekSelect').value = savedWeek;

        const savedVbDay = localStorage.getItem('vb_day') || '';
        document.getElementById('volleyballDay').value = savedVbDay;

        if (!activeWeeklyPrep.mains.length) shuffleWeeklyPrep();

        selectDay(currentSelectedDay);

        // Restore saved weight/waist/neck/height
        const savedWeight = localStorage.getItem('currentWeight');
        const savedWaist  = localStorage.getItem('currentWaist');
        const savedNeck   = localStorage.getItem('bf_neck');
        const savedHeight = localStorage.getItem('bf_height');
        if (savedWeight) document.getElementById('currentWeight').value = savedWeight;
        if (savedWaist)  document.getElementById('currentWaist').value  = savedWaist;
        if (savedNeck)   document.getElementById('currentNeck').value   = savedNeck;
        if (savedHeight) document.getElementById('currentHeight').value = savedHeight;

        updateProgress();
        updateWaterUI();
        updateStepsUI();

        // Restore photo check
        const savedPhoto = localStorage.getItem('photo_check');
        if (savedPhoto) {
            document.getElementById('photoCheck').checked = true;
            document.getElementById('photoDate').innerText = `Last taken: ${savedPhoto}`;
            document.getElementById('photoDate').style.display = 'block';
        }

        // Sleep tracker
        loadSleepForToday();
        setTimeout(renderSleepChart, 80);

        // Phase progress tracker + trend chart
        setTimeout(renderPhaseProgress, 60);
        setTimeout(renderTrendChart, 80);

        // Deficit card
        setTimeout(updateDeficitCard, 90);

        // Guide tab components (rendered on demand but pre-warm)
        setTimeout(() => { renderHabitChecklist(); renderHeatmap(); }, 100);

        // Weekly check-in (Sunday only)
        checkWeeklyCheckin();
    }

    function switchMainTab(tabId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        const idx = ['workout', 'nutrition', 'grocery', 'guide'].indexOf(tabId);
        document.querySelectorAll('.nav-item')[idx].classList.add('active');
        if (tabId === 'grocery')   renderGroceryList();
        if (tabId === 'workout')   { setTimeout(renderPhaseProgress, 40); setTimeout(renderTrendChart, 50); setTimeout(updateDeficitCard, 60); }
        if (tabId === 'guide')     { setTimeout(renderSleepChart, 50); setTimeout(renderHeatmap, 60); setTimeout(renderHabitChecklist, 70); }
    }

    // ============================================================
    // KITCHEN LOGIC
    // ============================================================
    function showKitchenMode(mode) {
        ['daily', 'weekly', 'track'].forEach(m => {
            document.getElementById(m + '-view').style.display = m === mode ? 'block' : 'none';
            document.getElementById('btn-' + m).className = m === mode ? 'tab-btn active-sub' : 'tab-btn';
        });
        if (mode === 'track') { updateTracking(); updateWaterUI(); updateStepsUI(); }
    }

    function shuffleWeeklyPrep() {
        const getRandom = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
        activeWeeklyPrep.breakfast  = getRandom(mealDatabase.prepRecipes.breakfast, 1);
        activeWeeklyPrep.mains      = getRandom(mealDatabase.prepRecipes.mains, 3);
        activeWeeklyPrep.snacks     = getRandom(mealDatabase.prepRecipes.snacks, 1);
        activeWeeklyPrep.preworkout = getRandom(mealDatabase.prepRecipes.preworkout, 1);
        activeWeeklyPrep.postworkout= getRandom(mealDatabase.prepRecipes.postworkout, 1);
        renderWeeklyPrepUI();
        generateDailyShuffle();
    }

    function renderWeeklyPrepUI() {
        const container = document.getElementById('sample-day-container');
        let html = '';
        const renderItem = (item, cat) => {
            let s = `<div class="meal-card"><div class="meal-time">${cat}</div><div class="meal-name">${item.name}</div><div class="meal-macros" style="margin-bottom:10px;">P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fat}g | ${item.cal} cal</div>`;
            if (item.ingredients) {
                s += `<div class="recipe-card"><div class="recipe-header">📋 Ingredients</div>`;
                item.ingredients.forEach(ing => s += `<div class="ingredient-row"><span>${ing.item}</span><span style="color:var(--dim);">${ing.qty}</span></div>`);
                s += `<div class="recipe-steps" style="margin-top:10px;"><div class="recipe-header">Steps</div>`;
                item.steps.forEach(step => s += `<div class="recipe-step">${step}</div>`);
                s += `</div></div>`;
            }
            return s + `</div>`;
        };
        activeWeeklyPrep.breakfast.forEach(i => html += renderItem(i, 'Breakfast Prep'));
        activeWeeklyPrep.mains.forEach(i => html += renderItem(i, 'Main Meal Prep (Lunch/Dinner)'));
        activeWeeklyPrep.snacks.forEach(i => html += renderItem(i, 'Snack Prep'));
        container.innerHTML = html;
    }

    function generateDailyShuffle() {
        const container = document.getElementById('daily-container');
        const getRand = arr => arr[Math.floor(Math.random() * arr.length)];
        const db = mealDatabase.prepRecipes;

        // 6 time-based slots for a 5:45 AM workout day
        const todayMenu = [
            { slot: '⚡ Pre-Workout',   time: '5:15 AM',  color: 'var(--steps)',   item: getRand(db.preworkout) },
            { slot: '🥤 Post-Workout',  time: '7:00 AM',  color: 'var(--water)',   item: getRand(db.postworkout) },
            { slot: '🍳 Breakfast',     time: '9:30 AM',  color: 'var(--primary)', item: getRand(db.breakfast) },
            { slot: '🍛 Lunch',         time: '12:30 PM', color: 'var(--success)', item: getRand(db.mains) },
            { slot: '🥜 Afternoon Snack', time: '4:00 PM', color: 'var(--purple)', item: getRand(db.snacks) },
            { slot: '🍽️ Dinner',        time: '7:30 PM',  color: 'var(--success)', item: getRand(db.mains) }
        ];

        // Ensure dinner differs from lunch
        const lunchName = todayMenu[3].item?.name;
        const dinnerPool = db.mains.filter(m => m.name !== lunchName);
        todayMenu[5].item = getRand(dinnerPool.length ? dinnerPool : db.mains);

        let html = ''; let totalCal = 0; let totalPro = 0; let totalCarb = 0; let totalFat = 0;
        todayMenu.forEach(meal => {
            if (!meal.item) return;
            const safeName = meal.item.name.replace(/'/g, "\\'");
            totalCal += meal.item.cal; totalPro += meal.item.protein;
            totalCarb += meal.item.carbs; totalFat += meal.item.fat;
            const desc = meal.item.desc ? `<div style="font-size:0.78rem; color:var(--dim); margin:4px 0 6px; font-style:italic;">${meal.item.desc}</div>` : '';
            html += `<div class="guide-card" style="margin-bottom:10px; border-left:3px solid ${meal.color};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.75rem; color:${meal.color}; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${meal.slot}</div>
                    <div style="font-size:0.78rem; color:var(--dim); font-weight:700;">${meal.time}</div>
                </div>
                <div style="font-weight:bold; font-size:1.05rem; margin:5px 0 2px;">${meal.item.name}</div>
                ${desc}
                <div style="font-size:0.78rem; color:var(--dim); background:var(--bg); padding:6px 8px; border-radius:6px; display:flex; gap:10px; flex-wrap:wrap;">
                    <span>🔥 ${meal.item.cal} cal</span>
                    <span style="color:var(--primary);">P: ${meal.item.protein}g</span>
                    <span style="color:var(--water);">C: ${meal.item.carbs}g</span>
                    <span style="color:var(--steps);">F: ${meal.item.fat}g</span>
                </div>
                <button class="add-meal-btn" style="margin-top:8px;" onclick="addMealToTracking('${safeName}', ${meal.item.cal}, ${meal.item.protein}, ${meal.item.carbs}, ${meal.item.fat})">+ Log This Meal</button>
            </div>`;
        });

        const calPct  = Math.round((totalCal  / 2200) * 100);
        const proPct  = Math.round((totalPro  / 210)  * 100);
        const carbPct = Math.round((totalCarb / 180)  * 100);
        const fatPct  = Math.round((totalFat  / 70)   * 100);
        const calColor  = calPct  > 110 ? 'var(--danger)' : calPct  > 95 ? 'var(--success)' : 'var(--text)';
        const proColor  = proPct  >= 95 ? 'var(--success)' : 'var(--primary)';

        const summaryCard = `<div class="stats-card" style="margin-bottom:15px; padding:15px;">
            <div style="font-size:0.7rem; color:var(--dim); font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">📊 Today's Projected Totals</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div style="background:var(--bg); padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:0.65rem; color:var(--dim); text-transform:uppercase; font-weight:700;">Calories</div>
                    <div style="font-size:1.3rem; font-weight:900; color:${calColor};">${totalCal}</div>
                    <div style="font-size:0.65rem; color:var(--dim);">/ 2200 · ${calPct}%</div>
                </div>
                <div style="background:var(--bg); padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:0.65rem; color:var(--dim); text-transform:uppercase; font-weight:700;">Protein</div>
                    <div style="font-size:1.3rem; font-weight:900; color:${proColor};">${totalPro}g</div>
                    <div style="font-size:0.65rem; color:var(--dim);">/ 210g · ${proPct}%</div>
                </div>
                <div style="background:var(--bg); padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:0.65rem; color:var(--dim); text-transform:uppercase; font-weight:700;">Carbs</div>
                    <div style="font-size:1.3rem; font-weight:900; color:var(--water);">${totalCarb}g</div>
                    <div style="font-size:0.65rem; color:var(--dim);">/ 180g · ${carbPct}%</div>
                </div>
                <div style="background:var(--bg); padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:0.65rem; color:var(--dim); text-transform:uppercase; font-weight:700;">Fat</div>
                    <div style="font-size:1.3rem; font-weight:900; color:var(--steps);">${totalFat}g</div>
                    <div style="font-size:0.65rem; color:var(--dim);">/ 70g · ${fatPct}%</div>
                </div>
            </div>
        </div>`;

        container.innerHTML = summaryCard + html;
    }

    // ============================================================
    // TRACKING LOGIC
    // ============================================================
    function addMealToTracking(name, cal, pro, carb, fat) {
        const today = new Date().toISOString().split('T')[0];
        let tracked = JSON.parse(localStorage.getItem(`tracked_${today}`) || '[]');
        tracked.push({ name, cal, protein: pro, carbs: carb, fat: fat, id: Date.now() });
        localStorage.setItem(`tracked_${today}`, JSON.stringify(tracked));
        if (document.getElementById('track-view').style.display === 'block') updateTracking();
    }

    function setMacroBar(barId, value, goal, color) {
        const pct = Math.min(110, (value / goal) * 100);
        const bar = document.getElementById(barId);
        if (bar) {
            bar.style.width = Math.min(100, pct) + '%';
            bar.style.background = pct > 100 ? 'var(--danger)' : color;
        }
    }

    function updateTracking() {
        const today = new Date().toISOString().split('T')[0];
        let tracked = JSON.parse(localStorage.getItem(`tracked_${today}`) || '[]');
        let tCal = 0, tPro = 0, tCarb = 0, tFat = 0;
        tracked.forEach(m => { tCal += m.cal; tPro += m.protein; tCarb += m.carbs; tFat += m.fat; });

        document.getElementById('trackCal').innerText  = tCal;
        document.getElementById('trackPro').innerText  = tPro + 'g';
        document.getElementById('trackCarb').innerText = tCarb + 'g';
        document.getElementById('trackFat').innerText  = tFat + 'g';

        setMacroBar('barCal',  tCal,  2200, 'var(--primary)');
        setMacroBar('barPro',  tPro,   210, 'var(--success)');
        setMacroBar('barCarb', tCarb,  180, 'var(--water)');
        setMacroBar('barFat',  tFat,    70, '#fb923c');

        document.getElementById('tracked-meals').innerHTML = tracked.map(m => `
            <div class="meal-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div><div class="meal-name" style="margin:0 0 5px 0; font-size:1rem;">${m.name}</div><div class="meal-macros">P: ${m.protein}g | ${m.cal}cal</div></div>
                <button class="clear-day-btn" onclick="removeMealTracking(${m.id})">✕</button>
            </div>`).join('') || '<p style="color:var(--dim);">No meals logged.</p>';

        // Refresh habit auto-checks since protein/water may have changed
        renderHabitChecklist();
    }

    function removeMealTracking(id) {
        const today = new Date().toISOString().split('T')[0];
        let tracked = JSON.parse(localStorage.getItem(`tracked_${today}`) || '[]');
        localStorage.setItem(`tracked_${today}`, JSON.stringify(tracked.filter(m => m.id !== id)));
        updateTracking();
    }

    function updateWater(amount) {
        const today = new Date().toISOString().split('T')[0];
        let current = parseInt(localStorage.getItem(`water_${today}`) || '0');
        current = Math.max(0, Math.min(200, current + amount));
        localStorage.setItem(`water_${today}`, current);
        updateWaterUI();
    }

    function updateWaterUI() {
        const today = new Date().toISOString().split('T')[0];
        const current = parseInt(localStorage.getItem(`water_${today}`) || '0');
        document.getElementById('waterDisplay').innerText = `${current} oz`;
        document.getElementById('waterFillBar').style.width = `${Math.min(100, (current / 128) * 100)}%`;
        renderHabitChecklist();
    }

    // ============================================================
    //  STEPS TRACKER
    // ============================================================
    function updateSteps(amount) {
        const today = new Date().toISOString().split('T')[0];
        let current = parseInt(localStorage.getItem(`steps_${today}`) || '0');
        current = Math.max(0, Math.min(99999, current + amount));
        localStorage.setItem(`steps_${today}`, current);
        updateStepsUI();
    }

    function setStepsManual() {
        const input = document.getElementById('stepsManualInput');
        const val = parseInt(input.value);
        if (!isNaN(val) && val >= 0) {
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem(`steps_${today}`, Math.min(99999, val));
            input.value = '';
            updateStepsUI();
        }
    }

    function updateStepsUI() {
        const today = new Date().toISOString().split('T')[0];
        const current = parseInt(localStorage.getItem(`steps_${today}`) || '0');
        const goal = 10000;
        const pct = Math.min(100, (current / goal) * 100);
        const disp = document.getElementById('stepsDisplay');
        const bar  = document.getElementById('stepsBarFill');
        const mile = document.getElementById('stepsMilestone');
        if (disp) disp.innerText = current.toLocaleString();
        if (bar)  bar.style.width = `${pct}%`;
        if (mile) {
            if (current >= goal) {
                mile.innerHTML = `<span style="color:var(--success); font-weight:700;">🎉 Goal reached! ${current.toLocaleString()} steps</span>`;
            } else {
                const remaining = goal - current;
                const pctLabel = Math.round(pct);
                mile.innerText = `${remaining.toLocaleString()} steps to goal · ${pctLabel}% complete`;
            }
        }
        renderHabitChecklist();
    }

    function clearDayTracking() {
        if (confirm('Clear all meals, water, and steps for today?')) {
            const today = new Date().toISOString().split('T')[0];
            localStorage.removeItem(`tracked_${today}`);
            localStorage.removeItem(`water_${today}`);
            localStorage.removeItem(`steps_${today}`);
            updateTracking(); updateWaterUI(); updateStepsUI();
        }
    }

    function copyToSheets() {
        const today = new Date().toISOString().split('T')[0];
        const cal   = document.getElementById('trackCal').innerText;
        const pro   = document.getElementById('trackPro').innerText.replace('g', '');
        const carb  = document.getElementById('trackCarb').innerText.replace('g', '');
        const fat   = document.getElementById('trackFat').innerText.replace('g', '');
        const water = parseInt(localStorage.getItem(`water_${today}`) || '0');
        const steps = parseInt(localStorage.getItem(`steps_${today}`) || '0');
        const weight = document.getElementById('currentWeight').value || '';
        const waist  = document.getElementById('currentWaist').value  || '';
        const tsv = `${today}\t${weight}\t${waist}\t${cal}\t${pro}\t${carb}\t${fat}\t${water}\t${steps}`;

        navigator.clipboard.writeText(tsv).then(() => {
            alert('✅ Copied! Format: Date | Weight | Waist | Cal | Pro | Carb | Fat | Water | Steps');
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = tsv;
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            alert('✅ Copied to clipboard!');
        });
    }

    function togglePhotoCheck() {
        const isChecked = document.getElementById('photoCheck').checked;
        const dateEl = document.getElementById('photoDate');
        if (isChecked) {
            const d = new Date().toLocaleDateString();
            localStorage.setItem('photo_check', d);
            dateEl.innerText = `Last taken: ${d}`;
            dateEl.style.display = 'block';
        } else {
            localStorage.removeItem('photo_check');
            dateEl.style.display = 'none';
        }
    }

    // ============================================================
    // GROCERY & CSV
    // ============================================================
    function renderGroceryList() {
        const container = document.getElementById('dynamic-grocery-list');
        let combined = [];
        [...activeWeeklyPrep.breakfast, ...activeWeeklyPrep.mains, ...activeWeeklyPrep.snacks].forEach(meal => {
            if (meal.ingredients) meal.ingredients.forEach(ing => combined.push(`${ing.item} (${ing.qty})`));
        });
        let html = `<div class="grocery-list"><div class="grocery-category">📦 HUEL & STAPLES</div><div class="grocery-item"><span>Huel Black Edition</span></div><div class="grocery-item"><span>Huel Hot & Savory</span></div><div class="grocery-item"><span>Cosmic Protein</span></div></div>
            <div class="grocery-list"><div class="grocery-category">🔪 PREP INGREDIENTS</div>`;
        [...new Set(combined)].forEach(item => html += `<div class="grocery-item"><span>${item}</span></div>`);
        html += `</div><div class="grocery-list"><div class="grocery-category">💊 SUPPLEMENTS</div><div class="grocery-item"><span>Kaged Pre-Workout Elite (Stim Free)</span><span style="color:var(--dim); font-size:0.8rem;">incl. Creatine + Beta-Alanine</span></div><div class="grocery-item"><span>Multivitamin</span></div></div>`;
        container.innerHTML = html;
    }

    function exportGroceryCSV() {
        let csv = 'data:text/csv;charset=utf-8,Category,Item\nStaples,Huel Black Edition\nStaples,Huel Hot & Savory\nStaples,Cosmic Protein\nSupplements,Kaged Pre-Workout Elite (Stim Free)\nSupplements,Multivitamin\n';
        [...activeWeeklyPrep.breakfast, ...activeWeeklyPrep.mains, ...activeWeeklyPrep.snacks].forEach(meal => {
            if (meal.ingredients) meal.ingredients.forEach(ing => csv += `Prep Recipe (${meal.name}),${ing.item} - ${ing.qty}\n`);
        });
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csv));
        link.setAttribute('download', 'weekly_grocery_list.csv');
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    // ============================================================
    // PROGRESS UPDATE (weight + waist logging)
    // ============================================================
    function updateProgress() {
        const currentWeight = parseFloat(document.getElementById('currentWeight').value) || 250;
        const currentWaist  = parseFloat(document.getElementById('currentWaist').value)  || 0;

        localStorage.setItem('currentWeight', currentWeight);
        if (currentWaist > 0) localStorage.setItem('currentWaist', currentWaist);

        // Push to history and re-render chart
        if (currentWeight !== 250 || currentWaist > 0) {
            pushProgressHistory(currentWeight, currentWaist);
            setTimeout(renderTrendChart, 50);
        }

        const progress = Math.min(100, Math.max(0, ((250 - currentWeight) / 40) * 100));
        setTimeout(() => {
            document.getElementById('progressCircle').style.strokeDashoffset = 376.99 - (progress / 100 * 376.99);
        }, 100);

        document.getElementById('progressPercent').innerText = Math.round(progress) + '%';
        document.getElementById('displayWeight').innerText = currentWeight;
        document.getElementById('displayWaist').innerText = currentWaist > 0 ? currentWaist : '---';

        updateBF();
        updateDeficitCard();
    }

    // ============================================================
    // SLEEP TRACKER
    // ============================================================
    function onSleepSlide(val) {
        document.getElementById('sleepDisplay').innerHTML = `${val} <span>hrs</span>`;
    }

    function logSleep() {
        const val = parseFloat(document.getElementById('sleepSlider').value);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('sleep_' + today, val);
        renderSleepChart();
        const fb = val >= 7 ? '✅ Great sleep! Recovery maximized.' : val >= 6 ? '⚠️ Aim for 7+ hours — cortisol spikes under 7.' : '❌ Poor recovery — prioritize sleep tonight.';
        document.getElementById('sleepFeedback').innerText = fb;
        document.getElementById('sleepFeedback').style.color = val >= 7 ? 'var(--success)' : val >= 6 ? 'var(--primary)' : 'var(--danger)';
    }

    function loadSleepForToday() {
        const today = new Date().toISOString().split('T')[0];
        const saved = parseFloat(localStorage.getItem('sleep_' + today) || '0');
        if (saved) {
            document.getElementById('sleepSlider').value = saved;
            document.getElementById('sleepDisplay').innerHTML = `${saved} <span>hrs</span>`;
            const fb = saved >= 7 ? '✅ Great sleep! Recovery maximized.' : saved >= 6 ? '⚠️ Aim for 7+ hours.' : '❌ Poor recovery — prioritize sleep.';
            document.getElementById('sleepFeedback').innerText = fb;
            document.getElementById('sleepFeedback').style.color = saved >= 7 ? 'var(--success)' : saved >= 6 ? 'var(--primary)' : 'var(--danger)';
        }
    }

    function renderSleepChart() {
        const canvas = document.getElementById('sleepCanvas');
        if (!canvas || canvas.offsetWidth === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.offsetWidth;
        const ch = 80;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        canvas.style.width = cw + 'px';
        canvas.style.height = ch + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const hrs = parseFloat(localStorage.getItem('sleep_' + dateStr) || '0');
            const label = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
            days.push({ label, hrs });
        }

        const barSlot = (cw - 16) / 7;
        const barW = barSlot - 6;
        const maxBarH = ch - 22;

        // Goal line at 7 hrs
        const goalY = ch - 18 - (7 / 10) * maxBarH;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#1e1e2c';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(8, goalY); ctx.lineTo(cw - 8, goalY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#3a3a3a'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('7h', cw - 8, goalY - 2);

        days.forEach((day, i) => {
            const x = 8 + i * barSlot;
            const barH = day.hrs > 0 ? (day.hrs / 10) * maxBarH : 2;
            const y = ch - 18 - barH;

            let color = '#1e1e2c';
            if (day.hrs > 0) {
                if (day.hrs >= 7)      color = '#4ade80';
                else if (day.hrs >= 6) color = '#a78bfa';
                else                   color = '#f87171';
            }

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]) : ctx.rect(x, y, barW, barH);
            ctx.fill();

            ctx.fillStyle = '#3d3d4e'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(day.label, x + barW / 2, ch - 4);

            if (day.hrs > 0) {
                ctx.fillStyle = color; ctx.font = 'bold 8px sans-serif';
                ctx.fillText(day.hrs + 'h', x + barW / 2, y - 2);
            }
        });
    }

    // ============================================================
    // WEEKLY CHECK-IN (Sunday accountability)
    // ============================================================
    function getWeekKey() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
        return `${now.getFullYear()}_W${weekNum}`;
    }

    function checkWeeklyCheckin() {
        if (new Date().getDay() !== 0) return; // Sunday only
        if (localStorage.getItem('checkin_' + getWeekKey())) return; // Already done
        setTimeout(() => {
            const modal = document.getElementById('checkinModal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }, 1500);
    }

    function closeCheckinModal(e) {
        if (e.target.id === 'checkinModal') dismissCheckin();
    }

    function submitCheckin() {
        const weightEl = document.getElementById('checkinWeight');
        const weight = weightEl.value;
        if (!weight) {
            weightEl.classList.add('input-error');
            setTimeout(() => weightEl.classList.remove('input-error'), 1500);
            return;
        }
        const waist = document.getElementById('checkinWaist').value;
        const photo = document.getElementById('checkinPhoto').checked;

        document.getElementById('currentWeight').value = weight;
        if (waist) document.getElementById('currentWaist').value = waist;
        updateProgress();

        if (photo) {
            document.getElementById('photoCheck').checked = true;
            togglePhotoCheck();
        }

        localStorage.setItem('checkin_' + getWeekKey(), new Date().toISOString());
        dismissCheckin();
        setTimeout(() => alert('✅ Weekly check-in saved! You are ' + Math.round(((250 - parseFloat(weight)) / 40) * 100) + '% of the way to goal. Keep grinding.'), 350);
    }

    function dismissCheckin() {
        const modal = document.getElementById('checkinModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    // ============================================================
    // DEFICIT & GOAL DATE CALCULATOR
    // ============================================================
    function updateDeficitCard() {
        const container = document.getElementById('deficitContent');
        if (!container) return;

        const currentWeight = parseFloat(localStorage.getItem('currentWeight') || '250');
        const weightToLose = currentWeight - 210;

        if (weightToLose <= 0) {
            container.innerHTML = `<div style="color:var(--success); font-weight:800; font-size:1.1rem; text-align:center;">🎉 Goal Reached! You hit 210 lbs!</div>`;
            return;
        }

        // Rolling 7-day calorie average from tracked meals
        let totalCals = 0, loggedDays = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const tracked = JSON.parse(localStorage.getItem(`tracked_${dateStr}`) || '[]');
            if (tracked.length > 0) {
                totalCals += tracked.reduce((sum, m) => sum + (m.cal || 0), 0);
                loggedDays++;
            }
        }

        if (loggedDays < 2) {
            container.innerHTML = `<div style="color:var(--dim); font-size:0.85rem;">Log meals in the Kitchen tab for at least 2 days to see your projected goal date.<br><br><strong style="color:var(--text);">${weightToLose.toFixed(1)} lbs</strong> to go.</div>`;
            return;
        }

        const avgCals    = Math.round(totalCals / loggedDays);
        const avgDeficit = 2200 - avgCals;
        const weeklyLoss = (avgDeficit * 7) / 3500;

        if (avgDeficit <= 50) {
            container.innerHTML = `<div style="color:var(--primary); font-size:0.85rem;">⚠️ Avg <strong>${avgCals}</strong> cal/day — barely in a deficit. Hit the 2200 cal goal and push cardio to accelerate.</div>`;
            return;
        }

        const daysToGoal = Math.round((weightToLose / Math.max(0.05, weeklyLoss)) * 7);
        const goalDate   = new Date();
        goalDate.setDate(goalDate.getDate() + daysToGoal);
        const goalDateStr = goalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        container.innerHTML = `
            <div class="deficit-row"><span class="deficit-lbl">Avg Calories (${loggedDays}-day)</span><span class="deficit-val">${avgCals} cal</span></div>
            <div class="deficit-row"><span class="deficit-lbl">Avg Daily Deficit</span><span class="deficit-val">−${avgDeficit} cal</span></div>
            <div class="deficit-row"><span class="deficit-lbl">Projected Weekly Loss</span><span class="deficit-val">~${weeklyLoss.toFixed(1)} lbs/wk</span></div>
            <div class="deficit-row"><span class="deficit-lbl">Remaining</span><span class="deficit-val">${weightToLose.toFixed(1)} lbs</span></div>
            <div class="goal-date-block">
                <div class="goal-date-lbl">ESTIMATED GOAL DATE</div>
                <div class="goal-date-val">${goalDateStr}</div>
            </div>`;
    }

    // ============================================================
    // CUSTOM FOOD LOGGER
    // ============================================================
    function toggleCustomFood() {
        const form   = document.getElementById('customFoodForm');
        const toggle = document.getElementById('customFoodToggle');
        const isOpen = form.style.display === 'block';
        form.style.display = isOpen ? 'none' : 'block';
        toggle.innerText = isOpen ? '+' : '−';
    }

    function logCustomFood() {
        const name = document.getElementById('cfName').value.trim();
        const cal  = parseInt(document.getElementById('cfCal').value)  || 0;
        const pro  = parseInt(document.getElementById('cfPro').value)  || 0;
        const carb = parseInt(document.getElementById('cfCarb').value) || 0;
        const fat  = parseInt(document.getElementById('cfFat').value)  || 0;

        if (!name) { document.getElementById('cfName').focus(); return; }
        if (cal === 0) { document.getElementById('cfCal').focus(); return; }

        addMealToTracking(name, cal, pro, carb, fat);
        updateTracking();

        // Clear inputs
        ['cfName','cfCal','cfPro','cfCarb','cfFat'].forEach(id => { document.getElementById(id).value = ''; });

        // Auto-switch to track view and scroll to history
        showKitchenMode('track');
    }

    // ============================================================
    // WORKOUT HEATMAP
    // ============================================================
    function renderHeatmap() {
        const container = document.getElementById('heatmapGrid');
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Start from the Monday 6 weeks before the current week's Monday
        const dayOfWeek = today.getDay(); // 0=Sun
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() - daysToMonday);
        const startDate = new Date(thisMonday);
        startDate.setDate(thisMonday.getDate() - 42); // 6 weeks back

        const dayLabels = ['M','T','W','T','F','S','S'];
        let html = dayLabels.map(d =>
            `<div class="heatmap-day-label">${d}</div>`
        ).join('');

        for (let col = 0; col < 7; col++) {   // 7 weeks (columns)
            for (let row = 0; row < 7; row++) { // Mon–Sun (rows)
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + col * 7 + row);
                const dateStr = date.toISOString().split('T')[0];
                const isFuture = date > today;
                const isToday  = dateStr === todayStr;

                let done = false;
                if (!isFuture) {
                    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
                    for (const wk of ['1','2','5']) {
                        const key = `wo_${dateStr}_${wk}_${dayNames[row]}`;
                        const state = JSON.parse(localStorage.getItem(key) || '{}');
                        if (Object.values(state).some(v => v === true)) { done = true; break; }
                    }
                }

                const bg     = isFuture ? '#0d0d0d' : done ? 'var(--success)' : '#1f1f1f';
                const border = isFuture ? '#0f0f1a' : done ? 'var(--success)' : '#1e1e2c';
                const outline = isToday ? 'outline:2px solid var(--primary); outline-offset:1px;' : '';
                html += `<div class="heatmap-cell" title="${dateStr}" style="background:${bg}; border:1px solid ${border}; ${outline}"></div>`;
            }
        }
        container.innerHTML = html;
    }

    // ============================================================
    // HABIT CHECKLIST
    // ============================================================
    const HABITS = [
        { id: 'creatine', label: 'Kaged Pre-Workout taken',   note: 'Creatine + Beta-Alanine included · Tap to check', auto: false },
        { id: 'vitamin',  label: 'Multivitamin taken',       note: 'Tap to check',               auto: false },
        { id: 'protein',  label: 'Hit protein goal (200g+)', note: '⚡ Auto — from meal log',     auto: true,
          check: () => {
              const today = new Date().toISOString().split('T')[0];
              const tracked = JSON.parse(localStorage.getItem(`tracked_${today}`) || '[]');
              return tracked.reduce((s, m) => s + (m.protein || 0), 0) >= 200;
          }
        },
        { id: 'sleep',    label: '7+ hrs sleep',             note: '⚡ Auto — from sleep log',    auto: true,
          check: () => parseFloat(localStorage.getItem('sleep_' + new Date().toISOString().split('T')[0]) || '0') >= 7
        },
        { id: 'water',    label: 'Drank 128oz water',        note: '⚡ Auto — from water log',    auto: true,
          check: () => parseInt(localStorage.getItem('water_' + new Date().toISOString().split('T')[0]) || '0') >= 128
        },
        { id: 'photo',    label: 'Progress photo this week', note: '⚡ Auto — from Weekly Flex',  auto: true,
          check: () => !!localStorage.getItem('photo_check')
        },
        { id: 'steps',    label: '10,000 steps walked',      note: '⚡ Auto — from steps log',    auto: true,
          check: () => parseInt(localStorage.getItem('steps_' + new Date().toISOString().split('T')[0]) || '0') >= 10000
        }
    ];

    function renderHabitChecklist() {
        const listEl = document.getElementById('habitList');
        const scoreEl = document.getElementById('habitScoreBadge');
        const barEl   = document.getElementById('habitBarFill');
        if (!listEl) return;

        const today = new Date().toISOString().split('T')[0];
        const key = `habits_${today}`;
        let habitData = JSON.parse(localStorage.getItem(key) || '{}');

        // Auto-evaluate
        HABITS.forEach(h => { if (h.auto && h.check) habitData[h.id] = h.check(); });
        localStorage.setItem(key, JSON.stringify(habitData));

        const checked = HABITS.filter(h => habitData[h.id]).length;
        const total   = HABITS.length;

        if (scoreEl) scoreEl.innerText = `${checked} / ${total}`;
        if (barEl)   barEl.style.width = `${(checked / total) * 100}%`;

        listEl.innerHTML = HABITS.map(h => {
            const isChecked = !!habitData[h.id];
            const clickAttr = h.auto ? '' : `onclick="toggleHabit('${h.id}')"`;
            const cursor    = h.auto ? 'cursor:default;' : 'cursor:pointer;';
            const checkmark = isChecked
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
                : '';
            return `<div class="habit-item" ${clickAttr} style="${cursor}">
                <div class="habit-check ${isChecked ? 'checked' : ''}">${checkmark}</div>
                <div class="habit-label">${h.label}<span class="habit-note">${h.note}</span></div>
            </div>`;
        }).join('');
    }

    function toggleHabit(habitId) {
        const today = new Date().toISOString().split('T')[0];
        const key = `habits_${today}`;
        let habitData = JSON.parse(localStorage.getItem(key) || '{}');
        habitData[habitId] = !habitData[habitId];
        localStorage.setItem(key, JSON.stringify(habitData));
        renderHabitChecklist();
    }

    // ============================================================
    // DATA BACKUP & RESTORE
    // ============================================================
    function downloadBackup() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `6pack_backup_${today}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function restoreBackup(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const count = Object.keys(data).length;
                if (confirm(`Restore ${count} data entries from backup?\n\nThis will overwrite ALL current data and reload the page.`)) {
                    localStorage.clear();
                    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
                    alert('✅ Backup restored successfully! Reloading...');
                    location.reload();
                }
            } catch (err) {
                alert('Error reading file. Make sure it\'s a valid 6-Pack Challenge backup (.json).');
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    // ============================================================
    // SETTINGS / RESET
    // ============================================================
    function hardReset() {
        if (confirm('Wipe ALL data and factory reset? This cannot be undone.')) {
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
        }
    }

    // ============================================================
    // BOOT: check session, show gate or init directly
    // ============================================================
    checkSession();
