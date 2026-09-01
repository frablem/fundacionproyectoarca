/* Fundación Proyecto Arca — layout compartido
   Navbar, Footer, SEO en runtime, analítica e iconos.
   Toda la configuración por cliente vive en el bloque de arriba. */

/* ============================================================
   CONFIGURACIÓN DEL SITIO
   ============================================================ */

const FOUNDATION_NAME = 'Fundación Proyecto Arca';
const FOUNDATION_SHORT = 'Proyecto Arca';
const FOUNDATION_TAGLINE = 'La Serena · Coquimbo · Santiago';
const SLOGAN = 'Rescatamos vidas, transformamos historias.';

const CONTACT_EMAIL = 'proyectoarcacoquimbo@gmail.com';
const INSTAGRAM_URL = 'https://www.instagram.com/fundacionproyectoarca/';
const INSTAGRAM_HANDLE = '@fundacionproyectoarca';
const INSTAGRAM_EDUCA_URL = 'https://www.instagram.com/proyectoarcaeduca/';
const INSTAGRAM_EDUCA_HANDLE = '@proyectoarcaeduca';

const RUT_ONG = '65.201.899-8';
const REG_NUM = '319235';

/* Dominio propio de la fundación, recuperado en agosto de 2026. Habilita
   canonical y URLs absolutas en Open Graph. El apex es la forma canónica.
   www también sirve el sitio y es el canonical el que consolida, igual que en
   refugionoe.cl. Nunca poner aquí una URL de proveedor. */
const BASE_URL = 'https://proyectoarcafundacion.cl';

/* GA4. La medición se activa recién cuando exista la propiedad. */
const GA_ID = '';

/* Petfi — entregado por @petfiapp y verificado contra la API de Petfi.
   Es el único origen de las fichas de adopción del sitio. */
const PETFI_FOUNDATION_ID = 'x8UIwGbtFkhiwm3asaYOv7DUVlq1';
const PETFI_SPECIES = 'cat';
const PETFI_PROFILE_URL =
  'https://petfi.io/fundacion/' + PETFI_FOUNDATION_ID +
  '?utm_source=fundacion_cloe&utm_medium=referral&utm_campaign=arca&utm_content=foundation_profile';

/* Formspree — un endpoint por formulario. Pendientes de creación. */
const FORMSPREE = {
  contacto: 'PLACEHOLDER_FORMSPREE_ID_CONTACTO',
  adopcion: 'PLACEHOLDER_FORMSPREE_ID_ADOPCION',
  hogar_temporal: 'PLACEHOLDER_FORMSPREE_ID_HOGAR_TEMPORAL'
};

/* Transferencia bancaria — datos confirmados por la fundación. */
const TRANSFERENCIA = [
  { label: 'Nombre', value: FOUNDATION_NAME },
  { label: 'RUT', value: RUT_ONG },
  { label: 'Banco', value: 'Banco Santander' },
  { label: 'Tipo', value: 'Cuenta corriente' },
  { label: 'N° cuenta', value: '91975505' },
  { label: 'Correo', value: CONTACT_EMAIL }
];

/* Socios Guardianes FPA 365 — montos y textos escritos por la fundación.
   La cuenta de Mercado Pago está en creación, así que los links quedan pendientes. */
const GUARDIANES = [
  {
    tier: 'Guardián Bronce',
    amount: '$3.000',
    color: '#b08d57',
    copy: 'Tu aporte ayuda a mantener nuestra labor de rescate activa durante todo el año.',
    link: 'PLACEHOLDER_MERCADOPAGO_LINK_BRONCE'
  },
  {
    tier: 'Guardián Plata',
    amount: '$5.000',
    color: '#9aa2ab',
    copy: 'Ayudas a cubrir alimentación, arena y cuidados básicos de nuestros rescatados.',
    link: 'PLACEHOLDER_MERCADOPAGO_LINK_PLATA'
  },
  {
    tier: 'Guardián Oro',
    amount: '$10.000',
    color: '#dbcc00',
    copy: 'Contribuyes directamente a que podamos recibir nuevos casos y entregarles atención veterinaria.',
    link: 'PLACEHOLDER_MERCADOPAGO_LINK_ORO'
  },
  {
    tier: 'Guardián Platino',
    amount: '$20.000',
    color: '#c9d1d6',
    copy: 'Tu aporte nos permite responder ante emergencias y acompañar procesos de recuperación.',
    link: 'PLACEHOLDER_MERCADOPAGO_LINK_PLATINO'
  },
  {
    tier: 'Guardián Diamante',
    amount: '$30.000 o más',
    color: '#bf99d1',
    copy: 'Eres parte de la red que permite que Proyecto Arca siga creciendo y transformando historias.',
    link: 'PLACEHOLDER_MERCADOPAGO_LINK_DIAMANTE'
  }
];

