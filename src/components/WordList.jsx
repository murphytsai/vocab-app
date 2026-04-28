import React, { useState } from 'react';

export default function WordList({ words }) {
  const [search, setSearch] = useState('');

  const filtered = words.filter(w =>
    w.english.toLowerCase().includes(search.toLowerCase()) ||
    w.chinese.includes(search)
  );

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <input
          type="text"
          placeholder="搜尋單字..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '10px 16px', width: '100%', maxWidth: 400,
            border: '1px solid #ccc', borderRadius: 8, fontSize: 15
          }}
        />
      </div>
      <div className="word-list">
        {filtered.map(w => (
          <div className="word-item" key={w.id}>
            <span className="num">{w.id}.</span>
            <span className="eng">{w.english}</span>
            <span className="chn">{w.chinese}</span>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: 20 }}>找不到符合的單字</p>
      )}
    </div>
  );
}
