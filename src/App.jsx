import { useState, useEffect, useCallback } from "react";
import {
  submitOrder,
  verifyPin,
  fetchOrders,
  deleteOrder,
  todayStr
} from "./supabase.js";

const C = {
  cream: "#FDF4E7", card: "#FFFBF4", red: "#A8321C", redDark: "#7E2413",
  amber: "#E8862E", amberSoft: "#F8E3C8", brown: "#3B2316",
  brownSoft: "#8A6A52", green: "#2F6B3F", line: "#EAD9C2"
};

const prettyDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
};

// One color row inside a bag-size card
function ColorRow({ color, value, onChange }) {
  const isWhite = color === "White";
  const swatch = isWhite ? "#F5ECDD" : "#8A5A33";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: swatch, border: `1.5px solid ${C.line}`, display: "inline-block" }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: C.brown }}>{color}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Decrease ${color}`} style={btnStep(value === 0)}>−</button>
        <input type="number" min="0" max="99" value={value}
          onChange={(e) => { const n = parseInt(e.target.value, 10); onChange(isNaN(n) ? 0 : Math.max(0, Math.min(99, n))); }}
          style={{ width: 50, textAlign: "center", fontSize: 20, fontWeight: 700, color: C.brown, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "5px 0", background: "#fff", outline: "none" }} />
        <button onClick={() => onChange(Math.min(99, value + 1))} aria-label={`Increase ${color}`} style={btnStep(false)}>+</button>
      </div>
    </div>
  );
}

function BagCard({ size, white, brown, setWhite, setBrown, accent }) {
  const total = (white + brown) * size;
  return (
    <div style={{ background: C.card, border: `1.5px solid ${(white + brown) > 0 ? accent : C.line}`, borderRadius: 18, padding: "16px 18px", boxShadow: (white + brown) > 0 ? `0 4px 16px ${accent}22` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "radial-gradient(circle at 38% 35%, #F3D9AE, #E2B97F 55%, #C9985B)", border: `3px solid ${(white + brown) > 0 ? accent : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: C.brown }}>{size}</div>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.brown }}>Bag of {size}</div>
          <div style={{ fontSize: 12, color: C.brownSoft }}>{size} injera per bag · pick color</div>
        </div>
      </div>
      <ColorRow color="White" value={white} onChange={setWhite} />
      <div style={{ height: 1, background: C.line }} />
      <ColorRow color="Brown" value={brown} onChange={setBrown} />
      {(white + brown) > 0 && (
        <div style={{ marginTop: 8, fontSize: 13, color: accent, fontWeight: 600, textAlign: "right" }}>{white + brown} bag{(white + brown) > 1 ? "s" : ""} · {total} injera</div>
      )}
    </div>
  );
}

const btnStep = (disabled) => ({
  width: 36, height: 36, borderRadius: "50%", border: "none", cursor: disabled ? "default" : "pointer",
  background: disabled ? C.amberSoft : C.red, color: disabled ? C.brownSoft : "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1
});

const injeraOf = (o) =>
  o.bag5white * 5 + o.bag5brown * 5 + o.bag10white * 10 + o.bag10brown * 10 + o.bag20white * 20 + o.bag20brown * 20;

export default function App() {
  const [view, setView] = useState("order");
  const [staffPin, setStaffPin] = useState(() => sessionStorage.getItem("arif_staff_pin") || "");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [b5w, setB5w] = useState(0); const [b5b, setB5b] = useState(0);
  const [b10w, setB10w] = useState(0); const [b10b, setB10b] = useState(0);
  const [b20w, setB20w] = useState(0); const [
