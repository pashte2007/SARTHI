let currentField = null;
let fields = [];
let currentIndex = 0;
let recognition = null;
let aiSupported = true;
let isProcessing = false; 
let silenceTimer = null; 
let isManuallyStopped = false; 
let isListening = false; 

const statusText = document.getElementById('aiStatusText');
const statusLabel = document.getElementById('statusLabel');
const startBtn = document.getElementById('startBtn');

// Force Chrome to load voices into memory on page load
window.speechSynthesis.getVoices(); 

function setStatus(state) {
    if (!statusText) return;
    statusText.className = 'ai-status'; 
    if (state === 'listening') {
        statusText.classList.add('status-listening');
        statusLabel.innerText = "Listening... (Take your time)";
    } else if (state === 'thinking') {
        statusText.classList.add('status-thinking');
        statusLabel.innerText = "Translating & Processing...";
    } else {
        statusLabel.innerText = "System Ready";
    }
}

window.onload = function() {
    if (typeof window.pagePipeline !== 'undefined') {
        fields = window.pagePipeline.map(id => document.getElementById(id));
        
        let firstEmptyIndex = -1;

        fields.forEach((input, index) => {
            if(input) {
                // --- 🚀 FIX 1: RESTORE FROM LOCAL STORAGE ---
                let savedValue = localStorage.getItem(input.id);
                if (savedValue) {
                    input.value = savedValue;
                } else if (firstEmptyIndex === -1) {
                    firstEmptyIndex = index; // Find where they left off!
                }

                // Save manual typing to local storage just in case
                input.addEventListener("input", function() {
                    localStorage.setItem(this.id, this.value);
                });
                // --- END FIX 1 ---

                input.addEventListener("click", function() {
                    currentField = this;
                    currentIndex = index;
                });
            }
        });

        // Start the mic at the first empty field, not the very beginning
        if (fields.length > 0) {
            currentIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
            currentField = fields[currentIndex];
            
            // If the whole form is already filled upon reload, set to Done
            if (firstEmptyIndex === -1 && startBtn) {
                startBtn.innerText = "✅ Done";
                startBtn.style.background = "#00e676";
            }
        }
    }
};

// --- 🚀 FIX 2: RESET FORM LOGIC ---
function resetForm() {
    fields.forEach(input => {
        if(input) {
            input.value = "";
            localStorage.removeItem(input.id); // Clear saved data
        }
    });
    
    currentIndex = 0;
    if (fields.length > 0) currentField = fields[0];
    
    isListening = false;
    isManuallyStopped = false;
    
    setStatus('ready');
    startBtn.innerText = "🎤 Start Assistant";
    startBtn.style.background = "#00e676"; // Return to original start color
    
    if(window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance("Form reset and ready."));
    }
}
// --- END FIX 2 ---

function playPromptAndListen() {
    const elderlyMode = document.getElementById('elderlyMode');
    
    if (elderlyMode && elderlyMode.checked && window.voicePrompts && currentField && window.voicePrompts[currentField.id]) {
        setStatus('ready');
        statusLabel.innerText = "🤖 Speaking...";
        
        window.speechSynthesis.cancel(); 
        try { recognition.stop(); } catch(e) {}
        
        let textToSpeak = window.voicePrompts[currentField.id];
        let utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        window.currentUtterance = utterance; 
        utterance.rate = 0.85; 
        utterance.lang = window.promptLanguage || "en-IN"; 
        
        utterance.onend = function() {
            if (isManuallyStopped) return; 
            setStatus('listening');
            try { recognition.start(); } catch(e) {}
        };

        utterance.onerror = function(event) {
            console.error("Browser Voice Error:", event.error);
            setStatus('listening'); 
            try { recognition.start(); } catch(e) {}
        };
        
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
        
    } else {
        setStatus('listening');
        try { recognition.start(); } catch(e) {}
    }
}

function startVoice() {
    // --- 🚀 FIX 3: INTERCEPT "DONE" CLICK TO TRIGGER RESET ---
    if (startBtn.innerText.includes("Done")) {
        resetForm();
        return; 
    }
    // --- END FIX 3 ---

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { 
        aiSupported = false;
        alert("🚨 Speech Recognition blocked. Please use Google Chrome."); 
        return; 
    }

    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = true; 
        recognition.lang = "en-IN"; 
        
        recognition.onresult = function(event) {
            if (isProcessing) return; 

            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }

            if (currentField) {
                currentField.value = transcript;
            }

            clearTimeout(silenceTimer);

            let waitTime = 1500; 
            let hardFields = ["bank_ifsc", "bank_account", "aadhar_number", "train_name"];
            
            if (currentField && hardFields.includes(currentField.id)) {
                waitTime = 4000; 
                statusLabel.innerText = "Listening... (Take your time reading)";
            }

            silenceTimer = setTimeout(() => {
                if (transcript.trim() !== "") {
                    processWithAI(transcript.trim());
                }
            }, waitTime); 
        };

        recognition.onerror = function(event) {
            if (isProcessing) return; 
            setStatus('ready');
            statusLabel.innerText = "Microphone Paused. Click Start.";
        };

        recognition.onend = function() {
            if (isProcessing || isManuallyStopped) return; 
            
            const elderlyMode = document.getElementById('elderlyMode');
            if (elderlyMode && elderlyMode.checked && currentField && currentField.value === "") {
                statusLabel.innerText = "👵 Patience Mode: Still listening...";
                try { recognition.start(); } catch(e) {}
            }
        };
    }

    if (isListening) {
        isManuallyStopped = true;
        isListening = false;
        startBtn.innerText = "🎤 Start Assistant";
        startBtn.style.background = "#00e676";
        
        window.speechSynthesis.cancel(); 
        try { recognition.stop(); } catch(e) {}
        
        setStatus('ready');
        return; 
    }

    isManuallyStopped = false;
    isListening = true;
    startBtn.innerText = "🛑 Stop Assistant";
    startBtn.style.background = "#ff1744";

    playPromptAndListen();
}

