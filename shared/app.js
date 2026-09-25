/* Fundación Proyecto Arca — componentes y hooks compartidos */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ============================================================
   useReveal — aparición al hacer scroll
   Observa también los nodos que llegan después de Firestore.
   ============================================================ */

const useReveal = () => {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    const sweep = () => {
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
        // Si ya está dentro del viewport al montar, revelar de inmediato.
        if (el.getBoundingClientRect().top < window.innerHeight * 0.94) el.classList.add('in');
        else observer.observe(el);
      });
    };

    sweep();
    const mutation = new MutationObserver(sweep);
    mutation.observe(document.body, { childList: true, subtree: true });
    const timers = [300, 900, 2000, 4000].map((ms) => window.setTimeout(sweep, ms));

    // Red de seguridad: pase lo que pase con el observer, a los 12 s nada
    // queda invisible. Un .reveal atascado en opacity:0 es contenido perdido.
    const finalSweep = window.setTimeout(() => {
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => el.classList.add('in'));
    }, 12000);

    return () => {
      observer.disconnect();
      mutation.disconnect();
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finalSweep);
    };
  }, []);

  // El navegador busca el #ancla antes de que React pinte la sección, así que
  // un link como /donar/#socios-guardianes quedaba arriba. Se salta al montar.
  useEffect(() => {
    let id = window.location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    const el = id && document.getElementById(id);
    if (el) window.requestAnimationFrame(() => el.scrollIntoView());
  }, []);
};

/* ============================================================
   sanitize — el HTML enriquecido del CMS lo escribe la fundación,
   así que nunca llega crudo a innerHTML. Si DOMPurify no cargara,
   fallamos en cerrado y quitamos todas las etiquetas.
   ============================================================ */

const sanitize = (html) => {
  const raw = String(html == null ? '' : html);
  if (window.DOMPurify && window.DOMPurify.sanitize) {
    return window.DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }
  const el = document.createElement('div');
  el.textContent = raw.replace(/<[^>]*>/g, '');
  return el.innerHTML;
};

/* ============================================================
   useCollection — única vía de lectura del CMS
   REST primero, SDK como respaldo, y resultado vacío a los ~12 s.
   ============================================================ */

const unwrapValue = (field) => {
  if (field === null || field === undefined) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(unwrapValue);
  if ('mapValue' in field) return unwrapFields(field.mapValue.fields || {});
  return null;
};

const unwrapFields = (fields) => {
  const out = {};
  Object.keys(fields).forEach((key) => { out[key] = unwrapValue(fields[key]); });
  return out;
};

const unwrapDoc = (doc) => {
  const parts = (doc.name || '').split('/');
  return Object.assign({ id: parts[parts.length - 1] }, unwrapFields(doc.fields || {}));
};

// Firestore corta cada página por peso, no solo por pageSize. Con fotos en base64,
// Historias llegaba en dos páginas y el sitio mostraba solo la primera.
const fetchAllDocs = (url, pageToken, acc) => {
  const rows = acc || [];
  const pageUrl = pageToken ? url + '&pageToken=' + encodeURIComponent(pageToken) : url;
  return fetch(pageUrl)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('rest ' + res.status))))
    .then((json) => {
      (json.documents || []).forEach((d) => rows.push(unwrapDoc(d)));
      return json.nextPageToken ? fetchAllDocs(url, json.nextPageToken, rows) : rows;
    });
};

