/* =====================================================================
   Campaign Report Builder
   Turns post-level social metrics into KPIs, a format face-off, a
   reach-vs-engagement map, a leaderboard, plain-English insights, and a
   shareable stakeholder summary.
   Everything runs in the browser. No libraries, no server, no API keys.
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- 1. Configuration ---------- */

  // Example data: International Week 2026 (Grambling State University) Instagram
  // insights, entered from each post's Insights screen. Check with the account
  // owners before publishing this publicly; swap in your own data if needed.
  // collaborators = number of partner accounts on the post (null = unknown).
  const EXAMPLE = [
    { post: "Will You Marry Me? reel", platform: "Instagram", format: "Reel", views: 19998, reach: 8513, likes: 802, comments: 45, shares: 594, saves: 22, reposts: 90, collaborators: 3 },
    { post: "Engaged save-the-date graphic", platform: "Instagram", format: "Post", views: 17231, reach: 6627, likes: 397, comments: 20, shares: 380, saves: 31, reposts: 52, collaborators: 3 },
    { post: "Group photo with G banner reel", platform: "Instagram", format: "Reel", views: 2423, reach: 1290, likes: 67, comments: 6, shares: 19, saves: 1, reposts: 11, collaborators: 1 },
    { post: "Fake African Wedding event flyer", platform: "Instagram", format: "Post", views: 10592, reach: 4180, likes: 155, comments: 2, shares: 121, saves: 16, reposts: 25, collaborators: 3 },
    { post: "Black-and-white couple reel", platform: "Instagram", format: "Reel", views: 11972, reach: 5223, likes: 431, comments: 11, shares: 330, saves: 20, reposts: 39, collaborators: 4 },
    { post: "Fake African Wedding Casting Call", platform: "Instagram", format: "Post", views: 5528, reach: 1885, likes: 106, comments: 18, shares: 93, saves: 6, reposts: 14, collaborators: null },
    { post: "DJ set photo", platform: "Instagram", format: "Post", views: 6241, reach: 2113, likes: 144, comments: 3, shares: 4, saves: 1, reposts: 9, collaborators: 2 },
    { post: "Three women on the steps photo", platform: "Instagram", format: "Post", views: 5852, reach: 1765, likes: 201, comments: 0, shares: 44, saves: 6, reposts: 17, collaborators: 2 },
    { post: "Railing jump reel", platform: "Instagram", format: "Reel", views: 5854, reach: 3543, likes: 142, comments: 1, shares: 168, saves: 2, reposts: 10, collaborators: 1 },
    { post: "Style Guide: Traditional", platform: "Instagram", format: "Post", views: 3493, reach: 1271, likes: 130, comments: 0, shares: 12, saves: 1, reposts: 9, collaborators: 1 },
    { post: "Style Guide: Non-Traditional", platform: "Instagram", format: "Post", views: 2835, reach: 1100, likes: 108, comments: 0, shares: 20, saves: 5, reposts: 9, collaborators: 1 },
    { post: "Fake African Wedding Menu", platform: "Instagram", format: "Post", views: 7804, reach: 2612, likes: 189, comments: 18, shares: 67, saves: 11, reposts: 15, collaborators: 2 },
    { post: "POV: You DJ a Fake African Wedding reel", platform: "Instagram", format: "Reel", views: 6943, reach: 3702, likes: 237, comments: 8, shares: 12, saves: 7, reposts: 13, collaborators: 1 },
    { post: "Fake African Wedding Outfits reel", platform: "Instagram", format: "Reel", views: 19384, reach: 8744, likes: 971, comments: 5, shares: 78, saves: 18, reposts: 53, collaborators: 2 }
  ];

  // Column names the tool understands. Left = internal name, right = accepted CSV headers.
  // To support a new export format, add its header spelling here.
  const COLUMN_ALIASES = {
    post: ["post", "name", "title", "content", "postname", "description"],
    platform: ["platform", "channel", "network"],
    format: ["format", "type", "mediatype", "posttype"],
    date: ["date", "publishdate", "posted", "publishtime"],
    views: ["views", "impressions", "plays"],
    reach: ["reach", "accountsreached", "uniquereach"],
    likes: ["likes", "reactions"],
    comments: ["comments", "replies"],
    shares: ["shares", "sends"],
    saves: ["saves", "bookmarks"],
    reposts: ["reposts", "retweets"],
    collaborators: ["collaborators", "collabs", "collaboratorcount", "partners"]
  };
  const NUMERIC = ["views", "reach", "likes", "comments", "shares", "saves", "reposts"];
  const SMALL_SAMPLE = 3;          // groups smaller than this get a "directional only" caveat
  const SIMILAR_ENGAGEMENT = 0.02; // engagement gaps under 2 points are called "similar"
  const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
  // Only the visitor's own data is saved here. (v2: older versions also saved the example
  // campaign under "v1", which would mix it into "my data", so that key is ignored.)
  const STORAGE_KEY = "campaign-report-builder:own-data-v2";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 2. State ---------- */
  // mode = what the visitor chose on the landing screen:
  //   "landing" (nothing chosen yet) · "example" (built-in campaign) · "own" (their own data)
  // The example and the visitor's data are kept in separate lists so they never mix.
  let mode = "landing";
  let ownRows = load();   // the visitor's own posts (remembered in this browser)
  let rows = [];          // whichever list is currently on screen
  let formatColor = {};

  /* ---------- 3. Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
  const fmtPct = (n) => (isFinite(n) ? (n * 100).toFixed(1) + "%" : "–");
  const fmtShort = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : fmtInt(n);
  const normKey = (h) => String(h).toLowerCase().replace(/[^a-z]/g, "");
  const chip = (format) => `<span class="chip" style="--c:${formatColor[format] || SERIES[0]}">${esc(format)}</span>`;

  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function save() {
    if (mode !== "own") return; // the example campaign is never saved as the visitor's data
    ownRows = rows;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch (e) { /* storage unavailable: data stays in memory */ }
  }
  // Messages appear next to the data form ("status") or the share buttons ("shareStatus").
  function setStatus(msg, kind, id = "status") {
    const el = $(id); el.textContent = msg; el.className = "status" + (kind ? " is-" + kind : "");
  }

  /* ---------- 4. CSV parsing ---------- */
  // Handles quoted fields, commas inside quotes, and Windows line endings.
  function parseCSV(text) {
    const out = []; let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((v) => v.trim() !== "")) out.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some((v) => v.trim() !== "")) out.push(row);
    return out;
  }

  function toNumber(v) {
    if (v == null) return 0;
    const s = String(v).trim().toUpperCase().replace(/,/g, "");
    const m = s.match(/^([\d.]+)\s*([KM])?$/); // supports "6.1K" style values
    if (!m) return Number(s) || 0;
    return parseFloat(m[1]) * (m[2] === "K" ? 1e3 : m[2] === "M" ? 1e6 : 1);
  }

  // Maps CSV headers to internal fields, then builds clean row objects.
  function rowsFromCSV(text) {
    const table = parseCSV(text.trim());
    if (table.length < 2) throw new Error("Need a header row plus at least one data row.");
    const headers = table[0].map(normKey);
    const index = {};
    Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
      const i = headers.findIndex((h) => aliases.includes(h));
      if (i !== -1) index[field] = i;
    });
    if (index.reach === undefined) throw new Error('No "reach" column found. Reach is required to compare posts fairly.');
    return table.slice(1).map((cells, n) => {
      const r = {};
      Object.keys(COLUMN_ALIASES).forEach((f) => {
        const v = index[f] !== undefined ? cells[index[f]] : "";
        r[f] = NUMERIC.includes(f) ? toNumber(v) : String(v || "").trim();
      });
      r.post = r.post || "Post " + (rows.length + n + 1);
      r.platform = r.platform || "Unspecified";
      r.format = r.format || "Unspecified";
            // Blank collaborator count = unknown (null), so it isn't mistaken for 0.
      r.collaborators = r.collaborators === "" ? null : toNumber(r.collaborators);
      return r;
    });
  }

  /* ---------- 5. Metrics ---------- */
  function withMetrics(r) {
    const interactions = r.likes + r.comments + r.shares + r.saves + r.reposts;
    return {
      ...r,
      interactions,
      engagementRate: r.reach ? interactions / r.reach : NaN,
      shareRate: r.reach ? r.shares / r.reach : NaN,
      saveRate: r.reach ? r.saves / r.reach : NaN
    };
  }

  function groupAverage(list, key) {
    const groups = {};
    list.forEach((r) => { (groups[r[key]] = groups[r[key]] || []).push(r); });
    return Object.entries(groups)
      .map(([name, items]) => ({
        name,
        n: items.length,
        avgReach: items.reduce((s, r) => s + r.reach, 0) / items.length,
        avgEng: items.reduce((s, r) => s + (r.engagementRate || 0), 0) / items.length,
        avgShare: items.reduce((s, r) => s + (r.shareRate || 0), 0) / items.length
      }))
      .sort((a, b) => b.avgReach - a.avgReach);
  }
  // Average reach by number of collaborating accounts, in buckets 1, 2 and 3+.
  // Posts with an unknown (or zero) collaborator count are left out.
  const COLLAB_BUCKETS = ["1 collaborator", "2 collaborators", "3+ collaborators"];
  function groupByCollaborators(list) {
    const known = list
      .filter((r) => r.collaborators != null && r.collaborators >= 1)
      .map((r) => ({ ...r, collabBucket: COLLAB_BUCKETS[Math.min(r.collaborators, 3) - 1] }));
    return groupAverage(known, "collabBucket")
      .sort((a, b) => COLLAB_BUCKETS.indexOf(a.name) - COLLAB_BUCKETS.indexOf(b.name));
  }
  function summarize(list) {
    const sum = (k) => list.reduce((s, r) => s + (r[k] || 0), 0);
    const totals = { posts: list.length, views: sum("views"), reach: sum("reach"), interactions: sum("interactions"), shares: sum("shares") };
    totals.engagementRate = totals.reach ? totals.interactions / totals.reach : NaN;
    return totals;
  }

  /* ---------- 6. Insights (plain-English, with honest caveats) ---------- */
  const ICONS = {
    reach: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    share: '<path d="M4 12l16-8-6 16-3-7-7-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    scale: '<path d="M12 4v16M5 8h14M7 8l-3 6a3 3 0 006 0zM17 8l-3 6a3 3 0 006 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    platform: '<rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };

  function buildInsights(list, byFormat, byPlatform) {
    const out = [];
    const caveat = (groups) => groups.some((g) => g.n < SMALL_SAMPLE)
      ? `Based on ${groups.map((g) => g.n).join(" vs. ")} posts per group, so treat this as directional until each group has at least ${SMALL_SAMPLE} posts.`
      : "";

    if (byFormat.length >= 2) {
      const [a, b] = byFormat;
      const lift = b.avgReach ? (a.avgReach - b.avgReach) / b.avgReach : 0;
      out.push({ icon: "reach", text: `The ${a.name} format averaged ${fmtPct(lift)} more reach per post than ${b.name} (${fmtInt(a.avgReach)} vs. ${fmtInt(b.avgReach)}).`, caveat: caveat([a, b]) });
      const gap = a.avgEng - b.avgEng;
      out.push({
        icon: "scale",
        text: Math.abs(gap) < SIMILAR_ENGAGEMENT
          ? `Engagement was similar (${fmtPct(a.avgEng)} vs. ${fmtPct(b.avgEng)}), so ${a.name} won mainly by reaching more people, not by stronger reactions.`
          : `${gap > 0 ? a.name : b.name} also drew stronger reactions: ${fmtPct(Math.max(a.avgEng, b.avgEng))} average engagement vs. ${fmtPct(Math.min(a.avgEng, b.avgEng))}.`,
        caveat: caveat([a, b])
      });
    }
    if (byPlatform.length >= 2) {
      const [a, b] = byPlatform;
      out.push({ icon: "platform", text: `${a.name} delivered the highest average reach per post (${fmtInt(a.avgReach)}), ahead of ${b.name} (${fmtInt(b.avgReach)}).`, caveat: caveat([a, b]) });
    }
    if (list.length >= 2) {
      const topEng = [...list].sort((x, y) => y.engagementRate - x.engagementRate)[0];
      out.push({ icon: "heart", text: `Highest engagement rate: ${topEng.post} (${topEng.format}), at ${fmtPct(topEng.engagementRate)} of accounts reached.`, caveat: "" });
      const topShare = [...list].sort((x, y) => y.shareRate - x.shareRate)[0];
      if (topShare.shares > 0) out.push({ icon: "share", text: `Most shareable: ${topShare.post} (${topShare.format}) was shared by ${fmtPct(topShare.shareRate)} of the accounts it reached (${fmtInt(topShare.shares)} shares), a signal of word-of-mouth potential.`, caveat: "" });
    }
    if (list.length === 1) out.push({ icon: "info", text: "Add at least one more post to unlock comparisons.", caveat: "" });
    return out;
  }

  /* ---------- 7. Rendering ---------- */
  // Shows or hides each part of the page based on the visitor's choice (mode) and whether there's data.
  function applyModeVisibility(has) {
    const landing = mode === "landing";
    document.body.dataset.mode = mode;
    $("stepnav").hidden = landing;
    $("step1").hidden = mode !== "own";
    $("report").hidden = landing || !has;
    $("share").hidden = landing || !has;
    $("modeBanner").hidden = mode !== "example";
    $("btnClear").hidden = !(mode === "own" && has);
    document.querySelector('.stepnav__item[data-step="step1"]').hidden = mode !== "own";
    document.querySelectorAll('.stepnav__item:not([data-step="step1"])').forEach((a) => a.classList.toggle("is-locked", !has));
  }

  function render(animate) {
    const list = rows.map(withMetrics);
    const has = list.length > 0;
    applyModeVisibility(has);
    $("tableWrap").hidden = !has;
    $("emptyState").hidden = has;
    $("tableCount").textContent = `${list.length} post${list.length === 1 ? "" : "s"}`;

    $("tableBody").innerHTML = list.map((r, i) => `
      <tr>
        <td>${esc(r.post)}</td><td>${esc(r.format)}</td>
        <td class="num">${fmtInt(r.reach)}</td><td class="num">${fmtInt(r.views)}</td>
        <td class="num">${fmtInt(r.interactions)}</td><td class="num">${fmtPct(r.engagementRate)}</td>
        <td><button type="button" class="remove" data-remove="${i}" aria-label="Remove ${esc(r.post)}">×</button></td>
      </tr>`).join("");

    if (!has) return;

    const byFormat = groupAverage(list, "format");
    const byPlatform = groupAverage(list, "platform");
    formatColor = {};
    byFormat.forEach((g, i) => { formatColor[g.name] = SERIES[i % SERIES.length]; });
    const totals = summarize(list);
    const insights = buildInsights(list, byFormat, byPlatform);
    const topReach = [...list].sort((a, b) => b.reach - a.reach)[0];

    renderStory(totals, byFormat, topReach);
    renderKpis(totals, animate);
    renderFaceoff(byFormat);
    renderScatter(list);
    renderLeaders(list);
    $("barsFormat").innerHTML = bars(byFormat, true);
    $("barsPlatform").innerHTML = bars(byPlatform, false);
    const byCollab = groupByCollaborators(list);
    $("barsCollab").innerHTML = byCollab.length
      ? bars(byCollab, false)
      : `<p class="hint">Add a "collaborators" column to your CSV to see this breakdown.</p>`;
    $("insights").innerHTML = insights.map((x) => `
      <li class="insight"><span class="insight__icon"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[x.icon]}</svg></span>
      <p>${esc(x.text)}${x.caveat ? `<span class="caveat">${esc(x.caveat)}</span>` : ""}</p></li>`).join("");
    const key = $("rankBy").value;
    const ranked = [...list].sort((a, b) => (b[key] || 0) - (a[key] || 0));
    const keepRec = currentRecommendation();
    $("summaryText").value = buildSummary(totals, insights, ranked, RANK_LABEL[key], keepRec);
    observeReveals();
  }

  const RANK_LABEL = { reach: "reach", views: "views", engagementRate: "engagement rate", shareRate: "share rate", interactions: "interactions" };

  function renderStory(t, byFormat, top) {
    $("report-title").innerHTML = `${t.posts} posts generated <em>${fmtInt(t.views)}</em> views and ${fmtInt(t.interactions)} interactions.`;
    let sub = `Overall engagement rate: ${fmtPct(t.engagementRate)}. Top post by reach: ${esc(top.post)} (${fmtInt(top.reach)} accounts).`;
    if (byFormat.length >= 2 && byFormat[1].avgReach > 0) {
      const mult = byFormat[0].avgReach / byFormat[1].avgReach;
      sub = `${esc(byFormat[0].name)} reached ${mult.toFixed(1)}× as many accounts per post as ${esc(byFormat[1].name)}. ` + sub;
    }
    $("storySub").innerHTML = sub;
  }

  function renderKpis(t, animate) {
    const items = [
      [t.posts, "Posts", "var(--s2)", "int"],
      [t.views, "Total views", "var(--s1)", "int"],
      [t.reach, "Total reach", "var(--s3)", "int"],
      [t.interactions, "Interactions", "var(--s4)", "int"],
      [t.engagementRate, "Engagement rate", "var(--s5)", "pct"]
    ];
    $("kpis").innerHTML = items.map(([v, l, c, kind]) =>
      `<div class="kpi reveal" style="--k:${c}"><div class="kpi__value" data-target="${v}" data-kind="${kind}">${kind === "pct" ? fmtPct(v) : fmtInt(v)}</div><div class="kpi__label">${l}</div></div>`).join("");
    if (animate && !reduceMotion) countUp($("kpis").querySelectorAll(".kpi__value"));
  }

  function countUp(nodes) {
    const start = performance.now(), dur = 900;
    function frame(now) {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      nodes.forEach((n) => {
        const v = Number(n.dataset.target) * e;
        n.textContent = n.dataset.kind === "pct" ? fmtPct(v) : fmtInt(v);
      });
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderFaceoff(byFormat) {
    const el = $("faceoff");
    if (byFormat.length < 2) {
      el.innerHTML = `<p class="fo-note">Add posts in at least two formats (e.g., Reel and Post) to see a face-off.</p>`;
      return;
    }
    const [a, b] = byFormat;
    const side = (g, win) => `
      <div class="fo-side ${win ? "is-winner" : ""}" style="--c:${formatColor[g.name]}">
        <div class="fo-side__name">${esc(g.name)} ${win ? '<span class="fo-crown">More reach</span>' : ""}</div>
        <p class="fo-big">${fmtInt(g.avgReach)}</p>
        <div class="fo-lbl">average accounts reached per post</div>
        <div class="fo-row"><span>Posts</span><strong>${g.n}</strong></div>
        <div class="fo-row"><span>Avg. engagement rate</span><strong>${fmtPct(g.avgEng)}</strong></div>
        <div class="fo-row"><span>Avg. share rate</span><strong>${fmtPct(g.avgShare)}</strong></div>
      </div>`;
    const mult = b.avgReach ? a.avgReach / b.avgReach : 0;
    const small = a.n < SMALL_SAMPLE || b.n < SMALL_SAMPLE;
    el.innerHTML = side(a, true) +
      `<div class="fo-vs"><div><div class="fo-mult">${mult.toFixed(1)}×</div><div class="fo-mult-lbl">the reach per post</div></div></div>` +
      side(b, false) +
      (small ? `<p class="fo-note" style="grid-column:1/-1">Fewer than ${SMALL_SAMPLE} posts in a group: treat this as directional.</p>` : "");
  }

  function renderScatter(list) {
    const W = 760, H = 340, m = { t: 16, r: 18, b: 46, l: 56 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    // Round axis maximums up to clean steps (1, 2, 2.5 or 5 × a power of ten) so labels read nicely.
    const niceStep = (raw) => { const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
    const stepX = niceStep(Math.max(...list.map((r) => r.reach), 1) / 4);
    const stepY = niceStep(Math.max(...list.map((r) => r.engagementRate || 0), 0.01) / 4);
    const maxX = Math.ceil(Math.max(...list.map((r) => r.reach), 1) / stepX) * stepX;
    const maxY = Math.ceil(Math.max(...list.map((r) => r.engagementRate || 0), 0.01) / stepY) * stepY;
    const x = (v) => m.l + (v / maxX) * iw;
    const y = (v) => m.t + ih - (v / maxY) * ih;
    const ticks = (max, step) => Array.from({ length: Math.round(max / step) + 1 }, (_, i) => step * i);
    const avgEng = list.reduce((s, r) => s + (r.engagementRate || 0), 0) / list.length;
    const avgReach = list.reduce((s, r) => s + r.reach, 0) / list.length;

    const grid = ticks(maxY, stepY).map((v) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${+(v * 100).toFixed(1)}%</text>`).join("");
    const xt = ticks(maxX, stepX).map((v) => `<text class="tick" x="${x(v)}" y="${H - m.b + 18}" text-anchor="middle">${fmtShort(v)}</text>`).join("");
    const dots = [...list].sort((a, b) => b.reach - a.reach).map((r) => `
      <circle class="dot" tabindex="0" r="8" cx="${x(r.reach)}" cy="${y(r.engagementRate || 0)}" fill="${formatColor[r.format]}"
        data-name="${esc(r.post)}" data-format="${esc(r.format)}" data-reach="${r.reach}" data-eng="${r.engagementRate}" data-views="${r.views}"
        aria-label="${esc(r.post)}, ${esc(r.format)}: reach ${fmtInt(r.reach)}, engagement ${fmtPct(r.engagementRate)}"></circle>`).join("");

    $("scatter").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Scatter chart of reach versus engagement rate for each post">
        ${grid}${xt}
        <line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/>
        <line class="avgline" x1="${x(avgReach)}" x2="${x(avgReach)}" y1="${m.t}" y2="${m.t + ih}"/>
        <line class="avgline" x1="${m.l}" x2="${W - m.r}" y1="${y(avgEng)}" y2="${y(avgEng)}"/>
        <text class="avglabel" x="${x(avgReach) + 6}" y="${m.t + 12}">avg reach</text>
        <text class="avglabel" x="${W - m.r}" y="${y(avgEng) - 6}" text-anchor="end">avg engagement</text>
        <text class="axis-title" x="${m.l + iw / 2}" y="${H - 6}" text-anchor="middle">Accounts reached</text>
        <text class="axis-title" transform="translate(14 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">Engagement rate</text>
        ${dots}
      </svg>`;
    $("legend").innerHTML = Object.keys(formatColor).map((f) => chip(f)).join("");
  }

  function renderLeaders(list) {
    const key = $("rankBy").value;
    const ranked = [...list].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 5);
    const max = Math.max(...ranked.map((r) => r[key] || 0), 1e-9);
    const show = (r) => key.endsWith("Rate") ? fmtPct(r[key]) : fmtInt(r[key]);
    $("ranking").innerHTML = ranked.map((r, i) => `
      <li class="leader reveal">
        <span class="leader__rank">${i + 1}</span>
        <div>
          <div class="leader__name">${esc(r.post)}</div>
          <div class="leader__meta">${chip(r.format)} <span>${esc(r.platform)}</span> <span>· reach ${fmtInt(r.reach)}</span> <span>· engagement ${fmtPct(r.engagementRate)}</span></div>
        </div>
        <div class="leader__metric"><div class="leader__val">${show(r)}</div><div class="leader__lbl">${RANK_LABEL[key]}</div></div>
        <div class="leader__bar"><i style="--w:${((r[key] || 0) / max) * 100}%;--c:${formatColor[r.format]}"></i></div>
      </li>`).join("");
  }

  function bars(groups, colorByFormat) {
    const max = Math.max(...groups.map((g) => g.avgReach), 1);
    return groups.map((g, i) => `
      <div class="bar" role="img" aria-label="${esc(g.name)}: average reach ${fmtInt(g.avgReach)} across ${g.n} post(s)">
        <span>${esc(g.name)} <span class="bar__n">(n=${g.n})</span></span>
        <span class="bar__track"><span class="bar__fill" style="width:${(g.avgReach / max) * 100}%;--c:${colorByFormat ? formatColor[g.name] : SERIES[(i + 1) % SERIES.length]}"></span></span>
        <span class="bar__val">${fmtInt(g.avgReach)}</span>
      </div>`).join("");
  }

  // Keeps whatever the user typed as their recommendation when the report re-renders.
  function currentRecommendation() {
    const m = $("summaryText").value.match(/Recommended next step:\s*([\s\S]*)$/);
    return m && m[1].trim() && !m[1].includes("[add your recommendation]") ? m[1].trim() : "";
  }

  function buildSummary(t, insights, ranked, rankLabel, rec) {
    return [
      "Campaign performance summary",
      "",
      `${t.posts} posts generated ${fmtInt(t.views)} views and ${fmtInt(t.interactions)} interactions, with a ${fmtPct(t.engagementRate)} overall engagement rate (interactions ÷ accounts reached).`,
      "",
      "Key insights:",
      ...insights.map((x) => `• ${x.text}${x.caveat ? " (" + x.caveat + ")" : ""}`),
      "",
      `Top post by ${rankLabel}: ${ranked[0] ? ranked[0].post : "–"}.`,
      "",
      `Recommended next step: ${rec || "[add your recommendation]"}`
    ].join("\n");
  }

  function aiPrompt() {
    const list = rows.map(withMetrics);
    return `You are helping a marketing team write a short campaign recap for stakeholders.

Using ONLY the data below, write:
1. A 2-sentence headline summary.
2. Three insights, each backed by a specific number from the data.
3. One recommendation for the next campaign.

Rules: do not invent numbers or context that isn't in the data. Where a comparison rests on fewer than ${SMALL_SAMPLE} posts per group, say it is directional. Engagement rate = (likes + comments + shares + saves + reposts) ÷ reach.

DATA (CSV):
${toCSV(list)}`;
  }

  function toCSV(list) {
    const cols = ["post", "platform", "format", "date", "views", "reach", "likes", "comments", "shares", "saves", "reposts", "collaborators", "interactions", "engagementRate", "shareRate"];
    const cell = (v) => { const s = typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(4)) : String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.join(","), ...list.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  }

  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); setStatus(okMsg, "ok", "shareStatus"); }
    catch (e) { setStatus("Copy didn't work in this browser. Select the text and copy it manually.", "error", "shareStatus"); }
  }

  /* ---------- 8. Scroll effects (reveal + active step) ---------- */
  let revealObserver = null;
  function observeReveals() {
    const nodes = document.querySelectorAll(".reveal:not(.is-in)");
    // Skip the fade-in when motion is reduced, the browser can't observe scrolling, or the tab is in the
    // background (browsers pause animations there, which could leave cards invisible).
    if (reduceMotion || document.hidden || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => { n.style.transition = "none"; n.classList.add("is-in"); }); return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); revealObserver.unobserve(e.target); }
      }), { rootMargin: "0px 0px -8% 0px" });
    }
    nodes.forEach((n, i) => { n.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`; revealObserver.observe(n); });
  }

  if ("IntersectionObserver" in window) {
    const items = [...document.querySelectorAll(".stepnav__item")];
    const stepObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) items.forEach((a) => a.classList.toggle("is-active", a.dataset.step === e.target.id));
    }), { rootMargin: "-40% 0px -55% 0px" });
    ["step1", "report", "share"].forEach((id) => stepObserver.observe($(id)));
  }

  /* ---------- 9. Events ---------- */
  function addRows(newRows, source) {
    rows = rows.concat(newRows); save(); render(true);
    setStatus(`Added ${newRows.length} post${newRows.length === 1 ? "" : "s"} from ${source}. Scroll down for your report.`, "ok");
  }
  function handleCSVText(text, source) {
    try { addRows(rowsFromCSV(text), source); } catch (e) { setStatus(e.message, "error"); }
  }
  // Switches between the landing screen, the example campaign, and the visitor's own data.
  function enterMode(next, { quiet = false } = {}) {
    mode = next;
    rows = next === "example" ? EXAMPLE.map((r) => ({ ...r })) : next === "own" ? ownRows : [];
    $("summaryText").value = "";          // a typed recommendation belongs to one dataset, not both
    setStatus(""); setStatus("", "", "shareStatus");
    render(next !== "landing");
    if (quiet) return;
    const behavior = reduceMotion ? "auto" : "smooth";
    if (next === "landing") {
      window.scrollTo({ top: 0, behavior });
      $("btnExample").focus({ preventScroll: true });
      return;
    }
    // Example → start at the analysis. Own data → start at the data form.
    const heading = next === "example" ? $("report-title") : $("step1-title");
    heading.closest("section").scrollIntoView({ behavior, block: "start" });
    heading.focus({ preventScroll: true });
  }
  function loadExample() { enterMode("example"); }

  $("fileInput").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => handleCSVText(reader.result, f.name);
    reader.readAsText(f); e.target.value = "";
  });
  const drop = document.querySelector(".drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("is-over")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f) return;
    const reader = new FileReader(); reader.onload = () => handleCSVText(reader.result, f.name); reader.readAsText(f);
  });

  $("btnPaste").addEventListener("click", () => handleCSVText($("pasteInput").value, "pasted text"));

  $("rowForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    NUMERIC.forEach((k) => (data[k] = toNumber(data[k])));
    addRows([data], "the form"); e.target.reset();
  });

  $("tableBody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]"); if (!b) return;
    const removed = rows.splice(Number(b.dataset.remove), 1)[0];
    save(); render(false); setStatus(`Removed "${removed.post}".`, "ok");
  });

  $("btnExample").addEventListener("click", loadExample);
  $("btnExample2").addEventListener("click", loadExample);
  $("btnOwn").addEventListener("click", () => enterMode("own"));
  $("btnOwnFromExample").addEventListener("click", () => enterMode("own"));
  $("btnBack").addEventListener("click", () => enterMode("landing"));
  // Clear data removes the visitor's own posts and returns to the landing screen.
  $("btnClear").addEventListener("click", () => {
    if (mode !== "own" || !rows.length) return; if (!confirm("Remove all your posts from this report?")) return;
    rows = []; save(); enterMode("landing");
  });
  $("rankBy").addEventListener("change", () => { renderLeaders(rows.map(withMetrics)); observeReveals(); });
  $("btnCopySummary").addEventListener("click", () => copy($("summaryText").value, "Summary copied."));
  $("btnCopyPrompt").addEventListener("click", () => copy(aiPrompt(), "AI prompt copied. Paste it into Claude or Gemini."));
  $("btnDownload").addEventListener("click", () => {
    const blob = new Blob([toCSV(rows.map(withMetrics))], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "campaign-metrics.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("btnPrint").addEventListener("click", () => window.print());

  // Scatter tooltips (mouse and keyboard)
  const tip = $("tooltip");
  function showTip(dot) {
    const r = dot.getBoundingClientRect();
    tip.innerHTML = `<strong>${esc(dot.dataset.name)}</strong>${esc(dot.dataset.format)} · reach ${fmtInt(+dot.dataset.reach)}<br>views ${fmtInt(+dot.dataset.views)} · engagement ${fmtPct(+dot.dataset.eng)}`;
    tip.style.left = r.left + r.width / 2 + "px"; tip.style.top = r.top + "px"; tip.hidden = false;
  }
  const hideTip = () => { tip.hidden = true; };
  $("scatter").addEventListener("mouseover", (e) => { if (e.target.classList.contains("dot")) showTip(e.target); });
  $("scatter").addEventListener("mouseout", (e) => { if (e.target.classList.contains("dot")) hideTip(); });
  $("scatter").addEventListener("focusin", (e) => { if (e.target.classList.contains("dot")) showTip(e.target); });
  $("scatter").addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });

  // Accessible tabs (arrow keys move between tabs)
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(i) {
    tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(j === i)); t.tabIndex = j === i ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = j !== i;
    });
    tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(i));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") selectTab((i + 1) % tabs.length);
      if (e.key === "ArrowLeft") selectTab((i - 1 + tabs.length) % tabs.length);
    });
  });

  // Every visit (including a refresh) starts on the landing screen with the two choices.
  enterMode("landing", { quiet: true });
})();
