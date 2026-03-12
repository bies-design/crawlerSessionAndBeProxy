const crawlerService = require('./services/crawlerService');
const express = require('express');
// 安裝 axios 或使用 node-fetch
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
// const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
let globalCookies = null; // 全局變數存儲 Cookies
let cookiesTimestamp = null; // 記錄 Cookies 的獲取時間
const cookiesTTL = 5 * 60 * 1000; // Cookies 的有效時間（例如 5 分鐘）

async function getFlashCookies(testPath) {
  if (!globalCookies || Date.now() - cookiesTimestamp > cookiesTTL) {
    const cookies = await crawlerService.fetchSessionCookies('https://esg.push-server.info', testPath);
    globalCookies = cookies; // 將取得的 Cookies 存储到全局變數
    cookiesTimestamp = Date.now(); // 更新 Cookies 的獲取時間
  }
  return globalCookies;
}

// // 設定：每 1 秒 (1000ms) 最多 2 次請求
// const limiter = rateLimit({
//   windowMs: 1000, // 1 秒
//   max: 2, // 限制每個 IP 在 1 秒內最多 2 次請求 
//   standardHeaders: true, // 在 Response Header 回傳剩餘次數 (X-RateLimit-Limit)
//   legacyHeaders: false, 
//   handler: (req, res) => {
//     // 當超過限制時的回傳訊息
//     res.status(429).json({
//       error: "Too Many Requests",
//       message: "每秒僅限 2 次請求，請稍後再試。"
//     });
//   }
// });
// // 套用到所有路由
// app.use(limiter);

// API 接口：Client 訪問此處即可下載 Cookie 檔案
app.get('/download-session', async (req, res) => {
  try {
    // 預設訪問指定子頁面，也可透過 query 傳遞 path
    const path = req.query.path || '/ems/energyStorageCabinetThird';
    
    const cookies = await getFlashCookies(path);

    // 1. 下載Cookies 方案
    // // 設定 Response Header 強制瀏覽器下載 JSON 檔案
    // res.setHeader('Content-Type', 'application/json');
    // res.setHeader('Content-Disposition', 'attachment; filename=cookies.json');

    // // 回傳格式化後的 JSON
    // return res.status(200).send(JSON.stringify(cookies, null, 2));

    // 2. 回傳靜態頁面方案
    // 將 Puppeteer 格式轉為 Axios 用的 Cookie 字串
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // 後端代為請求目標網頁
    const response = await axios.get(`https://esg.push-server.info${path}`, {
      headers: { 'Cookie': cookieString }
    });

    // 設定正確的 Content-Type header
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // 在 HTML 的 <head> 中插入 <base> 標籤，使所有相對 URL 都指向原始伺服器
    let html = response.data;
    
    html = html.replace('<head>', '<head><base href="https://esg.push-server.info">');
    // 這樣一來，頁面中的相對路徑（如 /static/js/app.js）就會被解析為 
    // https://esg.push-server.info/static/js/app.js，確保資源能正確載入
    // 注意：如果頁面中有使用 JavaScript 動態生成 URL，可能還需要額外處理，但這是最基本的解決方案。

    // 直接回傳 HTML 給 iframe
    res.send(html);

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: '無法取得 Session, 無目標頁面內容', 
      error: error.message 
    });
  }
});

// workaround: 反向代理（選用）
// 只要是 /static/ 開頭的請求，通通轉發到目標伺服器
// 包含使用 JavaScript 動態生成 URL 的情況，因為這些 URL 也會以 /static/ 開頭
app.use('/static', createProxyMiddleware({
    target: 'https://esg.push-server.info',
    changeOrigin: true,
    pathRewrite: {
        '^/static': '/static', // 保持路徑不變
    },
    onProxyReq: async (proxyReq, req, res) => {
        // 如果目標伺服器需要 Cookie 才能抓資源，這裡也要補上
        const cookies = await getFlashCookies('/ems/energyStorageCabinetThird'); // default path 暫時設定成這個路徑
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        proxyReq.setHeader('Cookie', cookieString);
    }
}));

// 攔截所有請求 (GET, POST, etc.)
app.all(/(.*)/, (req, res) => {
    res.status(403).json({
        success: false,
        message: "無法受理此請求 (Request Not Accepted)",
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`爬蟲服務已啟動在 http://localhost:${PORT}`);
  console.log(`GET http://localhost:${PORT}/download-session?path=/your/target/path 回應網頁內容`);
  console.log(`=================================`);
});

// 程序結束時關閉瀏覽器
process.on('SIGINT', async () => {
  await crawlerService.closePage();
  await crawlerService.closeBrowser();
  process.exit();
});
