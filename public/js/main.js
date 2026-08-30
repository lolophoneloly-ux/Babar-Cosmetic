// =============================================
// Babar Cosmetics — Frontend Interactivity
// =============================================

document.getElementById('year').textContent = new Date().getFullYear();

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

function productCardHTML(p) {
  const badge = p.badge ? `<span class="product-card__badge">${p.badge}</span>` : '';
  return `
    <article class="product-card">
      ${badge}
      <div class="product-card__swatch" style="--shade:${p.shade}"></div>
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
