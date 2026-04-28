# WordBank

## Project
Vocabulary learning app for junior high school students. Scan vocabulary PDFs → digitize word pairs → flashcard quiz + fill-in-blank worksheet export.

## Tech
- React 18 + Vite 4 (no TS, plain JSX)
- pdfjs-dist for PDF upload text extraction
- html2pdf.js for PDF download
- Data stored in localStorage (multiple word sets)

## Structure
```
src/
  data/words.json          # default word set (100 words)
  components/
    WordList.jsx           # searchable word grid
    Flashcard.jsx          # flip card quiz (EN↔ZH)
    FillBlank.jsx          # A4 worksheet generator (1-page & 2-page layouts)
    Upload.jsx             # PDF upload + word extraction
  App.jsx                  # main app with tab navigation & word set management
  main.jsx
  index.css
scanned/                   # original scanned PDFs (not processed by app)
```

## Dev
```bash
npx vite --host
```
