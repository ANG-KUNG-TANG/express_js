// landing.js — IELTS Platform landing page interactions
// Cursor, canvas particles, floating UI, count-up, scroll reveal

/* ── CURSOR ── */
const cur = document.getElementById('cur');
const curR = document.getElementById('curR');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });
(function animCursor(){
  rx += (mx-rx)*.12; ry += (my-ry)*.12;
  cur.style.left  = mx+'px'; cur.style.top  = my+'px';
  curR.style.left = rx+'px'; curR.style.top = ry+'px';
  requestAnimationFrame(animCursor);
})();

/* ── CANVAS PARTICLE FIELD ── */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let W, H, pts=[];

function resize(){
  W=canvas.width=window.innerWidth;
  H=canvas.height=window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const N = Math.min(90, Math.floor(window.innerWidth/16));
for(let i=0;i<N;i++) pts.push({
  x: Math.random()*window.innerWidth,
  y: Math.random()*window.innerHeight,
  vx: (Math.random()-.5)*.28,
  vy: (Math.random()-.5)*.28,
  r: Math.random()*1.4+.3,
  o: Math.random()*.5+.15
});

let mouseX=W/2, mouseY=H/2;
document.addEventListener('mousemove', e=>{ mouseX=e.clientX; mouseY=e.clientY; });

function drawCanvas(){
  ctx.clearRect(0,0,W,H);

  // Subtle radial glow at mouse
  const g = ctx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,300);
  g.addColorStop(0,'rgba(201,168,76,.04)');
  g.addColorStop(1,'transparent');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // Particles + connections
  pts.forEach((p,i)=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=W; if(p.x>W)p.x=0;
    if(p.y<0)p.y=H; if(p.y>H)p.y=0;

    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(201,168,76,${p.o})`;
    ctx.fill();

    for(let j=i+1;j<pts.length;j++){
      const q=pts[j];
      const dx=p.x-q.x, dy=p.y-q.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<120){
        ctx.beginPath();
        ctx.moveTo(p.x,p.y);
        ctx.lineTo(q.x,q.y);
        ctx.strokeStyle=`rgba(201,168,76,${.08*(1-d/120)})`;
        ctx.lineWidth=.5;
        ctx.stroke();
      }
    }
  });
  requestAnimationFrame(drawCanvas);
}
drawCanvas();

/* ── FLOATING TIMER ── */
let timerS = 39*60+14;
setInterval(()=>{
  if(timerS>0) timerS--;
  const m=Math.floor(timerS/60), s=timerS%60;
  document.getElementById('fc-timer').textContent=
    String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
},1000);

/* ── FLOATING WORD COUNT ── */
const wcEl = document.getElementById('fc-wc');
let wc=247, wcDir=1;
setInterval(()=>{
  wc+=wcDir*(Math.random()<.3?1:0);
  if(wc>=252)wcDir=-1; if(wc<=240)wcDir=1;
  wcEl.textContent=wc;
},800);

/* ── COUNT-UP ANIMATION ── */
function countUp(el, target, isDecimal){
  let start=0, dur=2000, startTime=null;
  function step(t){
    if(!startTime) startTime=t;
    const p=Math.min((t-startTime)/dur,1);
    const ease=1-Math.pow(1-p,3);
    const val=start+(target-start)*ease;
    el.textContent = isDecimal ? val.toFixed(1) : Math.floor(val).toLocaleString();
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── INTERSECTION OBSERVER ── */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{
    if(en.isIntersecting){
      en.target.classList.add('visible');
      // Trigger count-up for stat numbers
      const target = en.target.dataset.target;
      if(target){
        countUp(en.target, parseFloat(target), en.target.dataset.decimal!=null);
        io.unobserve(en.target);
      }
    }
  });
},{threshold:.15});

document.querySelectorAll('.reveal,.feat-card,.stat-n').forEach(el=>io.observe(el));

/* ── STAGGER FEAT CARDS ── */
document.querySelectorAll('.feat-card').forEach((c,i)=>{
  c.style.transitionDelay = (i*.1)+'s';
});

/* ── SMOOTH SCROLL ── */
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const t=document.querySelector(a.getAttribute('href'));
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}
  });
});