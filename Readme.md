# Crawler Session and Be Proxy

輔助前端生成 iFrame 時不能處理cookies 的情況， <br/>
需要先協助取得，然後針對想要去訪問的頁面提供cookies <br/>
到標頭，然後回應該目標網頁的資訊給前端。 <br/>
-------------------------- <br/>
因為頁面有抓取靜態資源的需求，需要協助轉跳到 <br/>
目標網址，有加上 middleware: proxy 來達到這個需求 <br/>

## Manual Steps
> command line <br/>
```bash
0. rm package-lock.json && rm -r node_modules
1. npm init -y
2. npm install -l
3. npx depcheck              <--  有用到新模組的時候，
                                告知要下載的套件名稱是什麼
4. npm install [WHAT MODULEs YOU LOSE]
5. npm audit fix             <-- 安全性，不造成相依性錯誤的更新
6. npm run dev                <-- 資訊較多，除錯用
   npm run start              <-- 正式版
```

> startup <br/>
> (新取得:after git clone) 理論上只需要進行 2, 5, 6
> 開發中，有增減模組使用之後
```bash
npx depcheck
npm install [WHAT MODULEs YOU LOSE]
npm audit fix
npm run dev
```

> 有大量模組和寫法更動，或是node 版號更改，或難以確認的運行錯誤
```bash
rm package-lock.json && rm -r node_modules   <-- 預防相依性錯誤
npm init -y                                  <-- 檢查設定有無非法
npm install -l                               <-- 安裝套件
npx depcheck                                 <-- 檢查有無未安裝模組
npm install [WHAT MODULEs YOU LOSE]
npm audit fix                                 <-- 安全更新
npm run dev
```

## 預留功能
> 限制連線請求次數，已經註解不啟用。也不會記錄在 package.json

```bash
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    ...
    });
// 套用到所有路由
app.use(limiter);
```

## 建議作法
> 安裝缺失套件

```bash
npm install -g npm-install-missing
cd [Project/Path]
npm-install-missing
```
