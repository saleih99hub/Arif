import { useState, useEffect, useCallback } from "react";
import {
  submitOrder,
  verifyPin,
  fetchOrders,
  deleteOrder,
  todayStr
} from "./supabase.js";

// ---------- Arif Foods palette ----------
const C = {
  cream: "#FDF4E7",
  card: "#FFFBF4",
  red: "#A8321C",
  redDark: "#7E2413",
  amber: "#E8862E",
  amberSoft: "#F8E3C8",
  brown: "#3B2316",
  brownSoft: "#8A6A52",
  green: "#2F6B3F",
  line: "#EAD9C2"
};

const prettyDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
};

// ---------- Quantity stepper card ----------
function BagCard({ label, sub, value, onChange, accent }) {
  const n = parseInt(label.replace("Bag of ", ""), 10);
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(99, value + 1));
  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        background: C.card,
        border: `1.5px solid ${value > 0 ? accent : C.line}`,
        borderRadius: 18,
        padding: "20px 18px",
        textAlign: "center",
        boxShadow: value > 0 ? `0 4px 16px ${accent}22` : "none",
        transition: "all .2s"
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 10px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 35%, #F3D9AE, #E2B97F 55%, #C9985B)",
          border: `3px solid ${value > 0 ? accent : C.line}`,
          transition: "border-color .2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: C.brown
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 19,
          fontWeight: 700,
          color: C.brown
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: C.brownSoft, marginBottom: 14 }}>
        {sub}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14
        }}
      >
        <button onClick={dec} aria-label={`Decrease ${label}`} style={btnStep(value === 0)}>
          −
        </button>
        <input
          type="number"
          min="0"
          max="99"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange(isNaN(v) ? 0 : Math.max(0, Math.min(99, v)));
          }}
          aria-label={`${label} quantity`}
          style={{
            width: 64,
            textAlign: "center",
            fontSize: 26,
            fontWeight: 700,
            color: C.brown,
            border: `1.5px solid ${C.line}`,
            borderRadius: 12,
            padding: "6px 0",
            background: "#fff",
            outline: "none",
            fontFamily: "Georgia, serif"
          }}
        />
        <button onClick={inc} aria-label={`Increase ${label}`} style={btnStep(false)}>
          +
        </button>
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 13,
          color: value > 0 ? accent : C.brownSoft,
          fontWeight: 600,
          minHeight: 18
        }}
      >
        {value > 0
          ? `${value} bag${value > 1 ? "s" : ""} · ${value * n} injera`
          : "—"}
      </div>
    </div>
  );
}

const btnStep = (disabled) => ({
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  background: disabled ? C.amberSoft : C.red,
  color: disabled ? C.brownSoft : "#fff",
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1,
  transition: "background .15s"
});

