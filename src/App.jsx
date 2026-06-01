import { useState, useMemo, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const INITIAL_DATA = [
  { month: "2025-06", accounts: { 청약: 2340000, 적금: 2530000, 신한마통: -16719071, 성남: 0, 하남: 0, 현금: 191000, 삼성카드: -362983, 비씨카드: -396203, 현대카드: -41690 }, memo: "" },
  { month: "2025-07", accounts: { 청약: 2380000, 적금: 2540000, 신한마통: -18418402, 성남: 0, 하남: 0, 현금: 170000, 삼성카드: -221371, 비씨카드: -1284849, 현대카드: -96040 }, memo: "" },
  { month: "2025-08", accounts: { 청약: 2380000, 적금: 2550000, 신한마통: -18218180, 성남: 0, 하남: 0, 현금: 20000, 삼성카드: -1403095, 비씨카드: -882197, 현대카드: -51170 }, memo: "" },
  { month: "2025-09", accounts: { 청약: 2400000, 적금: 2550000, 신한마통: -17193562, 성남: 0, 하남: 0, 현금: 20000, 삼성카드: -1643200, 비씨카드: -940120, 현대카드: -32510 }, memo: "" },
  { month: "2025-10", accounts: { 청약: 2420000, 적금: 2570000, 신한마통: -17321081, 성남: 0, 하남: 0, 현금: 20000, 삼성카드: -2184198, 비씨카드: -755487 }, memo: "" },
  { month: "2025-11", accounts: { 청약: 2440000, 적금: 2580000, 신한마통: -16809027, 성남: 0, 하남: 0, 현금: 20000, 삼성카드: -1819816, 비씨카드: -299357, 국민카드: -182851 }, memo: "" },
  { month: "2025-12", accounts: { 청약: 2460000, 적금: 2580000, 신한마통: -16457302, 성남: 0, 하남: 0, 현금: 20000, 삼성카드: -1526609, 비씨카드: -34208, 국민카드: -126664 }, memo: "" },
  { month: "2026-01", accounts: { 청약: 2480000, 적금: 2600000, 신한마통: -15791908, 성남: 0, 하남: 0, 현금: 0, 삼성카드: -2077175, 국민카드: -187495 }, memo: "" },
  { month: "2026-02", accounts: { 청약: 2500000, 적금: 2600000, 신한마통: -16575349, 성남: 200000, 하남: 204540, 현금: 0, 삼성카드: -961052, 국민카드: -281578, 신한카드: -612995 }, memo: "" },
  { month: "2026-03", accounts: { 청약: 2520000, 적금: 2610000, 신한마통: -15241643, 선교비용: -1255000, 성남: 181000, 하남: 281490, 현금: 0, 삼성카드: -627804, 국민카드: -175864, 신한카드: -996041 }, memo: "" },
  { month: "2026-04", accounts: { 청약: 2540000, 신한마통: -13078236, 성남: 150100, 하남: 267390, 현금: 0, 삼성카드: -697591, 국민카드: -196900, 신한카드: -454621 }, memo: "성과급 1,255,000 흡수함" },
  { month: "2026-05", accounts: { 청약: 2560000, 신한마통: -12471999, 성남: 140600, 하남: 178860, 현금: 0, 삼성카드: -538333, 국민카드: -211380, 신한카드: -653654 }, memo: "" },
  { month: "2026-06", accounts: { 청약: 2580000, 신한마통: -14100976, 성남: 394600, 하남: 472260, 현금: 0, 삼성카드: -100084, 국민카드: -411814, 신한카드: -892386 }, memo: "" },
];

const SAVINGS_KEYS = ["청약", "적금"];

function getNextMonthStr(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function calcMonth(accounts) {
  const savings = SAVINGS_KEYS.reduce((s, k) => s + (Number(accounts[k]) || 0), 0);
  const total = Object.values(accounts).reduce((s, v) => s + (Number(v) || 0), 0);
  return { savings, outsideSavings: total - savings, total };
}
function fmt(n) {
  if (n === null || n === undefined) return "-";
  return (n >= 0 ? "+" : "") + n.toLocaleString("ko-KR") + "원";
}
function fmtAbs(n) { return (n || 0).toLocaleString("ko-KR") + "원"; }
function formatMonthShort(m) { const [, mo] = m.split("-"); return `${parseInt(mo)}월`; }
function formatMonthFull(m) { const [y, mo] = m.split("-"); return `${y}년 ${parseInt(mo)}월`; }

// 전역 스와이프 상태 관리
let globalOpenKey = null;
const listeners = new Set();
function setGlobalOpen(key) {
  globalOpenKey = key;
  listeners.forEach(fn => fn(key));
}

function SwipeRow({ rowKey, label, value, onDelete, onChange }) {
  const [offsetX, setOffsetX] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const rowRef = useRef(null);

  useEffect(() => {
    function onGlobalChange(key) {
      if (key !== rowKey && open) {
        setOffsetX(0);
        setOpen(false);
      }
    }
    listeners.add(onGlobalChange);
    return () => listeners.delete(onGlobalChange);
  }, [rowKey, open]);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (dy > 10) return; // 세로 스크롤이면 무시
    if (dx < 0) {
      e.preventDefault();
      setOffsetX(Math.max(dx, -72));
    } else if (open && dx > 0) {
      e.preventDefault();
      setOffsetX(Math.min(dx - 72, 0));
    }
  }
  function onTouchEnd() {
    const threshold = -36;
    if (offsetX < threshold) {
      setOffsetX(-72);
      setOpen(true);
      setGlobalOpen(rowKey);
    } else {
      setOffsetX(0);
      setOpen(false);
      setGlobalOpen(null);
    }
    startX.current = null;
  }
  function handleInputFocus() {
    if (open) {
      setOffsetX(0);
      setOpen(false);
      setGlobalOpen(null);
    }
  }

  const inputStyle = {
    background: "#111827",
    border: "1px solid #2d3748",
    color: "#e2e8f0",
    borderRadius: 7,
    padding: "8px 10px",
    fontSize: 15,
    textAlign: "right",
    outline: "none",
    flex: 1,
    minWidth: 0,
    WebkitAppearance: "none",
  };

  return (
    <div ref={rowRef} style={{ position: "relative", overflow: "hidden", borderRadius: 7, marginBottom: 4 }}>
      {/* 삭제 버튼 */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 72,
        background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <button onClick={onDelete} style={{ background: "none", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>삭제</button>
      </div>
      {/* 행 */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
          background: "#1e293b",
          transform: `translateX(${offsetX}px)`,
          transition: startX.current === null ? "transform 0.2s ease" : "none",
          touchAction: "pan-y",
        }}
      >
        <span style={{ fontSize: 13, color: "#94a3b8", width: 68, flexShrink: 0 }}>{label}</span>
        <input
          type="number"
          inputMode="numeric"
          value={value ?? ""}
          placeholder="0"
          onChange={onChange}
          onFocus={handleInputFocus}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px" }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: val >= 0 ? "#34d399" : "#f87171" }}>
          {val.toLocaleString("ko-KR")}원
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [data, setData] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const lastDay = getLastDayOfMonth(year, month);
    let base = [...INITIAL_DATA].sort((a, b) => a.month.localeCompare(b.month));
    if (today.getDate() === lastDay) {
      const currentMonthStr = `${year}-${String(month).padStart(2, "0")}`;
      const nextMonthStr = getNextMonthStr(currentMonthStr);
      if (!base.find(d => d.month === nextMonthStr)) {
        const lastAccounts = base[base.length - 1]?.accounts || {};
        const emptyAccounts = Object.fromEntries(Object.keys(lastAccounts).map(k => [k, ""]));
        base = [...base, { month: nextMonthStr, accounts: emptyAccounts, memo: "" }];
      }
    }
    return base;
  });

  const [selectedIdx, setSelectedIdx] = useState(data.length - 1);
  const [view, setView] = useState("detail");
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newMonth, setNewMonth] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const sortedIndices = useMemo(() =>
    [...data.map((_, i) => i)].sort((a, b) => data[b].month.localeCompare(data[a].month)),
    [data]);

  const computed = useMemo(() =>
    data.map((d, i) => {
      const c = calcMonth(d.accounts);
      const prev = i > 0 ? calcMonth(data[i - 1].accounts).total : null;
      return { ...c, diff: prev !== null ? c.total - prev : null };
    }), [data]);

  const chartData = useMemo(() =>
    data.map((d, i) => ({ label: formatMonthShort(d.month), total: computed[i].total })),
    [data, computed]);

  const selected = data[selectedIdx];
  const sel = computed[selectedIdx];
  const allKeys = Object.keys(selected.accounts);

  function updateAccount(key, val) {
    setData(prev => prev.map((d, i) =>
      i === selectedIdx ? { ...d, accounts: { ...d.accounts, [key]: val } } : d
    ));
  }
  function updateMemo(val) {
    setData(prev => prev.map((d, i) => i === selectedIdx ? { ...d, memo: val } : d));
  }
  function deleteAccount(key) {
    setData(prev => prev.map((d, i) => {
      if (i !== selectedIdx) return d;
      const acc = { ...d.accounts }; delete acc[key];
      return { ...d, accounts: acc };
    }));
  }
  function addAccount() {
    if (!newItemName.trim()) return;
    const key = newItemName.trim();
    setData(prev => prev.map((d, i) =>
      i === selectedIdx ? { ...d, accounts: { ...d.accounts, [key]: "" } } : d
    ));
    setAddingItem(false); setNewItemName("");
  }
  function addMonth() {
    if (!newMonth || data.find(d => d.month === newMonth)) return;
    const lastAccounts = data[data.length - 1]?.accounts || {};
    const emptyAccounts = Object.fromEntries(Object.keys(lastAccounts).map(k => [k, ""]));
    const sorted = [...data, { month: newMonth, accounts: emptyAccounts, memo: "" }]
      .sort((a, b) => a.month.localeCompare(b.month));
    setData(sorted);
    setSelectedIdx(sorted.findIndex(d => d.month === newMonth));
    setShowAddMonth(false); setNewMonth("");
  }

  const diffColor = !sel.diff ? "#64748b" : sel.diff >= 0 ? "#34d399" : "#f87171";

  const cardStyle = { background: "#1e293b", borderRadius: 12, padding: "12px 14px", border: "1px solid #2d3748", marginBottom: 8 };
  const inputBase = { background: "#111827", border: "1px solid #2d3748", color: "#e2e8f0", borderRadius: 7, padding: "8px 10px", fontSize: 15, outline: "none", WebkitAppearance: "none" };
  const monthBtnStyle = (active) => ({ padding: "6px 14px", borderRadius: 16, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: active ? "#3b82f6" : "#1e293b", color: active ? "#fff" : "#64748b", fontWeight: active ? 700 : 400, fontSize: 13, flexShrink: 0 });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Noto Sans KR', sans-serif", maxWidth: 480, margin: "0 auto", overflowX: "hidden" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f172a,#0a0f1e)", borderBottom: "1px solid #1e293b", padding: "20px 16px 0" }}>
        <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: 3, marginBottom: 2 }}>PERSONAL FINANCE</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>자산 트래커</div>
        <div style={{ display: "flex" }}>
          {[["detail","월별 상세"],["history","전체 히스토리"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "8px 18px", fontSize: 13, border: "none", cursor: "pointer", background: view===v ? "#1e293b" : "transparent", color: view===v ? "#60a5fa" : "#64748b", borderRadius: "8px 8px 0 0", fontWeight: view===v ? 700 : 400, borderBottom: view===v ? "2px solid #60a5fa" : "2px solid transparent" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px", boxSizing: "border-box", width: "100%" }}>

        {view === "detail" && (
          <>
            {/* Month Tabs */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 10, WebkitOverflowScrolling: "touch" }}>
              {sortedIndices.map(i => (
                <button key={data[i].month} onClick={() => setSelectedIdx(i)} style={monthBtnStyle(i===selectedIdx)}>
                  {formatMonthShort(data[i].month)}
                </button>
              ))}
              <button onClick={() => setShowAddMonth(v => !v)} style={{ ...monthBtnStyle(false), border: "1px dashed #334155" }}>+</button>
            </div>

            {showAddMonth && (
              <div style={{ ...cardStyle, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="month" value={newMonth} onChange={e => setNewMonth(e.target.value)}
                  style={{ ...inputBase, textAlign: "left", flex: 1, minWidth: 0 }} />
                <button onClick={addMonth} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 7, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>추가</button>
                <button onClick={() => setShowAddMonth(false)} style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 7, padding: "8px 10px", cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            )}

            {/* Summary */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, marginBottom: 4 }}>전월 대비</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: diffColor }}>{sel.diff !== null ? fmt(sel.diff) : "-"}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{formatMonthFull(selected.month)} 기준</div>
                </div>
                <button onClick={() => setSummaryOpen(v => !v)}
                  style={{ background: "#334155", border: "none", color: "#94a3b8", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {summaryOpen ? "접기 ▲" : "자세히 ▼"}
                </button>
              </div>
              {summaryOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid #2d3748" }}>
                  {[
                    { label: "저축", value: fmtAbs(sel.savings), color: "#60a5fa" },
                    { label: "저축 외", value: fmtAbs(sel.outsideSavings), color: sel.outsideSavings >= 0 ? "#34d399" : "#f87171" },
                    { label: "총 자산", value: fmtAbs(sel.total), color: sel.total >= 0 ? "#34d399" : "#f87171" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accounts */}
            <div style={{ ...cardStyle, padding: "12px 14px" }}>
              {allKeys.map(key => (
                <SwipeRow
                  key={key}
                  rowKey={`${selectedIdx}-${key}`}
                  label={key}
                  value={selected.accounts[key]}
                  onDelete={() => deleteAccount(key)}
                  onChange={e => updateAccount(key, e.target.value)}
                />
              ))}

              {addingItem ? (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input autoFocus placeholder="항목 이름" value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addAccount()}
                    style={{ ...inputBase, textAlign: "left", flex: 1, minWidth: 0 }} />
                  <button onClick={addAccount} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 7, padding: "8px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>추가</button>
                  <button onClick={() => { setAddingItem(false); setNewItemName(""); }} style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 7, padding: "8px 10px", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingItem(true)} style={{ background: "none", border: "1px dashed #334155", color: "#64748b", borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 6 }}>+ 항목 추가</button>
              )}

              <div style={{ borderTop: "1px solid #2d3748", margin: "10px 0" }} />
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>메모</div>
              <input type="text" value={selected.memo || ""} onChange={e => updateMemo(e.target.value)}
                placeholder="특이사항 입력"
                style={{ ...inputBase, textAlign: "left", width: "100%", boxSizing: "border-box" }} />
            </div>
          </>
        )}

        {view === "history" && (
          <>
            <div style={{ ...cardStyle, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>총 자산 추이</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="total" stroke="#60a5fa" strokeWidth={2}
                    dot={{ fill: "#60a5fa", r: 3 }} activeDot={{ r: 5, fill: "#fff" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>전체 월별 요약 (최신순)</div>
            {sortedIndices.map(i => {
              const d = data[i];
              const c = computed[i];
              return (
                <div key={d.month} onClick={() => { setSelectedIdx(i); setView("detail"); }}
                  style={{ ...cardStyle, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>{formatMonthFull(d.month)}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>저축 {fmtAbs(c.savings)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c.total >= 0 ? "#34d399" : "#f87171" }}>{fmtAbs(c.total)}</div>
                      {c.diff !== null && (
                        <div style={{ fontSize: 11, color: c.diff >= 0 ? "#34d399" : "#f87171", marginTop: 1 }}>{fmt(c.diff)}</div>
                      )}
                    </div>
                  </div>
                  {d.memo && <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>📝 {d.memo}</div>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}