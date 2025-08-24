// query_builder.js
(() => {
  const TAG = "[QueryBuilder:min]";

  // そのまま AND 検索に使う（.jp & https だけ付与）
  function buildFromTokens(tokensOrWords, { engine = "google", maxTerms = 20 } = {}) {
    // tokensOrWords は [{base, pos, ...}] または ["語", "語", ...]
    const words = Array.isArray(tokensOrWords) && typeof tokensOrWords[0] === "object"
      ? tokensOrWords.map(t => t.base || t.surface || "").filter(Boolean)
      : (tokensOrWords || []).map(w => String(w || ""));

    // 空/重複除去・順序維持・（任意で）上限
    const seen = new Set();
    const core = [];
    for (const w of words) {
      const ww = w.trim();
      if (!ww || seen.has(ww)) continue;
      seen.add(ww);
      core.push(ww);
      if (maxTerms && core.length >= maxTerms) break; // ←必要なら無限にしてもOK
    }

    // クォート（空白/ASCII+日本語混在など）
    const parts = core.map(quoteIfNeeded);

    // // 日本向け＆HTTPS優先だけ付与（不要なら外してOK）
    // parts.push("site:.jp", "inurl:https");

    const query = parts.join(" ").trim();

    // エンジン別URL
    let url = "";
    if (engine === "bing") {
      url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=ja-jp`;
    } else if (engine === "ddg") {
      url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=jp-ja`;
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ja`;
    }

    console.log(`${TAG} query:`, query);
    console.log(`${TAG} url:`, url);
    return { query, url };
  }

  function quoteIfNeeded(w) {
    if (/\s/.test(w) || (/[A-Za-z0-9]/.test(w) && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(w))) {
      return `"${w}"`;
    }
    return w;
  }

  async function init() {
    // もう読み込むものは何もない（ダミー）
    console.log("[QueryBuilder:min] ready");
  }

  // API
  window.QueryBuilder = { init, build: buildFromTokens };
  
})();
