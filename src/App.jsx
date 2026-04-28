import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WordList from './components/WordList';
import Flashcard from './components/Flashcard';
import FillBlank from './components/FillBlank';
import Upload from './components/Upload';

const DRAFTS_KEY = 'wordbank_drafts';

// Auto-load every JSON in src/data/wordsets/ at build time.
// Each file: { title: string, words: [{id, english, chinese}, ...] }
const wordsetModules = import.meta.glob('./data/wordsets/*.json', { eager: true });
const CANONICAL_SETS = Object.keys(wordsetModules)
  .sort()
  .map(path => {
    const mod = wordsetModules[path].default ?? wordsetModules[path];
    return {
      name: mod.title || path.split('/').pop().replace(/\.json$/, ''),
      words: mod.words || [],
      source: 'file',
      file: path.split('/').pop(),
    };
  });

function loadDrafts() {
  try {
    const saved = localStorage.getItem(DRAFTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(s => ({ ...s, source: 'draft' }));
    }
  } catch (e) { /* ignore */ }
  return [];
}

function saveDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function App() {
  const [tab, setTab] = useState('list');
  const [drafts, setDrafts] = useState(loadDrafts);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  const wordSets = useMemo(() => [...CANONICAL_SETS, ...drafts], [drafts]);

  useEffect(() => { saveDrafts(drafts); }, [drafts]);

  const activeSet = wordSets[activeSetIndex];
  const activeWords = activeSet?.words || [];

  const handleAddDraft = useCallback((name, words) => {
    setDrafts(prev => {
      const next = [...prev, { name, words, source: 'draft' }];
      setActiveSetIndex(CANONICAL_SETS.length + next.length - 1);
      return next;
    });
    setTab('list');
  }, []);

  const handleDeleteSet = useCallback(() => {
    if (!activeSet || activeSet.source !== 'draft') return;
    if (!confirm('確定要刪除這個草稿單字集嗎？（檔案型單字集無法刪除）')) return;
    const draftIndex = activeSetIndex - CANONICAL_SETS.length;
    setDrafts(prev => prev.filter((_, i) => i !== draftIndex));
    setActiveSetIndex(0);
  }, [activeSet, activeSetIndex]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>WordBank 單字庫</h1>
        <p className="subtitle">背單字 / 閃卡測驗 / 填空練習</p>
      </header>

      <nav className="nav-tabs">
        {[
          ['list', '單字列表'],
          ['flashcard', '閃卡測驗'],
          ['fillblank', '填空練習卷'],
          ['upload', '匯入單字'],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {wordSets.length > 0 && tab !== 'upload' && (
        <div className="wordset-selector">
          <select value={activeSetIndex} onChange={e => setActiveSetIndex(Number(e.target.value))}>
            {wordSets.map((set, i) => (
              <option key={i} value={i}>
                {set.source === 'draft' ? '📝 ' : ''}{set.name} ({set.words.length} 字)
              </option>
            ))}
          </select>
          {activeSet?.source === 'draft' && (
            <button onClick={handleDeleteSet}>刪除此草稿</button>
          )}
        </div>
      )}

      {tab === 'list' && <WordList words={activeWords} />}
      {tab === 'flashcard' && <Flashcard words={activeWords} />}
      {tab === 'fillblank' && <FillBlank words={activeWords} setName={activeSet?.name} />}
      {tab === 'upload' && <Upload onAdd={handleAddDraft} />}
    </div>
  );
}

export default App;
