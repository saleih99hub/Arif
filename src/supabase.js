import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaces a clear message instead of a blank screen if env vars are missing
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your Supabase project values."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");

/** Local date string (YYYY-MM-DD) in the device's timezone. */
export const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Customer action: submit tonight's order. Allowed for everyone. */
export async function submitOrder({ customer, phone, bag5, bag10, note }) {
  const { error } = await supabase.from("orders").insert({
    order_date: todayStr(),
    customer,
    phone: phone || null,
    bag5,
    bag10,
    note: note || null
  });
  if (error) throw error;
}

/** Staff action: check the PIN server-side. Returns true/false. */
export async function verifyPin(pin) {
  const { data, error } = await supabase.rpc("verify_pin", { pin });
  if (error) throw error;
  return data === true;
}

/**
 * Staff action: fetch all orders for a date.
 * The database function only returns rows when the PIN is correct,
 * so the customer list is never readable without it.
 */
export async function fetchOrders(pin, date) {
  const { data, error } = await supabase.rpc("get_orders", {
    pin,
    p_date: date
  });
  if (error) throw error;
  return data ?? [];
}

/** Staff action: remove an order (e.g. a customer cancels). PIN-gated server-side. */
export async function deleteOrder(pin, id) {
  const { error } = await supabase.rpc("delete_order", { pin, p_id: id });
  if (error) throw error;
}