/* Donar no va en navLinks: tiene su propio botón siempre visible. */
const navLinks = [
  { key: 'inicio', name: 'Inicio', href: '/' },
  { key: 'nosotras', name: 'Nosotras', href: '/nosotras' },
  { key: 'adoptar', name: 'Adoptar', href: '/adoptar' },
  { key: 'como-ayudar', name: 'Cómo ayudar', href: '/como-ayudar' },
  { key: 'noticias', name: 'Noticias', href: '/noticias' },
  { key: 'historias', name: 'Historias', href: '/historias' },
  { key: 'contacto', name: 'Contacto', href: '/contacto' }
];

const seoConfigByPath = {
  '/': {
    description: 'Fundación Proyecto Arca rescata, rehabilita y busca familias responsables para gatos abandonados en La Serena, Coquimbo y Santiago. Adopta, dona o hazte Socio Guardián FPA 365.',
    keywords: 'adoptar gatos Chile, rescate felino La Serena, adopción gatos Coquimbo, adopción gatos Santiago, fundación gatos Chile, donar rescate animal'
  },
  '/nosotras': {
    description: 'Somos un equipo de mujeres que rescata, rehabilita y educa por el bienestar de los gatos en La Serena, Coquimbo y Santiago. Conoce nuestra historia y cómo trabajamos.',
    keywords: 'fundación proyecto arca, quiénes somos, rescate felino Chile, equipo rescate gatos, tenencia responsable'
  },
  '/adoptar': {
    description: 'Gatitos en adopción de Fundación Proyecto Arca. Conoce el proceso, los requisitos y postula. Si vives en La Serena o Santiago, coordinamos el traslado de tu gato.',
    keywords: 'gatos en adopción, adoptar gato La Serena, adoptar gato Coquimbo, adoptar gato Santiago, adopción responsable felina'
  },
  '/como-ayudar': {
    description: 'Donar, adoptar, ser hogar temporal o difundir. Cuatro formas concretas de sostener el rescate felino de Fundación Proyecto Arca.',
    keywords: 'ayudar fundación gatos, hogar temporal gatos, voluntariado rescate animal, difundir adopción, colaborar rescate felino'
  },
  '/donar': {
    description: 'Dona a Fundación Proyecto Arca por transferencia bancaria o hazte Socio Guardián FPA 365 con un aporte mensual desde $3.000. Cada aporte sostiene alimentación, veterinario y traslados.',
    keywords: 'donar gatos Chile, socios guardianes FPA 365, aporte mensual rescate animal, transferencia donación fundación'
  },
  '/noticias': {
    description: 'Noticias, contenido educativo y novedades de Fundación Proyecto Arca sobre rescate felino y tenencia responsable.',
    keywords: 'noticias rescate felino, educación tenencia responsable, blog fundación gatos Chile'
  },
  '/historias': {
    description: 'Historias reales de rescate de Fundación Proyecto Arca. Cada gato rescatado deja una huella y una segunda oportunidad.',
    keywords: 'historias de rescate gatos, casos rescate felino Chile, antes y después adopción'
  },
  '/contacto': {
    description: 'Escríbenos para adoptar, ofrecer hogar temporal, colaborar o pedir una charla educativa. Fundación Proyecto Arca, La Serena, Coquimbo y Santiago.',
    keywords: 'contacto fundación proyecto arca, escribir fundación gatos, charlas tenencia responsable'
  }
};

/* ============================================================
   ANALÍTICA
   ============================================================ */

if (GA_ID) {
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
}

/* Nunca enviar nombres, correos, teléfonos ni texto libre. Solo página,
   ubicación del clic, tipo de formulario o identificador de animal. */
const trackEvent = (name, params) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, Object.assign({ page_path: window.location.pathname }, params || {}));
};

