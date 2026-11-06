const CONFIG = {
  APP_URL: window.ZENIT_CONFIG?.APP_URL || "http://localhost:19006",
  API_URL: window.ZENIT_CONFIG?.API_URL || "http://localhost:8000",
};
document.getElementById("year").textContent = new Date().getFullYear();
document.querySelectorAll("[data-app-path]").forEach((link) => {
  link.href = `${CONFIG.APP_URL.replace(/\/$/, "")}/${link.dataset.appPath}`;
});
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("mainNav");
function closeMenu() {
  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
}
menuButton.addEventListener("click", () => {
  const open = navigation.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
});
navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.classList.contains("open")) {
    closeMenu(); menuButton.focus();
  }
});
const form = document.getElementById("contactForm");
const submit = document.getElementById("contactSubmit");
const feedback = document.getElementById("contactFeedback");
let sending = false;
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending || !form.reportValidity()) return;
  const data = new FormData(form);
  const payload = {
    name: String(data.get("name")).trim(), email: String(data.get("email")).trim(),
    phone: String(data.get("phone")).trim() || null, message: String(data.get("message")).trim(),
  };
  if (!payload.name || payload.message.length < 10) {
    feedback.textContent = "Completá tu nombre y contanos un poco más sobre tu evento.";
    feedback.className = "form-feedback error"; return;
  }
  sending = true; submit.disabled = true; submit.textContent = "Enviando tu consulta…";
  feedback.className = "form-feedback"; feedback.textContent = "Estamos enviando tu consulta al equipo de Zenit…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${CONFIG.API_URL.replace(/\/$/, "")}/api/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    if (!response.ok) throw new Error("No se pudo enviar la consulta");
    feedback.className = "form-feedback success";
    feedback.textContent = "¡Gracias! Tu consulta llegó al equipo de Zenit. Nos pondremos en contacto con vos.";
    form.reset();
  } catch {
    feedback.className = "form-feedback error";
    feedback.textContent = "No pudimos confirmar el envío. Tus datos siguen acá: podés reintentar o escribirnos por Instagram.";
  } finally {
    clearTimeout(timeout); sending = false; submit.disabled = false;
    submit.replaceChildren(document.createTextNode("Enviar mi consulta "));
    const arrow = document.createElement("span"); arrow.setAttribute("aria-hidden", "true"); arrow.textContent = "↗"; submit.append(arrow);
  }
});
