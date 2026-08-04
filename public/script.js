const canvas = document.getElementById('coreCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- ESTADOS DE ANIMAÇÃO ---
let transitionProgress = 0;
let isProcessing = false;
let isListening = false;
let pulseTimer = 0;

let rotX = 0, rotY = 0, rotZ = 0;

// Variável para transição suave de forma (0 = Merkaba, 1 = Triângulos Neon)
let shapeMorphProgress = 0;
let lastBassTime = 0;

// Efeitos Especiais
let shockwaveRadius = 0;
let shockwaveActive = false;
let shockwaveAlpha = 0;

let isMuted = false;

// --- CONFIGURAÇÃO WEB AUDIO API (CAPTURA DA SAÍDA DO PC) ---
let audioCtx = null;
let analyser = null;
let dataArray = null;
let isMusicSyncActive = false;
let bassBoost = 0;

function setupAudioAnalyser(stream) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // Tamanho do analisador de frequência

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function getBassIntensity() {
    if (!analyser || !isMusicSyncActive || !dataArray) return 0;
    
    analyser.getByteFrequencyData(dataArray);
    
    // Captura as frequências graves (os primeiros bins = bumbo/kick da música)
    let bassSum = 0;
    const bassBins = 4;
    for (let i = 0; i < bassBins; i++) {
        bassSum += dataArray[i];
    }
    
    return (bassSum / bassBins) * 0.8;
}

// Elementos Visuais
let audioWaveSegments = 32;

const lightPlumes = Array.from({ length: 90 }, () => ({
    x: (Math.random() - 0.5) * 500,
    y: (Math.random() - 0.5) * 500,
    z: (Math.random() - 0.5) * 500,
    speedY: - (Math.random() * 1.0 + 0.3),
    size: Math.random() * 2.8 + 1,
    alpha: Math.random() * 0.7 + 0.3,
    gold: Math.random() < 0.45,
    history: []
}));

// Partículas para explosão do grave no modo música (Com limite para evitar travamentos)
let musicBurstParticles = [];
const MAX_BURST_PARTICLES = 40;

function createMusicBurst() {
    if (musicBurstParticles.length >= MAX_BURST_PARTICLES) return;
    
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        musicBurstParticles.push({
            x: 0,
            y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 2.5 + 1.5,
            alpha: 1,
            color: Math.random() < 0.5 ? '#00ffc8' : '#ffd782'
        });
    }
}

const tetraVertices = [
    [ 1,  1,  1],
    [-1, -1,  1],
    [-1,  1, -1],
    [ 1, -1, -1]
];

const tetraEdges = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3], [2, 3]
];

function project3D(x, y, z, scaleFactor) {
    const focalLength = 450;
    const distance = focalLength + z;
    const scale = focalLength / Math.max(1, distance);
    return { x: x * scale * scaleFactor, y: y * scale * scaleFactor, scale: scale };
}

function rotate3D(x, y, z, rx, ry, rz) {
    let y1 = y * Math.cos(rx) - z * Math.sin(rx);
    let z1 = y * Math.sin(rx) + z * Math.cos(rx);
    let x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
    let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
    let x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
    let y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
    return { x: x3, y: y3, z: z2 };
}

