import React, { useState, useEffect, useCallback } from 'react';
import words_2_1 from './data/words.json';
import words_1_1 from './data/words_1-1.json';
import words_1_2 from './data/words_1-2.json';
import words_1_3 from './data/words_1-3.json';
import words_2_2 from './data/words_2-2.json';
import WordList from './components/WordList';
import Flashcard from './components/Flashcard';
import FillBlank from './components/FillBlank';
import Upload from './components/Upload';

const STORAGE_KEY = 'wordbank_sets';

const DEFAULT_SETS = [
  { name: '七年級第一學期第一次單字競賽', words: words_1_1 },
  { name: '七年級第一學期第二次單字競賽', words: words_1_2 },
  { name: '七年級第一學期第三次單字競賽', words: words_1_3 },
  { name: '七年級第二學期第一次單字競賽', words: words_2_1 },
  { name: '七年級第二學期第二次單字競賽', words: words_2_2 },
];

function loadWordSets() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_SETS;
}

function saveWordSets(sets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

function App() {
  const [tab, setTab] = useState('list');
  const [wordSets, setWordSets] = useState(loadWordSets);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  useEffect(() => {
    saveWordSets(wordSets);
  }, [wordSets]);

  const activeWords = wordSets[activeSetIndex]?.words || [];

  const handleAddWordSet = useCallback((name, words) => {
    setWordSets(prev => {
      const next = [...prev, { name, words }];
      setActiveSetIndex(next.length - 1);
      return next;
    });
    setTab('list');
  }, []);

  const handleDeleteSet = useCallback(() => {
    if (wordSets.length <= 1) return;
    if (!confirm('確定要刪除這個單字集嗎？')) return;
    setWordSets(prev => prev.filter((_, i) => i !== activeSetIndex));
    setActiveSetIndex(0);
  }, [activeSetIndex, wordSets.length]);

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
              <option key={i} value={i}>{set.name} ({set.words.length} 字)</option>
            ))}
          </select>
          {wordSets.length > 1 && (
            <button onClick={handleDeleteSet}>刪除此單字集</button>
          )}
        </div>
      )}

      {tab === 'list' && <WordList words={activeWords} />}
      {tab === 'flashcard' && <Flashcard words={activeWords} />}
      {tab === 'fillblank' && <FillBlank words={activeWords} setName={wordSets[activeSetIndex]?.name} />}
      {tab === 'upload' && <Upload onAdd={handleAddWordSet} />}
    </div>
  );
}

export default App;