const useCollection = (name, options) => {
  const opts = options || {};
  const { filter, sort, max } = opts;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Las funciones llegan inline desde las páginas, así que no van en las deps.
  const filterRef = useRef(filter);
  const sortRef = useRef(sort);
  filterRef.current = filter;
  sortRef.current = sort;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    const shape = (rows) => {
      let out = rows.slice();
      if (filterRef.current) out = out.filter(filterRef.current);
      if (sortRef.current) out.sort(sortRef.current);
      if (max) out = out.slice(0, max);
      return out;
    };

    // La red de seguridad de los 12 s tiene que apagarse en cuanto llegan datos.
    // Si sigue viva, borra la colección ya cargada y la sección se vacía sola
    // delante del visitante.
    let timeout = null;

    const publish = (rows) => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setData(shape(rows));
      setLoading(false);
    };

    timeout = window.setTimeout(() => {
      if (!cancelled) { setData([]); setLoading(false); }
    }, 12000);

    const uid = (window.FBase && window.FBase.FOUNDATION_UID) || window.FOUNDATION_UID_FALLBACK;

    const viaSdk = () => {
      const run = () => {
        const fb = window.FBase;
        if (!fb || cancelled) return;
        try {
          const ref = fb.collection(
            fb.db, 'artifacts', fb.APP_ID, 'users', fb.FOUNDATION_UID, name
          );
          unsubscribe = fb.onSnapshot(
            fb.query(ref),
            (snap) => {
              const rows = [];
              snap.forEach((d) => rows.push(Object.assign({ id: d.id }, d.data())));
              publish(rows);
            },
            () => publish([])
          );
        } catch (err) {
          publish([]);
        }
      };
      if (window.FBase) run();
      else window.addEventListener('fbase-ready', run, { once: true });
    };

    const viaRest = () => {
      if (!uid || uid.indexOf('PLACEHOLDER') === 0) { publish([]); return; }
      const url =
        'https://firestore.googleapis.com/v1/projects/fundacion-cloe/databases/(default)/documents/' +
        'artifacts/fundacion-cloe/users/' + uid + '/' + name + '?pageSize=100';

      fetchAllDocs(url)
        .then(publish)
        .catch(viaSdk);
    };

    // El UID puede llegar con el módulo de Firebase, que es async.
    if (uid) viaRest();
    else window.addEventListener('fbase-ready', () => {
      if (!cancelled) {
        const ready = window.FBase && window.FBase.FOUNDATION_UID;
        if (ready && ready.indexOf('PLACEHOLDER') !== 0) {
          const url =
            'https://firestore.googleapis.com/v1/projects/fundacion-cloe/databases/(default)/documents/' +
            'artifacts/fundacion-cloe/users/' + ready + '/' + name + '?pageSize=100';
          fetchAllDocs(url)
            .then(publish)
            .catch(viaSdk);
        } else publish([]);
      }
    }, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [name, max]);

  return { data, loading };
};

/* Lee un parámetro de la URL para las vistas de detalle. */
const useDocParam = (param) => {
  const [value, setValue] = useState(() => new URLSearchParams(window.location.search).get(param));
  useEffect(() => {
    const onPop = () => setValue(new URLSearchParams(window.location.search).get(param));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [param]);
  return value;
};

/* ============================================================
   Formatos
   ============================================================ */

const fmtAge = (age) => {
  const n = Number(age);
  if (!age && age !== 0) return '';
  if (Number.isNaN(n)) return String(age);
  if (n < 1) return 'Cachorro';
  return n === 1 ? '1 año' : n + ' años';
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
};

const parseCategories = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((c) => String(c).trim()).filter(Boolean);
  return String(value).split(',').map((c) => c.trim()).filter(Boolean);
};

const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* Prefiere cerrar en una oración completa dentro del límite y, si no alcanza,
   recorta en el último espacio razonable. Agrega puntos suspensivos sólo si de
   verdad cortó. */
const resumen = (text, max) => {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);

  const sentenceEnds = /[.!?](?:[»”"')\]]+)?(?=\s|$)/g;
  let sentenceEnd = null;
  let match;
  while ((match = sentenceEnds.exec(cut))) {
    sentenceEnd = match.index + match[0].length;
  }
  if (sentenceEnd) return cut.slice(0, sentenceEnd).trim();

  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:…]+$/, '') + '…';
};

/* ============================================================
   Piezas de interfaz
   ============================================================ */

const Cargando = ({ label }) => (
  <p className="loading-row"><span className="spinner" aria-hidden="true"></span>{label || 'Cargando…'}</p>
);

const EstadoVacio = ({ titulo, children, dark }) => (
  <div className={'state-box' + (dark ? ' state-box--dark' : '')}>
    <h3>{titulo}</h3>
    {children}
  </div>
);

const SectionHead = ({ index, label, title, children, id }) => (
  <div className="section-head reveal">
    <div>
      <p className="section-label">{label}</p>
      <h2 id={id}>{title}</h2>
    </div>
    {children ? <p>{children}</p> : null}
    {index ? <span className="section-index">{index}</span> : null}
  </div>
);

