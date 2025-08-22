// // ==============================
// // Step1 JP: ツイート取得 + 日本語正規化/トークン化
// // ==============================
// (() => {

//  // ------- kuromoji 安全初期化（なくても動く） -------
// console.log(`${TAG} boot`);

// let tokenizer = null;
// let tokenizerReady = false;

// const dicPath = chrome.runtime.getURL('vendor/kuromoji/dict/');

// console.log(TAG, 'dicPath:', dicPath);
// fetch(dicPath + 'base.dat.gz')
//   .then(r => console.log(TAG, 'dict test status:', r.status)) // 200
//   .catch(e => console.error(TAG, 'dict test error:', e));

// // kuromoji初期化
// try {
//   if (typeof kuromoji === 'undefined') {
//     console.warn(`${TAG} kuromoji 未ロード。Segmenterフォールバックで続行`);
//   } else {
//     kuromoji.builder({ dicPath }).build((err, tk) => {
//       if (err) {
//         console.warn(`${TAG} kuromoji 構築失敗。Segmenterフォールバックで続行`, err);
//       } else {
//         tokenizer = tk;
//         tokenizerReady = true;
//         console.log(`${TAG} kuromoji 初期化完了`);
//       }
//     });
//   }
// } catch (e) {
//   console.warn(`${TAG} kuromoji 初期化例外。Segmenterフォールバックで続行`, e);
// }
  
//   // 手動実行用: console から window.__tweetHelperJP.forceExtract()
//   window.__tweetHelperJP = {
//     forceExtract: () => {
//       const text = extractActiveTweetText();
//       if (text) output(text);
//       else console.warn(`${TAG} ツイート本文が見つかりませんでした`);
//     }
//   };

//   // 直近でクリックしたツイートを覚える
//   let lastClickedArticle = null;
//   document.addEventListener('click', (e) => {
//     const article = e.target.closest?.('article');
//     if (article) lastClickedArticle = article;

//     // クリックのたびに軽く試す（UI変化に強い）
//     setTimeout(() => {
//       const text = extractActiveTweetText();
//       if (text) output(text);
//     }, 80);
//   }, { capture: true });

//   // モーダル出現（リポスト/引用）を監視
//   const mo = new MutationObserver(() => {
//     const dialog = document.querySelector('[role="dialog"], [data-testid="confirmationSheetDialog"]');
//     if (dialog) {
//       const txt = extractTweetTextFromArticle(dialog.querySelector('article')) || extractActiveTweetText();
//       if (txt) output(txt);
//     }
//   });
//   mo.observe(document.documentElement, { childList: true, subtree: true });

//   // ページ読み込み直後にも一度
//   setTimeout(() => {
//     const text = extractActiveTweetText();
//     if (text) output(text);
//   }, 600);

//   // -------- 抽出ロジック --------
//   function getVisiblePrimaryTweetArticle() {
//     const articles = Array.from(document.querySelectorAll('article'));
//     const viewportH = window.innerHeight || 0;

//     let best = null;
//     let bestScore = Infinity;
//     for (const a of articles) {
//       const rect = a.getBoundingClientRect();
//       if (rect.height < 40) continue;
//       const mid = rect.top + rect.height / 2;
//       if (mid < 0 || mid > viewportH) continue;
//       const score = Math.abs(mid - viewportH * 0.45);
//       if (score < bestScore) {
//         best = a;
//         bestScore = score;
//       }
//     }
//     return best;
//   }

//   function extractActiveTweetText() {
//     // 1) 直近クリック
//     const fromClicked = extractTweetTextFromArticle(lastClickedArticle);
//     if (fromClicked) return fromClicked;

//     // 2) モーダル内（引用/リポスト時）
//     const modal = document.querySelector('[role="dialog"], [data-testid="confirmationSheetDialog"]');
//     if (modal) {
//       const fromModal = extractTweetTextFromArticle(modal.querySelector('article'));
//       if (fromModal) return fromModal;
//     }

//     // 3) 画面中央付近のarticle
//     const primary = getVisiblePrimaryTweetArticle();
//     const fromPrimary = extractTweetTextFromArticle(primary);
//     if (fromPrimary) return fromPrimary;

//     // 4) フォールバック：最長のtweetText
//     const texts = Array.from(document.querySelectorAll('[data-testid="tweetText"]'))
//       .map(n => n.innerText.trim())
//       .filter(Boolean);
//     const longest = texts.sort((a,b)=>b.length-a.length)[0];
//     return longest || '';
//   }

//   function extractTweetTextFromArticle(article) {
//     if (!article) return '';
//     // 通常本文
//     const textNode = article.querySelector('[data-testid="tweetText"]');
//     if (textNode?.innerText) return textNode.innerText.trim();
//     // 詳細表示など
//     const langText = article.querySelector('div[lang]');
//     if (langText?.innerText) return langText.innerText.trim();
//     // 引用ツイート本文（引用カード内）
//     const quoted = article.querySelector('a[href*="/status/"] div[dir="auto"]');
//     if (quoted?.innerText) return quoted.innerText.trim();
//     return '';
//   }

  

// // --- 4) kuromojiでトークン化 → 複合名詞結合 & 動詞の辞書形化 ---
//   function tokenizeJa(normalized) {
//   if (!normalized) return [];
//   if (tokenizerReady && tokenizer) return tokenizeWithKuromoji(normalized);
//   return tokenizeWithSegmenter(normalized); // 準備中は必ずこちらを使う
// }

