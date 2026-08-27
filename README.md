# ScrapX — The Web3 Scrap Auction Protocol

A premium, futuristic Web3 portfolio site for a new scrap sale portal.
Dark canvas · deep purple → electric blue gradients · neon accents · glassmorphism.

## Sections

- **Hero** — bold tagline + CTA, live hammered-lot card, count-up stats
- **Tokenomics** — `$SCRX` allocation donut (SVG), token metrics, utility cards
- **Roadmap** — four-phase timeline (Ignition → Auction Engine → Tokenization → Scale & DAO)
- **Bidder details** — 13 KYC bidders with settlement ledgers (click a row to inspect their lots)
- **Lot details** — full 37-lot registry with auction/status/search filters + settlement modal
- **Team** & **Community** — crew cards, socials, newsletter

## Real data

The bidder & lot tables are generated from `Combined_Bid_Sheet 23.08.2026.xlsx`
(MSTC Limited auctions 21977–21980): 37 lots · 13 bidders · ₹1.77 Cr gross value.
Extracted dataset lives in `js/data.js`.

## Run

No build step — static HTML/CSS/JS.

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# open http://localhost:8080
```

## Structure

```
index.html      page shell
css/styles.css  design system (glass, gradients, neon, responsive)
js/data.js      bid-sheet dataset (auto-extracted)
js/main.js      rendering, filters, charts, modal, animations
```
