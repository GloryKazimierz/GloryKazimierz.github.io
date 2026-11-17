(() => {
  'use strict';
  const canvas=document.querySelector('#crystal'),ctx=canvas.getContext('2d'),wrap=document.querySelector('#scene-wrap');
  const rotationOutput=document.querySelector('#rotation');
  const palettes={polar:{key:[221,244,255],glow:[91,202,231],fill:[108,132,225]},dusk:{key:[255,228,184],glow:[249,177,92],fill:[171,119,198]},ember:{key:[255,211,193],glow:[243,106,88],fill:[123,110,204]}};
  let settings={preset:'polar',bloom:1,follow:true},color={...palettes.polar};
  let enabled=!matchMedia('(prefers-reduced-motion: reduce)').matches,visible=true,width=600,height=600,dpr=1;
  let yaw=.42,pitch=-.11,targetYaw=yaw,targetPitch=pitch,time=0,last=0,raf=0,dragging=false,moved=false,px=0,py=0,pulse=0;
  let mouseX=0,mouseY=0,lightX=0,lightY=0,targetLightX=0,targetLightY=0;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
  const rgba=(c,a=1)=>'rgba('+c.map(v=>Math.max(0,Math.min(255,v))|0).join(',')+','+a+')';
  function rotate(p,y,x,z=0){let[a,b,c]=p,t=a*Math.cos(z)-b*Math.sin(z);b=a*Math.sin(z)+b*Math.cos(z);a=t;t=a*Math.cos(y)+c*Math.sin(y);c=-a*Math.sin(y)+c*Math.cos(y);a=t;t=b*Math.cos(x)-c*Math.sin(x);c=b*Math.sin(x)+c*Math.cos(x);return[a,t,c];}
  function crystal(scale,offset,tilt,twist,variant){
    const vertices=[[.08,2.1,.04],[.02,-1.72,-.04]],faces=[];
    for(let i=0;i<6;i++){const a=i*Math.PI/3;vertices.push([Math.cos(a)*.56,.62,Math.sin(a)*.56]);}
    for(let i=0;i<6;i++){const a=i*Math.PI/3;vertices.push([Math.cos(a)*.59,-.78,Math.sin(a)*.59]);}
    for(let i=0;i<6;i++){const j=(i+1)%6;faces.push([0,2+i,2+j],[2+i,8+i,8+j],[2+i,8+j,2+j],[1,8+j,8+i]);}
    return{vertices:vertices.map(p=>rotate(p.map(v=>v*scale),twist,0,tilt).map((v,i)=>v+offset[i])),faces,variant};
  }
  const meshes=[crystal(1,[0,.10,0],-.15,.1,0),crystal(.66,[-.83,-.42,.12],-.65,.8,1),crystal(.57,[.77,-.48,.13],.58,.5,2),crystal(.35,[.17,-.87,.65],.28,1.1,1)];
  const satellites=Array.from({length:9},(_,i)=>({phase:i*2.399,r:1.6+(i%4)*.13,y:(i%5-2)*.5,scale:.04+(i%3)*.015}));
  function project(p){const f=6/Math.max(1,6+p[2]),s=Math.min(width,height)*.184;return[width*.51+p[0]*s*f,height*.47-p[1]*s*f,p[2]];}
  function line(a,b,col,lw=1){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();}
  function ellipse(cx,cy,rx,ry,col,lw=1){ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();}
  function path(v){ctx.beginPath();v.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
  function hull(points){const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const lo=[],hi=[];for(const v of p){while(lo.length>1&&turn(lo.at(-2),lo.at(-1),v)<=0)lo.pop();lo.push(v);}for(let i=p.length-1;i>=0;i--){const v=p[i];while(hi.length>1&&turn(hi.at(-2),hi.at(-1),v)<=0)hi.pop();hi.push(v);}return lo.slice(0,-1).concat(hi.slice(0,-1));}
  function glowAt(x,y,r,c,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(c,alpha));g.addColorStop(.3,rgba(c,alpha*.4));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const s=Math.min(width,height),cx=width*.51,cy=height*.47,floor=-2.12,bloom=settings.bloom;
    const lp=[-3.4+lightX*5.5,4.6-lightY*2.6,-3.5];
    const floorPoint=project([0,floor,0]),fy=floorPoint[1];
    glowAt(cx-35+lightX*50,cy-15,s*.58,color.glow,.075+bloom*.035);
    glowAt(cx,fy-5,s*.40,color.glow,.055+bloom*.02);
    // Broad translucent shafts share the specimen's movable key light.
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){const start=[cx-s*.55+lightX*s*.3+i*25,-s*.15],end=[cx+s*.10+lightX*s*.18+i*30,fy+20];const g=ctx.createLinearGradient(...start,...end);g.addColorStop(0,rgba(color.key,.035*bloom));g.addColorStop(.7,rgba(color.glow,.025*bloom));g.addColorStop(1,rgba(color.glow,0));path([start,[start[0]+s*.13,start[1]],[end[0]+s*.19,end[1]],end]);ctx.fillStyle=g;ctx.fill();}
    ctx.restore();
    for(let k=-5;k<=5;k++)line(project([k*.55,floor,-1.1]),project([k*.55,floor,2.7]),rgba(color.fill,.09),.6);
    for(let k=0;k<6;k++)line(project([-3,floor,-1.1+k*.65]),project([3,floor,-1.1+k*.65]),rgba(color.fill,.075),.6);
    [1,.78,.54].forEach((r,i)=>ellipse(cx,fy,s*.37*r,s*.065*r,rgba(color.glow,i===1?.30:.16),.7));
    const floating=enabled?Math.sin(time*.65)*.055:0,all=[],world=[];
    meshes.forEach((mesh,mi)=>{
      const expansion=1+pulse*.17;
      const verts=mesh.vertices.map(p=>rotate([p[0]*expansion,p[1]+floating,p[2]*expansion],yaw,pitch));world.push(verts);
      const origin=verts.reduce((a,b)=>a.map((x,i)=>x+b[i]/verts.length),[0,0,0]);
      mesh.faces.forEach((f,fi)=>{
        const v=f.map(i=>verts[i]),center=v.reduce((a,b)=>a.map((x,i)=>x+b[i]/3),[0,0,0]);
        let n=norm(cross(sub(v[1],v[0]),sub(v[2],v[0])));if(dot(n,sub(center,origin))<0)n=n.map(x=>-x);
        const l=norm(sub(lp,center)),eye=norm(sub([0,0,-6],center)),half=norm(l.map((v,i)=>v+eye[i]));
        const diffuse=Math.max(0,dot(n,l)),spec=Math.pow(Math.max(0,dot(n,half)),27),rim=Math.pow(1-Math.max(0,dot(n,eye)),3);
        const fill=Math.max(0,dot(n,norm([.8,.2,-.5]))),back=n[2]>0?.55:1;
        const rgb=color.key.map((v,i)=>([14,23,31][i]+v*diffuse*.69+color.fill[i]*fill*.16+v*spec*.9+color.glow[i]*rim*.09)*back+(fi%7===0?5:0));
        all.push({world:v,v:v.map(project),depth:center[2],rgb,n,fi,mi,spec,diffuse});
      });
    });
    all.sort((a,b)=>b.depth-a.depth);
    // Project mesh vertices from the key light onto a floor plane.
    ctx.save();ctx.filter='blur(9px)';
    world.forEach(verts=>{const shadow=verts.map(v=>{const t=(floor-lp[1])/(v[1]-lp[1]);return project([lp[0]+(v[0]-lp[0])*t,floor,lp[2]+(v[2]-lp[2])*t]);});path(hull(shadow));ctx.fillStyle='rgba(0,4,9,.40)';ctx.fill();});
    ctx.restore();
    // A faint planar reflection anchors the floating specimen.
    ctx.save();ctx.globalAlpha=.10;
    all.forEach(face=>{path(face.world.map(v=>project([v[0],floor*2-v[1],v[2]])));ctx.fillStyle=rgba(face.rgb);ctx.fill();});ctx.restore();
    const mask=ctx.createLinearGradient(0,fy,0,height);mask.addColorStop(0,'rgba(16,22,27,0)');mask.addColorStop(1,'rgba(16,22,27,.7)');ctx.fillStyle=mask;ctx.fillRect(0,fy,width,Math.max(0,height-fy));
    if(bloom>0){ctx.save();ctx.filter='blur('+(14+bloom*7)+'px)';ctx.globalCompositeOperation='screen';world.forEach(v=>{path(hull(v.map(project)));ctx.fillStyle=rgba(color.glow,.10*bloom);ctx.fill();});ctx.restore();}
    all.forEach(face=>{
      const{v,rgb,n,fi,spec,diffuse}=face;
      path(v);const g=ctx.createLinearGradient(v[0][0],v[0][1],v[2][0]+20,v[2][1]+20);g.addColorStop(0,rgba(rgb.map(x=>x+7)));g.addColorStop(1,rgba(rgb.map(x=>x-9)));ctx.fillStyle=g;ctx.fill();
      ctx.strokeStyle=rgba(color.key,.07+diffuse*.10);ctx.lineWidth=.65;ctx.stroke();
      if(n[2]<.3&&fi%4===0){ctx.save();ctx.shadowColor=rgba(color.glow,.7);ctx.shadowBlur=6*bloom;line(v[0],v[1],rgba(color.key,.24+diffuse*.34+spec*.25),.85);ctx.restore();}
      if(n[2]<0&&fi%7===0){const a=v[0].map((x,i)=>x*.68+v[1][i]*.32),b=v[0].map((x,i)=>x*.32+v[2][i]*.68);line(a,b,rgba(color.glow,.19),.55);}
    });
    const tip=project(world[0][0]);if(bloom>0){ctx.save();ctx.globalCompositeOperation='screen';glowAt(tip[0],tip[1],s*.085,color.key,.20*bloom);line([tip[0]-13*bloom,tip[1]],[tip[0]+13*bloom,tip[1]],rgba(color.key,.22*bloom),.6);ctx.restore();}
    satellites.forEach((sat,i)=>{const a=sat.phase+time*.075,p=project(rotate([Math.cos(a)*sat.r,sat.y+Math.sin(time*.7+i)*.07,Math.sin(a)*sat.r*.5],yaw*.25,pitch*.2)),k=s*sat.scale*.15;path([[p[0],p[1]-k*2],[p[0]+k,p[1]],[p[0],p[1]+k*1.4],[p[0]-k*.5,p[1]]]);ctx.fillStyle=rgba(i%3?color.glow:color.key,i%3?.35:.62);ctx.fill();});
    for(let i=0;i<37;i++){const x=((i*83.37+Math.sin(time*.13+i)*8)%width),y=((i*47.19-time*(1+i%3)+height*100)%height),a=(.04+(i%6)*.025)*Math.min(1,bloom+.2);ctx.fillStyle=rgba(color.key,a);ctx.fillRect(x,y,i%9===0?1.7:.8,i%9===0?1.7:.8);}
    for(let i=0;i<48;i++){const a=i*Math.PI/24;line([cx+Math.cos(a)*s*.38,fy+Math.sin(a)*s*.067],[cx+Math.cos(a)*(s*.38+4),fy+Math.sin(a)*(s*.067+1)],rgba(color.glow,.24),.6);}
    const ring=time*.22;ctx.fillStyle=rgba(color.key,.8);ctx.fillRect(cx+Math.cos(ring)*s*.288-2,fy+Math.sin(ring)*s*.051-2,4,4);
    const bx=cx-s*.25,by=cy-s*.38,bw=s*.5,bh=s*.73;
    [[bx,by,1,1],[bx+bw,by,-1,1],[bx,by+bh,1,-1],[bx+bw,by+bh,-1,-1]].forEach(([x,y,a,b])=>{line([x,y+b*11],[x,y],rgba(color.glow,.3),.65);line([x,y],[x+a*11,y],rgba(color.glow,.3),.65);});
    if(enabled){const sy=by+((time*.08)%1)*bh;line([bx-15,sy],[bx+bw+15,sy],rgba(color.glow,.07),.6);}
    if(pulse>.01)ellipse(cx,cy,s*(1-pulse)*.58+20,s*(1-pulse)*.23+8,rgba(color.key,pulse*.6),1);
    rotationOutput.textContent=(((yaw*180/Math.PI)%360+360)%360).toFixed(1).padStart(5,'0')+'°';
  }
  function tick(now){
    raf=0;const dt=Math.min((now-last)/1000||.016,.05);last=now;
    if(enabled&&!document.hidden&&visible){time+=dt;if(!dragging){targetYaw+=dt*.08;targetPitch=-.11+mouseY*.09;}yaw+=(targetYaw+mouseX*.08-yaw)*.075;pitch+=(targetPitch-pitch)*.09;lightX+=(targetLightX-lightX)*.07;lightY+=(targetLightY-lightY)*.07;pulse*=.95;}
    else{yaw=targetYaw;pitch=targetPitch;pulse=0;}
    for(const k of ['key','glow','fill'])color[k]=color[k].map((v,i)=>v+(palettes[settings.preset][k][i]-v)*(enabled?.085:1));
    draw();if(enabled&&visible&&!document.hidden)raf=requestAnimationFrame(tick);
  }
  function schedule(){if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);schedule();}
  new ResizeObserver(resize).observe(wrap);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();},{rootMargin:'80px'}).observe(wrap);
  canvas.addEventListener('pointerdown',e=>{dragging=true;moved=false;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouseX=(e.clientX-r.left)/r.width-.5;mouseY=(e.clientY-r.top)/r.height-.5;if(dragging){const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;targetYaw+=dx*.012;targetPitch=Math.max(-.8,Math.min(.8,targetPitch+dy*.006));px=e.clientX;py=e.clientY;schedule();}});
  canvas.addEventListener('pointerup',e=>{dragging=false;if(!moved&&enabled){pulse=1;schedule();}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
  canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('pointerleave',()=>{mouseX=0;mouseY=0;});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetYaw-=.16;if(e.key==='ArrowRight')targetYaw+=.16;if(e.key==='ArrowUp')targetPitch-=.1;if(e.key==='ArrowDown')targetPitch+=.1;if(e.key===' '&&enabled)pulse=1;schedule();}});
  document.querySelector('#reset-scene').addEventListener('click',()=>{targetYaw=.42;targetPitch=-.11;mouseX=0;mouseY=0;yaw=targetYaw;pitch=targetPitch;schedule();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  window.addEventListener('portfolio-motion',e=>{enabled=e.detail.enabled;if(!enabled&&raf){cancelAnimationFrame(raf);raf=0;}schedule();});
  window.addEventListener('portfolio-lighting',e=>{settings={...settings,...e.detail};if(!settings.follow){targetLightX=targetLightY=lightX=lightY=0;}schedule();});
  window.addEventListener('portfolio-light-pointer',e=>{if(enabled&&settings.follow){targetLightX=e.detail.x;targetLightY=e.detail.y;schedule();}});
  resize();
  const micro=document.querySelector('#micro-preview'),m=micro.getContext('2d');
  function microDraw(){const r=micro.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);micro.width=r.width*d;micro.height=r.height*d;m.setTransform(d,0,0,d,0,0);m.clearRect(0,0,r.width,r.height);const colors=['#8ec3d5','#e3d699','#567e94','#374f67'];for(let row=0;row<14;row++){for(let col=0;col<19;col++){const x=col*r.width/17-10,y=row*r.height/12-12,n=(row*13+col*7)%11,a=8+n*.6;m.beginPath();m.moveTo(x,y);m.lineTo(x+a,y+4);m.lineTo(x+3,y+a);m.closePath();m.strokeStyle=colors[n%4]+'55';m.lineWidth=.7;m.stroke();if(n%4===0){m.fillStyle=colors[n%4]+'33';m.fill();}}}}
  new ResizeObserver(microDraw).observe(micro);microDraw();
})();