// function tokenizeWithKuromoji(normalized) {
//   const toks = tokenizer.tokenize(normalized); // {surface_form, pos, basic_form, ...}
//   const result = [];
//   let buf = '';

//   const isLatinOrDigitOrHyphen = (s) => /^[A-Za-z0-9\-]+$/.test(s);

//   for (let i = 0; i < toks.length; i++) {
//     const t = toks[i];

//     if (t.pos === '動詞') {
//       const base = (t.basic_form && t.basic_form !== '*') ? t.basic_form : t.surface_form;
//       if (buf) { result.push(buf); buf = ''; }
//       result.push(base);
//       continue;
//     }

//     if (t.pos === '名詞') {
//       buf = buf ? buf + t.surface_form : t.surface_form; // 名詞は連結
//       const next = toks[i + 1];
//       if (!next || next.pos !== '名詞') { result.push(buf); buf = ''; }
//       continue;
//     }

//     if (isLatinOrDigitOrHyphen(t.surface_form)) {
//       if (buf) { result.push(buf); buf = ''; }
//       result.push(t.surface_form.toLowerCase());
//       continue;
//     }

//     if (buf) { result.push(buf); buf = ''; }
//     if (t.pos === '形容詞') {
//       const base = (t.basic_form && t.basic_form !== '*') ? t.basic_form : t.surface_form;
//       result.push(base);
//     }
//   }
//   if (buf) result.push(buf);
//   return cleanupTokens(result);
// }
  
// // フォールバック：Intl.Segmenter（必ず何か返す）
// function tokenizeWithSegmenter(normalized) {
//   let words = [];
//   try {
//     if ('Segmenter' in Intl) {
//       const seg = new Intl.Segmenter('ja', { granularity: 'word' });
//       words = Array.from(seg.segment(normalized), s => s.segment);
//     } else {
//       words = normalized.split(/\s+/);
//     }
//   } catch {
//     words = normalized.split(/\s+/);
//   }
//   return cleanupTokens(words);
// }

// function cleanupTokens(arr) {
//   return arr
//     .map(w => w.trim())
//     .filter(Boolean)
//     // ひらがな/カタカナ1文字はノイズとして除外
//     .filter(w => !(w.length === 1 && /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(w)))
//     .slice(0, 16);
// }

//   // -------- 出力（デバッグ） --------
//   function output(rawText) {
//     const normalized = normalizeJa(rawText);
//     const tokens = tokenizeJa(normalized);

//     console.log(`${TAG} 原文:`, rawText);
//     console.log(`${TAG} 正規化後:`, normalized);
//     console.log(`${TAG} トークン(${tokenizerReady ? 'kuromoji' : 'segmenter'}):`, tokens);
//   }
// })();


// ==============================
// Step2JP Runner
// 役割：ツイート本文を拾って Step2Extractor.run() を呼ぶだけ
// ==============================
(() => {
  const TAG = "[Step2Runner]";
  console.log(`${TAG} boot`);

  // ▼ あなたの辞書配置に合わせて（末尾スラッシュ必須）
  const dicPath = chrome.runtime.getURL("vendor/kuromoji/dict/");

  (async () => {
    try {
      await window.Step2Extractor.init({
        dicPath,
        stopPath: "assets/stopwords.json"
      });

      // 初回：画面中心付近のツイートで1回試す
      const t = extractActiveTweetText();
      if (t) window.Step2Extractor.run(t);
    } catch (e) {
      console.error(`${TAG} init error`, e);
    }
  })();

  // -------- ツイート抽出 --------
  function extractActiveTweetText() {
    // 1) モーダル（引用/リポスト時）
    const dialog = document.querySelector('[role="dialog"], [data-testid="confirmationSheetDialog"]');
    const article = dialog?.querySelector("article") || getVisiblePrimaryTweetArticle();
    // 2) 通常本文
    const node = article?.querySelector?.('[data-testid="tweetText"]') || document.querySelector('[data-testid="tweetText"]');
    return node?.innerText?.trim() || "";
  }

  function getVisiblePrimaryTweetArticle() {
    const viewportH = window.innerHeight || 0;
    let best = null, bestScore = Infinity;
    for (const a of document.querySelectorAll("article")) {
      const r = a.getBoundingClientRect();
      if (r.height < 40) continue;
      const mid = r.top + r.height / 2;
      if (mid < 0 || mid > viewportH) continue;
      const score = Math.abs(mid - viewportH * 0.45);
      if (score < bestScore) { best = a; bestScore = score; }
    }
    return best;
  }



  // ---- トリガー：クリック/モーダル ----
  document.addEventListener("click", () => {
    setTimeout(() => {
      const t = extractActiveTweetText();
      if (t) window.Step2Extractor.run(t);
    }, 80);
  }, { capture: true });

  const mo = new MutationObserver(() => {
    const dialog = document.querySelector('[role="dialog"], [data-testid="confirmationSheetDialog"]');
    if (dialog) {
      const t = extractActiveTweetText();
      if (t) window.Step2Extractor.run(t);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 手動実行:  Console で window.__step2.force()
  window.__step2 = { force: () => {
    const t = extractActiveTweetText();
    if (t) window.Step2Extractor.run(t);
  }};
})();
