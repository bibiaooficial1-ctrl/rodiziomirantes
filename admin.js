const ready =
  window.SUPABASE_URL?.startsWith("https://") &&
  !window.SUPABASE_URL.includes("COLOQUE_AQUI") &&
  window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_ANON_KEY.includes("COLOQUE_AQUI");
const sb = ready
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;
const $ = (s) => document.querySelector(s);
let currentProducts = [];
function safe(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function checkSession() {
  if (!sb) {
    $("#login-status").textContent =
      "Configure config.js com a URL e a chave pública do Supabase.";
    return;
  }
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    showLogin();
    return;
  }
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (profile?.role !== "admin") {
    await sb.auth.signOut();
    $("#login-status").textContent =
      "Esta conta não tem permissões de administrador.";
    showLogin();
    return;
  }
  $("#login-box").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  $("#logout").classList.remove("hidden");
  await loadCategories();
  await loadProducts();
  await loadReservations();
}
function showLogin() {
  $("#login-box").classList.remove("hidden");
  $("#dashboard").classList.add("hidden");
  $("#logout").classList.add("hidden");
}
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.currentTarget));
  const { error } = await sb.auth.signInWithPassword({
    email: f.email,
    password: f.password,
  });
  $("#login-status").textContent = error ? error.message : "Sessão iniciada.";
  if (!error) checkSession();
});
$("#logout").addEventListener("click", async () => {
  await sb.auth.signOut();
  showLogin();
});
async function loadCategories() {
  const { data, error } = await sb.from("categories").select("*").order("name");
  if (error) return;
  $("#category-select").innerHTML = (data || [])
    .map((c) => `<option value="${c.id}">${safe(c.name)}</option>`)
    .join("");
}
async function loadProducts() {
  const { data, error } = await sb
    .from("products")
    .select("*,categories(name)")
    .order("created_at", { ascending: false });
  if (error) {
    $("#product-list").textContent = error.message;
    return;
  }
  currentProducts = data || [];
  $("#product-list").innerHTML =
    `<table class="admin-table"><thead><tr><th>Foto</th><th>Prato</th><th>Categoria</th><th>Preço</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${currentProducts.map((p) => `<tr><td><img src="${safe(p.image_url || "")}" alt=""></td><td>${safe(p.name)}</td><td>${safe(p.categories?.name || "")}</td><td>${Number(p.price_kz).toLocaleString("pt-AO")} Kz</td><td>${p.is_active ? "Ativo" : "Oculto"}</td><td><button class="small-btn" data-edit="${p.id}">Editar</button> <button class="danger" data-delete="${p.id}">Eliminar</button></td></tr>`).join("")}</tbody></table>`;
  document
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => editProduct(b.dataset.edit)));
  document
    .querySelectorAll("[data-delete]")
    .forEach((b) => (b.onclick = () => deleteProduct(b.dataset.delete)));
}
function editProduct(id) {
  const p = currentProducts.find((x) => x.id === id);
  if (!p) return;
  const f = $("#product-form");
  f.elements.id.value = p.id;
  f.elements.name.value = p.name;
  f.elements.price_kz.value = p.price_kz;
  f.elements.category_id.value = p.category_id;
  f.elements.description.value = p.description || "";
  f.elements.is_active.checked = p.is_active;
  $("#form-title").textContent = "Editar prato";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function deleteProduct(id) {
  if (!confirm("Tem a certeza de que deseja eliminar este prato?")) return;
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) alert(error.message);
  else loadProducts();
}
$("#product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const d = new FormData(f);
  const id = d.get("id");
  let image_url = id
    ? currentProducts.find((p) => p.id === id)?.image_url
    : null;
  const photo = d.get("photo");
  try {
    if (photo && photo.size) {
      const ext = photo.name.split(".").pop().toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("menu-images")
        .upload(path, photo, { upsert: false });
      if (upErr) throw upErr;
      image_url = sb.storage.from("menu-images").getPublicUrl(path)
        .data.publicUrl;
    }
    const payload = {
      name: d.get("name"),
      price_kz: Number(d.get("price_kz")),
      category_id: d.get("category_id"),
      description: d.get("description"),
      is_active: $("#product-form [name=is_active]").checked,
      image_url,
    };
    const result = id
      ? await sb.from("products").update(payload).eq("id", id)
      : await sb.from("products").insert(payload);
    if (result.error) throw result.error;
    $("#product-status").textContent = "Prato guardado com sucesso.";
    f.reset();
    f.elements.id.value = "";
    $("#form-title").textContent = "Adicionar prato";
    await loadProducts();
  } catch (err) {
    $("#product-status").textContent = "Erro: " + err.message;
  }
});
async function loadReservations() {
  const { data, error } = await sb
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    $("#reservation-list").textContent = error.message;
    return;
  }
  $("#reservation-list").innerHTML =
    `<table class="admin-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Data/hora</th><th>Pessoas</th><th>Estado</th><th>Ação</th></tr></thead><tbody>${(data || []).map((r) => `<tr><td>${safe(r.customer_name)}</td><td>${safe(r.phone)}</td><td>${safe(r.reservation_date)} ${safe(r.reservation_time)}</td><td>${r.guests}</td><td>${safe(r.status)}</td><td><select data-status="${r.id}"><option ${r.status === "pending" ? "selected" : ""} value="pending">Pendente</option><option ${r.status === "confirmed" ? "selected" : ""} value="confirmed">Confirmada</option><option ${r.status === "cancelled" ? "selected" : ""} value="cancelled">Cancelada</option></select></td></tr>`).join("")}</tbody></table>`;
  document.querySelectorAll("[data-status]").forEach(
    (s) =>
      (s.onchange = async () => {
        const { error } = await sb
          .from("reservations")
          .update({ status: s.value })
          .eq("id", s.dataset.status);
        if (error) alert(error.message);
      }),
  );
}
checkSession();
