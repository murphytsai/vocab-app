import React, { useState, useCallback, useEffect } from 'react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcard({ words }) {
  const [mode, setMode] = useState('en2zh'); // en2zh or zh2en
  const [deck, setDeck] = useState(words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setDeck(words);
    setIndex(0);
    setFlipped(false);
  }, [words]);

  const current = deck[index];

  const handleShuffle = useCallback(() => {
    setDeck(shuffle(words));
    setIndex(0);
    setFlipped(false);
  }, [words]);

  const handlePrev = () => { setIndex(i => Math.max(0, i - 1)); setFlipped(false); };
  const handleNext = () => { setIndex(i => Math.min(deck.length - 1, i + 1)); setFlipped(false); };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!current) return <p style={{ textAlign: 'center', color: '#aaa' }}>沒有單字</p>;

  const front = mode === 'en2zh' ? current.english : current.chinese;
  const backWord = mode === 'en2zh' ? current.english : current.chinese;
  const backTranslation = mode === 'en2zh' ? current.chinese : current.english;

  return (
    <div className="flashcard-container">
      <div className="flashcard-mode-toggle">
        <button className={mode === 'en2zh' ? 'active' : ''} onClick={() => { setMode('en2zh'); setFlipped(false); }}>
          英 → 中
        </button>
        <button className={mode === 'zh2en' ? 'active' : ''} onClick={() => { setMode('zh2en'); setFlipped(false); }}>
          中 → 英
        </button>
      </div>

      <div className="flashcard-progress">
        {index + 1} / {deck.length}
      </div>

      <div className="flashcard" onClick={() => setFlipped(f => !f)}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <div className="word">{front}</div>
            <div className="hint">點擊翻面</div>
          </div>
          <div className="flashcard-back">
            <div className="word">{backWord}</div>
            <div className="translation">{backTranslation}</div>
          </div>
        </div>
      </div>

      <div className="flashcard-controls">
        <button className="btn-prev" onClick={handlePrev} disabled={index === 0}>上一個</button>
        <button className="btn-shuffle" onClick={handleShuffle}>隨機排序</button>
        <button className="btn-next" onClick={handleNext} disabled={index === deck.length - 1}>下一個</button>
      </div>

      <p style={{ fontSize: 13, color: '#aaa' }}>鍵盤：← → 切換，空白鍵翻面</p>
    </div>
  );
}
