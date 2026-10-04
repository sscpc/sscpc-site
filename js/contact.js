(function(){
  const f=document.getElementById('contact-form');
  if(!f)return;
  const $=id=>document.getElementById(id);
  const msg=$('contact-msg'),btn=$('contact-btn');

  f.addEventListener('submit',async e=>{
    e.preventDefault();

    /* Guards against a double tap/click and any re-entrant submit while a
       request is already in flight -- disabled is set synchronously below,
       before anything async happens, so a second submit event hits this
       check and stops here. */
    if(btn.disabled)return;
    btn.disabled=true;btn.textContent='Sending...';msg.hidden=true;

    const fd=new FormData(f);

    let sendErr=null;
    try{await sendForm(fd,'contact')}catch(err){sendErr=err}

    /* A thrown error (offline, or the script returned a non-OK HTTP
       status) is a genuine failure: nothing was saved. Show a clear error,
       leave every field exactly as typed, and re-enable the button so the
       visitor can just try again -- never a "received" message. */
    if(sendErr){
      msg.textContent=formError(sendErr,'Your message')+' Nothing you entered has been cleared -- you can press "Send Message" again once you\'re back online.';
      msg.hidden=false;
      btn.disabled=false;btn.textContent='Send Message';
      msg.scrollIntoView({block:'center'});
      return;
    }

    const name=(fd.get('name')||'').toString().trim().split(' ')[0];
    $('contact-status').textContent='Thank you'+(name?', '+name:'')+'. Your message has been received -- the club will get back to you soon.';

    f.reset();f.hidden=true;
    $('contact-done').hidden=false;
    $('contact-done').scrollIntoView({block:'center'});
    btn.disabled=false;btn.textContent='Send Message';
  });
})();
