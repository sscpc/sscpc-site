(function(){
  const lang=(e,t)=>{if(/[\u0D80-\u0DFF]/.test(t))e.lang='si';else e.removeAttribute('lang')};
  const root=document.getElementById('events-list');
  if(!root||typeof EVENTS==='undefined')return;
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null){e.textContent=x;lang(e,x)}return e};
  const list=EVENTS.filter(e=>(e.category||'school')==='main');
  (function(){
    list.forEach(e=>{
      const frame=el('article','info ev main'),inner=el('div','info-in'),ul=el('ul','info-list');
      const head=el('div','info-h','Main event');
      head.append(el('span','ev-chip',e.status==='upcoming'?'Upcoming':'Past'));
      inner.append(head,el('h4','ev-name',e.name));
      if(e.type)inner.append(el('p','ev-type',e.type));
      [['Date',e.date],['Time',e.time],['Venue',e.venue]].forEach(([k,v])=>{
        if(!v)return;const li=el('li');li.append(el('em',0,k),el('span',0,v));ul.append(li);
      });
      inner.append(ul);
      if(e.about)inner.append(el('p','ev-about',e.about));
      const btns=el('div','ev-btns');
      if(e.link){const a=el('a','btn cut',e.linkLabel||'Learn more');a.href=e.link;btns.append(a)}
      if(e.album){
        const b=el('button',e.link?'btn ghost':'btn cut','View album');b.type='button';
        b.onclick=()=>window.openAlbumByName&&window.openAlbumByName(e.album);
        btns.append(b);
      }
      if(e.mapsQuery||e.mapsUrl){
        const d=el('a','btn ghost','Directions');
        d.href=e.mapsUrl||('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(e.mapsQuery));
        d.target='_blank';d.rel='noopener';btns.append(d);
      }
      if(btns.children.length)inner.append(btns);
      frame.append(inner);root.append(frame);
    });
  })();
})();