/* Mapa de las tres ciudades. El cliente lo pidió explícitamente para explicar
   que conectan adopciones entre La Serena, Coquimbo y Santiago. */
const MapaCuidado = () => (
  <div className="network-card reveal" aria-label="Red que conecta Santiago, La Serena y Coquimbo">
    <div className="network-card-head">
      <span>Mapa de cuidado</span>
      <span>Territorio en común</span>
    </div>
    <div className="network-map" role="img" aria-label="Mapa de Chile entre Coquimbo y Santiago: La Serena y Coquimbo están juntas en la costa y Santiago a unos 470 km al sur por la Ruta 5">
      {/* Proyección real (lat/lon a escala) desde 29,5° S hasta 33,9° S. */}
      <svg viewBox="0 0 360 260" preserveAspectRatio="xMidYMid meet">
        <defs>
          {[['map-land-fade', 0.08], ['map-coast-fade', 0.4]].map(([id, alpha]) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff39a" stopOpacity="0" />
              <stop offset="0.08" stopColor="#fff39a" stopOpacity={alpha} />
              <stop offset="0.9" stopColor="#fff39a" stopOpacity={alpha} />
              <stop offset="1" stopColor="#fff39a" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[['30', 32.1], ['31', 90.1], ['32', 148.1], ['33', 206.1]].map(([lat, y]) => (
          <g key={lat}>
            <line className="map-grid" x1="0" x2="360" y1={y} y2={y} />
            <text className="map-grid-label" x="356" y={y - 3}>{lat}° S</text>
          </g>
        ))}
        <path className="map-land" d="M143.5 -14.3 L152.4 8.9 L153.8 25.1 L151.9 28.0 L148.9 28.6 L149.4 32.1 L149.4 37.9 L146.9 43.1 L143.0 47.2 L136.6 45.4 L133.6 58.2 L133.1 74.4 L135.6 90.1 L138.0 113.3 L142.0 142.3 L142.0 159.7 L145.4 177.1 L141.5 193.3 L140.5 207.3 L136.1 207.8 L134.6 227.0 L137.1 240.9 L128.2 258.3 L119.8 281.5 L222.0 281.5 L226.9 229.3 L214.6 185.8 L204.7 165.5 L189.9 124.9 L207.1 84.3 L225.9 43.7 L224.4 -14.3 Z" />
        <path className="map-coast" d="M143.5 -14.3 L152.4 8.9 L153.8 25.1 L151.9 28.0 L148.9 28.6 L149.4 32.1 L149.4 37.9 L146.9 43.1 L143.0 47.2 L136.6 45.4 L133.6 58.2 L133.1 74.4 L135.6 90.1 L138.0 113.3 L142.0 142.3 L142.0 159.7 L145.4 177.1 L141.5 193.3 L140.5 207.3 L136.1 207.8 L134.6 227.0 L137.1 240.9 L128.2 258.3 L119.8 281.5" />
        <text className="map-sea" x="72" y="186">Océano</text>
        <text className="map-sea" x="72" y="198">Pacífico</text>
        <path className="route-line-ghost" d="M155.4 26.6 L152.9 29.5 L148.9 42.5 L142.0 58.2 L139.0 75.6 L140.5 101.7 L142.0 124.9 L143.5 142.9 L145.4 159.7 L155.3 174.2 L169.6 196.8 L178.5 214.8 L184.0 232.1" />
        <path className="route-line" d="M155.4 26.6 L152.9 29.5 L148.9 42.5 L142.0 58.2 L139.0 75.6 L140.5 101.7 L142.0 124.9 L143.5 142.9 L145.4 159.7 L155.3 174.2 L169.6 196.8 L178.5 214.8 L184.0 232.1" />
        <text className="map-distance" x="128" y="121">≈ 470 km</text>
        <text className="map-distance-note" x="128" y="132">por Ruta 5</text>
        <circle className="route-node" cx="155.4" cy="26.6" r="3.2" />
        <circle className="route-node" cx="150.7" cy="29.4" r="3.2" />
        <circle className="route-node" cx="184" cy="232.1" r="4.5" />
        <circle className="node-core" cx="184" cy="232.1" r="1.6" />
        <text x="164" y="24">La Serena</text>
        <text className="map-label-west" x="142" y="40">Coquimbo</text>
        <text x="194" y="236">Santiago</text>
      </svg>
    </div>
    <div className="network-card-foot">
      <span><strong>3</strong> ciudades conectadas</span>
      <span>una misma promesa</span>
    </div>
  </div>
);

/* Franja de ciudades bajo el hero. */
const FranjaCiudades = () => (
  <section className="route-strip" aria-label="Ciudades donde trabaja Fundación Proyecto Arca">
    <div className="wrap route-strip-inner">
      <span className="route-strip-intro">Una red, tres ciudades</span>
      <ol className="route-list">
        <li>Santiago</li>
        <li>La Serena</li>
        <li>Coquimbo</li>
      </ol>
    </div>
  </section>
);

/* Aviso de traslado. La fundación acompaña el viaje del gato cuando la familia
   adoptante está en otra de sus ciudades. */
const AvisoTraslado = () => {
  const { IconRoute } = window.SharedComponents;
  return (
    <div className="travel-note reveal">
      <IconRoute size={22} />
      <p>
        <strong>¿Vives en La Serena o Santiago?</strong>
        Si la familia adoptante está en otra de nuestras ciudades, coordinamos con ustedes para que
        su match gatuno llegue hasta su nuevo hogar. La distancia no decide quién recibe ayuda.
      </p>
    </div>
  );
};

/* ============================================================
   Petfi — fichas de adopción
   Petfi es dueño del markup y del diseño de las tarjetas (Shadow DOM).
   Nunca recrear las tarjetas ni inyectarles CSS del sitio.
   ============================================================ */

const PetfiRescues = ({ id, limit }) => {
  const mountId = id || 'petfi-foundation-rescues';
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const start = () => {
      if (cancelled) return;
      if (!window.PetFiFoundationWidget) {
        tries += 1;
        if (tries > 40) { setFailed(true); return; }
        window.setTimeout(start, 150);
        return;
      }
      try {
        window.PetFiFoundationWidget.init({
          target: '#' + mountId,
          foundationId: window.SiteConfig.PETFI_FOUNDATION_ID,
          species: window.SiteConfig.PETFI_SPECIES,
          limit: limit
        });
      } catch (err) {
        setFailed(true);
      }
    };

    start();
    return () => { cancelled = true; };
  }, [mountId, limit]);

  // Los clics ocurren dentro del Shadow DOM de Petfi, así que se escuchan en el
  // contenedor y se registran como referidos, sin tocar el markup del widget.
  useEffect(() => {
    const node = document.getElementById(mountId);
    if (!node) return;
    const onClick = () => {
      window.SharedComponents.trackEvent('petfi_referral_click', {
        placement: mountId.indexOf('home') > -1 ? 'home' : 'adoptar'
      });
    };
    node.addEventListener('click', onClick);
    return () => node.removeEventListener('click', onClick);
  }, [mountId]);

  if (failed) {
    return (
      <EstadoVacio titulo="No pudimos cargar el listado">
        <p>
          Las fichas de adopción se cargan desde Petfi y en este momento no responden. Puedes verlas
          directamente en nuestro perfil de Petfi o escribirnos a {window.SiteConfig.CONTACT_EMAIL}.
        </p>
        <a className="button button--outline" href={window.SiteConfig.PETFI_PROFILE_URL}
          target="_blank" rel="noreferrer"
          onClick={() => window.SharedComponents.trackEvent('petfi_referral_click', { placement: 'fallback' })}>
          Ver en Petfi
        </a>
      </EstadoVacio>
    );
  }

  return <div className="petfi-mount" id={mountId}></div>;
};

