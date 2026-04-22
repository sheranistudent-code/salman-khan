"use strict";

let currentInput = null;
let recognition = null;
let isRecording = false;

const micBtn = document.createElement('div');
micBtn.className = 'sikandar-bridge-wrapper';
micBtn.innerHTML = '<button class="sikandar-injected-mic" title="Sikandar Bridge - Speak to type">🎤</button>';
document.body.appendChild(micBtn);

const innerBtn = micBtn.querySelector('.sikandar-injected-mic');

// Initialize speech engine if available
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ur-PK';

    recognition.onstart = () => {
        isRecording = true;
        innerBtn.classList.add('recording');
    };

    recognition.onend = () => {
        isRecording = false;
        innerBtn.classList.remove('recording');
    };

    recognition.onresult = (event) => {
        if (!currentInput) return;
        
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                let text = event.results[i][0].transcript;
                text = applyPunctuation(text);
                
                insertTextAtCursor(currentInput, text);
            }
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

function insertTextAtCursor(ele, text) {
    if (ele.isContentEditable) {
        ele.focus();
        document.execCommand('insertText', false, ' ' + text);
    } else {
        const start = ele.selectionStart;
        const end = ele.selectionEnd;
        const val = ele.value;
        const spacing = (start > 0 && val[start - 1] !== ' ' && val[start - 1] !== '\n') ? ' ' : '';
        ele.value = val.slice(0, start) + spacing + text + val.slice(end);
        ele.selectionStart = ele.selectionEnd = start + spacing.length + text.length;
        ele.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function positionMic(target) {
    const rect = target.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    micBtn.style.display = 'block';
    // Positioning: bottom-right of the input/textarea
    // Adjust logic to keep it within view
    let top = scrollTop + rect.top + (rect.height / 2) - 16;
    let left = scrollLeft + rect.right - 40;

    // Constraints for Gemini/ChatGPT specifically
    if (window.location.hostname.includes('gemini') || window.location.hostname.includes('chatgpt')) {
        // Just place it to the right of the input area if possible
        left = scrollLeft + rect.right + 5;
    }

    micBtn.style.top = `${top}px`;
    micBtn.style.left = `${left}px`;
}

// Track focus
document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target.tagName === 'TEXTAREA' || 
        target.tagName === 'INPUT' || 
        target.isContentEditable) {
        
        // Hide if it's a tiny input like a checkbox or radio
        if (target.tagName === 'INPUT' && (target.type !== 'text' && target.type !== 'search' && target.type !== 'url')) {
            micBtn.style.display = 'none';
            return;
        }

        currentInput = target;
        positionMic(target);
    }
});

// Hide mic when clicking outside
document.addEventListener('mousedown', (e) => {
    if (!micBtn.contains(e.target) && e.target !== currentInput) {
        // Keep it shown if we are recording
        if (!isRecording) {
            micBtn.style.display = 'none';
        }
    }
});

innerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isRecording) {
        recognition.stop();
    } else {
        if (currentInput) {
            currentInput.focus();
            recognition.start();
        }
    }
});

// Handle window resizing
window.addEventListener('resize', () => {
    if (currentInput && micBtn.style.display === 'block') {
        positionMic(currentInput);
    }
});
