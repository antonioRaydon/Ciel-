const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Você é uma inteligência artificial assistente chamada CIEL. Responda de forma direta, clara, concisa e amigável em português."
                },
                {
                    role: "user",
                    content: message,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });

        const responseText = completion.choices[0]?.message?.content || "Sem resposta.";
        res.json({ response: responseText });
    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ response: `Erro na API: ${error.message || 'Falha de conexão'}` });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor CIEL rodando em http://localhost:${PORT}`);
});