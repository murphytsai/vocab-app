import React, { useState, useRef } from 'react';

const ACCEPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export default function Upload({ onAdd }) {
  const [mode, setMode] = useState('file'); // 'file' | 'paste' | 'json'
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [setName, setSetName] = useState('');
  const [error, setError] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileRef = useRef();

  /* ---- reset ---- */
  const reset = () => {
    setExtracted(null);
    setError('');
    setPreviewUrls([]);
    setLoadingMsg('');
  };

  /* ========== Mode 1: File upload (PDF + Image OCR) ========== */
  const handleFiles = async (files) => {
    const fileList = Array.from(files);
    const valid = fileList.filter(f => ACCEPT_TYPES.includes(f.type));
    if (valid.length === 0) {
      setError('請上傳 PDF 或圖片檔案 (JPG/PNG)');
      return;
    }

    reset();
    setLoading(true);

    // Show image previews
    const urls = valid
      .filter(f => f.type.startsWith('image/'))
      .map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);

    try {
      let allText = '';
      valid.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        if (file.type === 'application/pdf') {
          setLoadingMsg(`處理 PDF (${i + 1}/${valid.length}): ${file.name}`);
          let pdfText = await extractPDF(file);
          if (pdfText.replace(/\s/g, '').length < 20) {
            setLoadingMsg(`PDF 無內嵌文字，改用 OCR (${i + 1}/${valid.length}): ${file.name}，請耐心等候...`);
            pdfText = await extractPDFviaOCR(file, (p, total) =>
              setLoadingMsg(`OCR PDF 第 ${p}/${total} 頁: ${file.name}`));
          }
          allText += pdfText + '\n';
        } else {
          setLoadingMsg(`OCR 辨識中 (${i + 1}/${valid.length}): ${file.name}，請耐心等候...`);
          allText += await extractImage(file) + '\n';
        }
      }

      const words = parseWords(allText);

      if (words.length === 0) {
        setError(`OCR 辨識完成但無法自動解析出單字對照。\n這是正常的，因為瀏覽器端 OCR 對中英混合表格辨識率有限。\n\n建議方案：\n1. 切換到「貼上文字」模式，手動貼上單字\n2. 切換到「匯入 JSON」模式，將圖片貼給 Claude 讓我幫你擷取 JSON\n\nOCR 原始文字（參考用）：\n${allText.slice(0, 600)}`);
      } else {
        const defaultName = valid[0].name.replace(/\.\w+$/i, '').replace(/[_]/g, ' ');
        setSetName(defaultName);
        setExtracted(words);
      }
    } catch (e) {
      setError('處理失敗：' + e.message);
    }
    setLoading(false);
    setLoadingMsg('');
  };

  /* ========== Mode 2: Paste text ========== */
  const handleParseText = () => {
    reset();
    if (!pasteText.trim()) { setError('請先貼上文字'); return; }
    const words = parseWords(pasteText);
    if (words.length === 0) {
      setError('無法從文字中解析出單字對照。請確認格式：每行 "編號 英文 中文"');
      return;
    }
    setSetName('新單字集');
    setExtracted(words);
  };

  /* ========== Mode 3: JSON import ========== */
  const handleImportJSON = () => {
    reset();
    if (!jsonText.trim()) { setError('請先貼上 JSON'); return; }
    try {
      const data = JSON.parse(jsonText);
      const arr = Array.isArray(data) ? data : data.words || [];
      const words = arr.map((w, i) => ({
        id: w.id || i + 1,
        english: w.english || w.en || '',
        chinese: w.chinese || w.zh || w.cn || '',
      })).filter(w => w.english && w.chinese);

      if (words.length === 0) {
        setError('JSON 中沒有找到有效的單字。格式應為：[{ "id": 1, "english": "...", "chinese": "..." }, ...]');
        return;
      }
      setSetName(data.name || '新單字集');
      setExtracted(words);
    } catch (e) {
      setError('JSON 格式錯誤：' + e.message);
    }
  };

  /* ========== Edit extracted word ========== */
  const updateWord = (index, field, value) => {
    setExtracted(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  };

  const deleteWord = (index) => {
    setExtracted(prev => prev.filter((_, i) => i !== index));
  };

  /* ========== Confirm ========== */
  const handleConfirm = () => {
    if (extracted && extracted.length > 0 && setName.trim()) {
      onAdd(setName.trim(), extracted);
      setExtracted(null);
      setSetName('');
      setPasteText('');
      setJsonText('');
      setPreviewUrls([]);
    }
  };

  /* ========== Download as JSON file (永久存檔) ========== */
  const handleDownloadJSON = () => {
    if (!extracted || extracted.length === 0 || !setName.trim()) return;
    const payload = { title: setName.trim(), words: extracted };
    const slug = slugify(setName.trim());
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  };

  /* ========== Render ========== */
  const modeBtn = (key, label) => (
    <button
      key={key}
      onClick={() => { setMode(key); reset(); }}
      style={{
        padding: '8px 18px', fontSize: 14, border: 'none', borderRadius: 8,
        cursor: 'pointer', color: 'white',
        background: mode === key ? '#3498db' : '#bbb',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="upload-section">
      <h2>上傳 / 匯入單字</h2>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '12px 0 20px' }}>
        {modeBtn('file', '上傳檔案 (PDF/圖片)')}
        {modeBtn('paste', '貼上文字')}
        {modeBtn('json', '匯入 JSON')}
      </div>

      {/* ---- File upload mode ---- */}
      {mode === 'file' && (
        <>
          <div
            className="upload-zone"
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={e => e.currentTarget.classList.remove('dragover')}
            onClick={() => fileRef.current?.click()}
          >
            <div className="icon">+</div>
            <p>拖放檔案到這裡，或點擊選擇檔案</p>
            <p style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>支援 JPG / PNG / PDF，可一次選多個檔案</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {/* Image previews */}
          {previewUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' }}>
              {previewUrls.map((url, i) => (
                <img key={i} src={url} alt={`preview-${i}`}
                  style={{ height: 120, borderRadius: 6, border: '1px solid #ddd' }} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ---- Paste text mode ---- */}
      {mode === 'paste' && (
        <div style={{ textAlign: 'left', maxWidth: 700, margin: '0 auto' }}>
          <p style={{ color: '#666', marginBottom: 12, fontSize: 14 }}>
            每行格式：<code>編號 英文單字 詞性.中文</code>，例如：<br/>
            <code>1 like v. 喜歡；像</code><br/>
            <code>2 practice v. 練習</code>
          </p>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="將單字文字貼到這裡..."
            style={{
              width: '100%', height: 250, padding: 12, fontSize: 14,
              border: '1px solid #ccc', borderRadius: 8, fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
          <button className="btn-confirm" style={{ marginTop: 12 }} onClick={handleParseText}>
            解析文字
          </button>
        </div>
      )}

      {/* ---- JSON import mode ---- */}
      {mode === 'json' && (
        <div style={{ textAlign: 'left', maxWidth: 700, margin: '0 auto' }}>
          {/* Step-by-step guide */}
          <div style={{
            background: '#eaf4fe', border: '1px solid #b8daff', borderRadius: 8,
            padding: 16, marginBottom: 16, fontSize: 14, lineHeight: 1.8,
          }}>
            <strong style={{ fontSize: 15 }}>如何用 Claude 擷取單字？</strong>
            <ol style={{ paddingLeft: 20, margin: '8px 0 0' }}>
              <li>到 <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: '#2980b9' }}>claude.ai</a> 開一個新對話</li>
              <li>將掃描的單字表圖片貼上（可一次多張）</li>
              <li>輸入以下 prompt：</li>
            </ol>
            <div style={{
              background: '#fff', border: '1px solid #ddd', borderRadius: 6,
              padding: '10px 14px', margin: '8px 0', fontFamily: 'monospace', fontSize: 13,
              whiteSpace: 'pre-wrap', userSelect: 'all', cursor: 'pointer',
            }}
              title="點擊全選，再 Ctrl+C 複製"
              onClick={e => { const sel = window.getSelection(); sel.selectAllChildren(e.currentTarget); }}
            >{`請將這張單字表擷取為 JSON，格式：\n[{"id": 1, "english": "...", "chinese": "..."}, ...]\n只輸出 JSON，不要其他文字。如果有多張圖片請合併為一個陣列。`}</div>
            <li style={{ listStyle: 'none', paddingLeft: 20 }}>4. 複製 Claude 回覆的 JSON，貼到下方輸入框</li>
          </div>

          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='[{"id": 1, "english": "like", "chinese": "v. 喜歡；像"}, ...]'
            style={{
              width: '100%', height: 250, padding: 12, fontSize: 13,
              border: '1px solid #ccc', borderRadius: 8, fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
          <button className="btn-confirm" style={{ marginTop: 12 }} onClick={handleImportJSON}>
            匯入 JSON
          </button>
        </div>
      )}

      {/* ---- Loading ---- */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>{loadingMsg || '處理中...'}</span>
        </div>
      )}

      {/* ---- Error ---- */}
      {error && (
        <pre style={{
          color: '#e74c3c', marginTop: 12, whiteSpace: 'pre-wrap', textAlign: 'left',
          background: '#fde8e8', padding: 16, borderRadius: 8, fontSize: 13,
          maxHeight: 300, overflow: 'auto',
        }}>{error}</pre>
      )}

      {/* ---- Extracted results (editable) ---- */}
      {extracted && (
        <div className="upload-result">
          <h3>擷取結果（可編輯）</h3>
          <p className="word-count">共 {extracted.length} 個單字</p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, marginRight: 8 }}>單字集名稱：</label>
            <input
              type="text"
              value={setName}
              onChange={e => setSetName(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: 6, width: 300 }}
            />
          </div>

          <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thSt}>#</th>
                  <th style={thSt}>English</th>
                  <th style={thSt}>中文</th>
                  <th style={{ ...thSt, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {extracted.map((w, i) => (
                  <tr key={i}>
                    <td style={tdSt}>{w.id}</td>
                    <td style={tdSt}>
                      <input value={w.english} onChange={e => updateWord(i, 'english', e.target.value)}
                        style={cellInput} />
                    </td>
                    <td style={tdSt}>
                      <input value={w.chinese} onChange={e => updateWord(i, 'chinese', e.target.value)}
                        style={cellInput} />
                    </td>
                    <td style={tdSt}>
                      <button onClick={() => deleteWord(i)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}>
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#f0f8ff', border: '1px solid #b8daff', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, lineHeight: 1.7 }}>
            <strong>兩種儲存方式：</strong>
            <ul style={{ paddingLeft: 20, margin: '4px 0 0' }}>
              <li><strong>下載 JSON 檔（推薦）</strong>：永久保存。下載後將檔案放到 <code>src/data/wordsets/</code>，重新整理就會自動出現，跨瀏覽器/裝置都看得到。</li>
              <li><strong>加入草稿</strong>：暫存到瀏覽器 localStorage，僅此瀏覽器可見。清快取會消失。</li>
            </ul>
          </div>

          <button className="btn-confirm" onClick={handleDownloadJSON} style={{ background: '#27ae60' }}>📥 下載 JSON 檔</button>
          <button className="btn-confirm" onClick={handleConfirm}>📝 加入草稿</button>
          <button className="btn-cancel" onClick={reset}>取消</button>
        </div>
      )}

      {/* ---- Tips ---- */}
      <div style={{ marginTop: 32, padding: 20, background: '#fff9e6', borderRadius: 8, textAlign: 'left' }}>
        <h4 style={{ marginBottom: 8 }}>使用建議</h4>
        <ul style={{ paddingLeft: 20, color: '#666', fontSize: 14, lineHeight: 1.8 }}>
          <li><strong>最推薦</strong>：將掃描圖片貼到 Claude 對話，請 Claude 輸出 JSON，再用「匯入 JSON」匯入</li>
          <li><strong>上傳檔案</strong>：支援文字型 PDF 直接擷取。圖片會嘗試 OCR，但中英混合辨識率有限</li>
          <li><strong>貼上文字</strong>：適合從其他來源複製的文字，每行格式為「編號 英文 中文」</li>
          <li>所有匯入結果都可以在表格中直接編輯修正後再加入</li>
        </ul>
      </div>
    </div>
  );
}

/* ---- slugify for filename ---- */
function slugify(s) {
  const ts = Date.now().toString(36);
  const ascii = s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
  return ascii ? `${ascii}_${ts}` : `wordset_${ts}`;
}

/* ---- shared table styles ---- */
const thSt = { border: '1px solid #ddd', padding: '6px 8px', background: '#f8f9fa', textAlign: 'left' };
const tdSt = { border: '1px solid #ddd', padding: '2px 4px' };
const cellInput = {
  width: '100%', border: 'none', padding: '4px 6px', fontSize: 14,
  background: 'transparent', outline: 'none',
};

/* ---- PDF text extraction ---- */
async function extractPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}

/* ---- PDF OCR (for scanned PDFs) ---- */
async function extractPDFviaOCR(file, onProgress) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const Tesseract = await import('tesseract.js');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data: { text } } = await Tesseract.recognize(canvas, 'eng+chi_tra', { logger: () => {} });
    fullText += text + '\n';
  }
  return fullText;
}

/* ---- Image OCR extraction ---- */
async function extractImage(file) {
  const Tesseract = await import('tesseract.js');
  const { data: { text } } = await Tesseract.recognize(file, 'eng+chi_tra', {
    logger: () => {},
  });
  return text;
}

/* ---- Parse word pairs from raw text ---- */
function parseWords(text) {
  const words = [];
  const seen = new Set();

  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ');

  const lines = cleaned.split('\n');

  for (const line of lines) {
    const matches = [];

    // Pattern 1: with POS tag (n./v./adj./adv./prep./phr./etc.)
    const regex = /(\d{1,3})\s+([a-zA-Z][a-zA-Z\s'''(.)\-!?,…]*?)\s+((?:n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|aux\.|phr\.|int\.|n\.\s*\/\s*v\.|v\.\s*n\.|a\.)\s*[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef][\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\w\s;；:：、，,。.()（）\-]*?)(?=\s+\d{1,3}\s+[a-zA-Z]|$)/g;

    let m;
    while ((m = regex.exec(line)) !== null) {
      matches.push({ id: parseInt(m[1]), english: m[2].trim(), chinese: m[3].trim() });
    }

    // Pattern 2: without POS tag (e.g. "67 put one's all 盡全力")
    if (matches.length === 0) {
      const simple = /(\d{1,3})\s+([a-zA-Z][a-zA-Z\s'''()\-!?,…]*?)\s+([\u4e00-\u9fff][\u4e00-\u9fff\w\s;；:：、，。()（）\-]*?)(?=\s+\d{1,3}\s+[a-zA-Z]|$)/g;
      let s;
      while ((s = simple.exec(line)) !== null) {
        matches.push({ id: parseInt(s[1]), english: s[2].trim(), chinese: s[3].trim() });
      }
    }

    for (const w of matches) {
      if (w.id > 0 && w.id <= 200 && !seen.has(w.id) && w.english && w.chinese) {
        seen.add(w.id);
        words.push(w);
      }
    }
  }

  words.sort((a, b) => a.id - b.id);
  return words;
}
