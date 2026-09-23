// Builds dist/ from src/template.html + content/site.json.
// Netlify runs this after every save in /admin. If the content is invalid the
// build throws, the deploy fails, and the live site stays on the last good version.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';

const ON_NETLIFY = process.env.NETLIFY === 'true';
const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
let html = readFileSync('src/template.html', 'utf8');

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// **word** -> bold; single newlines -> <br>
const rich = (s = '') => esc(String(s).trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

function need(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`Missing: ${label}`);
  return String(value).trim();
}

function telOf(display) {
  const d = display.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  throw new Error(`Phone number "${display}" isn't a 10-digit US number`);
}

// On Netlify, images go through the Image CDN, which resizes and picks WebP/AVIF per browser.
// Locally the raw file is used so dist/ opens straight from disk.
function imgUrl(path, width) {
  if (!ON_NETLIFY) return path.replace(/^\//, '');
  return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}`;
}
function imgAttrs(path, widths, sizes) {
  const src = `src="${esc(imgUrl(path, widths[widths.length - 1]))}"`;
  if (!ON_NETLIFY) return src;
  const set = widths.map((w) => `${imgUrl(path, w)} ${w}w`).join(', ');
  return `${src} srcset="${esc(set)}" sizes="${sizes}"`;
}

const { contact_info: info, hero, strip, services, about, gallery, contact } = site;

const phone = need(info.phone, 'Phone number');
const tel = telOf(phone);
const email = need(info.email, 'Email');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Email "${email}" doesn't look right`);

const serviceList = (services.items || []).filter((s) => s && s.title && s.title.trim());
if (!serviceList.length) throw new Error('Add at least one service');

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Young & Sons Hardwood Flooring',
  description: 'Expert hardwood installation, refinishing, and repair across Colorado and Southern Wyoming.',
  url: 'https://youngandsonshardwood.com/',
  logo: 'https://youngandsonshardwood.com/logo.png',
  telephone: tel,
  email,
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Colorado' },
    { '@type': 'AdministrativeArea', name: 'Southern Wyoming' },
  ],
  foundingDate: '1902',
  priceRange: '$$',
  ...(info.facebook ? { sameAs: [info.facebook.trim()] } : {}),
  address: { '@type': 'PostalAddress', addressRegion: 'CO', addressCountry: 'US' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Hardwood Flooring Services',
    itemListElement: serviceList.map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: s.title.trim() },
    })),
  },
};

const serviceCards = serviceList.map((s, i) => `<div class="service-card">
        <div class="service-num">${String(i + 1).padStart(2, '0')}</div>
        <h3>${esc(s.title.trim())}</h3>
        <p>${esc((s.description || '').trim())}</p>
      </div>`).join('\n      ');

const serviceOptions = serviceList
  .map((s) => `<option value="${esc(s.title.trim())}">${esc(s.title.trim())}</option>`)
  .join('\n            ');

const aboutPhoto = about.photo
  ? `<div class="about-photo"><img ${imgAttrs(about.photo, [500, 900], '(max-width: 768px) 88vw, 40vw')} alt="${esc(about.photo_alt)}" loading="lazy" decoding="async"></div>`
  : '<div class="about-photo">Photo Placeholder</div>';

const aboutBody = String(about.body || '').trim().split(/\n\s*\n/)
  .map((p) => `<p class="about-text">${rich(p)}</p>`)
  .join('\n        ');

const PLACEHOLDER_SHADES = [
  'linear-gradient(135deg, #8b6d52, #a8876a)',
  'linear-gradient(135deg, #6e5540, #8b6d52)',
  'linear-gradient(135deg, #96775c, #b8987a)',
  'linear-gradient(135deg, #7a6048, #a8876a)',
  'linear-gradient(135deg, #a8876a, #c4a888)',
];
const photos = (gallery.photos || []).filter((p) => p && p.image);
const galleryItems = photos.length
  ? photos.map((p, i) => {
      const sizes = i === 0
        ? '(max-width: 480px) 88vw, (max-width: 768px) 88vw, 66vw'
        : '(max-width: 480px) 88vw, (max-width: 768px) 44vw, 33vw';
      return `<a class="gallery-item" href="${esc(imgUrl(p.image, 2000))}" target="_blank" rel="noopener">
        <img ${imgAttrs(p.image, [600, 1000, 1600], sizes)} alt="${esc(p.caption)}" loading="lazy" decoding="async">
      </a>`;
    }).join('\n      ')
  : PLACEHOLDER_SHADES.map((shade, i) =>
      `<div class="gallery-item gallery-placeholder" style="--ph: ${shade}">Project Photo ${i + 1}</div>`
    ).join('\n      ');

const tokens = {
  JSON_LD: JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c'),
  PHONE_DISPLAY: esc(phone),
  PHONE_TEL: tel,
  EMAIL: esc(email),
  FACEBOOK: esc(need(info.facebook, 'Facebook link')),
  SERVICE_AREA: esc(need(info.service_area, 'Service area')),
  LOGO_HERO: imgAttrs('/logo.png', [240, 480], '(max-width: 768px) 180px, 240px'),
  LOGO_FOOTER: imgAttrs('/logo.png', [120], '52px'),
  HERO_EYEBROW: esc(hero.eyebrow),
  HERO_HEADLINE: rich(need(hero.headline, 'Headline')),
  HERO_TEXT: esc(hero.text),
  BADGE_BIG: esc(hero.badge_big),
  BADGE_SMALL: esc(hero.badge_small),
  STRIP_TITLE: esc(strip.title),
  STRIP_TEXT: esc(strip.text),
  SERVICES_HEADING: esc(services.heading),
  SERVICES_INTRO: esc(services.intro),
  SERVICES_CARDS: serviceCards,
  SERVICE_OPTIONS: serviceOptions,
  ABOUT_PHOTO: aboutPhoto,
  ABOUT_HEADING: esc(about.heading),
  ABOUT_QUOTE: esc(about.quote),
  ABOUT_BODY: aboutBody,
  PILLAR_1: esc(about.pillars?.one),
  PILLAR_2: esc(about.pillars?.two),
  PILLAR_3: esc(about.pillars?.three),
  GALLERY_HEADING: esc(gallery.heading),
  GALLERY_INTRO: esc(gallery.intro),
  GALLERY_ITEMS: galleryItems,
  CONTACT_HEADING: esc(contact.heading),
  CONTACT_INTRO: esc(contact.intro),
  PRICING_NOTE: rich(contact.pricing_note),
  YEAR: String(new Date().getFullYear()),
};

for (const [key, value] of Object.entries(tokens)) {
  html = html.split(`{{${key}}}`).join(value);
}
const leftover = html.match(/\{\{[A-Z_0-9]+\}\}/g);
if (leftover) throw new Error(`Unfilled placeholders: ${[...new Set(leftover)].join(', ')}`);

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('static', 'dist', { recursive: true });
cpSync('admin', 'dist/admin', { recursive: true });
writeFileSync('dist/index.html', html);
console.log(`Built dist/index.html (${serviceList.length} services, ${photos.length} gallery photos${ON_NETLIFY ? ', Netlify image CDN' : ''})`);
