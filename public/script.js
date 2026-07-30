const canvas = document.getElementById('coreCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Estado de animação e transição suave
let transitionProgress = 0; // Vai de 0 (normal) a 1 (pico suave)
let isProcessing = false;
let rotationAngle = 0;
let pulseTimer = 0;

// Partículas orbitais
const particles = Array.from({ length: 45 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radiusOffset: Math.random() * 50 - 25,
    speed: (Math.random() * 0.02 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
    size: Math.random() * 2.5 + 1,
    hue: Math.random() * 60 + 150
}));

function drawCore() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Suaviza a subida e descida da intensidade da animação
    const targetProgress = isProcessing ? 1 : 0;
    transitionProgress += (targetProgress - transitionProgress) * 0.05;

    pulseTimer += 0.03 + (0.05 * transitionProgress);
    const pulse = Math.sin(pulseTimer) * (12 + (16 * transitionProgress));
    const baseSize = (Math.min(canvas.width, canvas.height) * 0.22) + pulse;

    const speed = 0.006 + (0.025 * transitionProgress);
    rotationAngle += speed;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 1. FEIXES DE LUZ DETALHADOS
    const totalRays = Math.floor(36 + (36 * transitionProgress));
    const rayLength = baseSize * (1.5 + (0.8 * transitionProgress));

    for (let i = 0; i < totalRays; i++) {
        const angle = (Math.PI * 2 / totalRays) * i + rotationAngle;
        const currentRayLength = rayLength + Math.sin(pulseTimer * 2 + i) * (8 + (10 * transitionProgress));
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * currentRayLength, Math.sin(angle) * currentRayLength);
        
        const hue = (i * (360 / totalRays) + rotationAngle * 120) % 360;
        const opacity = 0.35 + (0.45 * transitionProgress);
        const lineWidth = 1.2 + (1.3 * transitionProgress);
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    // 2. CÍRCULOS EXTERNOS E ANÉIS DE ENERGIA
    ctx.save();
    ctx.rotate(rotationAngle * 0.8);
    ctx.beginPath();
    ctx.arc(0, 0, baseSize * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1.8 + (0.7 * transitionProgress);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-rotationAngle * 1.2);
    ctx.beginPath();
    ctx.arc(0, 0, baseSize * 1.35, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 0, 127, ${0.6 + (0.3 * transitionProgress)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 15]);
    ctx.stroke();
    ctx.restore();

    // 3. GEOMETRIA CENTRAL
    ctx.save();
    ctx.rotate(-rotationAngle * 1.5);
    ctx.beginPath();
    ctx.rect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.rect(-baseSize * 0.4, -baseSize * 0.4, baseSize * 0.8, baseSize * 0.8);
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 4. PARTÍCULAS ORBITAIS
    particles.forEach(p => {
        p.angle += p.speed * (1 + (1.8 * transitionProgress));
        const r = baseSize * 0.9 + p.radiusOffset;
        const x = Math.cos(p.angle) * r;
        const y = Math.sin(p.angle) * r;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${0.6 + (0.3 * transitionProgress)})`;
        ctx.fill();
    });

    // 5. NÚCLEO LUMINOSO PULSANTE
    const glowRadius = baseSize * (0.45 + (0.25 * transitionProgress));
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, glowRadius));
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.25, 'rgba(0, 255, 200, 0.9)');
    gradient.addColorStop(0.65, 'rgba(0, 150, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    requestAnimationFrame(drawCore);
}

drawCore();

// --- ÁUDIOS ---
const audioInicio = new Audio('som_inicio.mp3');
const audioFinal = new Audio('som_final.mp3');

function playAudio(audioObj) {
    if (audioObj) {
        audioObj.currentTime = 0;
        audioObj.play().catch(() => {});
    }
}

// --- LÓGICA DO CHAT ---
const form = document.getElementById('chatForm');
const input = document.getElementById('userInput');
const chatLog = document.getElementById('chatLog');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Ativa a animação viva e intensa do núcleo
    isProcessing = true;

    // Toca o primeiro som ao enviar
    playAudio(audioInicio);

    appendMessage(text, 'user-msg');
    input.value = '';

    let podeTocarSomFinal = false;
    let respostaChegou = false;

    // Função interna para tocar o som final e associar o fim da animação ao término dele
    const dispararSomFinal = () => {
        // Quando o som final terminar de tocar, a animação desacelera e volta ao normal
        audioFinal.onended = () => {
            isProcessing = false;
            audioFinal.onended = null;
        };
        playAudio(audioFinal);
    };

    const aoTerminarInicio = () => {
        audioInicio.removeEventListener('ended', aoTerminarInicio);
        
        // Espera 1 segundo após o término do primeiro som
        setTimeout(() => {
            podeTocarSomFinal = true;
            if (respostaChegou) {
                dispararSomFinal();
            }
        }, 1000);
    };

    audioInicio.addEventListener('ended', aoTerminarInicio);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        
        appendMessage(data.response, 'bot-msg');
        respostaChegou = true;

        if (podeTocarSomFinal) {
            dispararSomFinal();
        }

    } catch (err) {
        appendMessage('Erro ao conectar com o servidor.', 'bot-msg');
        isProcessing = false; // Em caso de erro, reestabelece a animação normal
    }
});

function appendMessage(msg, className) {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = msg;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
}