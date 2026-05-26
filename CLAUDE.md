---
project: division-trainer
category: 學科工具集
status: 開發中
version: "子專案文件初始化 2026-05-26"
url: ""
next_action: 修改後執行 npm run build 並確認 Netlify 部署設定
updated: 2026-05-26
---

# CLAUDE.md — division-trainer

React + Vite 除法練習工具，使用 Netlify 部署。

## 技術框架

- React
- Vite
- Tailwind/PostCSS
- Netlify (`netlify.toml`)

## 主要檔案

- `package.json`：npm scripts 與依賴
- `src/`：若存在，為主要 React 原始碼
- `index.html`：Vite 入口
- `netlify.toml`：部署設定
- `出題規則說明.md`：題目規則文件

## 不能動的地方

- `package-lock.json` 不要因無關安裝而變動。
- `netlify.toml` 改動會影響正式部署。

## 部署後驗證清單

- `npm run build`
- 本機啟動後確認可作答。
- Netlify 部署後確認正式網址可載入。
