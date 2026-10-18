# Campaign Report Builder

A small browser tool that turns post-level social media metrics into a stakeholder-ready campaign report.

**The problem it solves:** after a campaign, someone screenshots each post's insights, copies numbers into a spreadsheet, works out engagement rates by hand, and writes a recap. That's slow, inconsistent, and has to be redone every campaign. This tool does it in seconds, the same way every time.

Built by Ojuolape Onatola with AI-assisted development (Claude).

---

## What it does

1. **Takes in data three ways:** upload a CSV, paste CSV text, or add one post at a time with a form.
2. **Tells the story up front:** a plain-English headline plus animated KPIs (views, reach, interactions, engagement rate).
3. **Format face-off:** the top two formats side by side (average reach, engagement, share rate) with a reach multiplier.
4. **Reach vs. engagement map:** an interactive scatter chart of every post, with average lines and hover/keyboard tooltips.
5. **Leaderboard:** top posts ranked by reach, views, engagement rate, share rate, or interactions, plus average reach by format and platform.
6. **Writes plain-English insights,** and flags any comparison based on fewer than 3 posts per group as *directional*, so small samples aren't oversold.
7. **Shares the results:** an editable stakeholder summary, a ready-made AI prompt for Claude or Gemini to draft a narrative recap, a metrics CSV download, and print-to-PDF.
8. **Collaborator breakdown:** average reach for posts with 1, 2, or 3+ collaborating accounts. I added this after noticing in our International Week data that posts with more partner accounts seemed to reach more people. 
Everything runs in the browser. There's no server, no login, and no API key, and the data never leaves the page.

---

## How to use it

1. Open `index.html` in any browser, or visit the GitHub Pages link.
2. Click **See it with a real campaign** to load 14 International Week 2026 Instagram posts.
3. Replace that with your own data: download `sample-data.csv`, fill it in, and upload it.

### CSV columns

| Column | Required? | Accepted header names |
|---|---|---|
| post | recommended | post, name, title, content |
| platform | recommended | platform, channel, network |
| format | recommended | format, type, media type |
| date | optional | date, publish date, posted |
| views | optional | views, impressions, plays |
| **reach** | **required** | reach, accounts reached, unique reach |
| likes, comments, shares, saves, reposts | optional | likes/reactions, comments/replies, shares/sends, saves/bookmarks, reposts/retweets |

Numbers can include commas ("19,885") or shorthand ("6.1K").

### How metrics are defined
- **Interactions** = likes + comments + shares + saves + reposts
- **Engagement rate** = interactions ÷ reach
- **Share rate** = shares ÷ reach
- **Total reach** is a sum across posts, so people who saw multiple posts are counted more than once. The tool notes this on screen.

---

## How to maintain and extend it

All logic is in `app.js`, organized in numbered sections:

| To change… | Edit |
|---|---|
| Accept a new export's column names | `COLUMN_ALIASES` (section 1): add the header spelling to the right list |
| The "directional" threshold (default 3 posts) | `SMALL_SAMPLE` (section 1) |
| When engagement counts as "similar" (default 2 points) | `SIMILAR_ENGAGEMENT` (section 1) |
| The example data | `EXAMPLE` (section 1) |
| How metrics are calculated | `withMetrics()` (section 5) |
| The wording of insights | `buildInsights()` (section 6) |
| The headline, face-off, chart, or leaderboard | `renderStory()`, `renderFaceoff()`, `renderScatter()`, `renderLeaders()` (section 7) |
| The stakeholder summary template | `buildSummary()` (section 7) |
| The AI prompt | `aiPrompt()` (section 7) |
| Colors, chart colors (`--s1`…`--s5`), and fonts | the tokens at the top of `styles.css` |

**Ideas for next versions:** a date filter, a campaign-over-campaign comparison, charts by week, or connecting to a team's data system through an API instead of CSV upload.

---

## Publish it on GitHub Pages (free)

1. Create a free GitHub account and a new **public** repository, e.g. `campaign-report-builder`.
2. Click **Add file → Upload files** and drag in everything in this folder (`index.html`, `app.js`, `styles.css`, `sample-data.csv`, `README.md`). Click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. In a minute or two your tool is live at `https://YOUR-USERNAME.github.io/campaign-report-builder/`.
