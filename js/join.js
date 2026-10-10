(function(){
  const f=document.getElementById('join-form');
  if(!f)return;
  const $=id=>document.getElementById(id);
  const clean=v=>String(v==null?'':v).replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g,'?').trim();

  /* "Why do you want to join?": None / Prefer not to say quick option */
  const whyText=$('join-why'),whyNone=$('join-why-none');
  if(whyNone&&whyText){
    whyNone.addEventListener('change',()=>{
      if(whyNone.checked){
        whyText.dataset.prev=whyText.value;
        whyText.value='None / Prefer not to say';
        whyText.readOnly=true;
        whyText.required=false;
      }else{
        whyText.value=whyText.dataset.prev||'';
        whyText.readOnly=false;
        whyText.required=true;
      }
    });
  }

  const confirmBox=f.querySelector('[name="confirm"]');
  const confirmMsg=$('join-confirm-msg');

  f.addEventListener('submit',async e=>{
    e.preventDefault();

    /* Required confirmation is actually enforced: block submission, show a
       clear message, keep every field the applicant already entered. */
    if(confirmBox&&!confirmBox.checked){
      if(confirmMsg){confirmMsg.textContent='Please tick "I confirm that the details above are correct" before submitting.';confirmMsg.hidden=false;}
      confirmBox.focus();
      return;
    }
    if(confirmMsg)confirmMsg.hidden=true;

    /* Guards against a double tap/click and any re-entrant submit while a
       request is already in flight -- disabled is set synchronously below,
       before anything async happens, so a second submit event hits this
       check and stops here. */
    const btn=$('join-btn');
    if(btn.disabled)return;
    btn.disabled=true;btn.textContent='Sending...';

    const fd=new FormData(f);
    const d={};['name','grade','admission','phone','email','guardian','guardian_phone','experience','equipment','why'].forEach(k=>d[k]=fd.get(k)||'');
    d.interests=fd.getAll('interests').join(', ');

    let sendErr=null,serverResult=null;
    try{serverResult=await sendForm(fd,'join')}catch(err){sendErr=err}

    /* A thrown error (offline, or the script returned a non-OK HTTP
       status) is a genuine failure: nothing was saved. Never show a
       "received" message and never invent a membership number here --
       show a clear error, leave every field exactly as the applicant
       typed it, and re-enable the button so they can just try again. */
    if(sendErr){
      if(confirmMsg){confirmMsg.textContent=formError(sendErr,'Your application')+' Nothing you entered has been cleared -- you can press "Submit application" again once you\'re back online.';confirmMsg.hidden=false;}
      btn.disabled=false;btn.textContent='Submit application';
      confirmMsg&&confirmMsg.scrollIntoView({block:'center'});
      return;
    }

    /* The membership number (SSCPC 001, SSCPC 002, ...) is assigned by the
       Google Apps Script, never by the browser -- it comes back in the
       script's reply. If the reply couldn't be read here (a rare case
       where the request went through but the response was blocked from
       being read) there is no number to show yet; the applicant is told
       it's pending rather than being shown a made-up one. */
    const ref=(serverResult&&serverResult.ref)||'';

    /* The PDF is built by the shared engine (js/pdf/docs/join.js). deliver() also wires
       the Download / Share buttons and the PDF options panel, and returns null if the
       PDF could not be created on this device. */
    const dl=$('join-dl'),share=$('join-share'),wa=$('join-wa');
    let pdf=null;
    try{pdf=await window.SSCPCPdf.deliver({id:'join',data:Object.assign({},d,{ref:ref}),dl:dl,share:share,
      shareTitle:'SSCPC membership application',shareText:'SSCPC membership application'+(ref?' '+ref:''),optionsEl:$('join-pdf-opts')})}catch(err){pdf=null}

    const first=clean(d.name).split(' ')[0]||'';
    const refLine=ref?' Membership number: '+ref+'.':' Your membership number will be confirmed by the club.';
    $('join-status').textContent='Thank you'+(first?', '+first:'')+'. Your application has been received.'+refLine
      +(pdf?'':' The PDF could not be created on this device, but you can message the president on WhatsApp.');

    const num=(typeof PRESIDENT_WHATSAPP==='string'?PRESIDENT_WHATSAPP:'').replace(/\D/g,'');
    const msg='Hello, I applied to join SSCPC.\n'+(ref?'Membership number: '+ref+'\n':'')+'Name: '+clean(d.name)+'\nGrade: '+clean(d.grade)+'\nPhone: '+clean(d.phone)+'\nI can send the PDF of my application.';
    const link=(typeof PRESIDENT_WHATSAPP_LINK==='string'?PRESIDENT_WHATSAPP_LINK:'').trim();
    wa.href=num?'https://wa.me/'+num+'?text='+encodeURIComponent(msg):(link||'https://wa.me/?text='+encodeURIComponent(msg));

    f.reset();f.hidden=true;$('join-done').hidden=false;
    btn.disabled=false;btn.textContent='Submit application';
    $('join-done').scrollIntoView({block:'center'});
  });
})();
