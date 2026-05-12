const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const GEMINI_KEY = process.env.GEMINI_KEY;
const NVIDIA_KEY = process.env.NVIDIA_KEY;
const OPUSMAX_KEY = process.env.OPUSMAX_KEY;
const BASE_URL = process.env.BASE_URL || 'https://gentle-tenderness-production-8cce.up.railway.app';

// Telegram Bot with Webhook
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Set webhook for Railway
const webhookPath = '/webhook/telegram';
const fullWebhookUrl = `${BASE_URL}${webhookPath}`;

bot.setWebHook(fullWebhookUrl).then(() => {
  console.log('✅ Webhook set:', fullWebhookUrl);
}).catch(err => {
  console.log('⚠️ Webhook error:', err.message);
});

// Webhook endpoint
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'VihaAgent Server Running!',
    ai: 'OpenRouter, Gemini, NVIDIA, OpusMax available',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/keys-status', (req, res) => {
  res.json({
    openrouter: OPENROUTER_KEY ? '✅' : '❌',
    gemini: GEMINI_KEY ? '✅' : '❌',
    nvidia: NVIDIA_KEY ? '✅' : '❌',
    opusmax: OPUSMAX_KEY ? '✅' : '❌'
  });
});

app.post('/chat', async (req, res) => {
  const { message, model } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    let response;
    switch (model) {
      case 'gemini': response = await chatWithGemini(message); break;
      case 'nvidia': response = await chatWithNvidia(message); break;
      case 'opusmax': response = await chatWithOpusMax(message); break;
      default: response = await chatWithOpenRouter(message);
    }
    res.json({ response, model: model || 'openrouter' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function chatWithOpenRouter(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [{ role: 'user', content: message }]
    });
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://viha-agent.railway.app',
        'X-Title': 'VihaAgent'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(json.error.message || json.error));
          else if (json.choices && json.choices[0]) resolve(json.choices[0].message.content);
          else reject(new Error('No response from AI'));
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function chatWithGemini(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [{ parts: [{ text: message }] }]
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(json.error.message || json.error));
          else if (json.candidates && json.candidates[0]) resolve(json.candidates[0].content.parts[0].text);
          else reject(new Error('No response from Gemini'));
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function chatWithNvidia(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      messages: [{ role: 'user', content: message }],
      temperature: 0.5,
      max_tokens: 1024
    });
    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_KEY}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(json.error.message || json.error));
          else if (json.choices && json.choices[0]) resolve(json.choices[0].message.content);
          else reject(new Error('No response from NVIDIA'));
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function chatWithOpusMax(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-opus-4-6',
      messages: [{ role: 'user', content: message }]
    });
    const req = https.request({
      hostname: 'api.opusmax.pro',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPUSMAX_KEY}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(json.error.message || json.error));
          else if (json.choices && json.choices[0]) resolve(json.choices[0].message.content);
          else reject(new Error('No response from OpusMax'));
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Telegram Commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🤖 VihaAgent Bot!\n\nCommands:\n/ai <msg> - OpenRouter AI\n/gemini <msg> - Gemini\n/nvidia <msg> - NVIDIA\n/opus <msg> - OpusMax\n/status - Server info');
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, '📚 Commands:\n/ai <msg> - OpenRouter\n/gemini <msg> - Gemini\n/nvidia <msg> - NVIDIA\n/opus <msg> - OpusMax\n/status - Info');
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, '✅ Server Running!\n\n🌐 https://gentle-tenderness-production-8cce.up.railway.app\n\n📦 AI Providers:\n• OpenRouter ✅\n• Gemini ✅\n• NVIDIA ✅\n• OpusMax ✅');
});

bot.onText(/\/ai (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, '🤔 Thinking...').then(() => {
    chatWithOpenRouter(match[1])
      .then(r => bot.sendMessage(msg.chat.id, r))
      .catch(e => bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message));
  });
});

bot.onText(/\/gemini (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, '🤔 Gemini thinking...').then(() => {
    chatWithGemini(match[1])
      .then(r => bot.sendMessage(msg.chat.id, r))
      .catch(e => bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message));
  });
});

bot.onText(/\/nvidia (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, '🤔 NVIDIA thinking...').then(() => {
    chatWithNvidia(match[1])
      .then(r => bot.sendMessage(msg.chat.id, r))
      .catch(e => bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message));
  });
});

bot.onText(/\/opus (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, '🤔 OpusMax thinking...').then(() => {
    chatWithOpusMax(match[1])
      .then(r => bot.sendMessage(msg.chat.id, r))
      .catch(e => bot.sendMessage(msg.chat.id, '❌ Error: ' + e.message));
  });
});

bot.on('polling_error', (error) => {
  console.log('Telegram polling error:', error.code, error.message);
});

bot.on('webhook_error', (error) => {
  console.log('Telegram webhook error:', error.code, error.message);
});

console.log('✅ All AI providers configured');
console.log(`Server running on port ${PORT}`);

app.listen(PORT, () => {
  console.log(`✅ VihaAgent Server started on port ${PORT}`);
});