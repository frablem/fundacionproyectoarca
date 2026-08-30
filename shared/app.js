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

    const shape = (rows) => {
      let out = rows.slice();
      if (filterRef.current) out = out.filter(filterRef.current);
      if (sortRef.current) out.sort(sortRef.current);
      if (max) out = out.slice(0, max);
      return out;
    };

    const publish = (rows) => {
      if (cancelled) return;
      setData(shape(rows));
      setLoading(false);
    };

    const timeout = window.setTimeout(() => {
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
          fb.onSnapshot(
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

      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('rest ' + res.status))))
        .then((json) => publish((json.documents || []).map(unwrapDoc)))
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
          fetch(url)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('rest'))))
            .then((json) => publish((json.documents || []).map(unwrapDoc)))
            .catch(viaSdk);
        } else publish([]);
      }
    }, { once: true });

    return () => { cancelled = true; window.clearTimeout(timeout); };
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
    <div className="network-map" role="img" aria-label="Conexión entre Santiago, La Serena y Coquimbo">
      <svg viewBox="0 0 360 260" preserveAspectRatio="none">
        <path className="route-line-ghost" d="M74 35 C128 65, 215 63, 274 107 S308 198, 208 218" />
        <path className="route-line" d="M74 35 C128 65, 215 63, 274 107 S308 198, 208 218" />
        <circle className="route-node" cx="74" cy="35" r="8" />
        <circle className="node-core" cx="74" cy="35" r="3" />
        <circle className="route-node" cx="274" cy="107" r="8" />
        <circle className="node-core" cx="274" cy="107" r="3" />
        <circle className="route-node" cx="208" cy="218" r="8" />
        <circle className="node-core" cx="208" cy="218" r="3" />
        <text x="91" y="31">Santiago</text>
        <text x="287" y="103">La Serena</text>
        <text x="220" y="238">Coquimbo</text>
        <text className="map-caption" x="38" y="73">rescate</text>
        <text className="map-caption" x="298" y="152">cuidado</text>
        <text className="map-caption" x="122" y="213">familias</text>
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

/* Nombres de los gatos disponibles, para el selector del formulario de adopción.
   Las fichas del sitio las pinta el widget de Petfi y su markup vive en Shadow DOM,
   así que no se puede leer desde ahí. Esta lectura es solo para llenar un <select>:
   no dibuja tarjetas ni reemplaza al widget. Si falla, el campo pasa a texto libre. */
const usePetfiAnimals = () => {
  const [names, setNames] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    const cfg = window.SiteConfig;
    const url = 'https://petfi.io/api/foundation/' + cfg.PETFI_FOUNDATION_ID +
      '/rescues?limit=200&species=' + cfg.PETFI_SPECIES;

    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('petfi ' + res.status))))
      .then((json) => {
        if (cancelled) return;
        const list = (json.items || [])
          .map((it) => it.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'es'));
        setNames(list);
        setState(list.length ? 'ready' : 'empty');
      })
      .catch(() => { if (!cancelled) setState('error'); });

    return () => { cancelled = true; };
  }, []);

  return { names, state };
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

/* ============================================================
   Socios Guardianes FPA 365
   ============================================================ */

const SociosGuardianes = ({ compact }) => {
  const { GUARDIANES, CONTACT_EMAIL } = window.SiteConfig;
  const { trackEvent } = window.SharedComponents;

  return (
    <section className="section guardians" id="socios-guardianes" aria-labelledby="guardianes-title">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="section-label"><span className="eyebrow-dot" aria-hidden="true"></span>Socios Guardianes FPA 365</p>
            <h2 id="guardianes-title">Una comunidad que está ahí los 365 días.</h2>
          </div>
          <p>
            No podemos rescatar solas. Un aporte mensual convierte la urgencia en un plan: sabemos
            con cuánto contamos cada mes y podemos decir que sí a más gatos.
          </p>
        </div>

        <div className="guardian-grid">
          {GUARDIANES.map((g) => (
            <article key={g.tier} className={'guardian-card reveal' + (g.featured ? ' guardian-card--featured' : '')}>
              <p className="guardian-tier">
                <span className="guardian-dot" style={{ background: g.color }} aria-hidden="true"></span>
                {g.tier}
              </p>
              <p className="guardian-amount">{g.amount}<small>al mes</small></p>
              <p>{g.copy}</p>
              <a className={'button ' + (g.featured ? 'button--yellow' : 'button--outline')}
                href={'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Quiero ser ' + g.tier + ' — FPA 365')}
                onClick={() => trackEvent('donation_start', { placement: 'guardianes', method: 'fpa365', tier: g.tier })}>
                Quiero ser {g.tier.replace('Guardián ', '')}
              </a>
            </article>
          ))}
        </div>

        {!compact ? (
          <div className="guardians-pending reveal">
            <strong>Suscripción en línea, muy pronto</strong>
            <p>
              Estamos terminando de habilitar el pago mensual automático. Mientras tanto, escríbenos
              y coordinamos tu aporte contigo. Cada Guardián cuenta desde el primer mes.
            </p>
          </div>
        ) : null}
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
    const events = { adopcion: 'adoption_start', hogar_temporal: 'volunteer_start', contacto: 'contact_start' };
    trackEvent(events[tipo] || 'contact_start', { placement: 'form', form_type: tipo });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

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

    const form = event.target;
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
    <form className="form-card" onSubmit={submit} onFocus={noteStart} noValidate>
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
  fmtAge, fmtDate, parseCategories, stripHtml, sanitize,
  Cargando, EstadoVacio, SectionHead,
  MapaCuidado, FranjaCiudades, AvisoTraslado,
  PetfiRescues, usePetfiAnimals, ValorCopiable, HojaTransferencia, SociosGuardianes,
  FormspreeForm, Field, TextArea, Check, CierreCTA
};
