# vocab-app

> 國中英文單字背誦工具：閃卡測驗 + A4 填空練習卷產生器

**🌐 Live demo:** https://murphytsai.github.io/vocab-app/

純前端 React + Vite 應用，不需後端。所有題庫以 JSON 檔放在 `src/data/wordsets/`，自動載入。使用者匯入的草稿存在瀏覽器 localStorage。

## Features

- **單字列表**：可搜尋的詞彙表
- **閃卡測驗**：英↔中翻面，洗牌、上下題切換
- **填空練習卷**：A4×1（100 字 / 頁）或 A4×2（50 字 / 頁）兩種版型，可下載 PDF / HTML 或直接列印
- **匯入單字**：支援上傳 PDF / 圖片（Tesseract OCR）、貼上純文字、或貼 JSON
- **多題庫**：自動掃描 `src/data/wordsets/*.json`，新增題庫不需改 code

## Tech

- React 18 + Vite 4（純 JSX，無 TypeScript）
- pdfjs-dist（PDF 文字擷取）
- tesseract.js（圖片/掃描 PDF 的 OCR）
- html2pdf.js（PDF 下載）

## 新增題庫

把 `{ "title": "...", "words": [{"id": 1, "english": "...", "chinese": "..."}] }` 格式的 JSON 檔丟進 `src/data/wordsets/`，重新整理就會出現在下拉選單。檔名前綴決定排序（例如 `06_xxx.json`）。

或在「匯入單字」分頁透過 UI 匯入，按「📥 下載 JSON 檔」就會產出符合格式的檔案。

## Dev

```bash
npm install
npx vite --host
```

## Deploy

Push 到 `main` 會自動觸發 GitHub Actions 部署到 GitHub Pages（見 `.github/workflows/deploy.yml`）。
