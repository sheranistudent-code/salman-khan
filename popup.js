"use strict";

document.addEventListener('DOMContentLoaded', () => {
    let recognition;
    let isRecording = false;
    const output = document.getElementById('output');
    const micBtn = document.getElementById('mic-btn');
    const statusBadge = document.getElementById('status-badge');
    const historyPanel = document.getElementById('history-panel');
    const settingsPanel = document.getElementById('settings-panel');
    const historyList = document.getElementById('history-list');
    const autoCopyToggle = document.getElementById('auto-copy-toggle');
    const persistentToggle = document.getElementById('persistent-toggle');

    let settings = {
        autoCopy: false,
        persistent: false
    };

    // --- Core 0: Initialize Settings ---
    chrome.storage.local.get(['settings'], (res) => {
        if (res.settings) {
            settings = res.settings;
            autoCopyToggle.checked = settings.autoCopy;
            persistentToggle.checked = settings.persistent;
        }
    });

    autoCopyToggle.addEventListener('change', (e) => {
        settings.autoCopy = e.target.checked;
        chrome.storage.local.set({ settings });
    });

    persistentToggle.addEventListener('change', (e) => {
        settings.persistent = e.target.checked;
        chrome.storage.local.set({ settings });
    });

    // --- Core 1: Speech Engine ---
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ur-PK';

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('active');
            statusBadge.innerText = 'سن رہا ہے...';
            statusBadge.classList.add('active');
        };

        recognition.onend = () => {
            if (isRecording && settings.persistent) {
                recognition.start();
            } else {
                stopRecording();
            }
        };

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    let text = event.results[i][0].transcript;
                    text = applyPunctuation(text);
                    
                    const spacing = (output.value && !output.value.endsWith('\n')) ? ' ' : '';
                    output.value += spacing + text;
                    
                    // Auto-copy if enabled
                    if (settings.autoCopy) {
                        navigator.clipboard.writeText(output.value);
                    }
                    
                    saveToHistory(output.value);
                    output.scrollTop = output.scrollHeight;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                statusBadge.innerText = 'Mic Blocked';
                stopRecording();
            }
        };
    }

    function applyPunctuation(text) {
        // Localized for Urdu (PK)
        return text.trim()
            .replace(/\bفل سٹاپ\b/gi, '۔')
            .replace(/\bختمہ\b/gi, '۔')
            .replace(/\bکامہ\b/gi, '،')
            .replace(/\bسوالیہ نشان\b/gi, '؟')
            .replace(/\bنئی لائن\b/gi, '\n')
            .replace(/\bfull stop\b/gi, '۔')
            .replace(/\bcomma\b/gi, '،')
            .replace(/\bquestion mark\b/gi, '؟');
    }

    function stopRecording() {
        isRecording = false;
        micBtn.classList.remove('active');
        statusBadge.innerText = 'تیار ہے';
        statusBadge.classList.remove('active');
        if (recognition) recognition.stop();
    }

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    });

    // --- Core 2: Clipboard Sync ---
    document.getElementById('copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(output.value).then(() => {
            const btn = document.getElementById('copy-btn');
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => btn.innerHTML = original, 1500);
        });
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        output.value = '';
    });

    // --- Integration Hub ---
    document.querySelectorAll('.hub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            navigator.clipboard.writeText(output.value).then(() => {
                chrome.tabs.create({ url: url });
            });
        });
    });

    // --- Panel Management ---
    document.getElementById('history-btn').addEventListener('click', () => {
        historyPanel.classList.remove('hidden');
        renderHistory();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
        settingsPanel.classList.remove('hidden');
    });

    document.getElementById('close-history').addEventListener('click', () => {
        historyPanel.classList.add('hidden');
    });

    document.getElementById('close-settings').addEventListener('click', () => {
        settingsPanel.classList.add('hidden');
    });

    // --- History Logic ---
    function saveToHistory(text) {
        if (!text.trim() || text.length < 3) return;
        chrome.storage.local.get(['history'], (result) => {
            let history = result.history || [];
            history = history.filter(item => item.content !== text);
            history.unshift({ content: text, time: Date.now() });
            history = history.slice(0, 30);
            chrome.storage.local.set({ history: history });
        });
    }

    function renderHistory() {
        chrome.storage.local.get(['history'], (result) => {
            const history = result.history || [];
            historyList.innerHTML = history.length ? '' : '<p style="text-align:center; color:var(--text-dim); margin-top:50px;">No history records found.</p>';
            history.forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerText = item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '');
                div.onclick = () => {
                    output.value = item.content;
                    historyPanel.classList.add('hidden');
                };
                historyList.appendChild(div);
            });
        });
    }

    // --- Visuals: Particle Background ---
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const particlesContainer = document.getElementById('particles');
    particlesContainer.appendChild(canvas);

    let particles = [];
    function initParticles() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedX: Math.random() * 0.5 - 0.25,
                speedY: Math.random() * 0.5 - 0.25,
                opacity: Math.random() * 0.5
            });
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

            ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();
    window.addEventListener('resize', initParticles);
});
