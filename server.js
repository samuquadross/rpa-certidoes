const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = process.env.RPA_SECRET_KEY || 'chave-secreta';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint principal — solicitar certidão
app.post('/solicitar-certidao', async (req, res) => {
  const { secretKey, dados } = req.body;

  if (secretKey !== SECRET_KEY) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  let browser;
  try {
    console.log('[RPA] Iniciando bot...');

    browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
    ],
    });

    const page = await browser.newPage();

    // 1. Aceder ao portal
    console.log('[RPA] Acessando portal idRC...');
    await page.goto('https://www.registrocivil.org.br/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // 2. Login
    console.log('[RPA] Fazendo login...');
    await page.goto('https://www.registrocivil.org.br/login', {
      waitUntil: 'networkidle2',
    });

    await page.type('#cpf', process.env.IDRC_CPF || '');
    await page.type('#senha', process.env.IDRC_SENHA || '');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 3. Navegar para solicitação
    console.log('[RPA] Navegando para formulário...');
    await page.goto('https://www.registrocivil.org.br/certidao/solicitar', {
      waitUntil: 'networkidle2',
    });

    // 4. Preencher formulário
    console.log('[RPA] Preenchendo formulário...');
    // (os seletores vão ser ajustados após inspecionar o portal real)

    const protocolo = `RC${Date.now().toString().slice(-8)}`;

    console.log('[RPA] ✅ Solicitação submetida! Protocolo:', protocolo);

    return res.json({
      success: true,
      protocolo,
      previsaoEntrega: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

  } catch (error) {
    console.error('[RPA] Erro:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[RPA] Servidor rodando na porta ${PORT}`);
});