// ==============================
// Step2JP Extractor
// 正規化 → kuromojiトークン化 → ストップワード除去
// API:
//   await Step2Extractor.init({ dicPath, stopPath })
//   const { tokens, keywords } = Step2Extractor.run(text)
// ==============================
(() => {
  const TAG = "[Step2Extractor]";

  let tokenizer = null;
  let stopwords = { surface: [], pos: ["助詞"], minLen: 2 };
  let ready = false;

  // ---- 正規化 ----
  function normalizeJa(input) {
    if (!input) return "";
    let s = input;
    try { s = s.normalize("NFKC"); } catch {}
    s = s.replace(/https?:\/\/\S+|www\.\S+/gi, " "); // URL除去
    s = s.replace(/@\w+/g, " ");                     // メンション除去
    // # はハッシュタグ抽出のため残す
    s = s.replace(/[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9#\s\-]/gu, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  // ---- 形態素解析（kuromoji） ----
  function tokenize(normText) {
    const toks = tokenizer.tokenize(normText);
    // 出力: { surface, base, pos }
    return toks.map(t => ({
      surface: t.surface_form,
      base: (t.basic_form && t.basic_form !== "*") ? t.basic_form : t.surface_form,
      pos: t.pos
    }));
  }

  // ---- フィルタ（stopwords.json: surface/pos/minLen）----
  function filterTokens(tokens) {
    const stopSurface = new Set(stopwords.surface || []);
    const stopPos = new Set(stopwords.pos || []);
    const minLen = stopwords.minLen ?? 2;

    return tokens.filter(t => {
      if (!t.base || t.base.length < minLen) return false;
      if (stopSurface.has(t.base)) return false;
      if (stopPos.has(t.pos)) return false;
      return true;
    });
  }

  // ---- 公開API ----
  async function init({ dicPath, stopPath = "assets/stopwords.json" } = {}) {
    // stopwords.json
    try {
      const res = await fetch(chrome.runtime.getURL(stopPath));
      if (res.ok) stopwords = await res.json();
      else console.warn(`${TAG} stopwords.json load failed: ${res.status}`);
    } catch (e) {
      console.warn(`${TAG} stopwords.json load error`, e);
    }

    // kuromoji 準備
    if (typeof kuromoji === "undefined") {
      console.error(`${TAG} kuromoji not loaded. Check manifest order.`);
      return;
    }
    await new Promise(resolve => {
      kuromoji.builder({ dicPath }).build((err, tk) => {
        if (err) {
          console.error(`${TAG} kuromoji build failed`, err);
        } else {
          tokenizer = tk;
          console.log(`${TAG} kuromoji ready`);
        }
        resolve();
      });
    });

    ready = !!tokenizer;
  }

  function run(rawText) {
    if (!ready || !rawText) return { tokens: [], keywords: [] };

    const norm = normalizeJa(rawText);
    const tokens = tokenize(norm);

    // デバッグ：トークン化前後を出力
    console.log(`${TAG} 原文:`, rawText);
    console.log(`${TAG} 正規化後:`, norm);
    console.log(`${TAG} 全トークン:`, tokens);

    const filtered = filterTokens(tokens);
    const keywords = filtered.map(t => t.base);

    console.log(`${TAG} キーワード(助詞など除外後):`, keywords);

    return { tokens, keywords };
  }

  // グローバル公開
  window.Step2Extractor = { init, run };
})();
