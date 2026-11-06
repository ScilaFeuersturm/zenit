// ============================================================
// Config: URLs de la app real (Expo) y de la API (FastAPI).
// Cambiar acá cuando se despliegue a producción, por ejemplo:
//   APP_URL: "https://app.eventoszenit.com"
//   API_URL: "https://api.eventoszenit.com"
// El login/registro NO se reimplementa en la landing: se reusa
// el flujo ya existente y probado de la app (incluye la lógica
// de "el admin no se registra, ya tiene credenciales").
// ============================================================
const CONFIG = {
  APP_URL: window.ZENIT_CONFIG?.APP_URL || "http://localhost:19006",
  API_URL: window.ZENIT_CONFIG?.API_URL || "http://localhost:8000",
};

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Links de login / registro ----------
const loginTargets = ["loginLink", "loginLinkMobile", "footerLogin"];
const registerTargets = [
  "registerLink",
  "registerLinkMobile",
  "footerRegister",
  "ctaPrimary",
  "ctaSecondary",
];

loginTargets.forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = `${CONFIG.APP_URL}/login`;
});

registerTargets.forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.href = `${CONFIG.APP_URL}/register`;
});

// ---------- Header: fondo sólido al scrollear ----------
const header = document.getElementById("siteHeader");
function onScroll() {
  header.classList.toggle("scrolled", window.scrollY > 20);
}
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// ---------- Menú mobile ----------
const navToggle = document.getElementById("navToggle");
const mobilePanel = document.getElementById("mobilePanel");

navToggle.addEventListener("click", () => {
  const isOpen = mobilePanel.classList.toggle("open");
  navToggle.textContent = isOpen ? "✕" : "☰";
});

mobilePanel.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobilePanel.classList.remove("open");
    navToggle.textContent = "☰";
  });
});

// ---------- Reveal on scroll ----------
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => revealObserver.observe(el));

// ---------- Lightbox de galería ----------
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".lightbox-trigger").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const fallback = trigger.dataset.fallback;
    lightboxImg.onerror = fallback
      ? () => {
          lightboxImg.onerror = null;
          lightboxImg.src = fallback;
        }
      : null;
    lightboxImg.src = trigger.getAttribute("href");
    lightboxImg.alt = trigger.querySelector("img")?.alt ?? "Vista ampliada";
    lightbox.classList.add("open");
  });
});

function closeLightbox() {
  lightbox.classList.remove("open");
  lightboxImg.src = "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

// ---------- Formulario de contacto ----------
const contactForm = document.getElementById("contactForm");
const contactFeedback = document.getElementById("contactFeedback");
const contactSubmit = document.getElementById("contactSubmit");

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const payload = {
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    phone: formData.get("phone")?.toString().trim() || undefined,
    message: formData.get("message")?.toString().trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    showFeedback("Completá nombre, email y mensaje.", "error");
    return;
  }

  contactSubmit.disabled = true;
  contactSubmit.textContent = "Enviando...";

  try {
    const res = await fetch(`${CONFIG.API_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? "No se pudo enviar el mensaje");
    }

    contactForm.reset();
    showFeedback("¡Gracias! Te vamos a responder a la brevedad por email.", "success");
  } catch (err) {
    showFeedback(
      err instanceof Error ? err.message : "No se pudo enviar el mensaje. Probá de nuevo.",
      "error"
    );
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.textContent = "Enviar mensaje";
  }
});

function showFeedback(text, kind) {
  contactFeedback.textContent = text;
  contactFeedback.className = `form-feedback show ${kind}`;
}
