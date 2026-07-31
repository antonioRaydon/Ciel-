const canvas = document.getElementById('coreCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Estados de Animação
let transitionProgress = 0;
let isProcessing = false;
let isListening = false;
let pulseTimer = 0;

let rotX = 0, rotY = 0, rotZ = 0;

// Efeitos Especiais
let shockwaveRadius = 0;
let shockwaveActive = false;
let shockwaveAlpha = 0;

let isMuted = false;

// EFEITO 1: Anéis de Áudio Circular (Equalizador ao Ouvir)
let audioWaveSegments = 32;

// EFEITO 2: Partículas de Poeira / Plumas com Gravidade Inversa
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

// Geometria Merkaba 3D
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

function drawCore() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const targetProgress = isProcessing ? 1 : 0;
    transitionProgress += (targetProgress - transitionProgress) * 0.04;

    pulseTimer += 0.02 + (0.04 * transitionProgress);
    const pulse = Math.sin(pulseTimer) * (8 + (15 * transitionProgress));
    
    // Diminui e acalma ao escutar
    let sizeMultiplier = isListening ? 0.7 : 1.0;
    const baseSize = ((Math.min(canvas.width, canvas.height) * 0.13) + pulse) * sizeMultiplier;

    const speed = isListening ? 0.002 : (0.005 + (0.015 * transitionProgress));
    rotX += speed * 0.7;
    rotY += speed * 1.1;
    rotZ += speed * 0.5;

    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.globalCompositeOperation = 'lighter';

    // 1. AURA CELESTIAL
    const totalRays = Math.floor(48 + (24 * transitionProgress));
    const rayLength = baseSize * (2.4 + (1.0 * transitionProgress));

    for (let i = 0; i < totalRays; i++) {
        const angle = (Math.PI * 2 / totalRays) * i + (rotZ * 0.3);
        const rayLen = rayLength + Math.sin(pulseTimer * 1.5 + i) * (10 + (20 * transitionProgress));
        
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

    // 2. EFEITO 1: ONDAS DE ÁUDIO CIRCULAR (Ativas quando está ouvindo o microfone)
    if (isListening) {
        const waveRadius = baseSize * 1.8;
        ctx.beginPath();
        for (let i = 0; i <= audioWaveSegments; i++) {
            const angle = (Math.PI * 2 / audioWaveSegments) * i;
            // Simula frequência de voz com modulação senoidal
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

        // Anel Secundário Suave
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius * 1.25 + Math.sin(pulseTimer * 4) * 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 130, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 3. ONDA DE CHOQUE / IMPACTO
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

    // 4. AURÉOLAS / ANÉIS SAGRADOS
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

    // 5. MERKABA 3D
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

    // 6. EFEITO 2: GRAVIDADE INVERSA DAS PARTÍCULAS (Atração ao Centro no Estado "Pensando")
    lightPlumes.forEach(p => {
        if (isProcessing) {
            // Puxa as partículas em direção ao centro (0, 0, 0)
            p.x *= 0.94;
            p.y *= 0.94;
            p.z *= 0.94;

            // Se chegar muito perto do centro, reaparece nas bordas para continuar o fluxo de atração
            if (Math.abs(p.x) < 15 && Math.abs(p.y) < 15) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 150;
                p.x = Math.cos(angle) * dist;
                p.y = Math.sin(angle) * dist;
                p.z = (Math.random() - 0.5) * 300;
                p.history = [];
            }
        } else {
            // Movimento Normal Flutuante Subindo
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

    // 7. NÚCLEO DIVINO DE LUZ
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

    isProcessing = true; // Ativa a atração de partículas ao centro
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
            isProcessing = false; // Desativa a atração de partículas
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