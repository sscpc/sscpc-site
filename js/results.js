/* Spectrum 2026 results: category winners (1st-3rd + merit awards) shown in the Spectrum tab.
   To change a name, school or placing, edit RESULTS below. Photos live in images/spectrum/winners/ (merit/ for merit awards).
   The SCOPE champion, nominees and Most Popular Photograph are plain HTML in index.html (section #results). Style: css/results.css. */
(function(){
  const D='images/spectrum/winners/';
  const RESULTS=[
    {id:'nature',name:'Nature & Wildlife',
      podium:[
        {who:'Chamathki Fernando',school:"Mahamaya Girls' College",img:'nature-1.jpg'},
        {who:'Uthum Methsara',school:'Sivali Central College',img:'nature-2.jpg'},
        {who:'Mayon Minthaka',school:'Maris Stella College',img:'nature-3.jpg'}],
      merit:[
        ['Bihandu Kalidasa','Nalanda College'],['Mayon Minthaka','Maris Stella College'],['Methika Mihinuda','Nalanda College'],
        ['Bihandu Kalidasa','Nalanda College'],['Mayon Devkalana','D. S. Senanayake College'],['Uthum Methsara','Sivali Central College'],
        ['Vidun Nanayakkara','Ananda College']]},
    {id:'mobile',name:'Mobile',
      podium:[
        {who:'Bihandu Kalidasa',school:'Ananda College',img:'mobile-1.jpg'},
        {who:'Dulma Yuthmanthi',school:"Girls' High School",img:'mobile-2.jpg',port:true},
        {who:'Kaveesha Gayanthi',school:'Ananda Balika Vidyalaya',img:'mobile-3.jpg'}],
      merit:[
        ['Bihandu Kalidasa','Ananda College'],['Vinudi Sehanse','Vishaka Balika Vidyalaya'],['Risadi Pehansa','Anula Vidyalaya'],
        ['Sayuru Gunathilaka','Ananda College'],['Sesath Wathsuka','Bandaranayake College'],['Methika Mihinuda','Nalanda College'],
        ['Pawani Prabhashwari','Maliyadeva Balika Vidyalaya']]},
    {id:'colour',name:'Colour',
      podium:[
        {who:'Jithuli Yesanga',school:"St Paul's College",img:'colour-1.jpg'},
        {who:'Lakindu Karunarthna',school:'Prince College',img:'colour-2.jpg'},
        {who:'Lakindu Karunarthna',school:'Prince College',img:'colour-3.jpg'}],
      merit:[
        ['Bihandu Kalidasa','Nalanda College'],['Isuli Liyanage','Yashodara Devi Balika Maha Vidyalaya'],['Mayon Minthaka','Maris Stella College'],
        ['Prabhavee Mohottige','Kalutara Balika Vidyalaya'],['Senuda Damsith','President College'],['Nantharupan Pramothan','Jaffna Hindu College'],
        ['Uthum Methsara','Sivali Central College']]},
    {id:'mono',name:'Monochrome',
      podium:[
        {who:'Prabhavee Mohottige',school:'Kalutara Balika Vidyalaya',img:'mono-1.jpg'},
        {who:'Kaveesha Gayanthi',school:'Ananda Balika Vidyalaya',img:'mono-2.jpg'},
        {who:'Shemika Anusara',school:'Nalanda College',img:'mono-3.jpg'}],
      merit:[
        ['Yethum Sandil','St Thomas College'],['Dulshan Kokila','Sivali Central College'],['Methika Mihinuda','Nalanda College'],
        ['Bihandu Kalidasa','Nalanda College'],['Mayon Minthaka','Maris Stella College'],['Prabhavee Mohottige','Kalutara Balika Vidyalaya'],
        ['Sandithi Kariyawasam',"Mahamaya Girls' College"]]}
  ];
  const PLACE=[['1st','1','Winner'],['2nd','2','Second place'],['3rd','3','Third place']];

  const root=document.getElementById('res-cats');
  if(!root)return;
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};

  /* ----- build tabs + panels ----- */
  const tabs=el('div','rc-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Competition category');
  const panels=el('div','rc-panels');
  const btns=[],pans=[];

  RESULTS.forEach((c,ci)=>{
    const b=el('button','rc-tab',c.name);
    b.type='button';b.id='rc-tab-'+c.id;b.setAttribute('role','tab');b.setAttribute('aria-controls','rc-pan-'+c.id);
    b.addEventListener('click',()=>pick(ci,true));
    b.addEventListener('keydown',e=>{
      let n=-1;
      if(e.key==='ArrowRight')n=(ci+1)%RESULTS.length;else if(e.key==='ArrowLeft')n=(ci+RESULTS.length-1)%RESULTS.length;
      else if(e.key==='Home')n=0;else if(e.key==='End')n=RESULTS.length-1;
      if(n>-1){e.preventDefault();pick(n,true)}
    });
    tabs.appendChild(b);btns.push(b);

    const p=el('div','rc-panel');p.id='rc-pan-'+c.id;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);

    const pod=el('div','rc-pod');
    c.podium.forEach((w,i)=>{
      const pl=PLACE[i];
      const f=el('figure','rc-win rc-win--'+pl[1]+(w.port?' is-port':''));
      const ph=el('button','rc-ph');ph.type='button';
      ph.setAttribute('aria-label','View larger: '+pl[0]+' place, '+c.name+', by '+w.who);
      const im=new Image();im.src=D+w.img;im.alt=pl[0]+' place in '+c.name+', photographed by '+w.who;im.loading='lazy';im.decoding='async';
      ph.appendChild(im);
      ph.addEventListener('click',()=>lightbox(D+w.img,im.alt,w.who+' • '+w.school));
      const medal=el('span','rc-medal');
      medal.innerHTML='<b>'+pl[0].replace(/(st|nd|rd)$/,'')+'<sup>'+pl[0].slice(-2)+'</sup></b><i>Place</i>';
      ph.appendChild(medal);
      const cap=el('figcaption','rc-cap');
      cap.appendChild(el('strong','',w.who));cap.appendChild(el('span','',w.school));
      f.appendChild(ph);f.appendChild(cap);pod.appendChild(f);
    });
    p.appendChild(pod);

    const mh=el('div','rc-mh');mh.appendChild(el('h4','','Merit Awards'));mh.appendChild(el('span','',c.name));p.appendChild(mh);
    const mg=el('ul','rc-merit');
    c.merit.forEach((m,i)=>{
      const li=el('li','rc-m');
      const mb=el('button','rc-mph');mb.type='button';mb.setAttribute('aria-label','View larger: merit award, '+c.name+', by '+m[0]);
      const mi=new Image();mi.src=D+'merit/'+c.id+'-m'+(i+1)+'.jpg';mi.alt='Merit award in '+c.name+', photographed by '+m[0];mi.loading='lazy';mi.decoding='async';
      mb.appendChild(mi);
      mb.addEventListener('click',()=>lightbox(mi.src,mi.alt,m[0]+' • '+m[1]));
      li.appendChild(mb);
      const t=el('div','rc-mt');t.appendChild(el('strong','',m[0]));t.appendChild(el('span','',m[1]));
      li.appendChild(t);mg.appendChild(li);
    });
    p.appendChild(mg);
    panels.appendChild(p);pans.push(p);
  });

  function pick(i,focus){
    btns.forEach((b,j)=>{const on=i===j;b.classList.toggle('is-on',on);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1});
    pans.forEach((p,j)=>{p.hidden=i!==j;p.classList.remove('is-in');if(i===j){void p.offsetWidth;p.classList.add('is-in')}});
    if(focus)btns[i].focus();
  }
  root.appendChild(tabs);root.appendChild(panels);
  pick(0);

  /* ----- Most Popular photo opens in the viewer; jump buttons scroll to a block ----- */
  const pp=document.getElementById('res-pop-ph');
  if(pp){const pi=pp.querySelector('img');
    pp.addEventListener('click',()=>lightbox(pi.currentSrc||pi.src,pi.alt,'The Framed Education \u2022 Sandithi Kariyawasam \u2022 Mahamaya Girls\u2019 College'))}
  document.querySelectorAll('[data-res-go]').forEach(b=>b.addEventListener('click',()=>{
    const t=document.getElementById(b.getAttribute('data-res-go'));
    if(t)t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}));

  /* ----- simple photo viewer ----- */
  let lb=null,lastFocus=null;
  function close(){if(!lb)return;lb.remove();lb=null;document.removeEventListener('keydown',onKey);if(lastFocus&&lastFocus.focus)lastFocus.focus()}
  function onKey(e){if(e.key==='Escape')close()}
  function lightbox(src,alt,cap){
    close();lastFocus=document.activeElement;
    lb=el('div','rc-lb');lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Photograph');
    const x=el('button','rc-lb-x','×');x.type='button';x.setAttribute('aria-label','Close');
    const im=new Image();im.src=src;im.alt=alt;
    lb.appendChild(x);lb.appendChild(im);lb.appendChild(el('p','',cap));
    lb.addEventListener('click',e=>{if(e.target!==im)close()});
    document.body.appendChild(lb);document.addEventListener('keydown',onKey);x.focus();
  }
})();
