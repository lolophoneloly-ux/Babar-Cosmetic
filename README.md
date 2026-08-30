# Babar Cosmetics — Full-Stack Website

Owner / Founder: **Ahmad Hassan Babar**

Yeh ek complete website hai — **frontend + backend dono** — jo animations aur
professional design ke sath banayi gayi hai.

## Structure

```
babar-cosmetics/
├── server.js              ← Backend (pure Node.js, koi npm install nahi chahiye)
├── package.json
├── data/
│   ├── products.json      ← Products ki list (yahan se edit karein)
│   ├── contacts.json      ← Contact form submissions yahan save hoti hain
│   └── subscribers.json   ← Newsletter emails yahan save hoti hain
└── public/                ← Frontend
    ├── index.html
    ├── css/style.css
    └── js/main.js
```

## Kaise chalayein (Run Locally)

Aapke computer par [Node.js](https://nodejs.org) installed hona chahiye
(version 14 ya usse upar). Phir:

```bash
cd babar-cosmetics
node server.js
```

Browser mein open karein: **http://localhost:3000**

Koi `npm install` ki zaroorat nahi — backend sirf Node.js ke built-in
modules use karta hai.

## Kya kya features hain

- **Hero section**: animated gradient blobs, "swipe" text reveal animation
  (lipstick swatch jaisi), scroll-triggered word animation
- **Marquee strip**: infinite scrolling brand values
- **Product grid**: backend API (`/api/products`) se live data, hover shine
  animation, staggered scroll-reveal
- **Brand story section**: Ahmad Hassan Babar ki founding story, animated
  stacked "compact" visual
- **Why Us section**: 4 feature cards
- **Testimonials**: auto-scrolling marquee
- **Newsletter + Contact form**: dono backend se connected
  (`/api/newsletter`, `/api/contact`) — data `data/` folder mein JSON files
  mein save hota hai
- Fully responsive (mobile, tablet, desktop) + keyboard-accessible +
  reduced-motion respect

## Customize karna

- **Products**: `data/products.json` edit karein — naya product add karne ke
  liye bas ek naya object list mein add karein (id, name, category, price,
  shade hex color, tagline, badge).
- **Colors / branding**: `public/css/style.css` ke top par `:root` variables
  mein saara color palette hai (`--wine-900`, `--rose-gold`, `--gold`, etc).
- **Copy / text**: `public/index.html` mein directly edit karein.
- **Owner / contact details**: footer aur "Our Story" section mein
  `public/index.html` ke andar.

## Deploy karna (live website banane ke liye)

Yeh Node.js app kisi bhi hosting par chal sakti hai jo Node support karti
ho — jaise Render, Railway, a VPS, ya Vercel (serverless adapter ke sath).
`server.js` ko start karna hai aur `PORT` environment variable set kar sakte
hain agar hosting provider koi specific port chahta ho.