/* ============================================================
   SEO EN RUNTIME
   Complementa las metaetiquetas estáticas del <head>: los crawlers
   sociales no ejecutan JavaScript, así que esto es un refuerzo.
   ============================================================ */

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let tag = document.head.querySelector('meta[' + attr + '="' + key + '"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const initSeo = () => {
  let path = window.location.pathname.replace(/\/index\.html$/, '/');
  if (path.length > 1) path = path.replace(/\/$/, '');
  const cfg = seoConfigByPath[path] || seoConfigByPath['/'];
  const title = document.title;

  upsertMeta('name', 'description', cfg.description);
  upsertMeta('name', 'keywords', cfg.keywords);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', cfg.description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', FOUNDATION_NAME);
  upsertMeta('property', 'og:locale', 'es_CL');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', cfg.description);

  if (BASE_URL) {
    const absolute = BASE_URL + (path === '/' ? '/' : path);
    upsertMeta('property', 'og:url', absolute);
    upsertMeta('property', 'og:image', BASE_URL + '/media/og.jpg');
    upsertMeta('name', 'twitter:image', BASE_URL + '/media/og.jpg');
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', absolute);
  }
};

/* ============================================================
   ICONOS — SVG inline, nunca un CDN de iconos
   ============================================================ */

const Icon = ({ children, size, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size || 20} height={size || 20}
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" {...rest}>{children}</svg>
);

const IconInstagram = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

const IconMail = (props) => (
  <Icon {...props}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3.5 6.5 8.5 6 8.5-6" />
  </Icon>
);

const IconPin = (props) => (
  <Icon {...props}>
    <path d="M12 21s7-4.6 7-10.3A7 7 0 0 0 5 10.7C5 16.4 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.3" />
  </Icon>
);

const IconArrow = (props) => (
  <Icon {...props}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
);

const IconCheck = (props) => (
  <Icon {...props}><path d="m4.5 12.5 5 5 10-11" /></Icon>
);

const IconHeart = (props) => (
  <Icon {...props}>
    <path d="M12 20.5S3.5 15.2 3.5 9.4a4.9 4.9 0 0 1 8.5-3.3 4.9 4.9 0 0 1 8.5 3.3c0 5.8-8.5 11.1-8.5 11.1Z" />
  </Icon>
);

const IconPaw = (props) => (
  <Icon {...props}>
    <ellipse cx="7" cy="9" rx="1.9" ry="2.5" />
    <ellipse cx="12" cy="7" rx="1.9" ry="2.6" />
    <ellipse cx="17" cy="9" rx="1.9" ry="2.5" />
    <path d="M12 12.2c2.8 0 5 2 5 4.2 0 1.9-1.6 3.1-3.4 2.7-1-.2-2.2-.2-3.2 0-1.8.4-3.4-.8-3.4-2.7 0-2.2 2.2-4.2 5-4.2Z" />
  </Icon>
);

const IconRoute = (props) => (
  <Icon {...props}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.5 6h5a4 4 0 0 1 0 8h-3a4 4 0 0 0 0 8" strokeDasharray="2.5 3" />
  </Icon>
);

const IconBook = (props) => (
  <Icon {...props}>
    <path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v13a2 2 0 0 0-2-2H4Z" />
    <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2 2 0 0 1 2-2h6Z" />
  </Icon>
);

/* ============================================================
   NAVBAR
   ============================================================ */

const Navbar = ({ active }) => {
  const [open, setOpen] = React.useState(false);

  /* Sin bloqueo de scroll a propósito. Poner overflow:hidden en el body lo
     convierte en contenedor de scroll y el header sticky salta a su posición
     estática, así que el menú se abría fuera de pantalla al ir desplazado. */

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label={FOUNDATION_NAME + ', inicio'}>
          <img src="/media/logo.png" width="50" height="50" alt="" />
          <span className="brand-copy">
            <strong>{FOUNDATION_NAME}</strong>
            <small>{FOUNDATION_TAGLINE}</small>
          </span>
        </a>

        <button className="nav-toggle" type="button" aria-controls="primary-nav"
          aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen((v) => !v)}>
          <span>{open ? 'Cerrar' : 'Menú'}</span>
          <span className="nav-toggle-icon" aria-hidden="true"><span></span><span></span></span>
        </button>

        <nav className={'primary-nav' + (open ? ' is-open' : '')} id="primary-nav" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <a key={link.key} href={link.href}
              aria-current={active === link.key ? 'page' : undefined}
              onClick={() => setOpen(false)}>{link.name}</a>
          ))}
          <a className="nav-instagram" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            <IconInstagram size={17} /> Instagram
          </a>
          <a className="nav-donate" href="/donar"
            onClick={() => { trackEvent('donation_start', { placement: 'navbar' }); setOpen(false); }}>
            Donar
          </a>
        </nav>
      </div>
    </header>
  );
};

