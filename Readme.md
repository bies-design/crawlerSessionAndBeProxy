# Crawler Session

## Manual Steps
> prepare <br/>
```bash
0. rm package-lock.json && rm -r node_modules
1. npm init -y
2. npx depcheck              <--  有用到新模組的時候，告知要下載的套件名稱是什麼
3. npm install [WHAT MODULEs YOU LOSE]
4. npm install -l
5. npm audit fix
```

> startup <br/>
> (新取得)先進行 4, 5
```bash
npm run dev
```