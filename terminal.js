(() => {
  'use strict';
  const root=document.documentElement,hero=document.querySelector('.hero');
  const presets=[...document.querySelectorAll('[data-light]')],bloom=document.querySelector('#bloom'),output=document.querySelector('#bloom-value'),follow=document.querySelector('#light-follow');
  const get=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
  const set=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
  const colors={polar:['91,202,231','144,176,255'],dusk:['249,177,92','171,119,198'],ember:['243,106,88','123,110,204']};
  const saved=get('cw-light-preset','polar'),savedBloom=Number(get('cw-bloom','1'));
  let preset=Object.hasOwn(colors,saved)?saved:'polar',amount=Number.isFinite(savedBloom)?Math.max(0,Math.min(1.8,savedBloom)):1,tracking=get('cw-light-follow','true')==='true';
  let enabled=!document.body.classList.contains('motion-off'),frame=0,pointer={x:0,y:0};
  function apply(){
    root.style.setProperty('--light-rgb',colors[preset][0]);root.style.setProperty('--light-secondary',colors[preset][1]);root.style.setProperty('--bloom',String(amount));
    presets.forEach(button=>{const active=button.dataset.light===preset;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    bloom.value=String(amount);output.value=amount.toFixed(1)+'×';follow.classList.toggle('active',tracking);follow.setAttribute('aria-pressed',String(tracking));
    document.querySelector('#lighting-readout').textContent='LIGHT / '+preset.toUpperCase();
    if(!tracking)root.style.setProperty('--beam-shift','0px');
    window.dispatchEvent(new CustomEvent('portfolio-lighting',{detail:{preset,bloom:amount,follow:tracking}}));
  }
  presets.forEach(button=>button.addEventListener('click',()=>{preset=button.dataset.light;set('cw-light-preset',preset);apply();}));
  bloom.addEventListener('input',()=>{amount=Number(bloom.value);set('cw-bloom',String(amount));apply();});
  follow.addEventListener('click',()=>{tracking=!tracking;set('cw-light-follow',String(tracking));apply();});
  function sendPointer(){frame=0;if(!enabled||!tracking)return;root.style.setProperty('--beam-shift',pointer.x*22+'px');window.dispatchEvent(new CustomEvent('portfolio-light-pointer',{detail:pointer}));}
  hero.addEventListener('pointermove',event=>{if(!enabled||!tracking)return;const r=hero.getBoundingClientRect();pointer={x:Math.max(-.8,Math.min(.8,(event.clientX-r.left)/r.width*1.6-.8)),y:Math.max(-.6,Math.min(.6,(event.clientY-r.top)/r.height*1.2-.6))};if(!frame)frame=requestAnimationFrame(sendPointer);},{passive:true});
  hero.addEventListener('pointerleave',()=>{pointer={x:0,y:0};if(!frame)frame=requestAnimationFrame(sendPointer);});
  window.addEventListener('portfolio-motion',event=>{enabled=event.detail.enabled;if(!enabled){if(frame)cancelAnimationFrame(frame);frame=0;root.style.setProperty('--beam-shift','0px');}});
  apply();
})();