// --- RENDERIZADOR DO CANVAS 3D ---
function drawCore() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const targetProgress = isProcessing ? 1 : 0;
    transitionProgress += (targetProgress - transitionProgress) * 0.04;

    // Transição de forma suave
    const targetMorph = isMusicSyncActive ? 1 : 0;
    shapeMorphProgress += (targetMorph - shapeMorphProgress) * 0.08;

    pulseTimer += 0.02 + (0.04 * transitionProgress);
    const pulse = Math.sin(pulseTimer) * (8 + (15 * transitionProgress));
    
    // Obter o pulso do grave da música
    bassBoost = getBassIntensity();

    // Explosão controlada de luz nos graves
    const now = Date.now();
    if (isMusicSyncActive && bassBoost > 35 && (now - lastBassTime > 250)) {
        createMusicBurst();
        lastBassTime = now;
    }

    let sizeMultiplier = isListening ? 0.7 : 1.0;
    const baseSize = (((Math.min(canvas.width, canvas.height) * 0.13) + pulse) * sizeMultiplier) + bassBoost;

    // Aceleração sutil de rotação com a batida
    const musicSpeedBoost = bassBoost * 0.0003;
    const speed = isListening ? 0.002 : (0.005 + (0.015 * transitionProgress) + musicSpeedBoost);
    rotX += speed * 0.7;
    rotY += speed * 1.1;
    rotZ += speed * 0.5;

    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.globalCompositeOperation = 'lighter';

    // ------------------------------------------------------------------
    // EFEITOS GERAIS (Sempre visíveis)
    // ------------------------------------------------------------------

    // EQUALIZADOR CIRCULAR (QUANDO O MICROFONE ESTÁ LIGADO)
    if (isListening) {
        const waveRadius = baseSize * 1.8;
        ctx.beginPath();
        for (let i = 0; i <= audioWaveSegments; i++) {
            const angle = (Math.PI * 2 / audioWaveSegments) * i;
            const waveAmp = Math.sin(pulseTimer * 8 + i * 0.8) * 12 + Math.cos(pulseTimer * 5 + i * 1.5) * 8;
            const r = waveRadius + waveAmp;
            
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // ONDA DE CHOQUE DA ENTRADA DE MENSAGEM
    if (shockwaveActive) {
        shockwaveRadius += 12 + (10 * transitionProgress);
        shockwaveAlpha -= 0.018;

        if (shockwaveAlpha <= 0) {
            shockwaveActive = false;
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, shockwaveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 235, 180, ${shockwaveAlpha})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    // ------------------------------------------------------------------
    // FORMA 1: MERKABA 3D + AURA + ANÉIS (MODO NORMAL)
    // ------------------------------------------------------------------
    if (shapeMorphProgress < 0.99) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - shapeMorphProgress);

        // Aura Celestial
        const totalRays = Math.floor(48 + (24 * transitionProgress));
        const rayLength = baseSize * (2.4 + (1.0 * transitionProgress));

        for (let i = 0; i < totalRays; i++) {
            const angle = (Math.PI * 2 / totalRays) * i + (rotZ * 0.3);
            const rayLen = rayLength + Math.sin(pulseTimer * 1.5 + i) * (10 + (20 * transitionProgress)) + (bassBoost * 0.5);
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
            
            const isGold = i % 2 === 0;
            ctx.strokeStyle = isGold 
                ? `rgba(255, 215, 130, ${0.15 + (0.3 * transitionProgress)})`
                : `rgba(200, 245, 255, ${0.12 + (0.25 * transitionProgress)})`;

            ctx.lineWidth = isGold ? 1.5 : 0.8;
            ctx.stroke();
        }

        // Auréolas / Anéis Sagrados
        for (let h = 0; h < 3; h++) {
            const ringRadius = baseSize * (1.5 + h * 0.35);
            ctx.beginPath();
            
            for (let i = 0; i <= 36; i++) {
                const theta = (Math.PI * 2 / 36) * i;
                let px = ringRadius * Math.cos(theta);
                let py = ringRadius * Math.sin(theta);
                let pz = Math.sin(theta * 2 + pulseTimer) * 20;

                let rot = rotate3D(px, py, pz, rotX * (0.4 + h * 0.2), rotY * (0.3 - h * 0.1), rotZ * 0.5);
                let proj = project3D(rot.x, rot.y, rot.z, 1);

                if (i === 0) ctx.moveTo(proj.x, proj.y);
                else ctx.lineTo(proj.x, proj.y);
            }

            ctx.strokeStyle = h === 0 
                ? `rgba(255, 223, 150, ${0.7 + (0.3 * transitionProgress)})` 
                : `rgba(180, 235, 255, ${0.4 + (0.4 * transitionProgress)})`;
            ctx.lineWidth = 1.3;
            ctx.stroke();
        }

        // Merkaba 3D
        function drawTetrahedron(scale, color, rx, ry, rz, invert) {
            const sign = invert ? -1 : 1;
            const transformedVerts = tetraVertices.map(v => {
                let rot = rotate3D(v[0] * sign, v[1] * sign, v[2] * sign, rx, ry, rz);
                return project3D(rot.x, rot.y, rot.z, baseSize * scale);
            });

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8 + (1.0 * transitionProgress);

            tetraEdges.forEach(edge => {
                const p1 = transformedVerts[edge[0]];
                const p2 = transformedVerts[edge[1]];
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            });
        }

        drawTetrahedron(0.95, 'rgba(255, 230, 170, 0.95)', rotX, rotY, rotZ, false);
        drawTetrahedron(0.95, 'rgba(170, 240, 255, 0.9)', -rotX * 0.8, -rotY * 0.9, rotZ * 1.2, true);

        ctx.restore();
    }

    // ------------------------------------------------------------------
    // FORMA 2: DOIS TRIÂNGULOS EM NEON (MODO MÚSICA)
    // ------------------------------------------------------------------
    if (shapeMorphProgress > 0.01) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, shapeMorphProgress);

        function drawTriangle(radius, angleOffset, color, width) {
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = angleOffset + (i * Math.PI * 2 / 3);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        }

        // Reduz a velocidade de rotação do modo música para um giro mais suave
        const smoothRot = rotZ * 0.1;

        // Triângulo Interno
        const innerRadius = (baseSize * 0.8) + (bassBoost * 0.85);
        drawTriangle(innerRadius, smoothRot, '#00ffc8', 2.5);

        // Triângulo Externo
        const outerRadius = (baseSize * 1.4) + (bassBoost * 0.4);
        drawTriangle(outerRadius, -smoothRot * 0.5, '#ffd782', 1.8);

        // Conectores
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI / 3) + rotZ;
            ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
            ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        }
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // PARTÍCULAS DE EXPLOSÃO
    for (let i = musicBurstParticles.length - 1; i >= 0; i--) {
        let p = musicBurstParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;

        if (p.alpha <= 0) {
            musicBurstParticles.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // POEIRA CELESTIAL
    lightPlumes.forEach(p => {
        if (isProcessing) {
            p.x *= 0.94;
            p.y *= 0.94;
            p.z *= 0.94;

            if (Math.abs(p.x) < 15 && Math.abs(p.y) < 15) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 150;
                p.x = Math.cos(angle) * dist;
                p.y = Math.sin(angle) * dist;
                p.z = (Math.random() - 0.5) * 300;
                p.history = [];
            }
        } else {
            p.y += p.speedY * (isListening ? 0.3 : 1.0);
            if (p.y < -260) {
                p.y = 260;
                p.x = (Math.random() - 0.5) * 450;
                p.history = [];
            }
        }

        let rot = rotate3D(p.x, p.y, p.z, rotX * 0.2, rotY * 0.2, 0);
        let proj = project3D(rot.x, rot.y, rot.z, 1);

        p.history.push({ x: proj.x, y: proj.y });
        if (p.history.length > 5) p.history.shift();

        if (p.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let h = 1; h < p.history.length; h++) {
                ctx.lineTo(p.history[h].x, p.history[h].y);
            }
            ctx.strokeStyle = p.gold 
                ? `rgba(255, 215, 120, ${p.alpha * 0.3})`
                : `rgba(200, 245, 255, ${p.alpha * 0.3})`;
            ctx.lineWidth = p.size * 0.6;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, Math.max(0.6, p.size * proj.scale), 0, Math.PI * 2);
        ctx.fillStyle = p.gold 
            ? `rgba(255, 220, 140, ${p.alpha * (0.7 + 0.3 * transitionProgress)})`
            : `rgba(235, 252, 255, ${p.alpha * (0.7 + 0.3 * transitionProgress)})`;
        ctx.fill();
    });

    // NÚCLEO DIVINO DE LUZ
    const glowRadius = baseSize * (0.55 + (0.25 * transitionProgress));
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, glowRadius));
    gradient.addColorStop(0, '#ffffff'); 
    gradient.addColorStop(0.2, 'rgba(255, 248, 220, 0.98)');
    gradient.addColorStop(0.55, 'rgba(160, 235, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    requestAnimationFrame(drawCore);
}

