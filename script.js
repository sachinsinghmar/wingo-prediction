let history = JSON.parse(localStorage.getItem('wg_pro_history') || '[]');

// DOM Elements
const periodBox = document.getElementById('period-box');
if (!periodBox || !periodBox.value || periodBox.value === "835") if (periodBox) periodBox.value = "884";
const nextDisplay = document.getElementById('next-result');
const numSuggestion = document.getElementById('number-suggestion');
const confFill = document.getElementById('conf-fill');
const confText = document.getElementById('confidence-text');
const trendText = document.getElementById('trend-type');

let currentPredictionSize = null;
let currentPredictionColor = null;

// Initial Run
renderHistory();
predict();

function addRound(num) {
    const period = periodBox ? periodBox.value : "000";
    const size = num >= 5 ? "BIG" : "SMALL";
    const colors = getColors(num);
    const colorStr = colors.includes('red') ? "RED" : "GREEN";
    let winSize = (currentPredictionSize && size === currentPredictionSize);
    let winColor = (currentPredictionColor && colorStr === currentPredictionColor);
    history.unshift({ period, number: num, size, colors, winSize, winColor });
    if (history.length > 30) history.pop();
    localStorage.setItem('wg_pro_history', JSON.stringify(history));
    if (periodBox) periodBox.value = parseInt(period) + 1;
    renderHistory(); predict();
}

function getColors(n) {
    if (n === 0) return ['red', 'violet'];
    if (n === 5) return ['green', 'violet'];
    return n % 2 === 0 ? ['red'] : ['green'];
}

function aiScoring(history) {
    if (history.length < 10) return { red: 50, green: 50, big: 50, small: 50 };

    const recent = history.slice(0, 50);
    const colors = recent.map(h => h.colors.includes('red') ? "RED" : "GREEN");
    const sizes = recent.map(h => h.size);

    // 1. Skew Analysis (Mean Reversion)
    const redFreq = colors.filter(c => c === "RED").length / colors.length;
    const bigFreq = sizes.filter(s => s === "BIG").length / sizes.length;

    let redProb = 50 + (0.5 - redFreq) * 100; // If red is low, boost it
    let bigProb = 50 + (0.5 - bigFreq) * 100;

    // 2. Correlation (Number to Color)
    const lastNum = history[0].number;
    const historyOfLastNum = recent.filter((h, i) => i > 0 && recent[i - 1].number === lastNum);
    if (historyOfLastNum.length > 0) {
        const nextColAfterNum = historyOfLastNum.map((h, i) => recent[recent.indexOf(h) - 1].colors.includes('red') ? "RED" : "GREEN");
        const redAfterNum = nextColAfterNum.filter(c => c === "RED").length / nextColAfterNum.length;
        redProb = (redProb * 0.7) + (redAfterNum * 100 * 0.3);
    }

    return {
        red: Math.min(95, Math.max(5, redProb)),
        big: Math.min(95, Math.max(5, bigProb))
    };
}