async function processWithAI(finalText) {
    isProcessing = true; 
    try { recognition.stop(); } catch(e) {} 
    
    setStatus('thinking');
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalText, field_id: currentField.id })
        });

        const data = await response.json();
        
        if (data.status === 'success') {
            currentField.value = data.text; 
            
            // --- 🚀 FIX 4: SAVE AI OUTPUT TO LOCAL STORAGE ---
            localStorage.setItem(currentField.id, data.text);
            
            currentIndex++;
            if (currentIndex < fields.length) {
                currentField = fields[currentIndex];
                const elderlyMode = document.getElementById('elderlyMode');
                if (elderlyMode && elderlyMode.checked) {
                    setTimeout(() => { isProcessing = false; playPromptAndListen(); }, 1500); 
                } else {
                    setTimeout(() => {
                        isProcessing = false;
                        setStatus('listening');
                        currentField.value = ""; 
                        try { recognition.start(); } catch(e) {}
                    }, 1000);
                }
            }else{
                // --- 🚀 DYNAMIC CLIMAX (DETECTS WHICH FORM IS OPEN) ---
                isProcessing = false;
                setStatus('ready');
                statusLabel.innerText = "Form Complete!";
                startBtn.innerText = "✅ Done";
                startBtn.style.background = "#00e676";

                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    
                    let finalSentence = "Form complete. Thank you for using Sarthi A I.";

                    // Check if it's the Railway Form
                    if (document.getElementById('train_name')) {
                        let t_passengers = document.getElementById('passengers') ? document.getElementById('passengers').value : "Your";
                        let t_coach = document.getElementById('coach_class') ? document.getElementById('coach_class').value : "";
                        let t_train = document.getElementById('train_name') ? document.getElementById('train_name').value : "your train";
                        let t_name = document.getElementById('lead_name') ? document.getElementById('lead_name').value : "you";
                        let t_pay = document.getElementById('payment_mode') ? document.getElementById('payment_mode').value : "your chosen method";
                        
                        finalSentence = `Booking complete. ${t_passengers} ${t_coach} tickets confirmed on ${t_train} for ${t_name} using ${t_pay}. Thank you for using Sarthi A I.`;
                    } 
                    // Check if it's the Pension Form
                    else if (document.getElementById('applicant_name')) {
                        let p_name = document.getElementById('applicant_name').value || "Applicant";
                        let p_bank = document.getElementById('bank_account').value || "aapke account";
                        
                        // Hinglish translation for seamless en-IN voice playback
                        finalSentence = `Application poori ho gayi hai. ${p_name} ki pension details account ${p_bank} ke saath record kar li gayi hain. Sarthi A I ka istemaal karne ke liye dhanyawad.`;
                    }

                    let finalUtterance = new SpeechSynthesisUtterance(finalSentence);
                    window.currentUtterance = finalUtterance; 
                    finalUtterance.rate = 0.85;
                    finalUtterance.lang = window.promptLanguage || "en-IN";
                    
                    setTimeout(() => { window.speechSynthesis.speak(finalUtterance); }, 50);
                }
            }
        } 
        
        else if (data.status === 'unavailable') {
            currentField.value = ""; 
            statusLabel.innerText = "❌ Class Full!";
            setStatus('ready');

            window.speechSynthesis.cancel();
            let utterance = new SpeechSynthesisUtterance(data.text);
            window.currentUtterance = utterance; 
            utterance.rate = 0.85;
            utterance.lang = window.promptLanguage || "en-IN";

            utterance.onend = function() {
                isProcessing = false;
                setStatus('listening');
                try { recognition.start(); } catch(e) {} 
            };

            setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
        }

        // --- 🚀 FEATURE: THE REVERSE GEAR (STEP BACK) ---
        else if (data.status === 'step_back') {
            currentField.value = ""; 
            statusLabel.innerText = "⏪ Changing previous answer...";
            
            let targetIndex = fields.findIndex(f => f.id === data.target_field);
            if (targetIndex !== -1) {
                currentIndex = targetIndex;
                currentField = fields[currentIndex];
                currentField.value = ""; // Clear the old choice
            }

            window.speechSynthesis.cancel();
            let utterance = new SpeechSynthesisUtterance(data.text);
            window.currentUtterance = utterance; 
            utterance.rate = 0.85;
            utterance.lang = window.promptLanguage || "en-IN";
            
            utterance.onend = function() {
                isProcessing = false;
                setStatus('listening');
                try { recognition.start(); } catch(e) {} 
            };
            
            setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
        }

        else if (data.status === 'invalid') {
            currentField.value = ""; 
            statusLabel.innerText = "⚠️ Misunderstood. Try again."; 
            setTimeout(() => { isProcessing = false; playPromptAndListen(); }, 2000); 
        }

    } catch (error) {
        currentField.value = "Error connecting to AI";
        setStatus('ready');
        isProcessing = false; 
    }
}