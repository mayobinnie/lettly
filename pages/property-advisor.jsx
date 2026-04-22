import { useState, useMemo } from "react";

const PROPERTIES = [
  { id: 1, name: "3 Northfield Ave", value: 140000, debt: 80000, rent: 730, rate: 5.25, ownership: "Personal", dealEnding: false, mortgageType: "IO", termYears: 25, maxOverpayPct: 10 },
  { id: 2, name: "11 Northfield Ave", value: 160000, debt: 48000, rent: 850, rate: 5.25, ownership: "Personal", dealEnding: true, dealEndNote: "Deal ending soon", mortgageType: "IO", termYears: 25, maxOverpayPct: 10 },
  { id: 3, name: "31 Northfield Ave", value: 145000, debt: 75000, rent: 750, rate: 5.25, ownership: "Hannat Ltd", dealEnding: false, mortgageType: "IO", termYears: 25, maxOverpayPct: 10 },
  { id: 4, name: "7 Tower Hill Mews", value: 85000, debt: 55000, rent: 575, rate: 5.25, ownership: "Personal", dealEnding: false, mortgageType: "IO", termYears: 25, maxOverpayPct: 10 },
  { id: 5, name: "602 Hotham Rd South", value: 120000, debt: 74000, rent: 675, rate: 5.24, ownership: "Hannat Ltd", dealEnding: false, mortgageType: "IO", termYears: 30, maxOverpayPct: 10 },
];

const GBP = String.fromCharCode(163);
const fmt = (n) => GBP + Math.round(n).toLocaleString("en-GB");
const fmtPct = (n) => (n * 100).toFixed(1) + "%";
const fmtPctInt = (n) => Math.round(n * 100) + "%";

function calcMetrics(p) {
  const equity = p.value - p.debt;
  const ltv = p.value > 0 ? p.debt / p.value : 0;
  const grossYield = p.value > 0 ? (p.rent * 12) / p.value : 0;
  const annualInterest = p.debt * (p.rate / 100);
  const monthlyInterest = annualInterest / 12;
  const runningCosts = p.rent * 0.13;
  const netCashflow = p.rent - monthlyInterest - runningCosts;
  const icr = monthlyInterest > 0 ? p.rent / monthlyInterest : Infinity;
  const maxRelease75 = Math.max(0, p.value * 0.75 - p.debt);
  const maxAnnualOverpay = p.debt * (p.maxOverpayPct / 100);
  return { equity, ltv, grossYield, annualInterest, monthlyInterest, netCashflow, icr, maxRelease75, runningCosts, maxAnnualOverpay };
}

