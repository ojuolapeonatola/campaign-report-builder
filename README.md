# Campaign Report Builder

**Live demo:** https://ojuolape-onatola.github.io/campaign-report-builder/

A browser tool that turns post-level social media metrics into a stakeholder-ready campaign report.

**The problem:** after a campaign, someone screenshots each post's insights, copies numbers into a spreadsheet, calculates engagement by hand, and writes a recap. It's slow, inconsistent, and repeated every campaign. This tool does it in seconds, the same way every time.

**Status:** built in October 2026 and back-tested on International Week 2026 Instagram data (14 posts). Live pilot planned for International Week 2027 promotion.

Built by Ojuolape Onatola with AI-assisted development (Claude).

---

## What it does

1. **Takes in data three ways:** upload a CSV, paste CSV text, or add posts one at a time.
2. **Tells the story up front:** a plain-English headline plus KPIs (views, reach, interactions, engagement rate).
3. **Format face-off:** the top two formats side by side, with a reach multiplier.
4. **Reach vs. engagement map:** an interactive chart of every post.
5. **Leaderboard and breakdowns:** top posts, plus average reach by format, platform, and number of collaborators.
6. **Plain-English insights** that flag small samples as *directional* instead of overselling them.
7. **Shareable outputs:** an editable stakeholder summary, an AI prompt for drafting a recap, a CSV export, and print-to-PDF.

Everything runs in the browser: no server, no login, no API keys, and data never leaves the page.

### What I added
**Collaborator breakdown:** average reach for posts with 1, 2, or 3+ collaborating accounts. I added it after noticing in our International Week data that posts with more partner accounts seemed to reach more people. Posts with 3+ collaborators averaged ~6,100 reach vs. ~2,200 with one.

---

## How to use it

1. Click **See it with a real campaign** to load the example data.
2. To use your own data, download `sample-data.csv`, fill it in, and upload it.

| Column | Required? |
|---|---|
| post, platform, format, date | recommended |
| **reach** | **required** |
| views, likes, comments, shares, saves, reposts | optional |
| collaborators (number of partner accounts) | optional |

**Metric definitions:** Interactions = likes + comments + shares + saves + reposts · Engagement rate = interactions ÷ reach · Share rate = shares ÷ reach.

---

## How it's built

Plain HTML, CSS, and JavaScript with no libraries. All logic lives in `app.js` in numbered sections: configuration, CSV parsing, metrics, insights, and rendering. Supporting a new export format or changing a metric means editing one clearly labeled section.

**Next ideas:** a date filter, campaign-over-campaign comparison, and connecting to a team's data system through an API.ojuolape-onatola.github.io/campaign-report-builder/`.