function predict() {
    if (history.length < 5) {
        if (nextDisplay) nextDisplay.innerText = "Minimum 5 rounds chahiye...";
        return;
    }

    const s = history.map(h => h.size);
    const c = history.map(h => h.colors.includes('red') ? "RED" : "GREEN");

    const getStreak = (arr) => {
        let count = 0;
        for (let i = 0; i < arr.length; i++) { if (arr[i] === arr[0]) count++; else break; }
        return count;
    };

    const isZigZag = (arr, n) => {
        if (arr.length < n) return false;
        for (let i = 0; i < n - 1; i++) { if (arr[i] === arr[i + 1]) return false; }
        return true;
    };

    const isMirror = (arr) => {
        if (arr.length < 4) return false;
        return (arr[0] === arr[1] && arr[2] === arr[3] && arr[0] !== arr[2]);
    };

    const ai = aiScoring(history);
    let predSize = s[0], predColor = c[0], confidence = 50, type = "NEUTRAL";

    // --- Decision Engine ---
    const colorStreak = getStreak(c);
    const colorZigZag = isZigZag(c, 4);
    const colorMirror = isMirror(c);

    // Color Logic
    if (colorStreak >= 4) { predColor = c[0]; confidence = 75 + colorStreak; type = "DRAGON"; }
    else if (colorZigZag) { predColor = c[0] === "RED" ? "GREEN" : "RED"; confidence = 82; type = "ZIGZAG"; }
    else if (colorMirror) { predColor = c[0] === "RED" ? "GREEN" : "RED"; confidence = 80; type = "MIRROR"; }
    else {
        predColor = ai.red > 50 ? "RED" : "GREEN";
        confidence = 50 + Math.abs(ai.red - 50);
        type = "AI-SMART";
    }

    // Size Logic
    const sizeStreak = getStreak(s);
    const sizeZigZag = isZigZag(s, 4);
    if (sizeStreak >= 4) { predSize = s[0]; confidence = Math.max(confidence, 76); }
    else if (sizeZigZag) { predSize = s[0] === "BIG" ? "SMALL" : "BIG"; confidence = Math.max(confidence, 82); }
    else {
        predSize = ai.big > 50 ? "BIG" : "SMALL";
        confidence = Math.max(confidence, 60 + Math.abs(ai.big - 50));
    }

    // Final Confidence Tuning
    if (confidence > 98) confidence = 98;
    currentPredictionSize = predSize; currentPredictionColor = predColor;

    if (nextDisplay) {
        nextDisplay.innerText = `${predSize === "BIG" ? "BADA" : "CHOTA"} + ${predColor === "RED" ? "🔴 RED" : "🟢 GREEN"}`;
        nextDisplay.style.color = predColor === "RED" ? "#f43f5e" : "#10b981";
    }
    if (confFill) confFill.style.width = `${confidence}%`;
    if (confText) confText.innerText = `BHAROSA: ${confidence}%`;
    if (trendText) {
        trendText.innerText = `${type} | ${confidence >= 75 ? "CONFIRMED" : "WATCH"}`;
        trendText.style.color = confidence >= 75 ? "#10b981" : "#f59e0b";
    }
}

function renderHistory() {
    const list = document.getElementById('history-list'); if (!list) return;
    list.innerHTML = "";
    const valid = history.filter(h => h.winSize !== null);
    const sizeAcc = valid.length ? Math.round((valid.filter(h => h.winSize).length / valid.length) * 100) : 0;
    const statsEl = document.createElement('div');
    statsEl.style = "display:flex;justify-content:space-around;background:rgba(255,255,255,0.05);padding:10px;border-radius:12px;margin-bottom:15px;font-size:0.75rem;";
    statsEl.innerHTML = `<span>ACCURACY: <b style="color:#10b981">${sizeAcc}%</b></span><span>Rounds: ${history.length}</span>`;
    list.appendChild(statsEl);
    history.forEach(round => {
        const item = document.createElement('div'); item.className = 'history-item';
        let colorStyle = round.colors.length > 1 ? `background:linear-gradient(135deg,var(--${round.colors[0]}) 50%,var(--${round.colors[1]}) 50%)` : `background:var(--${round.colors[0]})`;
        item.innerHTML = `<div><span class="h-p">#${round.period}</span></div><div class="h-n" style="${colorStyle}">${round.number}</div><span class="h-s">${round.size}</span>`;
        list.appendChild(item);
    });
}

function clearData() { if (confirm("Sab clear?")) { history = []; localStorage.removeItem('wg_pro_history'); renderHistory(); predict(); } }

// ===========================
// ⚡ REAL-TIME JALWA CONNECT
// ===========================
const API_URLS = [
    'https://api.jalwaapi.com/api/webapi',
    'https://h5.ar-lottery06.com/api',
    'https://api.a7jalx9.com/api/webapi'
];

const PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
    ''
];

function setBadge(connected, label) {
    const b = document.getElementById('login-badge'); if (!b) return;
    b.style.background = connected ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
    b.style.color = connected ? '#10b981' : '#f43f5e';
    b.innerText = connected ? '✅ CONNECTED' : (label || '❌ NOT CONNECTED');
}

function setStatus(msg, color) {
    const el = document.getElementById('fetch-status'); if (el) { el.style.color = color || '#94a3b8'; el.innerText = msg; }
}