function calcRepayment(principal, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function Card({ title, subtitle, children, highlight, icon, accent }) {
  return (
    <div style={{
      background: highlight ? "linear-gradient(135deg, #1a1412 0%, #2a1a18 100%)" : "#141010",
      border: highlight ? "1px solid " + (accent || "#e07b7b") : "1px solid #2a2222",
      borderRadius: 12, padding: "20px", marginBottom: 12,
      position: "relative", overflow: "hidden"
    }}>
      {highlight && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, " + (accent || "#e07b7b") + ", #c06060)" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: highlight ? (accent || "#e07b7b") : "#b89090", fontSize: 13, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</span>
      </div>
      {subtitle && <div style={{ color: "#998585", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function Row({ label, value, accent, small, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1e1818" }}>
      <span style={{ color: "#998585", fontSize: small ? 12 : 13 }}>{label}</span>
      <span style={{ color: color || (accent ? "#e07b7b" : "#e8d8d8"), fontSize: small ? 13 : 14, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  );
}

function Bars({ items, maxVal }) {
  const mx = maxVal || Math.max(...items.map(i => Math.abs(i.value)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#998585", fontSize: 11 }}>{item.label}</span>
            <span style={{ color: item.color || "#e8d8d8", fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{fmt(item.value)}</span>
          </div>
          <div style={{ background: "#0d0a0a", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{ width: Math.max(2, Math.abs(item.value) / mx * 100) + "%", height: "100%", borderRadius: 4, background: item.color || "#e07b7b", transition: "width 0.4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: "#0d0a0a", borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
      <div style={{ color: "#776868", fontSize: 10, marginBottom: 3 }}>{label}</div>
      <div style={{ color: color || "#e07b7b", fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  );
}

function PropSelector({ selectedId, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
      {PROPERTIES.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)} style={{
          padding: "8px 10px", borderRadius: 8, border: "none",
          background: selectedId === p.id ? "#e07b7b" : "#1a1515",
          color: selectedId === p.id ? "#0d0a0a" : "#b8a8a8",
          fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", position: "relative"
        }}>
          {p.name.replace(" Ave", "").replace(" Mews", "").replace(" South", "")}
          {p.dealEnding && <span style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: 3, background: "#e0a040" }} />}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, suffix }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#998585", fontSize: 12 }}>{label}</span>
        <span style={{ color: "#e07b7b", fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{value}{suffix || ""}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#e07b7b" }} />
    </div>
  );
}

function SavingsGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + items.length + ", 1fr)", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: "#0d0a0a", borderRadius: 8, padding: "10px 4px", textAlign: "center" }}>
          <div style={{ color: "#776868", fontSize: 10, marginBottom: 3 }}>{item.label}</div>
          <div style={{ color: item.value >= 0 ? "#70b890" : "#b87070", fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
            {(item.value >= 0 ? "+" : "") + fmt(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FinancialAdvisor() {
  const [tab, setTab] = useState("overview");
  const [selectedId, setSelectedId] = useState(2);
  const [refiLTV, setRefiLTV] = useState(75);
  const [newRate, setNewRate] = useState(4.5);
  const [payoffSource, setPayoffSource] = useState(null);
  const [overpayAmount, setOverpayAmount] = useState(500);

  const selected = PROPERTIES.find(p => p.id === selectedId);

  const portfolio = useMemo(() => {
    let totalValue = 0, totalDebt = 0, totalRent = 0, totalInterest = 0, totalCosts = 0;
    const perProp = PROPERTIES.map(p => {
      const m = calcMetrics(p);
      totalValue += p.value; totalDebt += p.debt; totalRent += p.rent;
      totalInterest += m.monthlyInterest; totalCosts += m.runningCosts;
      return { ...p, ...m };
    });
    return { perProp, totalValue, totalDebt, totalEquity: totalValue - totalDebt, totalRent, totalInterest, totalCosts, netMonthly: totalRent - totalInterest - totalCosts, blendedLTV: totalDebt / totalValue, annualInterest: totalInterest * 12 };
  }, []);

  const comparison = useMemo(() => {
    const curAI = portfolio.annualInterest;
    const refiDebt11 = 160000 * 0.75;
    const optAI = (refiDebt11 * (newRate / 100)) + (80000 * 0.0525) + (75000 * 0.0525) + (74000 * 0.0524);
    const saving = curAI - optAI;
    return {
      current: { ai: curAI, mi: curAI / 12, net: portfolio.netMonthly },
      optimised: { ai: optAI, mi: optAI / 12, net: portfolio.totalRent - optAI / 12 - portfolio.totalCosts },
      saving, monthlySaving: saving / 12,
      s1: saving, s3: saving * 3, s5: saving * 5, s10: saving * 10,
    };
  }, [portfolio, newRate]);

  const refiScenario = useMemo(() => {
    if (!selected) return null;
    const td = selected.value * (refiLTV / 100);
    const cr = td - selected.debt;
    const nmi = (td * (newRate / 100)) / 12;
    const omi = (selected.debt * (selected.rate / 100)) / 12;
    const cfc = omi - nmi;
    const repay = calcRepayment(td, newRate, 25);
    const ioTotal = (td * (newRate / 100)) * 25 + td;
    const repTotal = repay * 25 * 12;
    return { td, cr, nmi, omi, cfc, newNet: selected.rent - nmi - selected.rent * 0.13, icr: nmi > 0 ? selected.rent / nmi : Infinity, s1: cfc * 12, s3: cfc * 36, s5: cfc * 60, repay, ioTotal, repTotal };
  }, [selected, refiLTV, newRate]);

  const payoffScenario = useMemo(() => {
    if (!selected) return null;
    const m = calcMetrics(selected);
    let rs = null;
    if (payoffSource) {
      const src = PROPERTIES.find(p => p.id === payoffSource);
      if (src) {
        const sm = calcMetrics(src);
        const rel = sm.maxRelease75;
        const ok = rel >= selected.debt;
        const extraInt = ((src.debt + Math.min(selected.debt, rel)) * (newRate / 100)) / 12 - sm.monthlyInterest;
        rs = { src, rel, ok, extraInt, net: m.monthlyInterest - extraInt };
      }
    }
    return { saved: m.monthlyInterest, annual: m.annualInterest, netAfter: selected.rent - m.runningCosts, rs, s1: m.annualInterest, s3: m.annualInterest * 3, s5: m.annualInterest * 5 };
  }, [selected, payoffSource, newRate]);

  const overpayScenario = useMemo(() => {
    if (!selected) return null;
    const m = calcMetrics(selected);
    const annOP = overpayAmount * 12;
    const ok = annOP <= m.maxAnnualOverpay;
    const yrs = selected.debt / annOP;
    const noOP5 = m.annualInterest * 5;
    let bal = selected.debt, withOP5 = 0, breakdown = [];
    for (let y = 1; y <= 10; y++) {
      const intY = bal * (selected.rate / 100);
      if (y <= 5) withOP5 += intY;
      bal = Math.max(0, bal - annOP);
      breakdown.push({ y, bal, int: intY, done: bal === 0 });
      if (bal === 0) break;
    }
    return { annOP, ok, max: m.maxAnnualOverpay, yrs, saved5: noOP5 - withOP5, breakdown };
  }, [selected, overpayAmount]);

  const tax = useMemo(() => {
    const pp = portfolio.perProp.filter(p => p.ownership === "Personal");
    const lp = portfolio.perProp.filter(p => p.ownership === "Hannat Ltd");
    const pRent = pp.reduce((s, p) => s + p.rent * 12, 0);
    const pInt = pp.reduce((s, p) => s + p.annualInterest, 0);
    const pCost = pp.reduce((s, p) => s + p.runningCosts * 12, 0);
    const pProfit = pRent - pCost;
    const pTax40 = pProfit * 0.4;
    const pCredit = pInt * 0.2;
    const pDue = pTax40 - pCredit;
    const pNet = pRent - pInt - pCost - pDue;
    const lRent = lp.reduce((s, p) => s + p.rent * 12, 0);
    const lInt = lp.reduce((s, p) => s + p.annualInterest, 0);
    const lCost = lp.reduce((s, p) => s + p.runningCosts * 12, 0);
    const lProfit = lRent - lInt - lCost;
    const lTax = Math.max(0, lProfit * 0.19);
    const lNet = lProfit - lTax;
    return { pRent, pInt, pCost, pProfit, pTax40, pCredit, pDue, pNet, lRent, lInt, lCost, lProfit, lTax, lNet, s24Cost: pInt - pCredit };
  }, [portfolio]);

  const tabs = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "compare", label: "Compare", icon: "⚖" },
    { key: "refinance", label: "Refinance", icon: "🔄" },
    { key: "payoff", label: "Pay Off", icon: "✅" },
    { key: "overpay", label: "Overpay", icon: "💰" },
    { key: "tax", label: "Tax", icon: "🏛" },
  ];

  return (
    <div style={{ background: "#0d0a0a", minHeight: "100vh", color: "#e8d8d8", fontFamily: "'DM Sans', -apple-system, sans-serif", padding: "16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #e07b7b, #c06060)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#0d0a0a", fontFamily: "'Syne', sans-serif" }}>L</div>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Financial Advisor</h1>
          <p style={{ color: "#776868", fontSize: 11, margin: 0 }}>Mortgage strategy, tax efficiency and debt optimisation</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 8, border: "none",
            background: tab === t.key ? "#e07b7b" : "#1a1515", color: tab === t.key ? "#0d0a0a" : "#998585",
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap"
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && <>
        <Card title="Portfolio snapshot" icon="📊">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <StatBox label="Gross Asset Value" value={fmt(portfolio.totalValue)} />
            <StatBox label="Total Equity" value={fmt(portfolio.totalEquity)} color="#70b890" />
            <StatBox label="Total Debt" value={fmt(portfolio.totalDebt)} color="#b87070" />
            <StatBox label="Blended LTV" value={fmtPctInt(portfolio.blendedLTV)} color="#e0a040" />
          </div>
        </Card>
        <Card title="Monthly cashflow" icon="💧">
          <Bars items={[
            { label: "Gross rent", value: portfolio.totalRent, color: "#70b890" },
            { label: "Mortgage interest", value: portfolio.totalInterest, color: "#b87070" },
            { label: "Running costs", value: portfolio.totalCosts, color: "#e0a040" },
            { label: "Net cashflow", value: portfolio.netMonthly, color: "#e07b7b" },
          ]} maxVal={portfolio.totalRent} />
          <div style={{ marginTop: 14 }}>
            <Row label="Annual interest bill" value={fmt(portfolio.annualInterest)} color="#b87070" />
            <Row label="5yr interest (do nothing)" value={fmt(portfolio.annualInterest * 5)} color="#b87070" />
            <Row label="Net take-home" value={fmt(portfolio.netMonthly) + "/mo"} accent />
          </div>
        </Card>
        <Card title="Property ranking" icon="🏠">
          {portfolio.perProp.sort((a, b) => b.netCashflow - a.netCashflow).map((p, i) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "1px solid #1e1818" : "none" }}>
              <div>
                <div style={{ color: "#d0c0c0", fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                <div style={{ color: "#776868", fontSize: 10 }}>{fmtPct(p.grossYield)} yield | {fmtPctInt(p.ltv)} LTV | {fmt(p.monthlyInterest)} int/mo</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: p.netCashflow > 0 ? "#70b890" : "#b87070", fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(p.netCashflow)}</div>
                <div style={{ color: "#776868", fontSize: 10 }}>net/mo</div>
              </div>
            </div>
          ))}
        </Card>
      </>}

      {/* COMPARE */}
      {tab === "compare" && <>
        <Slider label="New rate assumption" value={newRate} onChange={setNewRate} min={3} max={7} step={0.25} suffix="%" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card title="Do nothing" icon="😐">
            <Row label="Interest/mo" value={fmt(comparison.current.mi)} small />
            <Row label="Interest/yr" value={fmt(comparison.current.ai)} small />
            <Row label="Net/mo" value={fmt(comparison.current.net)} small />
            <Row label="5yr interest" value={fmt(comparison.current.ai * 5)} small color="#b87070" />
          </Card>
          <Card title="Optimise" icon="🚀" highlight accent="#70b890">
            <Row label="Interest/mo" value={fmt(comparison.optimised.mi)} small />
            <Row label="Interest/yr" value={fmt(comparison.optimised.ai)} small />
            <Row label="Net/mo" value={fmt(comparison.optimised.net)} small accent />
            <Row label="5yr interest" value={fmt(comparison.optimised.ai * 5)} small color="#70b890" />
          </Card>
        </div>
        <Card title="Cumulative interest saved" subtitle="Refi 11 Northfield at 75%, clear Tower Hill" icon="📈" highlight>
          <SavingsGrid items={[
            { label: "1 Year", value: comparison.s1 },
            { label: "3 Years", value: comparison.s3 },
            { label: "5 Years", value: comparison.s5 },
            { label: "10 Years", value: comparison.s10 },
          ]} />
          <div style={{ marginTop: 14 }}>
            <Row label="Monthly uplift" value={"+" + fmt(comparison.monthlySaving) + "/mo"} accent />
            <Row label="Annual uplift" value={"+" + fmt(comparison.saving) + "/yr"} accent />
          </div>
        </Card>
        <Card title="What the savings fund" icon="🎯">
          <div style={{ color: "#b8a8a8", fontSize: 13, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 6 }}>The {fmt(comparison.saving)}/yr saving covers insurance across all 5 properties with change to spare.</div>
            <div style={{ marginBottom: 6 }}>Over 5 years, {fmt(comparison.s5)} saved funds a deposit on the next BTL through Hannat.</div>
            <div>Over 10 years, {fmt(comparison.s10)} compounding into the portfolio adds serious equity.</div>
          </div>
        </Card>
      </>}

      {/* REFINANCE */}
      {tab === "refinance" && <>
        <PropSelector selectedId={selectedId} onSelect={setSelectedId} />
        {selected && refiScenario && <>
          <Slider label="Target LTV" value={refiLTV} onChange={setRefiLTV} min={30} max={80} step={5} suffix="%" />
          <Slider label="New rate" value={newRate} onChange={setNewRate} min={3} max={7} step={0.25} suffix="%" />
          <Card title={"Refinance " + selected.name} icon="🔄" highlight={refiScenario.cr > 0}>
            <Row label="Current debt" value={fmt(selected.debt)} />
            <Row label="New debt" value={fmt(refiScenario.td)} />
            <Row label="Cash released" value={refiScenario.cr > 0 ? fmt(refiScenario.cr) : "None"} accent={refiScenario.cr > 0} />
            <Row label="Old interest" value={fmt(refiScenario.omi) + "/mo"} />
            <Row label="New interest" value={fmt(refiScenario.nmi) + "/mo"} />
            <Row label="Cashflow change" value={(refiScenario.cfc >= 0 ? "+" : "") + fmt(refiScenario.cfc) + "/mo"} accent />
            <Row label="ICR" value={refiScenario.icr === Infinity ? "N/A" : Math.round(refiScenario.icr * 100) + "%"} />
          </Card>
          <Card title="Cumulative impact" icon="📊">
            <SavingsGrid items={[
              { label: "1 Year", value: refiScenario.s1 },
              { label: "3 Years", value: refiScenario.s3 },
              { label: "5 Years", value: refiScenario.s5 },
            ]} />
          </Card>
          <Card title="Interest-only vs Repayment" subtitle={"Over 25 years on " + fmt(refiScenario.td)} icon="⚖">
            <Row label="IO monthly" value={fmt(refiScenario.nmi)} />
            <Row label="Repayment monthly" value={fmt(refiScenario.repay)} />
            <Row label="Extra for repayment" value={"+" + fmt(refiScenario.repay - refiScenario.nmi) + "/mo"} color="#e0a040" />
            <Row label="IO total cost (25yr + capital)" value={fmt(refiScenario.ioTotal)} color="#b87070" />
            <Row label="Repayment total cost" value={fmt(refiScenario.repTotal)} color="#70b890" />
            <Row label="Lifetime saving (repayment)" value={fmt(refiScenario.ioTotal - refiScenario.repTotal)} accent />
          </Card>
        </>}
      </>}

      {/* PAY OFF */}
      {tab === "payoff" && <>
        <PropSelector selectedId={selectedId} onSelect={setSelectedId} />
        {selected && payoffScenario && <>
          <Card title={"Clear " + selected.name} icon="✅" highlight>
            <div style={{ background: "#0d0a0a", borderRadius: 8, padding: 14, marginBottom: 14, textAlign: "center" }}>
              <div style={{ color: "#e07b7b", fontSize: 26, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(selected.debt)}</div>
              <div style={{ color: "#776868", fontSize: 12, marginTop: 2 }}>to clear mortgage</div>
            </div>
            <Row label="Interest saved" value={fmt(payoffScenario.saved) + "/mo"} accent />
            <Row label="Annual saving" value={fmt(payoffScenario.annual) + "/yr"} accent />
            <Row label="Net cashflow after" value={fmt(payoffScenario.netAfter) + "/mo"} />
            <Row label="Property becomes" value="0% LTV" />
          </Card>
          <Card title="Cumulative interest saved" icon="📈">
            <SavingsGrid items={[
              { label: "1 Year", value: payoffScenario.s1 },
              { label: "3 Years", value: payoffScenario.s3 },
              { label: "5 Years", value: payoffScenario.s5 },
            ]} />
          </Card>
          <div style={{ color: "#b89090", fontSize: 12, fontWeight: 600, marginTop: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Fund from another property</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {PROPERTIES.filter(p => p.id !== selectedId).map(p => {
              const pm = calcMetrics(p);
              return (
                <button key={p.id} onClick={() => setPayoffSource(p.id)} style={{
                  padding: "7px 10px", borderRadius: 6, border: "none",
                  background: payoffSource === p.id ? "#e07b7b" : "#1a1515",
                  color: payoffSource === p.id ? "#0d0a0a" : pm.maxRelease75 >= selected.debt ? "#d0c0c0" : "#554848",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>{p.name.split(" ").slice(0, 2).join(" ")} ({fmt(pm.maxRelease75)})</button>
              );
            })}
          </div>
          {payoffScenario.rs && (
            <Card title="Cross-property analysis" icon="🔗" highlight accent={payoffScenario.rs.ok ? "#70b890" : "#b87070"}>
              <div style={{ color: payoffScenario.rs.ok ? "#70b890" : "#b87070", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                {payoffScenario.rs.ok ? "Fully fundable" : "Insufficient equity"}
              </div>
              <Row label="Equity releasable" value={fmt(payoffScenario.rs.rel)} small />
              <Row label="Extra interest on source" value={"+" + fmt(payoffScenario.rs.extraInt) + "/mo"} small color="#b87070" />
              <Row label="Interest cleared" value={"-" + fmt(payoffScenario.saved) + "/mo"} small color="#70b890" />
              <Row label="Net monthly benefit" value={(payoffScenario.rs.net >= 0 ? "+" : "") + fmt(payoffScenario.rs.net) + "/mo"} accent small />
              <Row label="Net annual benefit" value={(payoffScenario.rs.net >= 0 ? "+" : "") + fmt(payoffScenario.rs.net * 12) + "/yr"} accent small />
              {payoffScenario.rs.ok && payoffScenario.rs.rel > selected.debt && (
                <div style={{ color: "#70b890", fontSize: 11, marginTop: 10, padding: "8px 10px", background: "#0d1a12", borderRadius: 6 }}>
                  Surplus: {fmt(payoffScenario.rs.rel - selected.debt)} for next deal or reserves
                </div>
              )}
            </Card>
          )}
        </>}
      </>}

      {/* OVERPAY */}
      {tab === "overpay" && <>
        <PropSelector selectedId={selectedId} onSelect={setSelectedId} />
        {selected && overpayScenario && <>
          <Slider label="Monthly overpayment" value={overpayAmount} onChange={setOverpayAmount} min={100} max={2000} step={50} suffix="/mo" />
          {!overpayScenario.ok && (
            <div style={{ color: "#e0a040", fontSize: 11, marginBottom: 10, padding: "8px 10px", background: "#2a1a10", borderRadius: 6 }}>
              Exceeds {selected.maxOverpayPct}% annual limit ({fmt(overpayScenario.max)}/yr). ERCs may apply.
            </div>
          )}
          <Card title={"Overpay " + selected.name} subtitle={fmt(selected.debt) + " at " + selected.rate + "%"} icon="💰" highlight>
            <Row label="Monthly overpayment" value={fmt(overpayAmount)} />
            <Row label="Annual overpayment" value={fmt(overpayScenario.annOP)} />
            <Row label="Max allowed (10%)" value={fmt(overpayScenario.max) + "/yr"} color={overpayScenario.ok ? "#70b890" : "#e0a040"} />
            <Row label="Mortgage cleared in" value={overpayScenario.yrs.toFixed(1) + " years"} accent />
            <Row label="Interest saved (5yr)" value={fmt(overpayScenario.saved5)} accent />
          </Card>
          <Card title="Year-by-year paydown" icon="📉">
            {overpayScenario.breakdown.map((yr, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e1818" }}>
                <span style={{ color: "#998585", fontSize: 12 }}>Year {yr.y}</span>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: "#b87070", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{fmt(yr.int)} int</span>
                  <span style={{ color: yr.done ? "#70b890" : "#e8d8d8", fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                    {yr.done ? "CLEARED" : fmt(yr.bal)}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </>}
      </>}

      {/* TAX */}
      {tab === "tax" && <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card title="Personal (S24)" subtitle="3 NF, 11 NF, Tower Hill" icon="👤">
            <Row label="Gross rent" value={fmt(tax.pRent) + "/yr"} small />
            <Row label="Interest" value={fmt(tax.pInt) + "/yr"} small />
            <Row label="Taxable profit" value={fmt(tax.pProfit)} small />
            <Row label="Tax at 40%" value={fmt(tax.pTax40)} small color="#b87070" />
            <Row label="S24 credit" value={"-" + fmt(tax.pCredit)} small color="#70b890" />
            <Row label="Tax due" value={fmt(Math.max(0, tax.pDue))} small color="#b87070" />
            <Row label="Net after tax" value={fmt(tax.pNet) + "/yr"} small accent />
          </Card>
          <Card title="Hannat Ltd" subtitle="31 NF, 602 Hotham" icon="🏢" highlight accent="#70b890">
            <Row label="Gross rent" value={fmt(tax.lRent) + "/yr"} small />
            <Row label="Interest" value={fmt(tax.lInt) + "/yr"} small />
            <Row label="Taxable profit" value={fmt(tax.lProfit)} small />
            <Row label="Corp tax (19%)" value={fmt(tax.lTax)} small color="#e0a040" />
            <Row label="Net retained" value={fmt(tax.lNet) + "/yr"} small accent />
          </Card>
        </div>
        <Card title="Section 24 cost" subtitle="The tax hit from personal mortgages" icon="⚠" highlight accent="#e0a040">
          <div style={{ color: "#b8a8a8", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
            Under S24, mortgage interest on personal properties gets a 20% credit instead of full deduction. At 40% tax, this creates phantom profit you pay tax on.
          </div>
          <Row label="Interest paid (personal)" value={fmt(tax.pInt) + "/yr"} />
          <Row label="Relief received (20%)" value={fmt(tax.pCredit) + "/yr"} color="#70b890" />
          <Row label="Effective S24 cost" value={fmt(tax.s24Cost) + "/yr"} color="#b87070" />
          <Row label="S24 cost per month" value={fmt(tax.s24Cost / 12) + "/mo"} color="#b87070" />
          <div style={{ color: "#e0a040", fontSize: 12, marginTop: 12, padding: "10px", background: "#1a1510", borderRadius: 6, lineHeight: 1.6 }}>
            Clearing personal mortgages removes S24 exposure. Paying off 11 Northfield ({fmt(48000)}) eliminates {fmt(48000 * 0.0525 * 0.2)}/yr of phantom tax. Route new acquisitions through Hannat to avoid entirely.
          </div>
        </Card>
        <Card title="Combined annual summary" icon="📊">
          <Row label="Personal net" value={fmt(tax.pNet) + "/yr"} />
          <Row label="Ltd net retained" value={fmt(tax.lNet) + "/yr"} />
          <Row label="Combined annual" value={fmt(tax.pNet + tax.lNet) + "/yr"} accent />
          <Row label="Combined monthly" value={fmt((tax.pNet + tax.lNet) / 12) + "/mo"} accent />
        </Card>
      </>}

      <div style={{ textAlign: "center", padding: "20px 0 10px", color: "#443838", fontSize: 10 }}>
        Built for Lettly. Not financial advice. Consult a qualified advisor before making decisions.
      </div>
    </div>
  );
}
