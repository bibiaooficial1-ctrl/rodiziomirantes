// Supabase Edge Function: notify-reservation
// Configure secrets: RESEND_API_KEY and RESERVATION_EMAIL=reservas@rodizio.co.ao
// Deploy with: supabase functions deploy notify-reservation
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = await req.json().catch(() => null);
  if (!body || !body.customer_name || !body.phone || !body.reservation_date || !body.reservation_time || !body.guests) {
    return new Response(JSON.stringify({ error: "Dados da reserva incompletos." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("RESERVATION_EMAIL") || "reservas@rodizio.co.ao";
  if (!apiKey) return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada." }), { status: 500, headers: { "Content-Type": "application/json" } });

  const safe = (v: unknown) => String(v ?? "").replace(/[<>&"]/g, "");
  const html = `<h2>Novo pedido de reserva — Rodízio de Mirantes</h2>
    <p><b>Cliente:</b> ${safe(body.customer_name)}</p>
    <p><b>Telefone:</b> ${safe(body.phone)}</p>
    <p><b>Data:</b> ${safe(body.reservation_date)}</p>
    <p><b>Hora:</b> ${safe(body.reservation_time)}</p>
    <p><b>Pessoas:</b> ${safe(body.guests)}</p>
    <p><b>Observações:</b> ${safe(body.notes)}</p>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Reservas Rodízio <onboarding@resend.dev>", to: [to], subject: "Novo pedido de reserva", html })
  });
  const result = await response.text();
  return new Response(result, { status: response.status, headers: { "Content-Type": "application/json" } });
});
