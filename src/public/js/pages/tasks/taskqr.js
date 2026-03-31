/* task.qr.js
   Self-contained QR code generator + canvas renderer.
   Extracted from detail.html inline script.
   Load as regular <script> after detail.js module. */

(function () {
  /* ── Tiny QR encoder (Nayuki QR Code Generator, MIT) ── */

  function toUtf8Bytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let cp = str.codePointAt(i);
      if (cp > 0xFFFF) i++;
      if      (cp < 0x80)    { bytes.push(cp); }
      else if (cp < 0x800)   { bytes.push(0xC0|(cp>>6), 0x80|(cp&0x3F)); }
      else if (cp < 0x10000) { bytes.push(0xE0|(cp>>12), 0x80|((cp>>6)&0x3F), 0x80|(cp&0x3F)); }
      else                   { bytes.push(0xF0|(cp>>18), 0x80|((cp>>12)&0x3F), 0x80|((cp>>6)&0x3F), 0x80|(cp&0x3F)); }
    }
    return bytes;
  }

  function appendBits(arr, val, len) { for (let i=len-1;i>=0;i--) arr.push((val>>>i)&1); }
  function getBit(x, i) { return ((x>>>i)&1) !== 0; }

  function makeByteSegment(data) {
    const bits = [];
    for (const b of data) appendBits(bits, b, 8);
    return { modeBits:4, numChars:data.length, charCountBits:[8,16,16], bitData:bits };
  }

  const ECC_CODEWORDS = [
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  ];
  const NUM_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
  ];

  function getNumRawDataModules(v){let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36;}return r;}
  function getNumDataCodewords(v,ecl){return Math.floor(getNumRawDataModules(v)/8)-ECC_CODEWORDS[ecl.ordinal][v]*NUM_BLOCKS[ecl.ordinal][v];}
  function numCharCountBits(seg,ver){return seg.charCountBits[Math.floor((ver+7)/17)];}
  function totalBits(segs,ver){let r=0;for(const s of segs){const c=numCharCountBits(s,ver);if(s.numChars>=1<<c)return Infinity;r+=4+c+s.bitData.length;}return r;}
  function rsDiv(degree){const r=new Array(degree).fill(0);r[degree-1]=1;let root=1;for(let i=0;i<degree;i++){for(let j=0;j<r.length;j++){r[j]=rsMul(r[j],root);if(j+1<r.length)r[j]^=r[j+1];}root=rsMul(root,2);}return r;}
  function rsRem(data,div){const r=new Array(div.length).fill(0);for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>{r[i]^=rsMul(c,f);});}return r;}
  function rsMul(x,y){let z=0;for(let i=7;i>=0;i--){z=z<<1^(z>>>7)*0x11D;z^=(y>>>i&1)*x;}return z;}

  function encodeSegments(segs, ecl) {
    let ver, used;
    for (ver=1;;ver++) { const cap=getNumDataCodewords(ver,ecl)*8; used=totalBits(segs,ver); if(used<=cap)break; if(ver>=40)throw new Error('Data too long'); }
    const bb=[];
    for(const s of segs){appendBits(bb,s.modeBits,4);appendBits(bb,s.numChars,numCharCountBits(s,ver));for(const b of s.bitData)bb.push(b);}
    const cap=getNumDataCodewords(ver,ecl)*8;
    appendBits(bb,0,Math.min(4,cap-bb.length));appendBits(bb,0,(8-bb.length%8)%8);
    for(let p=0xEC;bb.length<cap;p^=0xEC^0x11)appendBits(bb,p,8);
    const dw=new Array(bb.length/8).fill(0);bb.forEach((b,i)=>{dw[i>>>3]|=b<<(7-(i&7));});
    return buildMatrix(ver,ecl,dw);
  }

  function buildMatrix(ver, ecl, data) {
    const nb=NUM_BLOCKS[ecl.ordinal][ver],ecc=ECC_CODEWORDS[ecl.ordinal][ver];
    const raw=Math.floor(getNumRawDataModules(ver)/8);
    const nsb=nb-raw%nb,sbl=Math.floor(raw/nb);
    const blocks=[],rdiv=rsDiv(ecc);
    for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+sbl-ecc+(i<nsb?0:1));k+=d.length;const e=rsRem(d,rdiv);if(i<nsb)d.push(0);blocks.push(d.concat(e));}
    const result=[];
    for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==sbl-ecc||j>=nsb)result.push(b[i]);});
    const size=ver*4+17;
    const mods=Array.from({length:size},()=>new Array(size).fill(false));
    const isFn=Array.from({length:size},()=>new Array(size).fill(false));
    function setFn(x,y,on){mods[y][x]=on;isFn[y][x]=true;}
    function drawFinder(x,y){for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),xx=x+dx,yy=y+dy;if(xx>=0&&xx<size&&yy>=0&&yy<size)setFn(xx,yy,d!==2&&d!==4);}}
    function drawAlign(x,y){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)setFn(x+dx,y+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);}
    for(let i=0;i<size;i++){setFn(6,i,i%2===0);setFn(i,6,i%2===0);}
    drawFinder(3,3);drawFinder(size-4,3);drawFinder(3,size-4);
    const ap=ver===1?[]:(()=>{const n=Math.floor(ver/7)+2;const step=ver===32?26:Math.ceil((ver*4+4)/(n*2-2))*2;const res=[6];for(let p=size-7;res.length<n;p-=step)res.splice(1,0,p);return res;})();
    for(let i=0;i<ap.length;i++)for(let j=0;j<ap.length;j++)if(!((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0)))drawAlign(ap[i],ap[j]);
    function drawFormat(mask){const d=ecl.formatBits<<3|mask;let rem=d;for(let i=0;i<10;i++)rem=rem<<1^(rem>>>9)*0x537;const bits=(d<<10|rem)^0x5412;for(let i=0;i<=5;i++)setFn(8,i,getBit(bits,i));setFn(8,7,getBit(bits,6));setFn(8,8,getBit(bits,7));setFn(7,8,getBit(bits,8));for(let i=9;i<15;i++)setFn(14-i,8,getBit(bits,i));for(let i=0;i<8;i++)setFn(size-1-i,8,getBit(bits,i));for(let i=8;i<15;i++)setFn(8,size-15+i,getBit(bits,i));setFn(8,size-8,true);}
    if(ver>=7){let rem=ver;for(let i=0;i<12;i++)rem=rem<<1^(rem>>>11)*0x1F25;const bits=ver<<12|rem;for(let i=0;i<18;i++){setFn(size-11+i%3,Math.floor(i/3),getBit(bits,i));setFn(Math.floor(i/3),size-11+i%3,getBit(bits,i));}}
    drawFormat(0);
    let idx=0;
    for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++){for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;if(!isFn[y][x]&&idx<result.length*8){mods[y][x]=getBit(result[idx>>>3],7-(idx&7));idx++;}}}}
    function applyMask(mask){for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(isFn[y][x])continue;let inv;switch(mask){case 0:inv=(x+y)%2===0;break;case 1:inv=y%2===0;break;case 2:inv=x%3===0;break;case 3:inv=(x+y)%3===0;break;case 4:inv=(Math.floor(x/3)+Math.floor(y/2))%2===0;break;case 5:inv=x*y%2+x*y%3===0;break;case 6:inv=(x*y%2+x*y%3)%2===0;break;case 7:inv=((x+y)%2+x*y%3)%2===0;break;}if(inv)mods[y][x]=!mods[y][x];}}
    function penalty(){let r=0;for(let y=0;y<size;y++){let rc=false,rx=0;for(let x=0;x<size;x++){if(mods[y][x]===rc){rx++;if(rx===5)r+=3;else if(rx>5)r++;}else{rc=mods[y][x];rx=1;}}}for(let x=0;x<size;x++){let rc=false,ry=0;for(let y=0;y<size;y++){if(mods[y][x]===rc){ry++;if(ry===5)r+=3;else if(ry>5)r++;}else{rc=mods[y][x];ry=1;}}}for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){const c=mods[y][x];if(c===mods[y][x+1]&&c===mods[y+1][x]&&c===mods[y+1][x+1])r+=3;}let dark=0;for(const row of mods)for(const c of row)if(c)dark++;const tot=size*size,k=Math.ceil(Math.abs(dark*20-tot*10)/tot)-1;r+=k*10;return r;}
    let bestMask=-1,bestPen=Infinity;
    for(let m=0;m<8;m++){applyMask(m);drawFormat(m);const p=penalty();if(p<bestPen){bestPen=p;bestMask=m;}applyMask(m);}
    applyMask(bestMask);drawFormat(bestMask);
    return mods;
  }

  function makeQR(text) {
    const seg = makeByteSegment(toUtf8Bytes(text));
    const ecl = { ordinal:1, formatBits:0 }; // MEDIUM
    return encodeSegments([seg], ecl);
  }

  /* ── Draw to canvas ── */
  function drawQR(canvas, text) {
    const matrix = makeQR(text);
    const N = matrix.length, SIZE = 200;
    const cell = Math.floor(SIZE / (N + 8));
    const off  = Math.floor((SIZE - cell * N) / 2);
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#0b1120';
    for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (matrix[r][c]) ctx.fillRect(off+c*cell, off+r*cell, cell, cell);
  }

  /* ── Show QR when submission is revealed ── */
  function showQR() {
    const row    = document.getElementById('submission-qr-row');
    const canvas = document.getElementById('qr-canvas');
    if (!row || !canvas || row.style.display === 'grid') return;
    row.style.display = 'grid';
    const text = document.getElementById('task-submission')?.textContent?.trim() || '';
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    try { drawQR(canvas, dataUri); }
    catch {
      const truncated = text.slice(0, 800);
      try { drawQR(canvas, 'data:text/plain;charset=utf-8,' + encodeURIComponent(truncated + '\n[truncated]')); }
      catch (e) { console.warn('QR error:', e); }
    }
  }

  const sub = document.getElementById('submission-section');
  if (sub) {
    new MutationObserver(() => { if (sub.style.display === 'block') showQR(); })
      .observe(sub, { attributes: true, attributeFilter: ['style'] });
    if (sub.style.display === 'block') showQR();
  }

  /* ── Download button ── */
  document.getElementById('qr-download-btn')?.addEventListener('click', () => {
    const text = document.getElementById('task-submission')?.textContent?.trim() || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.download = 'submission.txt';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  });

})();