const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');

// إعدادات البورت والبيئة
const PORT = process.env.PORT || 8080;
const CONTROL_URL = process.env.EM7_CONTROL_URL || 'https://em7control-vxdcumhb.manus.space';
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET || '';

// إعداد عميل ديسكورد
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// متغيرات عامة للبوت
const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

client.once('ready', () => {
    console.log(`[READY] Connected as ${client.user.tag}`);
    startBridgePolling();
});

// دالة الـ Polling لجسر الإتصال مع Manus
function startBridgePolling() {
    if (!BRIDGE_SECRET || !CONTROL_URL) {
        console.log('[BRIDGE] Warning: BRIDGE_SECRET or CONTROL_URL is missing!');
        return;
    }

    console.log('[BRIDGE] Starting claim polling worker towards Manus...');
    
    setInterval(async () => {
        try {
            const targetUrl = `${CONTROL_URL.replace(/\/$/, '')}/api/bridge/operations/claim`;
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BRIDGE_SECRET}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                // تجاهل أخطاء الـ Polling المؤقتة لضمان استقرار البوت
                return;
            }

            const data = await response.json();
            // معالجة العمليات الواردة لو وجدت
        } catch (err) {
            // تجاهل أخطاء الشبكة المؤقتة
        }
    }, 15000); // إرسال طلب كل 15 ثانية لتثبيت حالة الاتصال الأخضر
}

// خادم الويب المحلي للاستجابة السريعة
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: 'online', bot: client.user ? client.user.tag : 'starting' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Server listening on port ${PORT}`);
});

// تسجيل الدخول لبوت ديسكورد
if (TOKEN) {
    client.login(TOKEN).catch(e => {
        console.error('Login failed:', e.message);
        process.exit(1);
    });
} else {
    console.error('Error: DISCORD_TOKEN is missing in environment variables!');
}
