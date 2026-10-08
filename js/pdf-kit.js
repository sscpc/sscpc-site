/* SSCPC PDF design kit.
   One shared look for every PDF the site makes (membership application, Spectrum
   registration, chat transcript, photography tips): Poppins type, club logo,
   navy header with the club colours, tidy field grid, signature boxes, page footer.
   Needs jsPDF (loaded before this file). If the Poppins files cannot be fetched it
   quietly falls back to Helvetica, so a PDF is always produced. */
(function(){
  const W=210,H=297,M=14,CW=W-2*M;
  const C={navy:[4,16,30],ink:[18,24,63],muted:[96,102,138],maroon:[125,21,38],cream:[244,241,228],paper:[247,244,232],
           rule:[222,215,176],sky:[108,200,255],blue:[40,130,230],red:[107,0,16],yel:[255,248,214],blu:[22,44,120]};
  const SITE='sscpc.vercel.app',EMAIL='sylvestrian.photography@gmail.com';

  const clean=v=>String(v==null?'':v).replace(/[\u201C\u201D]/g,'"').replace(/[\u2018\u2019]/g,"'").replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g,'?').trim();

  /* ---- assets, fetched once per page visit ---- */
  const cache={};
  function toB64(buf){let s='';const b=new Uint8Array(buf),n=0x8000;for(let i=0;i<b.length;i+=n)s+=String.fromCharCode.apply(null,b.subarray(i,i+n));return btoa(s)}
  function fontB64(url){
    if(!cache[url])cache[url]=fetch(url).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(toB64);
    return cache[url];
  }
  function logoData(){
    if(!cache.logo)cache.logo=new Promise(res=>{
      const img=new Image();
      img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);res(c.toDataURL('image/png'))}catch(e){res(null)}};
      img.onerror=()=>res(null);img.src='images/logo.png';
    });
    return cache.logo;
  }
  async function loadFonts(doc){
    try{
      const [r,s,b]=await Promise.all([fontB64('fonts/poppins-regular.ttf'),fontB64('fonts/poppins-semibold.ttf'),fontB64('fonts/poppins-bold.ttf')]);
      doc.addFileToVFS('Poppins-Regular.ttf',r);doc.addFont('Poppins-Regular.ttf','Poppins','normal');
      doc.addFileToVFS('Poppins-SemiBold.ttf',s);doc.addFont('Poppins-SemiBold.ttf','PoppinsSemi','normal');
      doc.addFileToVFS('Poppins-Bold.ttf',b);doc.addFont('Poppins-Bold.ttf','Poppins','bold');
      return {reg:['Poppins','normal'],semi:['PoppinsSemi','normal'],bold:['Poppins','bold']};
    }catch(e){
      return {reg:['helvetica','normal'],semi:['helvetica','bold'],bold:['helvetica','bold']};
    }
  }

  const fill=(d,c)=>d.setFillColor(c[0],c[1],c[2]);
  const ink=(d,c)=>d.setTextColor(c[0],c[1],c[2]);
  const stroke=(d,c)=>d.setDrawColor(c[0],c[1],c[2]);
  function font(x,w,size){x.doc.setFont(x.f[w][0],x.f[w][1]);x.doc.setFontSize(size)}
  function alpha(d,a){try{d.setGState(new d.GState({opacity:a}))}catch(e){}}
  function tri(d,y,h,full){ /* the three club colours */
    const w=full?W:W;fill(d,C.red);d.rect(0,y,w*.4,h,'F');fill(d,C.yel);d.rect(w*.4,y,w*.3,h,'F');fill(d,C.blu);d.rect(w*.7,y,w*.3,h,'F');
  }

  /* ---- page furniture ---- */
  function firstHeader(x,title){
    const d=x.doc;
    fill(d,C.navy);d.rect(0,0,W,56,'F');
    /* soft shutter rings, top right */
    alpha(d,.13);stroke(d,C.sky);d.setLineWidth(.35);
    [14,23,32,41].forEach(r=>d.circle(W-18,16,r,'S'));
    alpha(d,.06);fill(d,C.sky);d.circle(W-18,16,14,'F');alpha(d,1);
    if(x.logo){
      fill(d,[255,255,255]);alpha(d,.08);d.circle(M+13,28,15.5,'F');alpha(d,1);
      d.addImage(x.logo,'PNG',M,15,26,26);
    }
    ink(d,C.cream);font(x,'bold',25);d.text('SSCPC',M+33,25);
    ink(d,[176,200,232]);font(x,'reg',9);d.text("St. Sylvester's College Photography Club",M+33,31.5);
    const t=clean(title).toUpperCase();font(x,'semi',8);
    const tw=d.getTextWidth(t)+2.4*t.length*.35+10;
    fill(d,C.cream);d.roundedRect(M+33,36,tw,8,4,4,'F');
    ink(d,C.navy);d.text(t,M+38,41.3,{charSpace:.35});
    tri(d,56,2.4);
  }
  function contHeader(x){
    const d=x.doc;
    fill(d,C.navy);d.rect(0,0,W,15,'F');
    if(x.logo)d.addImage(x.logo,'PNG',M,3.2,8.6,8.6);
    ink(d,C.cream);font(x,'bold',10);d.text('SSCPC',M+12,8.9);
    ink(d,[176,200,232]);font(x,'reg',8);d.text(clean(x.title),W-M,8.9,{align:'right'});
    tri(d,15,1.2);
  }
  function addPage(x){x.doc.addPage();contHeader(x);x.y=28}
  function ensure(x,h){if(x.y+h>H-24)addPage(x)}

  /* ---- public: start a document ---- */
  async function create(title){
    if(!window.jspdf)throw new Error('jsPDF not loaded');
    const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
    const x={doc:doc,title:title,y:70,W:W,H:H,M:M,CW:CW,C:C,clean:clean};
    x.f=await loadFonts(doc);x.logo=await logoData();
    firstHeader(x,title);
    return x;
  }

  /* reference / date strip under the header */
  function meta(x,label,value,dateText){
    const d=x.doc,y=x.y-4;
    fill(d,C.paper);d.roundedRect(M,y,CW,15,3,3,'F');
    fill(d,C.maroon);d.roundedRect(M,y,1.8,15,.9,.9,'F');
    ink(d,C.muted);font(x,'semi',6.8);d.text(clean(label).toUpperCase(),M+7,y+5.6,{charSpace:.4});
    ink(d,C.ink);font(x,'bold',10.5);d.text(clean(value),M+7,y+11.4);
    ink(d,C.muted);font(x,'semi',6.8);d.text('DATE',W-M-5,y+5.6,{align:'right',charSpace:.4});
    ink(d,C.ink);font(x,'bold',10.5);d.text(clean(dateText),W-M-5,y+11.4,{align:'right'});
    x.y=y+15+10;
  }
  function today(){return new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}

  function section(x,title){
    ensure(x,22);
    const d=x.doc;
    fill(d,C.maroon);d.roundedRect(M,x.y-3.6,2.6,5.2,1.2,1.2,'F');
    ink(d,C.ink);font(x,'bold',9);d.text(clean(title).toUpperCase(),M+6,x.y+.4,{charSpace:.5});
    stroke(d,C.rule);d.setLineWidth(.25);
    const tw=d.getTextWidth(clean(title).toUpperCase())+clean(title).length*.5*.35;
    d.line(M+9+tw,x.y-.8,W-M,x.y-.8);
    x.y+=7;
  }

  /* a labelled value, drawn at (cx, y) in a column of width w; returns its height */
  function fieldBlock(x,k,v,cx,y,w,draw){
    const d=x.doc;font(x,'reg',10.5);
    const lines=d.splitTextToSize(clean(v),w);
    const h=4.8+lines.length*5.2+2.4;
    if(draw){
      ink(d,C.maroon);font(x,'semi',6.8);d.text(clean(k).toUpperCase(),cx,y,{charSpace:.4});
      ink(d,C.ink);font(x,'reg',10.5);d.text(lines,cx,y+5.2);
    }
    return h;
  }
  /* rows: [[label,value],...]. Short values sit two to a line, long ones span the page. */
  function fields(x,title,rows){
    const items=rows.map(r=>({k:r[0],v:clean(r[1]),full:!!(r[2]&&r[2].full)})).filter(r=>r.v);
    if(!items.length)return;
    if(title)section(x,title);
    const d=x.doc,half=(CW-8)/2;
    let pend=null;
    const rule=()=>{stroke(d,C.rule);d.setLineWidth(.2);d.line(M,x.y-1.6,W-M,x.y-1.6)};
    function drawLine(a,b){
      const ha=fieldBlock(x,a.k,a.v,M,0,a.full&&!b?CW:half,false);
      const hb=b?fieldBlock(x,b.k,b.v,M+half+8,0,half,false):0;
      const h=Math.max(ha,hb);
      ensure(x,h+3);
      fieldBlock(x,a.k,a.v,M,x.y,a.full&&!b?CW:half,true);
      if(b)fieldBlock(x,b.k,b.v,M+half+8,x.y,half,true);
      x.y+=h+2;rule();x.y+=2.6;
    }
    items.forEach(it=>{
      const short=!it.full&&it.v.length<=30&&it.v.indexOf('\n')<0;
      if(short){ if(pend){drawLine(pend,it);pend=null}else pend=it }
      else{ if(pend){drawLine(pend,null);pend=null} drawLine(Object.assign({},it,{full:true}),null) }
    });
    if(pend)drawLine(pend,null);
    x.y+=3;
  }

  /* signature boxes: labels = ['Applicant signature', ...] */
  function signatures(x,labels){
    ensure(x,30);
    const d=x.doc,n=labels.length,gap=8,w=(CW-gap*(n-1))/n,y=x.y+12;
    labels.forEach((l,i)=>{
      const cx=M+i*(w+gap);
      stroke(d,C.ink);d.setLineWidth(.3);d.line(cx,y,cx+w,y);
      ink(d,C.muted);font(x,'semi',6.8);d.text(clean(l).toUpperCase(),cx,y+4.6,{charSpace:.35});
    });
    x.y=y+12;
  }
  /* soft callout box */
  function note(x,text){
    const d=x.doc;font(x,'reg',9);
    const lines=d.splitTextToSize(clean(text),CW-14),h=lines.length*4.6+8;
    ensure(x,h+2);
    fill(d,C.paper);d.roundedRect(M,x.y,CW,h,3,3,'F');
    fill(d,C.blue);d.roundedRect(M,x.y,1.8,h,.9,.9,'F');
    ink(d,C.ink);d.text(lines,M+7,x.y+6.4);
    x.y+=h+4;
  }

  /* running text (used by the chat / tips PDFs) */
  function para(x,text,o){
    o=o||{};const d=x.doc,size=o.size||10,lh=o.lh||size*.5+.9,cx=o.x||M,w=(o.w||CW)-(cx-M);
    font(x,o.bold?'bold':(o.semi?'semi':'reg'),size);ink(d,o.color||C.ink);
    d.splitTextToSize(clean(text),w).forEach(ln=>{ensure(x,lh);d.text(ln,cx,x.y);x.y+=lh});
    x.y+=o.after||0;
  }
  /* a rounded text bubble that can flow over a page break */
  function bubble(x,text,o){
    o=o||{};const d=x.doc,size=o.size||9.6,lh=size*.5+1,px=5,py=4.4;
    const w=o.w||CW*.82,cx=o.right?W-M-w:M;
    font(x,'reg',size);
    let lines=d.splitTextToSize(clean(text),w-2*px);
    while(lines.length){
      ensure(x,lh+2*py+2);
      const room=Math.floor((H-24-x.y-2*py)/lh),part=lines.slice(0,Math.max(1,room));lines=lines.slice(part.length);
      const h=part.length*lh+2*py;
      fill(d,o.fill||C.paper);d.roundedRect(cx,x.y,w,h,3.2,3.2,'F');
      if(o.bar){fill(d,o.bar);d.roundedRect(cx,x.y,1.6,h,.8,.8,'F')}
      font(x,'reg',size);ink(d,o.color||C.ink);d.text(part,cx+px+(o.bar?1:0),x.y+py+size*.3);
      x.y+=h+(lines.length?0:o.after||3);
    }
  }
  function tag(x,text,o){ /* small caps label above a bubble */
    o=o||{};ensure(x,8);
    font(x,'semi',6.8);ink(x.doc,o.color||C.muted);
    x.doc.text(clean(text).toUpperCase(),o.right?W-M:M,x.y+.6,{align:o.right?'right':'left',charSpace:.4});
    x.y+=3.4;
  }

  /* footer on every page: site / email, page x of y */
  function finish(x,left){
    const d=x.doc,n=d.getNumberOfPages();
    for(let i=1;i<=n;i++){
      d.setPage(i);
      stroke(d,C.rule);d.setLineWidth(.25);d.line(M,H-15,W-M,H-15);
      font(x,'reg',7.6);ink(d,C.muted);
      d.text(clean(left||(SITE+'   |   '+EMAIL)),M,H-9.5);
      d.text('Page '+i+' of '+n,W-M,H-9.5,{align:'right'});
      tri(d,H-2.2,2.2);
    }
    return d;
  }

  window.SSCPCPdf={create:create,meta:meta,fields:fields,section:section,signatures:signatures,note:note,para:para,bubble:bubble,tag:tag,finish:finish,today:today,clean:clean,ensure:ensure,C:C};
})();
