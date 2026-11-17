(() => {
  'use strict';
  let canvas=document.querySelector('#shader-canvas');
  const status=document.querySelector('#webgl-status');
  let gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'}), ctx=null;
  let mode=0,speed=1,intensity=.7,time=15,paused=false,enabled=!matchMedia('(prefers-reduced-motion: reduce)').matches,visible=false,last=0,raf=0,lost=false;
  let mouse=[.5,.5],target=[.5,.5];
  const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  const fragment=`
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 mouse;
    uniform float time;
    uniform float intensity;
    uniform int mode;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(8.2,3.7);a*=.5;}return v;}
    vec3 aurora(vec2 uv){
      vec3 col=mix(vec3(.025,.045,.09),vec3(.07,.045,.14),uv.y);
      float x=uv.x*2.8+(mouse.x-.5)*.65;
      float y=uv.y+(mouse.y-.5)*.22;
      for(int i=0;i<5;i++){
        float f=float(i),n=fbm(vec2(x*1.2+f*.4,time*.075+f*1.6));
        float wave=.25+.16*f+.12*sin(x*2.1+time*.18+f)+n*.18;
        float d=y-wave;
        float band=exp(-abs(d)*18.)*(.45+.55*noise(vec2(x*32.+time*.1,f*2.)));
        float curtain=exp(-max(d,0.)*7.)*smoothstep(-.012,.045,d)*.27;
        vec3 hue=mix(vec3(.08,.72,.53),vec3(.40,.20,.78),f/4.);
        col+=hue*(band+curtain)*intensity*.68;
      }
      vec2 starGrid=uv*vec2(140.,95.);vec2 id=floor(starGrid),cell=fract(starGrid)-.5;
      float star=step(.991,hash(id))*exp(-length(cell)*18.);
      col+=star*vec3(.57,.72,.69)*(.65+.35*sin(time*.6+hash(id)*20.));
      float mountain=.08+fbm(vec2(uv.x*4.,1.))* .16;
      col=mix(vec3(.018,.039,.042),col,smoothstep(mountain-.007,mountain+.007,uv.y));
      return col;
    }
    vec3 liquid(vec2 uv){
      vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);p*=3.2;
      float t=time*.28;vec2 q=p+(mouse-.5)*.8;
      for(int i=0;i<4;i++){float f=float(i)+1.;q+=vec2(sin(q.y*f+t+f),cos(q.x*f-t+f))*.26/f;}
      float wave=sin(q.x*7.+q.y*4.+t)*.5+.5;
      float wave2=sin(q.y*8.-q.x*3.-t)*.5+.5;
      float caustic=pow(max(0.,1.-abs(wave-wave2)),18.);
      vec3 color=mix(vec3(.015,.08,.12),vec3(.08,.29,.32),wave*.65);
      color+=vec3(.31,.75,.69)*caustic*intensity*.6;
      color+=vec3(.06,.16,.19)*fbm(q*2.+time*.08);
      return color;
    }
    vec3 terrain(vec2 uv){
      vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.)*3.;p+=(mouse-.5)*.7;
      float n=fbm(p*1.1+vec2(time*.025,0.))+.1*sin(p.x*2.-time*.12);
      float v=fract(n*18.);float line=1.-smoothstep(.015,.08,min(v,1.-v));
      float major=1.-smoothstep(.01,.035,min(fract(n*6.),1.-fract(n*6.)));
      vec3 col=mix(vec3(.022,.052,.05),vec3(.11,.19,.13),n);
      col+=vec3(.5,.62,.35)*(line*.62+major*.35)*intensity;
      vec2 grid=abs(fract(p*3.)-.5);col+=vec3(.035,.055,.035)*(step(.492,grid.x)+step(.492,grid.y));
      return col;
    }
    void main(){vec2 uv=gl_FragCoord.xy/resolution;vec3 color;if(mode==0)color=aurora(uv);else if(mode==1)color=liquid(uv);else color=terrain(uv);float vignette=1.-.55*pow(length((uv-.5)*1.25),1.6);color*=vignette;color+=hash(gl_FragCoord.xy)*.006;gl_FragColor=vec4(pow(max(color,0.),vec3(.85)),1.);}
  `;
  let program,uniforms;
  const stars=Array.from({length:90},(_,i)=>({x:((i*173.71)%997)/997,y:((i*83.19)%983)/983,r:i%7===0?1.1:.6}));
  function initFallback(){
    if(gl){const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;gl=null;}
    ctx=canvas.getContext('2d');if(!ctx){unavailable();return false;}
    document.querySelector('#shader-fallback').hidden=true;
    document.querySelectorAll('.shader-controls button,.shader-controls input').forEach(el=>el.disabled=false);
    resize();return true;
  }
  function drawFallback(){
    if(!ctx)return;const w=canvas.width,h=canvas.height,t=time, mx=(mouse[0]-.5)*w*.22,my=(mouse[1]-.5)*h*.2;
    ctx.clearRect(0,0,w,h);
    if(mode===0){
      const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#111a2a');bg.addColorStop(.55,'#1b1736');bg.addColorStop(1,'#082b2c');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      stars.forEach((s,i)=>{ctx.globalAlpha=.2+(.5+.3*Math.sin(t*.5+i));ctx.fillStyle='#b3d2cb';ctx.fillRect(s.x*w,s.y*h*.84,s.r,s.r);});ctx.globalAlpha=1;
      ctx.globalCompositeOperation='screen';
      for(let layer=0;layer<4;layer++){
        const base=h*(.34+layer*.105);
        for(let j=0;j<80;j++){
          const x=w*j/79;
          const y=base+Math.sin(j*.065+t*.17+layer*.5)*h*.14+Math.cos(j*.13-t*.09)*h*.065+my;
          const length=h*(.16+.08*Math.sin(j*.19+t*.2+layer));
          const g=ctx.createLinearGradient(x,y-length,x,y+14);
          const colors=layer%2===0?'84,216,171':'116,101,213';
          g.addColorStop(0,`rgba(${colors},0)`);g.addColorStop(.7,`rgba(${colors},${intensity*.12})`);g.addColorStop(.91,`rgba(${colors},${intensity*.36})`);g.addColorStop(1,`rgba(${colors},0)`);
          ctx.strokeStyle=g;ctx.lineWidth=w/79+2;ctx.beginPath();ctx.moveTo(x+mx,y-length);ctx.bezierCurveTo(x+mx-7,y-length*.6,x+mx+10,y-12,x+mx+10,y+14);ctx.stroke();
        }
      }
      ctx.globalCompositeOperation='source-over';
      ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h*.87);for(let j=0;j<=80;j++){const x=w*j/80,y=h*.87-Math.sin(j*.21)*h*.023-Math.cos(j*.59)*h*.017;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.closePath();ctx.fillStyle='#091718';ctx.fill();
    }else if(mode===1){
      const bg=ctx.createRadialGradient(w*.4+mx,h*.4+my,10,w*.5,h*.5,w*.8);bg.addColorStop(0,'#144e56');bg.addColorStop(.6,'#0c303e');bg.addColorStop(1,'#071925');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation='screen';
      for(let family=0;family<2;family++)for(let k=-4;k<24;k++){
        ctx.beginPath();for(let j=0;j<=80;j++){const x=j/80*w;let y=k*h/18+Math.sin(j*.11+t*.4+k*.46)*h*.036+Math.cos(j*.18-t*.28+k*.33)*h*.032;let xx=x+mx*.25,yy=y+my*.3;if(family){xx=y*w/h;yy=x*h/w+Math.sin(k+t*.3)*h*.04;}if(j===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}
        ctx.strokeStyle=`rgba(99,212,190,${intensity*(.14+.09*Math.sin(k+t*.15))})`;ctx.lineWidth=1.7;ctx.shadowColor='#79d9c9';ctx.shadowBlur=5;ctx.stroke();
      }ctx.shadowBlur=0;ctx.globalCompositeOperation='source-over';
    }else{
      ctx.fillStyle='#0c1e19';ctx.fillRect(0,0,w,h);
      for(let j=0;j<5;j++){
        const cx=w*(.15+j*.23)+Math.sin(t*.1+j)*w*.025+mx, cy=h*(.25+(j%3)*.23)+my;
        for(let k=0;k<18;k++){
          ctx.beginPath();const r=15+k*11;for(let a=0;a<=110;a++){const angle=a/110*Math.PI*2;const perturb=1+.10*Math.sin(angle*3+j+t*.1)+.06*Math.cos(angle*5+j*2);const x=cx+Math.cos(angle)*r*perturb*1.3,y=cy+Math.sin(angle)*r*perturb*.7;if(a===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle=`rgba(172,194,111,${intensity*(k%4===0?.5:.2)})`;ctx.lineWidth=k%4===0?1:.65;ctx.stroke();
        }
      }
      ctx.strokeStyle='#aac57d12';ctx.lineWidth=.6;for(let x=0;x<w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    }
    const vignette=ctx.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.15,w*.5,h*.5,Math.max(w,h)*.64);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#000a');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function unavailable(message){status.textContent='WEBGL / UNAVAILABLE';document.querySelector('#shader-fallback').hidden=false;document.querySelectorAll('.shader-controls button,.shader-controls input').forEach(el=>el.disabled=true);if(message)console.warn(message);}
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw Error(gl.getShaderInfoLog(s));}return s;}
  function init(){
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['resolution','mouse','time','intensity','mode'].map(k=>[k,gl.getUniformLocation(program,k)]));
    status.textContent='WEBGL / LIVE';document.querySelector('#shader-fallback').hidden=true;document.querySelectorAll('.shader-controls button,.shader-controls input').forEach(el=>el.disabled=false);resize();
  }
  function render(){if(lost)return;if(ctx){drawFallback();return;}if(!program)return;gl.useProgram(program);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.mouse,mouse[0],1-mouse[1]);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.intensity,intensity);gl.uniform1i(uniforms.mode,mode);gl.drawArrays(gl.TRIANGLES,0,6);}
  function tick(now){raf=0;const dt=Math.min((now-last)/1000||.016,.05);last=now;if(!paused&&enabled&&!document.hidden)time+=dt*speed;mouse=mouse.map((v,i)=>v+(target[i]-v)*.08);render();if(visible&&enabled&&!paused&&!document.hidden&&!lost)raf=requestAnimationFrame(tick);}
  function schedule(){if(!raf&&!lost){last=performance.now();raf=requestAnimationFrame(tick);}}
  function resize(){if(lost)return;const r=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,ctx?1:1.35,1000/Math.max(r.width,1));canvas.width=Math.max(1,Math.round(r.width*scale));canvas.height=Math.max(1,Math.round(r.height*scale));if(gl)gl.viewport(0,0,canvas.width,canvas.height);document.querySelector('#shader-resolution').textContent=`${canvas.width} × ${canvas.height}`;render();}
  function updatePause(){const zh=document.documentElement.lang==='zh-CN';const b=document.querySelector('#pause-shader');b.textContent=paused?(zh?'▶ 继续':'▶ RESUME'):(zh?'Ⅱ 暂停':'Ⅱ PAUSE');b.setAttribute('aria-pressed',String(paused));status.textContent=(ctx?'CANVAS':'WEBGL')+((!paused&&enabled)?' / LIVE':' / STILL');}
  if(!gl){if(!initFallback())return;}else{try{init();}catch(e){console.warn('WebGL unavailable; using Canvas fallback.',e.message);if(!initFallback())return;}}
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=Number(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});document.querySelector('#shader-name').textContent=['AURORA','LIQUID','TERRAIN'][mode];render();schedule();}));
  document.querySelector('#speed').addEventListener('input',e=>{speed=Number(e.target.value);document.querySelector('#speed-value').textContent=speed.toFixed(1)+'×';render();});
  document.querySelector('#intensity').addEventListener('input',e=>{intensity=Number(e.target.value);document.querySelector('#intensity-value').textContent=intensity.toFixed(2);render();});
  document.querySelector('#pause-shader').addEventListener('click',()=>{paused=!paused;updatePause();schedule();});
  document.querySelector('#reset-shader').addEventListener('click',()=>{speed=1;intensity=.7;time=15;paused=false;mouse=target=[.5,.5];document.querySelector('#speed').value='1';document.querySelector('#intensity').value='.7';document.querySelector('#speed-value').textContent='1.0×';document.querySelector('#intensity-value').textContent='0.70';document.querySelector('[data-mode="0"]').click();updatePause();schedule();});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();target=[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];if(paused||!enabled){mouse=[...target];render();}});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')target[0]-=.05;if(e.key==='ArrowRight')target[0]+=.05;if(e.key==='ArrowUp')target[1]-=.05;if(e.key==='ArrowDown')target[1]+=.05;target=target.map(v=>Math.max(0,Math.min(1,v)));mouse=[...target];render();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;status.textContent='WEBGL / RECONNECTING';if(raf)cancelAnimationFrame(raf);raf=0;});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;try{init();updatePause();schedule();}catch(e){unavailable(e.message);}});
  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();},{rootMargin:'50px'}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)schedule();});
  window.addEventListener('portfolio-motion',e=>{enabled=e.detail.enabled;updatePause();schedule();});
  window.addEventListener('portfolio-language',updatePause);
  updatePause();
})();