// ---------- Main app ----------
export default function App() {
  // view: "order" | "pin" | "summary"
  const [view, setView] = useState("order");
  // The verified PIN is kept in memory and sessionStorage (cleared when the
  // browser tab/app closes). Every staff query re-sends it for server-side checks.
  const [staffPin, setStaffPin] = useState(
    () => sessionStorage.getItem("arif_staff_pin") || ""
  );
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bag5, setBag5] = useState(0);
  const [bag10, setBag10] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const [saving, setSaving] = useState(false);

  const [summaryDate, setSummaryDate] = useState(todayStr());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const refresh = useCallback(
    async (date, pin) => {
      setLoading(true);
      setSummaryError("");
      try {
        const list = await fetchOrders(pin, date);
        setOrders(list);
      } catch {
        setSummaryError("Could not load orders. Check your connection and try again.");
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (view === "summary" && staffPin) refresh(summaryDate, staffPin);
  }, [view, summaryDate, staffPin, refresh]);

  const tryPin = async () => {
    if (!pinInput) return;
    setPinChecking(true);
    setPinError("");
    try {
      const ok = await verifyPin(pinInput);
      if (ok) {
        setStaffPin(pinInput);
        sessionStorage.setItem("arif_staff_pin", pinInput);
        setView("summary");
        setPinInput("");
      } else {
        setPinError("Incorrect PIN. Try again.");
        setPinInput("");
      }
    } catch {
      setPinError("Could not verify the PIN. Check your connection.");
    }
    setPinChecking(false);
  };

  const lockAndExit = () => {
    setStaffPin("");
    sessionStorage.removeItem("arif_staff_pin");
    setView("order");
  };

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name so the baker knows who the order is for.");
      return;
    }
    if (bag5 === 0 && bag10 === 0) {
      setError(
        "Enter a quantity for at least one bag size — Bag of 5 or Bag of 10 — before submitting."
      );
      return;
    }
    setSaving(true);
    try {
      await submitOrder({
        customer: name.trim(),
        phone: phone.trim(),
        bag5,
        bag10,
        note: note.trim()
      });
      setConfirmed({
        customer: name.trim(),
        bag5,
        bag10,
        note: note.trim(),
        date: todayStr()
      });
      setBag5(0);
      setBag10(0);
      setNote("");
    } catch {
      setError("Could not save the order. Check your connection and try again.");
    }
    setSaving(false);
  };

  const removeOrder = async (id) => {
    try {
      await deleteOrder(staffPin, id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch {
      setSummaryError("Could not remove that order. Refresh and try again.");
    }
  };

  const tBag5 = orders.reduce((s, o) => s + o.bag5, 0);
  const tBag10 = orders.reduce((s, o) => s + o.bag10, 0);
  const tInjera = tBag5 * 5 + tBag10 * 10;

  const unlocked = view === "summary" && !!staffPin;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
        color: C.brown,
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Header */}
      <div style={{ background: C.red, padding: "26px 20px 22px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 30,
            fontWeight: 700,
            color: "#FFF6E8",
            letterSpacing: 0.5
          }}
        >
          Arif Foods
        </div>
        <div style={{ color: "#F6CFA0", fontSize: 13, marginTop: 2, fontStyle: "italic" }}>
          Love yourself — Bold Flavours, Authentic Roots
        </div>
        <div
          style={{
            color: "#FFE9CB",
            fontSize: 15,
            fontWeight: 700,
            marginTop: 14,
            letterSpacing: 2,
            textTransform: "uppercase"
          }}
        >
          {unlocked ? "👩‍🍳 Baker Dashboard" : "🌙 Night Injera Orders"}
        </div>
      </div>

      <div
        style={{
          maxWidth: 680,
          width: "100%",
          margin: "0 auto",
          padding: "26px 18px 40px",
          flex: 1,
          boxSizing: "border-box"
        }}
      >
        {/* ---------------- CUSTOMER ORDER VIEW ---------------- */}
        {view === "order" && !confirmed && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700 }}>
                Tonight's order
              </div>
              <div style={{ color: C.brownSoft, fontSize: 14, marginTop: 4 }}>
                {prettyDate(todayStr())} · fresh for tomorrow morning
              </div>
            </div>

            <label style={lbl}>Your name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hanna T."
              style={inp}
            />

            <label style={lbl}>Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(206) 555-0100"
              style={inp}
            />

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "22px 0 6px" }}>
              <BagCard label="Bag of 5" sub="5 injera per bag" value={bag5} onChange={setBag5} accent={C.amber} />
              <BagCard label="Bag of 10" sub="10 injera per bag" value={bag10} onChange={setBag10} accent={C.red} />
            </div>
            <div style={{ fontSize: 12.5, color: C.brownSoft, textAlign: "center", marginBottom: 16 }}>
              At least one bag size must have a quantity.
            </div>

            <label style={lbl}>Note to the baker (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. extra soft, pickup at 8am"
              style={inp}
            />

            {(bag5 > 0 || bag10 > 0) && (
              <div
                style={{
                  background: C.amberSoft,
                  border: `1px solid ${C.amber}55`,
                  borderRadius: 14,
                  padding: "12px 16px",
                  margin: "18px 0 6px",
                  textAlign: "center",
                  fontSize: 15
                }}
              >
                <strong>Order total: {bag5 * 5 + bag10 * 10} injera</strong>
                <span style={{ color: C.brownSoft }}>
                  {" "}
                  ({bag5 > 0 ? `${bag5} × bag of 5` : ""}
                  {bag5 > 0 && bag10 > 0 ? " + " : ""}
                  {bag10 > 0 ? `${bag10} × bag of 10` : ""})
                </span>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "#FBE3DE",
                  border: `1px solid ${C.red}66`,
                  color: C.redDark,
                  borderRadius: 12,
                  padding: "11px 15px",
                  margin: "14px 0 0",
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "16px 0",
                border: "none",
                borderRadius: 16,
                background: saving ? C.brownSoft : C.red,
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
                letterSpacing: 0.4,
                boxShadow: `0 6px 18px ${C.red}44`
              }}
            >
              {saving ? "Submitting…" : "Submit tonight's order"}
            </button>
          </>
        )}

        {/* ---------------- CONFIRMATION ---------------- */}
        {view === "order" && confirmed && (
          <div style={{ textAlign: "center", paddingTop: 24 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: C.green,
                color: "#fff",
                fontSize: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              ✓
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700 }}>
              Order received!
            </div>
            <div style={{ color: C.brownSoft, marginTop: 6, fontSize: 15 }}>
              Thank you, {confirmed.customer}. Your injera will be ready in the morning.
            </div>
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: "18px 20px",
                margin: "22px auto 0",
                maxWidth: 380,
                textAlign: "left",
                fontSize: 15
              }}
            >
              <Row k="Order date" v={prettyDate(confirmed.date)} />
              {confirmed.bag5 > 0 && (
                <Row
                  k="Bag of 5"
                  v={`${confirmed.bag5} bag${confirmed.bag5 > 1 ? "s" : ""} (${confirmed.bag5 * 5} injera)`}
                />
              )}
              {confirmed.bag10 > 0 && (
                <Row
                  k="Bag of 10"
                  v={`${confirmed.bag10} bag${confirmed.bag10 > 1 ? "s" : ""} (${confirmed.bag10 * 10} injera)`}
                />
              )}
              <Row k="Total injera" v={confirmed.bag5 * 5 + confirmed.bag10 * 10} bold />
              {confirmed.note && <Row k="Note" v={confirmed.note} />}
            </div>
            <button
              onClick={() => setConfirmed(null)}
              style={{
                marginTop: 22,
                padding: "12px 28px",
                borderRadius: 14,
                border: `1.5px solid ${C.red}`,
                background: "transparent",
                color: C.red,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Place another order
            </button>
          </div>
        )}

        {/* ---------------- PIN GATE ---------------- */}
        {view === "pin" && (
          <div style={{ textAlign: "center", paddingTop: 30, maxWidth: 320, margin: "0 auto" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700 }}>
              Staff access
            </div>
            <div style={{ color: C.brownSoft, fontSize: 14, margin: "6px 0 22px" }}>
              Enter the baker PIN to view the order summary.
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && tryPin()}
              placeholder="• • • •"
              autoFocus
              style={{
                ...inp,
                textAlign: "center",
                fontSize: 28,
                letterSpacing: 10,
                fontWeight: 700,
                border: `2px solid ${pinError ? C.red : C.line}`
              }}
            />
            {pinError && (
              <div style={{ color: C.redDark, fontSize: 14, fontWeight: 600, marginTop: 10 }}>
                {pinError}
              </div>
            )}
            <button
              onClick={tryPin}
              disabled={pinChecking}
              style={{
                width: "100%",
                marginTop: 18,
                padding: "14px 0",
                border: "none",
                borderRadius: 14,
                background: pinChecking ? C.brownSoft : C.red,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: pinChecking ? "wait" : "pointer"
              }}
            >
              {pinChecking ? "Checking…" : "Unlock summary"}
            </button>
            <button
              onClick={() => {
                setView("order");
                setPinInput("");
                setPinError("");
              }}
              style={{
                marginTop: 12,
                padding: "10px 0",
                border: "none",
                background: "transparent",
                color: C.brownSoft,
                fontSize: 14,
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              Back to ordering
            </button>
          </div>
        )}

        {/* ---------------- BAKER SUMMARY ---------------- */}
        {unlocked && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 18
              }}
            >
              <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700 }}>
                Order summary
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  style={{ ...inp, width: "auto", margin: 0, padding: "9px 12px", fontSize: 15 }}
                />
                <button
                  onClick={() => refresh(summaryDate, staffPin)}
                  title="Refresh orders"
                  style={{
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${C.amber}`,
                    background: "transparent",
                    color: C.amber,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  ↻
                </button>
                <button
                  onClick={lockAndExit}
                  title="Lock and return to customer view"
                  style={{
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${C.brownSoft}`,
                    background: "transparent",
                    color: C.brownSoft,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  🔒 Lock
                </button>
              </div>
            </div>
            <div style={{ color: C.brownSoft, fontSize: 14, marginBottom: 16 }}>
              {prettyDate(summaryDate)}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              <Stat label="Bags of 5" value={tBag5} accent={C.amber} />
              <Stat label="Bags of 10" value={tBag10} accent={C.red} />
              <Stat label="Total injera to bake" value={tInjera} accent={C.green} big />
            </div>

            {summaryError && (
              <div
                style={{
                  background: "#FBE3DE",
                  border: `1px solid ${C.red}66`,
                  color: C.redDark,
                  borderRadius: 12,
                  padding: "11px 15px",
                  marginBottom: 14,
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                {summaryError}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: "center", color: C.brownSoft, padding: 30 }}>
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: C.brownSoft,
                  padding: "36px 20px",
                  background: C.card,
                  borderRadius: 16,
                  border: `1px dashed ${C.line}`
                }}
              >
                No orders for this date yet. Orders submitted tonight will appear here.
              </div>
            ) : (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 16,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 44px",
                    padding: "12px 16px",
                    background: C.amberSoft,
                    fontSize: 12.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    color: C.brown
                  }}
                >
                  <div>Customer</div>
                  <div style={{ textAlign: "center" }}>Bag 5</div>
                  <div style={{ textAlign: "center" }}>Bag 10</div>
                  <div style={{ textAlign: "center" }}>Injera</div>
                  <div />
                </div>
                {orders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 44px",
                      padding: "13px 16px",
                      borderTop: `1px solid ${C.line}`,
                      fontSize: 15,
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{o.customer}</div>
                      <div style={{ fontSize: 12, color: C.brownSoft }}>
                        {new Date(o.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                        {o.phone ? ` · ${o.phone}` : ""}
                        {o.note ? ` · "${o.note}"` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>{o.bag5 || "—"}</div>
                    <div style={{ textAlign: "center" }}>{o.bag10 || "—"}</div>
                    <div style={{ textAlign: "center", fontWeight: 700 }}>
                      {o.bag5 * 5 + o.bag10 * 10}
                    </div>
                    <button
                      onClick={() => removeOrder(o.id)}
                      aria-label={`Remove ${o.customer}'s order`}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: C.brownSoft,
                        cursor: "pointer",
                        fontSize: 17
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 44px",
                    padding: "13px 16px",
                    borderTop: `2px solid ${C.red}`,
                    fontWeight: 800,
                    fontSize: 15,
                    background: "#FFF3E2"
                  }}
                >
                  <div>
                    Baker total ({orders.length} order{orders.length > 1 ? "s" : ""})
                  </div>
                  <div style={{ textAlign: "center" }}>{tBag5}</div>
                  <div style={{ textAlign: "center" }}>{tBag10}</div>
                  <div style={{ textAlign: "center", color: C.red }}>{tInjera}</div>
                  <div />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with discreet staff entrance */}
      <div style={{ textAlign: "center", padding: "0 0 22px", fontSize: 12.5, color: C.brownSoft }}>
        © Arif Foods ·{" "}
        {!unlocked && (
          <button
            onClick={() => setView("pin")}
            style={{
              border: "none",
              background: "transparent",
              color: C.brownSoft,
              fontSize: 12.5,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0
            }}
          >
            Staff sign-in
          </button>
        )}
      </div>
    </div>
  );
}

const lbl = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "#8A6A52",
  margin: "16px 0 6px"
};
const inp = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 15px",
  fontSize: 16,
  border: "1.5px solid #EAD9C2",
  borderRadius: 12,
  background: "#fff",
  color: "#3B2316",
  outline: "none"
};

function Row({ k, v, bold }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        fontWeight: bold ? 800 : 400
      }}
    >
      <span style={{ color: "#8A6A52" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function Stat({ label, value, accent, big }) {
  return (
    <div
      style={{
        flex: big ? 1.4 : 1,
        minWidth: 130,
        background: "#FFFBF4",
        border: `1.5px solid ${accent}55`,
        borderTop: `4px solid ${accent}`,
        borderRadius: 14,
        padding: "14px 16px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: accent,
          fontFamily: "Georgia, serif"
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "#8A6A52"
        }}
      >
        {label}
      </div>
    </div>
  );
}
