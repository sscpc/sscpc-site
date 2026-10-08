(function(){
  const root=document.getElementById('members-list');
  if(!root||typeof MEMBERS==='undefined')return;
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const norm=n=>String(n).toLowerCase().replace(/[^a-z]/g,'');
  const EXEC={};
  window.execMemberId=n=>EXEC[norm(n)]||null;
  window.goToMember=name=>{
    const id=EXEC[norm(name)];if(!id)return;
    const show=()=>{
      const c=document.getElementById(id);if(!c)return;
      c.scrollIntoView({behavior:'smooth',block:'center'});
      c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit');
      setTimeout(()=>c.classList.remove('hit'),3600);
    };
    if(location.hash==='#members'){show();return}
    addEventListener('hashchange',()=>setTimeout(show,60),{once:true});location.hash='#members';
  };

  const initials=n=>{const w=String(n).replace(/^(ven|mr|ms|mrs|dr)\.?\s+/i,'').trim().split(/\s+/);return((w[0]||'')[0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase()};

  /* profile popup */
  let dlg=null,lastBtn=null;
  function closeProfile(){
    if(!dlg)return;dlg.remove();dlg=null;document.body.classList.remove('xc-lock');
    document.removeEventListener('keydown',onKey);
    if(lastBtn)lastBtn.focus();
  }
  function onKey(e){
    if(e.key==='Escape'){closeProfile();return}
    if(e.key==='Tab'&&dlg){ /* keep focus inside the popup */
      const f=dlg.querySelectorAll('button');if(!f.length)return;
      if(document.activeElement===f[0]&&e.shiftKey||!dlg.contains(document.activeElement)){e.preventDefault();f[f.length-1].focus()}
    }
  }
  function openProfile(m,btn){
    closeProfile();lastBtn=btn;
    dlg=el('div','xp');dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label',m.name+' profile');
    const box=el('div','xp-box'),x=el('button','xp-x','\u00d7');x.type='button';x.setAttribute('aria-label','Close');
    const ph=el('div','xp-photo'+(m.photo?'':' none'));
    if(m.photo){const im=el('img');im.src=m.photo;im.alt=m.name;ph.append(im)}
    const tx=el('div','xp-text'),tags=el('div','xc-tags');
    tags.append(el('span','xc-tag',m.role));if(m.grade)tags.append(el('span','xc-tag',m.grade));
    tx.append(tags,el('h4','xc-name',m.name),el('p','xp-note',m.note));
    box.append(x,ph,tx);dlg.append(box);document.body.append(dlg);document.body.classList.add('xc-lock');
    x.addEventListener('click',closeProfile);
    dlg.addEventListener('click',e=>{if(e.target===dlg)closeProfile()});
    document.addEventListener('keydown',onKey);x.focus();
  }

  MEMBERS.forEach(g=>{
    root.append(el('h3','mem-group',g.title));
    if(g.exec){ /* executive committee: photo-on-top cards, no grade, phone for President & Secretary */
      const cg=el('div','cm-grid');
      const NOTE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.4"/><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6l1.2 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"/></svg>';
      const row=(k,v,href)=>{
        const r=el('div','cm-row');r.append(el('span','cm-k',k));
        if(href){const a=el('a','cm-v',v);a.href=href;r.append(a)}else r.append(el('span','cm-v',v));
        return r;
      };
      g.members.forEach((m,i)=>{
        const id='mem-'+norm(m.name),card=el('article','cm');
        card.id=id;EXEC[norm(m.name)]=id;
        const ph=el('div','cm-photo'+(m.photo?'':' none'));
        if(m.photo){const im=el('img');im.src=m.photo;im.alt=m.name;im.loading='lazy';ph.append(im)}
        const body=el('div','cm-body'),top=el('div','cm-top'),ic=el('span','cm-ic');
        ic.innerHTML=NOTE;
        top.append(ic,el('span','cm-no',String(i+1).padStart(2,'0')));
        const rows=el('div','cm-rows');
        rows.append(row('Position',m.role));
        if(m.phone)rows.append(row('Phone',m.phone,'tel:'+m.phone.replace(/[^\d+]/g,'').replace(/^0/,'+94')));
        body.append(top,el('h4','cm-name',m.name),rows);
        card.append(ph,body);cg.append(card);
      });
      root.append(cg);return;
    }
    const grid=el('div','mem-grid');
    g.members.forEach(m=>{
      const card=el('article','mc'),inner=el('div','mc-in'),ph=el('div','mc-photo');
      if(m.photo){const im=el('img');im.src=m.photo;im.alt=m.name;im.loading='lazy';ph.append(im)}
      else ph.classList.add('none');
      inner.append(ph,el('div','mc-role',m.role),el('div','mc-name',m.name));
      if(m.grade)inner.append(el('div','mc-grade',m.grade));
      if(g.exec){card.id='mem-'+norm(m.name);EXEC[norm(m.name)]=card.id}
      card.append(inner);grid.append(card);
    });
    root.append(grid);
  });
  /* any element with data-member="Full Name" opens that committee member's card */
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-member]');
    if(b&&window.goToMember)window.goToMember(b.dataset.member);
  });
})();