/* ============================================================
   Valor copiable — datos de transferencia
   ============================================================ */

const ValorCopiable = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Sin permiso de portapapeles el dato sigue visible y seleccionable.
      setCopied(false);
    }
  };

  return (
    <div className="bank-row">
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        <button type="button" className={'copy-button' + (copied ? ' is-copied' : '')}
          onClick={copy} aria-label={'Copiar ' + label}>
          {copied ? 'Listo' : 'Copiar'}
        </button>
      </dd>
    </div>
  );
};

const HojaTransferencia = ({ titulo, intro }) => {
  const { TRANSFERENCIA, CONTACT_EMAIL } = window.SiteConfig;
  return (
    <div className="bank-sheet reveal">
      <h3>{titulo || 'Transferencia bancaria'}</h3>
      <p className="bank-intro">{intro || 'Todos los aportes son en pesos chilenos. Puedes copiar cada dato con un toque.'}</p>
      <dl className="bank-details">
        {TRANSFERENCIA.map((row) => (
          <ValorCopiable key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
      <a className="bank-receipt" href={'mailto:' + CONTACT_EMAIL + '?subject=Comprobante%20de%20transferencia'}
        onClick={() => window.SharedComponents.trackEvent('donation_start', { placement: 'bank_sheet', method: 'transferencia' })}>
        Enviar comprobante por correo
      </a>
      <p className="bank-footnote">
        Los datos son públicos y cualquiera puede verificarlos: somos una fundación con personalidad
        jurídica vigente, Reg. N° {window.SiteConfig.REG_NUM}.
      </p>
    </div>
  );
};

const EsponsorCard = () => {
  const { ESPONSOR_URL } = window.SiteConfig;
  return (
    <div className="bank-sheet reveal">
      <h3>Aporte mensual con eSponsor</h3>
      <p className="bank-intro">
        Súmate como Socio Guardián FPA 365 con un cobro mensual automático. Elige tu nivel y
        completa la suscripción directamente en eSponsor.
      </p>
      <a className="button" href={ESPONSOR_URL} target="_blank" rel="noreferrer"
        onClick={() => window.SharedComponents.trackEvent('donation_start', { placement: 'bank_sheet_esponsor', method: 'esponsor' })}>
        Ver planes en eSponsor <IconArrow size={16} />
      </a>
    </div>
  );
};

/* ============================================================
   Socios Guardianes FPA 365
   ============================================================ */

const SociosGuardianes = () => {
  const { GUARDIANES, CONTACT_EMAIL } = window.SiteConfig;
  const { trackEvent } = window.SharedComponents;

  /* Cada tramo apunta a la página de planes de eSponsor en cuanto el link exista.
     Mientras el campo siga siendo un marcador, cae a correo sin romper nada:
     basta con pegar la URL en GUARDIANES para que el cobro mensual quede activo. */
  const destino = (g) => {
    const esUrl = typeof g.link === 'string' && g.link.indexOf('http') === 0;
    return esUrl
      ? { href: g.link, externo: true, metodo: 'esponsor' }
      : {
          href: 'mailto:' + CONTACT_EMAIL + '?subject=' +
            encodeURIComponent('Quiero ser ' + g.tier + ' — FPA 365'),
          externo: false,
          metodo: 'email'
        };
  };

  return (
    <section className="section guardians" id="socios-guardianes" aria-labelledby="guardianes-title">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="section-label"><span className="eyebrow-dot" aria-hidden="true"></span>Socios Guardianes FPA 365</p>
            <h2 id="guardianes-title">Una comunidad que está ahí para ellos los 365 días del año.</h2>
          </div>
          <p>
            No podemos rescatar solas. Necesitamos una comunidad. Un aporte mensual convierte la
            urgencia en un plan: sabemos con cuánto contamos cada mes y podemos decir que sí a más gatos.
          </p>
        </div>

        <div className="guardian-grid">
          {GUARDIANES.map((g) => {
            const d = destino(g);
            return (
              <article key={g.tier} className="guardian-card reveal">
                <p className="guardian-tier">
                  <span className="guardian-dot" style={{ background: g.color }} aria-hidden="true"></span>
                  {g.tier}
                </p>
                <p className="guardian-amount">{g.amount}<small>al mes</small></p>
                <p>{g.copy}</p>
                <a className="button button--outline" href={d.href}
                  target={d.externo ? '_blank' : undefined}
                  rel={d.externo ? 'noreferrer' : undefined}
                  onClick={() => trackEvent('donation_start', { placement: 'guardianes', method: d.metodo, tier: g.tier })}>
                  Quiero ser {g.tier.replace('Guardián ', '')}
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ============================================================
   Formspree — formularios con captcha aritmético
   ============================================================ */

const useCaptcha = () => {
  const make = () => ({ a: 1 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) });
  const [nums, setNums] = useState(make);
  return { nums, reset: () => setNums(make()) };
};

const FormspreeForm = ({ formId, tipo, children, submitLabel, successTitle, successText, onSuccess }) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const { nums, reset } = useCaptcha();
  const { trackEvent } = window.SharedComponents;
  const startedRef = useRef(false);

  const noteStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const events = { hogar_temporal: 'volunteer_start', contacto: 'contact_start' };
    trackEvent(events[tipo] || 'contact_start', { placement: 'form', form_type: tipo });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (Number(answer) !== nums.a + nums.b) {
      setError('La suma de verificación no coincide. Inténtalo otra vez.');
      reset();
      setAnswer('');
      return;
    }

    if (!formId || formId.indexOf('PLACEHOLDER') === 0) {
      setError('El envío del formulario aún no está habilitado. Escríbenos a ' +
        window.SiteConfig.CONTACT_EMAIL + ' y te respondemos igual.');
      return;
    }

    setStatus('submitting');

    try {
      const res = await fetch('https://formspree.io/f/' + formId, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (!res.ok) throw new Error('formspree ' + res.status);
      form.reset();
      setStatus('success');
      trackEvent('generate_lead', { form_type: tipo });
      if (onSuccess) onSuccess();
    } catch (err) {
      setStatus('idle');
      setError('No pudimos enviar el formulario. Revisa tu conexión o escríbenos a ' +
        window.SiteConfig.CONTACT_EMAIL + '.');
    }
  };

  if (status === 'success') {
    return (
      <div className="form-success" role="status">
        <h3>{successTitle}</h3>
        <p>{successText}</p>
        <a className="button" href="/">Volver al inicio</a>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={submit} onFocus={noteStart}>
      <input type="hidden" name="_subject" value={'Web Arca — ' + tipo} />
      <input type="text" name="_gotcha" tabIndex="-1" autoComplete="off"
        style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true" />
      {children}

      <fieldset>
        <legend>Verificación</legend>
        <div className="captcha">
          <label htmlFor={'captcha-' + tipo}>¿Cuánto es {nums.a} + {nums.b}? <span className="required-mark">*</span></label>
          <input id={'captcha-' + tipo} type="text" inputMode="numeric" required
            value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" />
        </div>
      </fieldset>

      <div className="form-actions">
        <button className="button" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Enviando…' : (submitLabel || 'Enviar')}
        </button>
        <span className="hint" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          Te respondemos al correo que nos dejes.
        </span>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
};

const Field = ({ id, label, type, name, required, wide, hint, children, ...rest }) => (
  <div className={'field' + (wide ? ' field--wide' : '')}>
    <label htmlFor={id}>{label}{required ? <span className="required-mark"> *</span> : null}</label>
    {children || <input id={id} name={name || id} type={type || 'text'} required={required} {...rest} />}
    {hint ? <span className="hint">{hint}</span> : null}
  </div>
);

const TextArea = ({ id, label, name, required, hint, rows, ...rest }) => (
  <div className="field field--wide">
    <label htmlFor={id}>{label}{required ? <span className="required-mark"> *</span> : null}</label>
    <textarea id={id} name={name || id} required={required} rows={rows || 5} {...rest}></textarea>
    {hint ? <span className="hint">{hint}</span> : null}
  </div>
);

const Check = ({ name, label }) => (
  <label className="check">
    <input type="checkbox" name={name} value="Sí" />
    <span>{label}</span>
  </label>
);

/* ============================================================
   CTA de cierre
   ============================================================ */

const CierreCTA = ({ titulo, texto, acciones }) => (
  <section className="closing-cta on-dark">
    <div className="wrap closing-inner reveal">
      <div>
        <h2>{titulo}</h2>
        {texto ? <p style={{ marginTop: '0.9rem' }}>{texto}</p> : null}
      </div>
      <div className="closing-actions">{acciones}</div>
    </div>
  </section>
);

/* ============================================================
   EXPORTS
   ============================================================ */

window.SharedApp = {
  useReveal, useCollection, useDocParam,
  fmtAge, fmtDate, parseCategories, stripHtml, resumen, sanitize,
  Cargando, EstadoVacio, SectionHead,
  MapaCuidado, FranjaCiudades, AvisoTraslado,
  PetfiRescues, ValorCopiable, HojaTransferencia, EsponsorCard, SociosGuardianes,
  FormspreeForm, Field, TextArea, Check, CierreCTA
};
