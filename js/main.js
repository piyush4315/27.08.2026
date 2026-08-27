/* ═══════════════════════════════════════════════════════════
   SCRAPX — interactions, rendering from real bid-sheet data
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  /* ── helpers ─────────────────────────────────────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

  const fmtINR = (n) => "₹" + inr.format(Math.round(n));
  const fmtCompact = (n) => {
    if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
    if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
    return fmtINR(n);
  };
  const fmtQty = (q) => (Number.isInteger(q) ? inr.format(q) : q.toFixed(2));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const STATUS_LABEL = { settled: "Settled", partial: "Partial", pending: "Pending" };

  const { meta, lots, bidders } = DATA;

  /* ── nav ─────────────────────────────────────────────── */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#navBurger"), navLinks = $("#navLinks");
  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { burger.classList.remove("open"); navLinks.classList.remove("open"); }
  });

  /* ── reveal on scroll ────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ── count-up stats ──────────────────────────────────── */
  const fmtCount = (el, v) => {
    const p = el.dataset.prefix || "", s = el.dataset.suffix || "";
    const d = +(el.dataset.decimals || 0);
    el.textContent = p + v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + s;
  };
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, target = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        fmtCount(el, target * e);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.4 });
  $$("[data-count]").forEach((el) => cio.observe(el));

  /* ── ticker (real hammer results) ────────────────────── */
  const tickerLots = lots
    .slice()
    .sort((a, b) => b.matValue - a.matValue)
    .slice(0, 14)
    .map((l) =>
      `<span class="ticker-item"><b>LOT ${l.lot}</b> ${esc(l.name.slice(0, 34))}${l.name.length > 34 ? "…" : ""}` +
      ` · <em>${fmtCompact(l.matValue)}</em> <span class="up">▲ ${l.status === "settled" ? "SETTLED" : l.status.toUpperCase()}</span></span>`
    ).join("");
  $("#tickerTrack").innerHTML = tickerLots + tickerLots; // duplicate for seamless loop

  /* ── tokenomics donut ────────────────────────────────── */
  const ALLOC = [
    { name: "Auction liquidity & escrow", pct: 30, color: "#a855f7" },
    { name: "Bidder rewards & cashback", pct: 25, color: "#7c3aed" },
    { name: "Team & advisors · 24m vest", pct: 15, color: "#6366f1" },
    { name: "Ecosystem & grants", pct: 15, color: "#3b82f6" },
    { name: "Public sale", pct: 10, color: "#22d3ee" },
    { name: "Treasury reserve", pct: 5, color: "#34d399" },
  ];
  const donut = $("#donut"), R = 78, C = 2 * Math.PI * R;
  let offset = 0;
  ALLOC.forEach((a) => {
    const seg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    seg.setAttribute("class", "seg");
    seg.setAttribute("cx", 100); seg.setAttribute("cy", 100); seg.setAttribute("r", R);
    seg.setAttribute("stroke", a.color);
    const len = (a.pct / 100) * C;
    seg.setAttribute("stroke-dasharray", `${len - 2.5} ${C - len + 2.5}`);
    seg.setAttribute("stroke-dashoffset", -offset);
    seg.setAttribute("stroke-linecap", "round");
    const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = `${a.name} — ${a.pct}%`;
    seg.appendChild(t);
    donut.appendChild(seg);
    offset += len;
  });
  $("#legend").innerHTML = ALLOC
    .map((a) => `<li><span class="sw" style="--sc:${a.color};background:${a.color}"></span>${esc(a.name)}<span class="pct">${a.pct}%</span></li>`)
    .join("");

  /* ── bidder summary chips ────────────────────────────── */
  const settledCount = bidders.filter((b) => b.status === "settled").length;
  const topBidder = bidders[0];
  $("#bidderSummary").innerHTML = `
    <div class="glass ledger-chip"><div class="lc-k">Registered bidders</div><div class="lc-v">${bidders.length}</div><div class="lc-s">KYC + wallet verified</div></div>
    <div class="glass ledger-chip"><div class="lc-k">Fully settled</div><div class="lc-v">${settledCount}/${bidders.length}</div><div class="lc-s">final payments cleared</div></div>
    <div class="glass ledger-chip"><div class="lc-k">Payments received</div><div class="lc-v">${fmtCompact(meta.totalFpReceived)}</div><div class="lc-s">of ${fmtCompact(meta.totalFpExpected)} expected</div></div>
    <div class="glass ledger-chip"><div class="lc-k">Top hammer</div><div class="lc-v" style="font-size:19px;line-height:1.35">${esc(topBidder.name)}</div><div class="lc-s">${fmtCompact(topBidder.matValue)} across ${topBidder.lots} lots</div></div>`;

  /* ── bidder table ────────────────────────────────────── */
  const bidderRows = $("#bidderRows");
  const renderBidders = (filter = "") => {
    const f = filter.trim().toLowerCase();
    const rows = bidders
      .filter((b) => !f || b.name.toLowerCase().includes(f))
      .map((b, i) => `
        <tr data-bidder="${esc(b.name)}">
          <td class="num">${String(i + 1).padStart(2, "0")}</td>
          <td class="strong">${esc(b.name)}</td>
          <td class="num">${b.lots}</td>
          <td class="num">${fmtINR(b.matValue)}</td>
          <td class="num">${fmtINR(b.receivables)}</td>
          <td class="num">${fmtINR(b.sdReceived)}</td>
          <td class="num">${fmtINR(b.fpReceived)} <span style="color:var(--ink-faint)">/ ${fmtCompact(b.fpExpected)}</span></td>
          <td><span class="badge ${b.status}">${STATUS_LABEL[b.status]}</span></td>
          <td><span class="row-link">view lots →</span></td>
        </tr>`).join("");
    bidderRows.innerHTML = rows || `<tr><td colspan="9" style="text-align:center;padding:34px;color:var(--ink-faint)">No bidders match “${esc(filter)}”.</td></tr>`;
  };
  renderBidders();
  $("#bidderSearch").addEventListener("input", (e) => renderBidders(e.target.value));

  bidderRows.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-bidder]");
    if (!tr) return;
    setBidderFilter(tr.dataset.bidder);
    $("#lots").scrollIntoView({ behavior: "smooth" });
  });

  /* ── lot table + filters ─────────────────────────────── */
  const lotRows = $("#lotRows"), lotFoot = $("#lotFoot");
  const state = { auction: "all", status: "all", q: "", bidder: null };

  const auctionChips = $("#auctionChips");
  auctionChips.innerHTML =
    `<button class="f-chip active" data-a="all">All auctions</button>` +
    meta.auctions.map((a) => `<button class="f-chip" data-a="${a}">Series ${a}</button>`).join("");
  auctionChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".f-chip");
    if (!btn) return;
    $$(".f-chip", auctionChips).forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    state.auction = btn.dataset.a;
    renderLots();
  });

  $("#statusFilter").addEventListener("change", (e) => { state.status = e.target.value; renderLots(); });
  $("#lotSearch").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); renderLots(); });

  const bidderTag = $("#bidderFilterTag");
  function setBidderFilter(name) {
    state.bidder = name;
    bidderTag.hidden = !name;
    if (name) bidderTag.querySelector("span").textContent = "Bidder: " + name;
    renderLots();
  }
  $("#clearBidderFilter").addEventListener("click", () => setBidderFilter(null));

  const filteredLots = () =>
    lots.filter((l) =>
      (state.auction === "all" || String(l.auction) === state.auction) &&
      (state.status === "all" || l.status === state.status) &&
      (!state.bidder || l.buyer === state.bidder) &&
      (!state.q ||
        l.name.toLowerCase().includes(state.q) ||
        l.buyer.toLowerCase().includes(state.q) ||
        String(l.lot).includes(state.q))
    );

  function renderLots() {
    const list = filteredLots();
    lotRows.innerHTML = list.map((l) => `
      <tr data-lot="${l.lot}">
        <td class="num strong">#${l.lot}</td>
        <td class="num">${l.auction}</td>
        <td class="lot-name">${esc(l.name)}</td>
        <td>${esc(l.buyer)}</td>
        <td class="num">${fmtQty(l.qty)} ${l.unit}</td>
        <td class="num">${fmtINR(l.rate)}</td>
        <td class="num strong">${fmtINR(l.matValue)}</td>
        <td><span class="badge ${l.status}">${STATUS_LABEL[l.status]}</span></td>
        <td><span class="row-link">detail →</span></td>
      </tr>`).join("") ||
      `<tr><td colspan="9" style="text-align:center;padding:34px;color:var(--ink-faint)">No lots match the current filters.</td></tr>`;
    const mv = list.reduce((s, l) => s + l.matValue, 0);
    lotFoot.innerHTML = `<span>${list.length} lot${list.length === 1 ? "" : "s"} · material value ${fmtCompact(mv)}</span><span>Source · Combined Bid Sheet 23.08.2026</span>`;
  }
  renderLots();

  /* ── lot modal ───────────────────────────────────────── */
  const backdrop = $("#modalBackdrop"), modalBody = $("#modalBody");
  lotRows.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-lot]");
    if (!tr) return;
    openLot(+tr.dataset.lot);
  });
  function openLot(lotNo) {
    const l = lots.find((x) => x.lot === lotNo);
    if (!l) return;
    const pct = l.fpExpected ? Math.min(100, Math.round((l.fpReceived / l.fpExpected) * 100)) : 0;
    modalBody.innerHTML = `
      <div class="modal-eyebrow">Lot #${l.lot} · Auction ${l.auction} · ${l.invoice ? "Invoice " + esc(l.invoice) : "Invoice pending"}</div>
      <h3>${esc(l.name)}</h3>
      <div class="modal-buyer">Won by <b>${esc(l.buyer)}</b> · <span class="badge ${l.status}">${STATUS_LABEL[l.status]}</span></div>
      <div class="modal-price"><span class="big">${fmtINR(l.matValue)}</span><span class="small">material value @ ${fmtINR(l.rate)}/${l.unit}</span></div>
      <div class="modal-grid">
        <div class="modal-cell"><span>Quantity</span><b>${fmtQty(l.qty)} ${l.unit}</b></div>
        <div class="modal-cell"><span>Hammer rate</span><b>${fmtINR(l.rate)} / ${l.unit}</b></div>
        <div class="modal-cell"><span>GST (18%)</span><b>${fmtINR(l.gst)}</b></div>
        <div class="modal-cell"><span>Total receivables</span><b>${fmtINR(l.receivables)}</b></div>
        <div class="modal-cell"><span>Security deposit</span><b>${fmtINR(l.sdReceived)} <span style="color:var(--ink-faint)">/ ${fmtCompact(l.sdExpected)}</span></b></div>
        <div class="modal-cell"><span>Final payment</span><b>${fmtINR(l.fpReceived)} <span style="color:var(--ink-faint)">/ ${fmtCompact(l.fpExpected)}</span></b></div>
      </div>
      <div class="modal-progress-label"><span>On-chain settlement progress</span><b>${pct}%</b></div>
      <div class="live-bar"><div class="live-bar-fill" style="--w:${pct}%"></div></div>`;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
  }
  const closeModal = () => { backdrop.hidden = true; document.body.style.overflow = ""; };
  $("#modalClose").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !backdrop.hidden) closeModal(); });

  /* ── team ────────────────────────────────────────────── */
  const TEAM = [
    { n: "Arjun Mehta", r: "Founder & CEO", b: "Ex-auction-house strategist. Cleared ₹40Cr+ of industrial disposals before going on-chain.", i: "AM", c: ["#a855f7", "#6366f1"] },
    { n: "Priya Sharma", r: "CTO · Protocol", b: "Smart-contract engineer. Previously built escrow infra settling $120M/yr in trade finance.", i: "PS", c: ["#6366f1", "#22d3ee"] },
    { n: "Kabir Anand", r: "Head of Auctions", b: "12 years running heavy-machinery e-auctions. Knows every transformer lot by smell.", i: "KA", c: ["#7c3aed", "#38bdf8"] },
    { n: "Neha Verma", r: "Compliance & Risk", b: "GST, TDS and scrap-regulation specialist keeping every settlement audit-clean.", i: "NV", c: ["#3b82f6", "#22d3ee"] },
    { n: "Dev Malhotra", r: "Lead Product Designer", b: "Turns settlement ledgers into interfaces people actually enjoy staring at.", i: "DM", c: ["#a855f7", "#3b82f6"] },
    { n: "Sara Fernandes", r: "Community & DAO", b: "Grew three protocol communities past 50k combined. Runs the auction war-rooms.", i: "SF", c: ["#22d3ee", "#818cf8"] },
  ];
  const iconX = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L1.6 2H8l4.4 5.9L18.9 2Zm-1.1 18h1.7L7.1 3.8H5.3L17.8 20Z"/></svg>';
  const iconIn = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.24 8.31h4.52V23H.24V8.31Zm7.44 0h4.33v2h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.93V23h-4.5v-7.1c0-1.7-.03-3.88-2.36-3.88-2.37 0-2.73 1.85-2.73 3.76V23H7.68V8.31Z"/></svg>';
  $("#teamGrid").innerHTML = TEAM.map((t, i) => `
    <div class="glass team-card reveal ${i ? "d" + Math.min(i, 4) : ""}" style="--a1:${t.c[0]};--a2:${t.c[1]};--tc:${t.c[0]}">
      <div class="avatar">${t.i}</div>
      <h4>${t.n}</h4>
      <div class="team-role">${t.r}</div>
      <p class="team-bio">${t.b}</p>
      <div class="team-socials">
        <a href="#" onclick="return false" aria-label="${t.n} on X">${iconX}</a>
        <a href="#" onclick="return false" aria-label="${t.n} on LinkedIn">${iconIn}</a>
      </div>
    </div>`).join("");
  $$("#teamGrid .reveal").forEach((el) => io.observe(el));

  /* ── newsletter ──────────────────────────────────────── */
  $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    e.target.hidden = true;
    $("#newsOk").hidden = false;
  });
})();
