const hasConfig =
  window.SUPABASE_URL?.startsWith("https://") &&
  !window.SUPABASE_URL.includes("COLOQUE_AQUI") &&
  window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_ANON_KEY.includes("COLOQUE_AQUI");
const db = hasConfig
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;
const money = (n) =>
  new Intl.NumberFormat("pt-AO").format(Number(n || 0)) + " Kz";
let allProducts = [];
document.getElementById("year").textContent = new Date().getFullYear();
function renderProducts(category = "Todas") {
  const list =
    category === "Todas"
      ? allProducts
      : allProducts.filter((p) => p.category_name === category);
  const target = document.getElementById("products");
  target.innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<article class="product-card"><img src="${escapeHtml(p.image_url || "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80")}" alt="${escapeHtml(p.name)}"><div class="product-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description || "")}</p><span class="price">${money(p.price_kz)}</span></div></article>`,
        )
        .join("")
    : '<p class="muted">Ainda não há pratos publicados. Volte em breve.</p>';
}
function escapeHtml(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function loadMenu() {
  if (!db) {
    document.getElementById("products").innerHTML =
      '<p class="muted">O menu será apresentado assim que a ligação à base de dados estiver configurada.</p>';
    return;
  }
  const { data, error } = await db
    .from("products")
    .select("*, categories(name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    document.getElementById("products").textContent =
      "Não foi possível carregar o menu.";
    return;
  }
  allProducts = (data || []).map((p) => ({
    ...p,
    category_name: p.categories?.name || "Outros",
  }));
  const cats = ["Todas", ...new Set(allProducts.map((p) => p.category_name))];
  document.getElementById("categories").innerHTML = cats
    .map(
      (c, i) =>
        `<button class="filter ${i === 0 ? "active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`,
    )
    .join("");
  document.querySelectorAll(".filter").forEach((b) =>
    b.addEventListener("click", () => {
      document
        .querySelectorAll(".filter")
        .forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      renderProducts(b.dataset.category);
    }),
  );
  renderProducts();
}
document
  .getElementById("reservation-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const status = document.getElementById("reservation-status");
    const data = Object.fromEntries(new FormData(form));
    data.guests = Number(data.guests);
    status.textContent = "A enviar pedido...";
    if (!db) {
      status.textContent =
        "O formulário ainda não está ligado. Configure primeiro o Supabase.";
      return;
    }
    const { error } = await db.from("reservations").insert(data);
    if (error) {
      status.textContent =
        "Não foi possível enviar. Tente pelo WhatsApp: +244 923 639 940.";
      return;
    }
    status.textContent =
      "Pedido enviado! A reserva ainda depende de confirmação do restaurante.";
    form.reset();
  });
loadMenu();