drawCore();

// --- BOTAO DE CAPTURA DO ÁUDIO DO SISTEMA (MÚSICA DAS CAIXINHAS) ---
const musicSyncBtn = document.getElementById('musicSyncBtn');

musicSyncBtn.addEventListener('click', async () => {
    if (!isMusicSyncActive) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    suppressLocalAudioPlayback: false
                }
            });

            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                alert("⚠️ Atenção: Na janela do navegador, você precisa MARCAR a caixinha 'Compartilhar áudio' no canto inferior!");
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            // Ouve o encerramento do compartilhamento pelo próprio navegador
            audioTrack.onended = () => {
                isMusicSyncActive = false;
                musicSyncBtn.classList.remove('active');
            };

            setupAudioAnalyser(stream);
            isMusicSyncActive = true;
            musicSyncBtn.classList.add('active');

        } catch (err) {
            console.error("Captura cancelada ou não permitida:", err);
            isMusicSyncActive = false;
            musicSyncBtn.classList.remove('active');
        }
    } else {
        isMusicSyncActive = false;
        musicSyncBtn.classList.remove('active');
    }
});

// --- CONTROLE DE ÁUDIO & MUTE ---
const audioInicio = new Audio('som_inicio.mp3');
const audioFinal = new Audio('som_final.mp3');
const muteBtn = document.getElementById('muteBtn');

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
});

