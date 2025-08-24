// ==============================
// context_x.js
// 役割：ツイート本文を取得し、Step2Extractor.run() を呼ぶ
// ==============================
(() => {
  const TAG = "[Step3Runner]";
  console.log(`${TAG} boot`);

  // 辞書のPath
  const dicPath = chrome.runtime.getURL("vendor/kuromoji/dict/");


  //window.QueryBuilder・window.Step2ExtractorがUndefinedの状態で、initを呼ばないようにするため
  async function waitForGlobal(name, ms = 3000, step = 50) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      if (window[name]) return window[name];
      await new Promise(r => setTimeout(r, step));
    }
    throw new Error(`${name} not loaded`);
  }

  (async () => {
    try {
        await waitForGlobal("Step2Extractor");
        await waitForGlobal("QueryBuilder");


        const extractor = window.Step2Extractor;
        if (extractor && typeof extractor.init === "function") {
        await extractor.init({ dicPath, stopPath: "assets/stopwords.json" });
        } else {
        console.warn("[Step3Runner] Step2Extractor.init が無いので、オート初期化済みとして続行します");
        }
        const qb = window.QueryBuilder;
        if (qb && typeof qb.init === "function") {
        await qb.init();
        } else {
        console.warn("[Step3Runner] QueryBuilder.init が見つからないためスキップします");
        }

        // 初回試走
        const t = extractActiveTweetText();
        if (t) buildAndLog(t);

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
      if (!t) return;
      const { keywords } = window.Step2Extractor.run(t);
      const { query, url } = window.QueryBuilder.build(keywords, { engine: "google" });
      console.log(`${TAG} クリック時クエリ:`, query);
      console.log(`${TAG} クリック時URL:`, url);
      // 開くならユーザー操作内で↓をコメント解除
      // window.QueryBuilder.open(url);
    }, 80);
  }, { capture: true });

  const mo = new MutationObserver(() => {
    const dialog = document.querySelector('[role="dialog"], [data-testid="confirmationSheetDialog"]');
    if (dialog) {
      const t = extractActiveTweetText();
      if (!t) return;
      const { keywords } = window.Step2Extractor.run(t);
      const { query, url } = window.QueryBuilder.build(keywords, { engine: "google" });
      console.log(`${TAG} モーダル時クエリ:`, query);
      console.log(`${TAG} モーダル時URL:`, url);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 手動
  window.__step3 = {
    force: (engine = "google") => {
      const t = extractActiveTweetText();
      if (!t) return;
      const { tokens } = window.Step2Extractor.run(t);
      const tokenWords = tokens.map(t => t.base).filter(Boolean);
      const { query, url } = window.QueryBuilder.build(tokenWords, { engine, maxTerms: 30 });
      console.log(`${TAG} forceクエリ:`, query);
      console.log(`${TAG} forceURL:`, url);
      // window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  
})();
