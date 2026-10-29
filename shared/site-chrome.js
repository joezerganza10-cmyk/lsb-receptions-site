/**
 * LSB Réceptions — identité et interface commune.
 * Centralise le nom de marque, le téléphone et le courriel à un seul
 * endroit (BRAND) : un changement de nom ne se fait qu'ici.
 */
const BRAND = {
  name: 'LSB Réceptions',
  fullName: 'Les Saveurs Bantoues',
  tagline: 'Agence de services traiteurs',
  logo: '/logo-lsb-receptions.png',
  phoneDisplay: '(819) 678-9242',
  phoneHref: 'tel:+18196789242',
  email: 'info@lsbreceptions.ca',
  region: "L'Estrie, avec un réseau en développement au Québec",
};

const NAV_ITEMS = [
  { key: 'accueil', label: 'Accueil', href: '/' },
  { key: 'formules', label: 'Nos formules', href: '/formules' },
  { key: 'evenements', label: 'Vos événements', href: '/evenements' },
  { key: 'agence', label: 'Notre agence', href: '/agence' },
  { key: 'contact', label: 'Contact', href: '/contact' },
];

function renderSiteChrome(activeKey){
  const navEl = document.getElementById('site-nav');
  const footEl = document.getElementById('site-footer');

  if (navEl){
    navEl.innerHTML = `
      <div class="nav-top">
        <a class="logo" href="/"><img src="${BRAND.logo}" alt="${BRAND.name}"></a>
        <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Ouvrir le menu">
          <span></span><span></span><span></span>
        </button>
        <div class="nav-links" id="nav-links">
          ${NAV_ITEMS.map(i => `<a href="${i.href}"${i.key === activeKey ? ' class="is-current"' : ''}>${i.label}</a>`).join('')}
          <a href="/soumission" class="btn btn-sm nav-cta">Demander une soumission</a>
        </div>
      </div>
      <div class="nav-contact-bar">
        <a href="${BRAND.phoneHref}">${BRAND.phoneDisplay}</a>
        <a href="mailto:${BRAND.email}">${BRAND.email}</a>
      </div>`;
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  if (footEl){
    footEl.innerHTML = `
      <div class="wrap footer-grid">
        <div>
          <div class="footer-brand"><img src="${BRAND.logo}" alt=""><span>${BRAND.name}</span></div>
          <p>${BRAND.tagline} — ${BRAND.fullName}.<br>${BRAND.region}.</p>
          <p class="footer-partner">Les prestations culinaires sont réalisées par notre réseau de traiteurs partenaires.</p>
        </div>
        <div class="footer-links">
          ${NAV_ITEMS.map(i => `<a href="${i.href}">${i.label}</a>`).join('')}
          <a href="/devenir-partenaire">Devenir traiteur partenaire</a>
        </div>
        <div class="footer-links">
          <a href="${BRAND.phoneHref}">${BRAND.phoneDisplay}</a>
          <a href="mailto:${BRAND.email}">${BRAND.email}</a>
        </div>
      </div>
      <div class="footer-bottom">${BRAND.name} — agence de services traiteurs. Une demande ne constitue pas une réservation.</div>`;
  }
}

function initReveal(){
  const els = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting){ entry.target.classList.add('is-visible'); io.unobserve(entry.target); } });
  }, { threshold:.15, rootMargin:'0px 0px -60px 0px' });
  els.forEach(el => io.observe(el));
}