/* ============================================================
   FOOTER
   ============================================================ */

const Footer = () => (
  <footer className="site-footer">
    <div className="wrap">
      <div className="footer-grid">
        <div>
          <a className="footer-brand" href="/">
            <img src="/media/logo.png" width="54" height="54" alt="" />
            <span>
              <strong>{FOUNDATION_SHORT}</strong>
              <small>{FOUNDATION_TAGLINE}</small>
            </span>
          </a>
          <p className="footer-blurb">
            {SLOGAN} Rescatamos, rehabilitamos y buscamos familias responsables para gatos en
            situación de abandono, y promovemos la tenencia responsable desde temprana edad.
          </p>
        </div>

        <div>
          <p className="footer-heading">En este sitio</p>
          <nav className="footer-links" aria-label="Enlaces del pie de página">
            {navLinks.map((link) => (
              <a key={link.key} href={link.href}>{link.name}</a>
            ))}
            <a href="/donar">Donar</a>
          </nav>
        </div>

        <div>
          <p className="footer-heading">Escríbenos</p>
          <div className="footer-contact">
            <a href={'mailto:' + CONTACT_EMAIL}
              onClick={() => trackEvent('contact_start', { placement: 'footer', method: 'email' })}>
              <IconMail size={16} /> {CONTACT_EMAIL}
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              <IconInstagram size={16} /> {INSTAGRAM_HANDLE}
            </a>
            <a href={INSTAGRAM_EDUCA_URL} target="_blank" rel="noreferrer">
              <IconBook size={16} /> {INSTAGRAM_EDUCA_HANDLE}
            </a>
            <p><IconPin size={16} /> {FOUNDATION_TAGLINE}</p>
          </div>
        </div>

        <div>
          <p className="footer-heading">Donar</p>
          <p className="footer-donation">
            <strong>Banco Santander</strong><br />
            Cuenta corriente {TRANSFERENCIA[4].value}<br />
            {FOUNDATION_NAME}<br />
            RUT {RUT_ONG}<br />
            Comprobantes a {CONTACT_EMAIL}
            <a className="footer-donate-link" href="/donar"
              onClick={() => trackEvent('donation_start', { placement: 'footer' })}>
              Ver formas de aportar
            </a>
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="legal-line">
          © {new Date().getFullYear()} {FOUNDATION_NAME} · Personalidad jurídica vigente · Reg. N° {REG_NUM}
        </p>
        <a href="https://fundacioncloe.com" target="_blank" rel="noreferrer" className="cloe-credit">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 207 207" aria-hidden="true">
            <path d="M 98.112 22.581 C 85.376 26.006, 73.852 34.909, 65.765 47.573 C 60.760 55.410, 58.004 61.973, 54.933 73.371 C 53.038 80.404, 52.974 81.402, 54.329 82.757 C 56.961 85.390, 58.556 83.456, 60.847 74.854 C 67.547 49.692, 81.463 33.501, 100.693 28.492 C 116.252 24.439, 145.475 30.082, 152.936 38.580 C 155.706 41.735, 159 50.146, 159 54.065 C 159 58.567, 170.457 65.493, 187.982 71.588 C 193.952 73.664, 197.622 75.485, 197.828 76.473 C 198.101 77.783, 197.470 77.939, 194.083 77.397 C 186.236 76.142, 185.013 81.836, 192.729 83.705 C 196.379 84.589, 196.490 84.745, 196.180 88.559 C 195.738 94.012, 192.918 99.978, 188.438 104.937 C 182.265 111.770, 181.366 112, 160.800 112.004 C 140.168 112.008, 137.812 112.663, 134.680 119.262 C 127.589 134.205, 127.975 158.464, 135.580 175.750 C 137.935 181.103, 139.777 182.178, 142 179.499 C 143.010 178.283, 142.846 177.069, 141.130 173.082 C 137.748 165.218, 136.031 156.195, 136.015 146.197 C 135.996 134.625, 138.381 123.528, 141.572 120.337 C 143.858 118.051, 144.325 118, 162.974 118 C 181.282 118, 182.188 117.906, 185.775 115.642 C 194.351 110.228, 201.230 99.466, 202.485 89.500 C 202.831 86.750, 203.586 82.355, 204.161 79.732 C 205.995 71.382, 205.470 70.770, 192.898 66.599 C 180.620 62.526, 169.378 57.236, 166.891 54.360 C 166.006 53.337, 164.747 50.302, 164.093 47.616 C 161.332 36.277, 156.961 31.286, 146.146 27.121 C 130.752 21.193, 110.419 19.271, 98.112 22.581 M 104.030 71.463 C 103.118 72.563, 103.222 74.767, 104.491 81.192 C 107.026 94.034, 107.528 114.233, 105.480 121 C 102.977 129.274, 103.031 132.433, 105.682 132.811 C 112.116 133.727, 115.233 108.567, 111.544 85.500 C 109.557 73.074, 109.294 72.228, 107.037 71.020 C 105.721 70.316, 104.880 70.440, 104.030 71.463 M 43.449 88.027 C 23.174 98.692, 6.001 118.178, 3.019 133.900 C 1.722 140.740, 1.692 163.059, 2.975 166.435 C 3.988 169.098, 7.898 170.098, 8.116 167.750 C 8.180 167.063, 8.293 159.277, 8.366 150.448 L 8.500 134.396 12.402 126.501 C 15.323 120.590, 18.339 116.550, 24.402 110.425 C 31.677 103.076, 45.243 93, 47.864 93 C 49.539 93, 50.260 101.317, 48.997 106.071 C 48.350 108.507, 46.440 113.028, 44.753 116.117 C 41.410 122.237, 41.545 125.357, 45.128 124.820 C 46.564 124.605, 48.467 122.368, 50.927 118 L 54.589 111.500 60.371 111.198 C 71.018 110.641, 76.120 114.731, 81.914 128.465 C 85.645 137.309, 87.608 139.160, 93.895 139.764 C 98.736 140.229, 98.984 140.399, 99.598 143.671 C 99.951 145.553, 100.035 149.566, 99.784 152.588 C 99.028 161.702, 94.189 166.444, 83.989 168.066 C 72.815 169.841, 63.520 175.844, 58.391 184.596 C 55.502 189.525, 55.784 192.027, 59.219 191.946 C 60.814 191.908, 62.402 190.480, 64.500 187.196 C 68.324 181.210, 75.416 176.464, 82.758 174.977 C 100.020 171.481, 106 164.803, 106 149.023 C 106 137.763, 103.746 134, 97 134 C 92.043 134, 90.417 132.511, 87.549 125.345 C 81.790 110.961, 74.393 105, 62.304 105 L 56 105 56 100.659 C 56 93.081, 52.858 85.086, 49.852 85.015 C 49.495 85.007, 46.614 86.362, 43.449 88.027" stroke="none" fill="currentColor" fillRule="evenodd" />
          </svg>
          <span className="font-medium">Sitio web donado por Fundación Cloe</span>
        </a>
      </div>
    </div>
  </footer>
);

/* ============================================================
   EXPORTS
   ============================================================ */

initSeo();

window.SiteConfig = {
  FOUNDATION_NAME, FOUNDATION_SHORT, FOUNDATION_TAGLINE, SLOGAN,
  CONTACT_EMAIL, INSTAGRAM_URL, INSTAGRAM_HANDLE, INSTAGRAM_EDUCA_URL, INSTAGRAM_EDUCA_HANDLE,
  RUT_ONG, REG_NUM, BASE_URL, GA_ID,
  PETFI_FOUNDATION_ID, PETFI_SPECIES, PETFI_PROFILE_URL,
  FORMSPREE, TRANSFERENCIA, GUARDIANES, navLinks
};

window.SharedComponents = {
  Navbar, Footer, Icon,
  IconInstagram, IconMail, IconPin, IconArrow, IconCheck, IconHeart, IconPaw, IconRoute, IconBook,
  trackEvent
};
