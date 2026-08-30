// =============================================
// Babar Cosmetics — Frontend Interactivity
// =============================================

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Account area (login/signup or logged-in user) ---------- */
function renderAccountArea() {
  const el = document.getElementById('navAccount');
  if (!el) return;
  const user = window.__currentUser;

  if (user) {
    const firstName = (user.name || '').split(' ')[0] || 'Account';
    el.innerHTML = `
      <span>Hi, ${firstName}</span>
      <span class="divider">·</span>
      <button type="button" class="link-btn" id="logoutBtn">Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      window.location.href = '/auth.html';
    });
  } else {
    el.innerHTML = `<a href="/auth.html">Login / Sign Up</a>`;
  }
}

if (window.__currentUser) {
  renderAccountArea();
} else {
  document.addEventListener('user-ready', renderAccountArea);
}

/* ---------- Navbar scroll state ---------- */
const nav = document.getElementById('siteNav');
const onScroll = () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 40);
};
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Mobile menu ---------- */
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  })
);

/* ---------- Cursor glow (desktop only) ---------- */
const glow = document.getElementById('cursorGlow');
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  window.addEventListener('mousemove', (e) => {
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    glow.classList.add('active');
  });
  window.addEventListener('mouseleave', () => glow.classList.remove('active'));
}

/* ---------- Scroll reveal ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

/* ---------- Products: fetch from backend, render cards ---------- */
const FALLBACK_PRODUCTS = [
  { id: 'p1', name: 'Velvet Wine Matte Lipstick', category: 'Lips', price: 1490, currency: 'PKR', shade: '#7A1F3D', tagline: 'One swipe, full pigment, zero fade.', badge: 'Bestseller' },
  { id: 'p2', name: 'Gold Dust Highlighter', category: 'Face', price: 1990, currency: 'PKR', shade: '#D4AF7A', tagline: 'A lit-from-within glow, not glitter.', badge: 'New' },
  { id: 'p3', name: 'Silk Veil Foundation', category: 'Face', price: 2450, currency: 'PKR', shade: '#E8C4A0', tagline: 'Buildable coverage that breathes.', badge: '' },
  { id: 'p4', name: 'Rose Ember Blush', category: 'Face', price: 1690, currency: 'PKR', shade: '#C97064', tagline: 'The flush of a good day, bottled.', badge: '' },
  { id: 'p5', name: 'Ink Line Eyeliner', category: 'Eyes', price: 990, currency: 'PKR', shade: '#141014', tagline: 'Precision tip, twelve-hour hold.', badge: 'Bestseller' },
  { id: 'p6', name: 'Amber Nights Perfume Oil', category: 'Fragrance', price: 2990, currency: 'PKR', shade: '#8A4B2E', tagline: 'Warm amber, soft musk, quiet confidence.', badge: 'New' },
];

function productIconSVG(category, shade) {
  const icons = {
    Lips: `
      <svg viewBox="0 0 100 100" class="product-card__icon-svg">
        <rect x="38" y="52" width="24" height="34" rx="6" fill="url(#pi-gold)"/>
        <rect x="41" y="30" width="18" height="24" rx="4" fill="#2A0712"/>
        <path d="M41 30 Q50 12 59 30 Q56 40 50 40 Q44 40 41 30 Z" fill="${shade}"/>
        <ellipse cx="50" cy="86" rx="12" ry="3" fill="rgba(0,0,0,0.12)"/>
      </svg>`,
    Face: `
      <svg viewBox="0 0 100 100" class="product-card__icon-svg">
        <circle cx="50" cy="56" r="30" fill="url(#pi-gold)"/>
        <circle cx="50" cy="56" r="22" fill="#FBF3EC"/>
        <circle cx="50" cy="56" r="14" fill="${shade}"/>
        <path d="M22 44 Q50 20 78 44" fill="none" stroke="url(#pi-gold)" stroke-width="5" stroke-linecap="round"/>
      </svg>`,
    Eyes: `
      <svg viewBox="0 0 100 100" class="product-card__icon-svg">
        <rect x="46" y="18" width="8" height="46" rx="3" fill="url(#pi-gold)"/>
        <path d="M46 64 L54 64 L50 82 Z" fill="${shade}"/>
        <rect x="44" y="14" width="12" height="8" rx="2" fill="#2A0712"/>
      </svg>`,
    Fragrance: `
      <svg viewBox="0 0 100 100" class="product-card__icon-svg">
        <rect x="38" y="20" width="24" height="12" rx="3" fill="url(#pi-gold)"/>
        <rect x="43" y="14" width="14" height="8" rx="2" fill="#2A0712"/>
        <path d="M34 32 H66 L70 82 Q70 88 64 88 H36 Q30 88 30 82 Z" fill="rgba(255,255,255,0.5)" stroke="url(#pi-gold)" stroke-width="2"/>
        <path d="M38 50 H62 L65 82 Q65 84 63 84 H37 Q35 84 35 82 Z" fill="${shade}" opacity="0.85"/>
      </svg>`,
  };
  return `
    <svg width="0" height="0" style="position:absolute">
      <defs><linearGradient id="pi-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E4C77A"/><stop offset="100%" stop-color="#C9A227"/>
      </linearGradient></defs>
    </svg>
    ${icons[category] || icons.Face}`;
}

function productCardHTML(p) {
  const badge = p.badge ? `<span class="product-card__badge">${p.badge}</span>` : '';
  return `
    <article class="product-card">
      ${badge}
      <div class="product-card__swatch" style="--shade:${p.shade}">
        <div class="product-card__icon">${productIconSVG(p.category, p.shade)}</div>
      </div>
      <p class="product-card__category">${p.category}</p>
      <h3 class="product-card__name">${p.name}</h3>
      <p class="product-card__tagline">${p.tagline}</p>
      <div class="product-card__footer">
        <span class="product-card__price">Rs. ${Number(p.price).toLocaleString()}</span>
        <button class="product-card__add" type="button">Add to Bag</button>
      </div>
    </article>`;
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = products.map(productCardHTML).join('');

  const cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('is-visible'), i * 60);
          cardObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  grid.querySelectorAll('.product-card').forEach((card) => cardObserver.observe(card));

  grid.querySelectorAll('.product-card__add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const original = btn.textContent;
      btn.textContent = 'Added ✓';
      setTimeout(() => (btn.textContent = original), 1600);
    });
  });
}

fetch('/api/products')
  .then((r) => r.json())
  .then((data) => renderProducts(data.products && data.products.length ? data.products : FALLBACK_PRODUCTS))
  .catch(() => renderProducts(FALLBACK_PRODUCTS));

/* ---------- Contact form ---------- */
const contactForm = document.getElementById('contactForm');
const contactMsg = document.getElementById('contactMsg');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const payload = {
    name: contactForm.name.value.trim(),
    email: contactForm.email.value.trim(),
    message: contactForm.message.value.trim(),
  };

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';
  contactMsg.textContent = '';
  contactMsg.classList.remove('error');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    contactMsg.textContent = data.message || data.error || '';
    if (data.success) {
      contactForm.reset();
    } else {
      contactMsg.classList.add('error');
    }
  } catch (err) {
    contactMsg.textContent = 'Kuch ghalat ho gaya. Dobara koshish karein.';
    contactMsg.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

/* ---------- Newsletter form ---------- */
const newsletterForm = document.getElementById('newsletterForm');
const newsletterMsg = document.getElementById('newsletterMsg');

newsletterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = newsletterForm.querySelector('button[type="submit"]');
  const email = newsletterForm.email.value.trim();

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = '…';
  newsletterMsg.textContent = '';
  newsletterMsg.classList.remove('error');

  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    newsletterMsg.textContent = data.message || data.error || '';
    if (data.success) {
      newsletterForm.reset();
    } else {
      newsletterMsg.classList.add('error');
    }
  } catch (err) {
    newsletterMsg.textContent = 'Kuch ghalat ho gaya. Dobara koshish karein.';
    newsletterMsg.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
