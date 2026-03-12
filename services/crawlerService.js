const { time } = require('node:console');
const puppeteer = require('puppeteer');

class CrawlerService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = null;
    this.path = null;
    this.maxRetries = 3;
  }

  // 初始化瀏覽器（單例模式，節省開銷）
  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  // 確認連線後取得Cookies
  async fetchSessionCookies(targetUrl='https://esg.push-server.info', path='/ems/energyStorageCabinetThird') {
    try {
        // 0. 設定基礎 URL 和子頁面路徑
        this.baseUrl = targetUrl;
        this.path = path;

        // 1. 訪問目標頁面以建立 Session/Cookies 並取回
        const cookies = await this.initSession();

        // 如果該頁面需要處理特定登入或等待特定 Session 標籤，可在此加入等待
        // await this.page.waitForSelector('.some-dashboard-element');

        // 2. 跳轉到指定的子頁面以確保該頁面所需的 Cookie 已寫入
        const pageTitle = await this.accessOtherPage(this.path);
        console.log('測試子頁面標題:', pageTitle);
        
        return cookies;
    } catch (error) {
        console.error('fetch Session Cookies失敗:', error);
        await this.closePage();
        await this.closeBrowser();
        return null;
    }
  }

  // 初始化並獲取 Session (登入/訪問目標頁面)
  async initSession() {
    if (!this.browser) {
      this.browser = await this.getBrowser();
    }
    this.page = await this.browser.newPage();

    let lastError = null;
    let cookies_now = null;
    // 重試迴圈
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const fullUrl = `${this.baseUrl}`;
        console.log(`[嘗試 ${attempt}/${this.maxRetries}] 訪問: ${fullUrl}`);

        // 執行訪問
        await this.page.goto(fullUrl, { 
            waitUntil: 'networkidle2',
            timeout: 5000 // 等待5秒連線成功...
        });

        // 成功則獲取 Cookies 並回傳
        console.log('Session 已建立');
        cookies_now = await this.page.cookies();
        attempt = this.maxRetries + 1; // 跳出重試迴圈

      } catch (error) {
        lastError = error;
        console.warn(`[嘗試 ${attempt}] 失敗: ${error.message}`);
        
        // 如果還沒到最後一次嘗試，可以在這裡加一個短暫延遲 (例如 500ms)
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // finally 區塊或重試結束後檢查是否成功獲取 Cookies
    if (cookies_now) {
      console.log('成功獲取並回傳 Session Cookies:');
      return cookies_now;
    }
    else {
      const errorMsg = lastError ? lastError.message : '未知錯誤';
      throw new Error(`在 ${this.maxRetries} 次嘗試後依然失敗: ${errorMsg}`);
    }
  }

  // 使用既有的 Session 訪問其他分頁
  async accessOtherPage(l_path) {
    if (!this.page) throw new Error("請先初始化 Session");

    const newUrl = `${this.baseUrl}${l_path}`;
    await this.page.goto(newUrl, { 
        waitUntil: 'networkidle2',
        timeout: 5000 // 等待5秒連線成功.. 
    });

    // 執行爬取或操作
    const data = await this.page.evaluate(() => {
      return document.title; // 範例：獲取新頁面標題
    });

    return data;
  }

  async closePage() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new CrawlerService();
