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
  cityRegion: 'Sherbrooke, QC',
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
          <a href="/soumission" class="btn btn-sm nav-cta">
            <span>Demander une soumission</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </div>
      <div class="nav-contact-bar">
        <span class="nav-contact-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>
          ${BRAND.cityRegion}
        </span>
        <a href="${BRAND.phoneHref}" class="nav-contact-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L7.9 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.9 2.3z"/></svg>
          ${BRAND.phoneDisplay}
        </a>
        <a href="mailto:${BRAND.email}" class="nav-contact-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>
          ${BRAND.email}
        </a>
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
