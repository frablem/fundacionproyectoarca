/* Shared form delivery. Recipients and secrets are configured on the server. */
(function () {
  'use strict';
  const h=React.createElement;
  const preview=location.hostname.endsWith('.pages.dev') || ['localhost','127.0.0.1'].includes(location.hostname);
  const base=preview?'https://fundacioncloe-forms-preview.contact-13c.workers.dev':'https://fundacioncloe-forms-production.contact-13c.workers.dev';
  let turnstileScript;
  function loadTurnstile() {
    if(window.turnstile) return Promise.resolve(window.turnstile);
    if(!turnstileScript) turnstileScript=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.onload=()=>resolve(window.turnstile);
      script.onerror=()=>{turnstileScript=null;script.remove();reject(new Error('No pudimos cargar la verificación. Revisa tu conexión y recarga la página.'));};
      document.head.appendChild(script);
    });
    return turnstileScript;
  }
  function useForm(id) {
    const [token,setToken]=React.useState('');
    const [error,setError]=React.useState('');
    const [result,setResult]=React.useState(null);
    const [epoch,setEpoch]=React.useState(0);
    const busy=React.useRef(false),attempt=React.useRef(null);
    const reset=()=>{setToken('');setEpoch(n=>n+1);};
    async function submit(form) {
      if(busy.current) return null;
      if(!token){setError('Completa la verificación de seguridad antes de enviar.');return null;}
      busy.current=true;setError('');
      const fields={},data=new FormData(form);
      const honeypot=String(data.get('_gotcha')||'');
      for(const [key,value] of data.entries()) {
        if(key.startsWith('_')||key==='cf-turnstile-response') continue;
        if(typeof value!=='string') continue;
        (fields[key]||(fields[key]=[])).push(value);
      }
      const signature=JSON.stringify({id,fields});
      if(attempt.current?.signature!==signature) attempt.current={signature,id:crypto.randomUUID()};
      try {
        const response=await fetch(base+'/forms/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:attempt.current.id,fields,honeypot,token}),signal:AbortSignal.timeout(30000)});
        const value=await response.json();
        if(!response.ok||!value.ok) throw new Error(value.error||'No pudimos enviar el formulario. Inténtalo nuevamente.');
        setResult(value);return value;
      } catch(err){setError(err.name==='TimeoutError'?'El envío está demorando. Tus respuestas siguen aquí. Puedes reintentar sin duplicar el mensaje.':(err instanceof TypeError?'Revisa tu conexión e inténtalo de nuevo. Tus respuestas siguen aquí.':err.message));return null;}
      finally {busy.current=false;reset();}
    }
    return {id,token,setToken,error,setError,result,epoch,reset,submit,preview};
  }
  function Security({form}) {
    const container=React.useRef(null);
    const [compact,setCompact]=React.useState(false);
    React.useEffect(()=>{
      const observer=new ResizeObserver(entries=>setCompact(entries[0].contentRect.width<300));
      if(container.current)observer.observe(container.current);
      return ()=>observer.disconnect();
    },[]);
    React.useEffect(()=>{
      let active=true,widget;
      form.setToken('');
      Promise.all([loadTurnstile(),fetch(base+'/forms/'+form.id).then(async r=>{if(!r.ok)throw new Error('El formulario no está disponible. Escríbenos por correo.');return r.json();})]).then(([api,config])=>{
        if(!active) return;
        widget=api.render(container.current,{sitekey:config.sitekey,action:form.id,language:'es',size:compact?'compact':'flexible',theme:'light',callback:form.setToken,'expired-callback':()=>form.setToken(''),'error-callback':()=>{form.setToken('');form.setError('La verificación falló. Revisa tu conexión o recarga la página.');}});
      }).catch(err=>{if(active)form.setError(err.message);});
      return ()=>{active=false;if(widget!==undefined&&window.turnstile)window.turnstile.remove(widget);};
    },[form.id,form.epoch,compact]);
    return h('div',{style:{margin:'20px 0',maxWidth:'100%'}},
      form.preview?h('p',{role:'status',style:{fontSize:'14px',fontWeight:600,marginBottom:'12px',color:'#44403c'}},'Modo de prueba: este formulario no enviará correos.'):null,
      h('div',{ref:container,style:{width:'100%',maxWidth:'100%'}}),
      form.error?h('p',{role:'alert',style:{color:'#b91c1c',fontSize:'14px',marginTop:'10px',overflowWrap:'anywhere'}},form.error):null);
  }
  function Preview({form}) {
    if(!form.result?.preview) return null;
    const message=form.result.notification;
    return h('div',{role:'status',style:{textAlign:'left',margin:'20px 0',padding:'18px',border:'1px solid #d6d3d1',borderRadius:'12px',background:'#fff'}},
      h('strong',null,'Prueba completada. No se envió ningún correo.'),
      message?h('details',{style:{marginTop:'12px'}},h('summary',{style:{cursor:'pointer'}},'Ver el correo en español'),h('p',null,message.subject),h('iframe',{title:'Vista previa del correo',sandbox:'',srcDoc:message.html,style:{width:'100%',height:'500px',border:0,marginTop:'10px'}})):null);
  }
  window.CloeForms={useForm,Security,Preview};
})();