function playAudio(audioObj) {
    if (!isMuted && audioObj) {
        audioObj.currentTime = 0;
        audioObj.play().catch(() => {});
    }
}

// --- RECONHECIMENTO DE VOZ (MICROFONE) ---
const micBtn = document.getElementById('micBtn');
const userInput = document.getElementById('userInput');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micBtn.textContent = '🛑';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    };

    recognition.onerror = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎙️';
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎙️';
    };
} else {
    micBtn.style.display = 'none';
}

// --- LÓGICA DO CHAT E ÁUDIOS CONDICIONAIS ---
const form = document.getElementById('chatForm');
const chatLog = document.getElementById('chatLog');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    shockwaveRadius = 10;
    shockwaveAlpha = 0.9;
    shockwaveActive = true;

    isProcessing = true;
    playAudio(audioInicio);

    appendUserMessage(text);
    userInput.value = '';

    const loadingMessage = appendBotLoadingMessage();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        
        const isLongResponse = data.response.length > 120;

        typeWriterEffect(loadingMessage, data.response, () => {
            if (isLongResponse) {
                playAudio(audioFinal);
            }
            isProcessing = false;
        });

    } catch (err) {
        loadingMessage.textContent = 'Erro ao conectar com o servidor.';
        isProcessing = false;
    }
});

function appendUserMessage(msg) {
    const div = document.createElement('div');
    div.className = 'user-msg';
    div.textContent = msg;
    chatLog.appendChild(div);
    scrollToBottom();
}

function appendBotLoadingMessage() {
    const div = document.createElement('div');
    div.className = 'bot-msg';
    div.innerHTML = `<span class="typing-indicator">CIEL está processando...</span>`;
    chatLog.appendChild(div);
    scrollToBottom();
    return div;
}

function typeWriterEffect(element, fullText, onComplete) {
    element.innerHTML = '';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copiar texto';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(fullText);
        copyBtn.innerHTML = '✔';
        setTimeout(() => copyBtn.innerHTML = '📋', 1500);
    };
    element.appendChild(copyBtn);

    const textNode = document.createTextNode('');
    element.appendChild(textNode);

    let index = 0;
    const speed = 18;

    function typeNextChar() {
        if (index < fullText.length) {
            textNode.nodeValue += fullText.charAt(index);
            index++;
            scrollToBottom();
            setTimeout(typeNextChar, speed);
        } else if (onComplete) {
            onComplete();
        }
    }

    typeNextChar();
}

function scrollToBottom() {
    const isAtBottom = chatLog.scrollHeight - chatLog.clientHeight <= chatLog.scrollTop + 60;
    if (isAtBottom) {
        chatLog.scrollTop = chatLog.scrollHeight;
    }
}