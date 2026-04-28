import React, { useState } from 'react';

/* ---- shared style fragments ---- */
const baseCSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Noto Sans CJK TC', 'PingFang TC', sans-serif; }
.sheet-header { text-align: center; }
.info-row {
  display: flex; justify-content: center; gap: 10mm;
  margin-bottom: 2mm;
}
.info-row span { white-space: nowrap; }
.info-blank { display: inline-block; width: 20mm; border-bottom: 1px solid #333; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 0.5px solid #666; }
th { background: #e8e8e8; font-weight: 600; }
.col-num { width: 6mm; text-align: center; }
.col-chn { width: 24mm; white-space: nowrap; }
`;

/* ---- 1-page layout: 100 words, 2 columns ---- */
const ONE_PAGE_CSS = `
@page { size: A4; margin: 5mm 5mm; }
${baseCSS}
.sheet { width: 200mm; margin: 0 auto; }
.sheet-header { margin-bottom: 2mm; }
.sheet-header h1 { font-size: 14pt; margin-bottom: 0.5mm; }
.sheet-header p  { font-size: 9pt; color: #555; }
.info-row { font-size: 10pt; margin-bottom: 2mm; }
.columns { display: flex; gap: 2mm; }
.columns .col { flex: 1; }
th, td { font-size: 9pt; line-height: 1.25; padding: 0.6mm 2mm; }
.col-chn { width: 26mm; }
`;

/* ---- 2-page layout: 50 words per page, 2 columns (25 each), more spacious ---- */
const TWO_PAGE_CSS = `
@page { size: A4; margin: 8mm 8mm; }
${baseCSS}
.sheet { width: 194mm; margin: 0 auto; }
.sheet-header { margin-bottom: 4mm; }
.sheet-header h1 { font-size: 18pt; margin-bottom: 1mm; }
.sheet-header p  { font-size: 11pt; color: #555; }
.info-row { font-size: 12pt; margin-bottom: 4mm; }
.columns { display: flex; gap: 3mm; }
.columns .col { flex: 1; }
th, td { font-size: 13pt; line-height: 1.3; padding: 1.6mm 3mm; }
.col-chn { width: 32mm; white-space: nowrap; }
.page-break { page-break-before: always; }
`;

const renderHeader = (setName) => `
  <div class="sheet-header">
    <h1>${setName || '單字填空練習'}</h1>
    <p>請根據中文提示填入正確的英文單字</p>
  </div>
  <div class="info-row">
    <span>班級：<span class="info-blank"></span></span>
    <span>座號：<span class="info-blank"></span></span>
    <span>姓名：<span class="info-blank"></span></span>
    <span>得分：<span class="info-blank"></span></span>
  </div>`;

const renderRows = (list) =>
  list.map(w => `<tr><td class="col-num">${w.id}</td><td class="col-chn">${w.chinese}</td><td></td></tr>`).join('');

function buildOnePageHTML(words, setName, css) {
  const half = Math.ceil(words.length / 2);
  return `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8">
<title>${setName || 'WordBank'} - 填空練習</title>
<style>${css || ONE_PAGE_CSS}</style></head>
<body><div class="sheet">
  ${renderHeader(setName)}
  <div class="columns">
    <div class="col"><table>
      <thead><tr><th class="col-num">#</th><th class="col-chn">中文</th><th>English</th></tr></thead>
      <tbody>${renderRows(words.slice(0, half))}</tbody>
    </table></div>
    <div class="col"><table>
      <thead><tr><th class="col-num">#</th><th class="col-chn">中文</th><th>English</th></tr></thead>
      <tbody>${renderRows(words.slice(half))}</tbody>
    </table></div>
  </div>
</div></body></html>`;
}

function buildTwoPageHTML(words, setName, css) {
  const pageSize = Math.ceil(words.length / 2);
  const page1 = words.slice(0, pageSize);
  const page2 = words.slice(pageSize);

  const renderTable = (list) => `<table>
    <thead><tr><th class="col-num">#</th><th class="col-chn">中文</th><th>English</th></tr></thead>
    <tbody>${renderRows(list)}</tbody>
  </table>`;

  const renderTwoCol = (pageWords) => {
    const h = Math.ceil(pageWords.length / 2);
    return `<div class="columns">
      <div class="col">${renderTable(pageWords.slice(0, h))}</div>
      <div class="col">${renderTable(pageWords.slice(h))}</div>
    </div>`;
  };

  return `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8">
<title>${setName || 'WordBank'} - 填空練習</title>
<style>${css || TWO_PAGE_CSS}</style></head>
<body>
<div class="sheet">
  ${renderHeader(setName)}
  ${renderTwoCol(page1)}
</div>
<div class="sheet page-break">
  ${renderHeader(setName)}
  ${renderTwoCol(page2)}
</div>
</body></html>`;
}

/* ---- React component ---- */
export default function FillBlank({ words, setName }) {
  const [layout, setLayout] = useState('one'); // 'one' or 'two'

  const buildHTML = layout === 'one' ? buildOnePageHTML : buildTwoPageHTML;

  const handlePrint = () => {
    const html = buildHTML(words, setName);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const handleExportHTML = () => {
    const html = buildHTML(words, setName);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${setName || 'WordBank'}_填空練習.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const html = buildHTML(words, setName);

      // render HTML into a temporary container
      const container = document.createElement('div');
      container.innerHTML = html;
      // extract body content + style
      const style = container.querySelector('style');
      const body = container.querySelector('body') || container;
      const wrapper = document.createElement('div');
      if (style) wrapper.appendChild(style.cloneNode(true));
      wrapper.innerHTML += body.innerHTML;
      document.body.appendChild(wrapper);

      const pageCount = layout === 'one' ? 1 : 2;
      const margin = layout === 'one' ? 5 : 8;

      await html2pdf().set({
        margin,
        filename: `${setName || 'WordBank'}_填空練習.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css'] },
      }).from(wrapper).save();

      document.body.removeChild(wrapper);
    } catch (e) {
      alert('PDF 產生失敗：' + e.message);
    }
    setPdfLoading(false);
  };

  const half = Math.ceil(words.length / 2);
  const left = words.slice(0, half);
  const right = words.slice(half);

  // For 2-page layout: split each page into left/right columns
  const page1Words = left;
  const page2Words = right;
  const p1h = Math.ceil(page1Words.length / 2);
  const p2h = Math.ceil(page2Words.length / 2);
  const twoPageCols = [
    [page1Words.slice(0, p1h), page1Words.slice(p1h)],
    [page2Words.slice(0, p2h), page2Words.slice(p2h)],
  ];

  /* shared inline cell styles */
  const thS = { border: '0.5px solid #666', background: '#e8e8e8', fontWeight: 600 };
  const tdS = { border: '0.5px solid #666' };

  /* layout-specific sizes */
  const is1 = layout === 'one';
  const fontSize = is1 ? '9pt' : '13pt';
  const pad = is1 ? '0.6mm 2mm' : '1.6mm 3mm';
  const lh = is1 ? 1.25 : 1.3;
  const chnW = is1 ? '26mm' : '32mm';
  const numW = is1 ? '6mm' : '8mm';

  const thStyle = { ...thS, fontSize, padding: pad, textAlign: 'left' };
  const tdStyle = { ...tdS, fontSize, padding: pad, lineHeight: lh, textAlign: 'left' };

  const renderPreviewTable = (list) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: numW, textAlign: 'center' }}>#</th>
          <th style={{ ...thStyle, width: chnW, whiteSpace: 'nowrap' }}>中文</th>
          <th style={thStyle}>English</th>
        </tr>
      </thead>
      <tbody>
        {list.map(w => (
          <tr key={w.id}>
            <td style={{ ...tdStyle, textAlign: 'center', width: numW }}>{w.id}</td>
            <td style={{ ...tdStyle, width: chnW, whiteSpace: 'nowrap' }}>{w.chinese}</td>
            <td style={tdStyle}>&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPreviewHeader = () => (
    <>
      <div style={{ textAlign: 'center', marginBottom: is1 ? '2mm' : '4mm' }}>
        <h3 style={{ fontSize: is1 ? '14pt' : '18pt', marginBottom: is1 ? '0.5mm' : '1mm' }}>{setName}</h3>
        <p style={{ fontSize: is1 ? '9pt' : '11pt', color: '#555' }}>請根據中文提示填入正確的英文單字</p>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '10mm',
        fontSize: is1 ? '10pt' : '12pt', marginBottom: is1 ? '2mm' : '4mm'
      }}>
        {['班級', '座號', '姓名', '得分'].map(label => (
          <span key={label}>{label}：<span style={{ display: 'inline-block', width: '20mm', borderBottom: '1px solid #333' }}>&nbsp;</span></span>
        ))}
      </div>
    </>
  );

  return (
    <div className="fill-blank-section">
      <h2>填空練習卷</h2>

      {/* Layout toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '12px 0 20px' }}>
        <button
          className={`btn-export ${layout === 'one' ? '' : 'inactive'}`}
          style={{ background: layout === 'one' ? '#8e44ad' : '#ccc', padding: '8px 18px', fontSize: 14, border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}
          onClick={() => setLayout('one')}
        >
          A4 × 1 (100字/頁)
        </button>
        <button
          className={`btn-export ${layout === 'two' ? '' : 'inactive'}`}
          style={{ background: layout === 'two' ? '#8e44ad' : '#ccc', padding: '8px 18px', fontSize: 14, border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}
          onClick={() => setLayout('two')}
        >
          A4 × 2 (50字/頁)
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
        <button className="btn-export" onClick={handlePrint}>列印練習卷</button>
        <button className="btn-export" style={{ background: '#e74c3c' }} onClick={handleExportPDF} disabled={pdfLoading}>
          {pdfLoading ? '產生中...' : '下載 PDF'}
        </button>
        <button className="btn-export" style={{ background: '#3498db' }} onClick={handleExportHTML}>下載 HTML</button>
      </div>

      {/* ---- A4 Preview ---- */}
      {layout === 'one' ? (
        <div style={{
          background: 'white', width: '210mm', height: '297mm',
          margin: '0 auto', padding: '5mm',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden',
        }}>
          {renderPreviewHeader()}
          <div style={{ display: 'flex', gap: '2mm' }}>
            <div style={{ flex: 1 }}>{renderPreviewTable(left)}</div>
            <div style={{ flex: 1 }}>{renderPreviewTable(right)}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {twoPageCols.map(([l, r], pi) => (
            <div key={pi} style={{
              background: 'white', width: '210mm', height: '297mm',
              margin: '0 auto', padding: '8mm',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden',
            }}>
              {renderPreviewHeader()}
              <p style={{ textAlign: 'right', fontSize: '9pt', color: '#999', marginBottom: '2mm' }}>
                第 {pi + 1} / 2 頁
              </p>
              <div style={{ display: 'flex', gap: '3mm' }}>
                <div style={{ flex: 1 }}>{renderPreviewTable(l)}</div>
                <div style={{ flex: 1 }}>{renderPreviewTable(r)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