async function jalwaLogin() {
    const phoneEl = document.getElementById('jalwa-phone');
    const passEl = document.getElementById('jalwa-pass');
    if (!phoneEl || !passEl) return;
    const phone = phoneEl.value.trim();
    const pass = passEl.value.trim();
    if (!phone || !pass) return;

    setBadge(false, '⏳ CONNECTING...');
    const loginName = (phone.length === 10) ? '91' + phone : phone;

    async function tryOne(proxy, baseUrl) {
        const fullUrl = baseUrl + '/Member/Login';
        const target = proxy ? (proxy.includes('corsproxy.io') || proxy.includes('allorigins') ? proxy + encodeURIComponent(fullUrl) : proxy + fullUrl) : fullUrl;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
            setStatus(`Cheking ${baseUrl.split('//')[1]}...`, '#a5b4fc');
            const res = await fetch(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginName, loginPassword: pass, loginType: 0 }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const d = await res.json();
            if (d?.data?.token) {
                localStorage.setItem('jalwa_token', d.data.token);
                localStorage.setItem('jalwa_api_base', baseUrl);
                localStorage.setItem('jalwa_phone', phone);
                return d.data.token;
            }
        } catch (e) { }
        return null;
    }

    for (let proxy of PROXIES) {
        for (let baseUrl of API_URLS) {
            const tok = await tryOne(proxy, baseUrl);
            if (tok) {
                setBadge(true); setStatus('✅ Login Success! Sync ho raha hai...', '#10b981');
                return jalwaFetch();
            }
        }
    }
    setBadge(false, '❌ BLOCKED');
    setStatus('⚠️ Kisi server ne response nahi diya. Manual ya Token mode use karein.', '#f43f5e');
}

async function jalwaFetch() {
    const token = localStorage.getItem('jalwa_token');
    const apiBase = localStorage.getItem('jalwa_api_base') || API_URLS[0];
    if (!token) return;

    const url = apiBase + '/Lottery/GetLotteryHistory';
    const body = { gameCode: 'WinGo_30S', pageNo: 1, pageSize: 30 };

    for (let proxy of PROXIES) {
        try {
            const target = proxy ? (proxy.includes('corsproxy.io') || proxy.includes('allorigins') ? proxy + encodeURIComponent(url) : proxy + url) : url;
            const res = await fetch(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(body)
            });
            const d = await res.json();
            if (d?.data?.list) {
                const list = d.data.list;
                history = list.map(r => ({
                    period: String(r.period).slice(-3),
                    number: parseInt(r.number),
                    size: (parseInt(r.number) >= 5 ? 'BIG' : 'SMALL'),
                    colors: getColors(parseInt(r.number)),
                    winSize: null, winColor: null
                }));
                localStorage.setItem('wg_pro_history', JSON.stringify(history));
                if (periodBox) periodBox.value = parseInt(String(list[0].period).slice(-3)) + 1;
                renderHistory(); predict(); setBadge(true);
                setStatus(`✅ ${list.length} rounds sync! #${periodBox.value}`, '#10b981');
                return;
            }
        } catch (e) { }
    }
}

// MANUAL TOKEN FUNCTIONS
function saveManualToken() {
    const tok = document.getElementById('manual-token').value.trim();
    if (!tok) return;
    localStorage.setItem('jalwa_token', tok);
    setBadge(true);
    setStatus('✅ Token Saved! Refresh karke sync karein.', '#10b981');
    jalwaFetch();
}

function copyTokenScript() {
    const script = 'javascript:alert(localStorage.getItem("token"))';
    navigator.clipboard.writeText(script).then(() => {
        setStatus('📋 Script Copied! Jalwa site par paste karein.', '#10b981');
    }).catch(err => {
        const t = document.createElement("textarea"); t.value = script; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
        setStatus('📋 Script Copied!', '#10b981');
    });
}

function masterImport() {
    const input = document.getElementById('master-input').value.trim();
    if (!input) return;
    const rawNums = input.split(/[,\s\n]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    let basePeriod = parseInt(periodBox.value) || 123;
    history = rawNums.map((num, i) => ({ period: String(basePeriod - i).slice(-3), number: num, size: num >= 5 ? 'BIG' : 'SMALL', colors: getColors(num), winSize: null, winColor: null }));
    localStorage.setItem('wg_pro_history', JSON.stringify(history));
    renderHistory(); predict();
    setStatus('✅ ' + history.length + ' rounds imported!', '#10b981');
}

window.addEventListener('DOMContentLoaded', () => {
    const tok = localStorage.getItem('jalwa_token'); if (tok) setBadge(true);
    const savedPhone = localStorage.getItem('jalwa_phone'); if (savedPhone) {
        const pInput = document.getElementById('jalwa-phone');
        if (pInput) pInput.value = savedPhone;
    }
});
