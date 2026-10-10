(function(){
  const f=document.getElementById('reg-form');
  if(!f)return;
  const msg=document.getElementById('reg-msg'),btn=document.getElementById('reg-btn');
  const confirmBox=f.querySelector('[name="confirm"]');
  const clean=v=>String(v==null?'':v).replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g,'?').trim();

  /* Students attending must exactly match the number of student names filled
     in below -- back to the original way: one named box per student. */
  const studentsInput=document.getElementById('reg-students');
  const namesWrap=document.getElementById('reg-student-names-wrap');
  const namesList=document.getElementById('reg-student-names');
  const namesCount=document.getElementById('reg-names-count');
  const MAX_STUDENTS=300;

  function studentsWanted(){
    const n=Math.floor(Number(studentsInput.value));
    return Number.isFinite(n)&&n>0?n:0;
  }

  /* The names actually typed so far, in order, skipping blank boxes. */
  function parseNames(){
    return Array.prototype.map.call(namesList.querySelectorAll('input[name="student_name"]'),i=>i.value.trim()).filter(Boolean);
  }

  function updateNamesCount(){
    const wanted=studentsWanted();
    const got=parseNames().length;
    if(!wanted){namesCount.textContent='';namesCount.classList.remove('err');return;}
    namesCount.textContent=got+' of '+wanted+' student names entered.';
    namesCount.classList.toggle('err',got!==wanted);
  }

  function renderStudentNames(n){
    n=Math.floor(Number(n));
    if(!Number.isFinite(n)||n<0)n=0;
    if(n>MAX_STUDENTS)n=MAX_STUDENTS;
    const existing=Array.prototype.map.call(namesList.querySelectorAll('input[name="student_name"]'),i=>i.value);
    namesList.innerHTML='';
    for(let i=0;i<n;i++){
      const lbl=document.createElement('label');
      lbl.className='fld';
      const span=document.createElement('span');
      span.textContent=(i+1)+'. Student name';
      const inp=document.createElement('input');
      inp.type='text';inp.name='student_name';
      inp.placeholder='e.g. Student full name';
      inp.value=existing[i]||'';
      inp.addEventListener('input',updateNamesCount);
      lbl.appendChild(span);lbl.appendChild(inp);
      namesList.appendChild(lbl);
    }
    namesWrap.hidden=(n===0);
    updateNamesCount();
  }
  if(studentsInput){
    studentsInput.addEventListener('input',()=>renderStudentNames(studentsInput.value));
    renderStudentNames(studentsInput.value);
  }

  /* Message: "None / No message" quick option */
  const msgText=document.getElementById('reg-message');
  const msgNone=document.getElementById('reg-message-none');
  if(msgNone&&msgText){
    msgNone.addEventListener('change',()=>{
      if(msgNone.checked){
        msgText.dataset.prev=msgText.value;
        msgText.value='None / No message';
        msgText.readOnly=true;
      }else{
        msgText.value=msgText.dataset.prev||'';
        msgText.readOnly=false;
      }
    });
  }

  f.addEventListener('submit',async e=>{
    e.preventDefault();

    /* Number of students attending must exactly match the number of student
       names filled in. Block submission with a clear message and keep every
       field the visitor already entered -- nothing is cleared. */
    const wanted=studentsWanted();
    const names=parseNames();
    if(wanted&&names.length!==wanted){
      updateNamesCount();
      msg.textContent='You said '+wanted+' student'+(wanted===1?'':'s')+' attending, but '+names.length+' student name'+(names.length===1?'':'s')+' '+(names.length===1?'was':'were')+' filled in. Please fill in all '+wanted+' name'+(wanted===1?'':'s')+'.';
      msg.hidden=false;
      const firstEmpty=Array.prototype.find.call(namesList.querySelectorAll('input[name="student_name"]'),i=>!i.value.trim());
      (firstEmpty||namesList).focus&&(firstEmpty||namesList).focus();
      return;
    }

    /* Required confirmation is actually enforced: block submission, show a
       clear message, keep every field the visitor already entered. */
    if(confirmBox&&!confirmBox.checked){
      msg.textContent='Please tick "I confirm that the details above are correct and that I am registering on behalf of my school" before submitting.';
      msg.hidden=false;
      confirmBox.focus();
      return;
    }

    /* Guards against a double tap/click and any re-entrant submit while a
       request is already in flight -- the button is disabled synchronously
       below, before anything async happens, so a second submit event
       (e.g. from pressing Enter again) hits this check and stops here. */
    if(btn.disabled)return;
    btn.disabled=true;btn.textContent='Sending...';msg.hidden=true;

    const fd=new FormData(f);
    const d={};['school','mic_name','mic_phone','email','phone','students','teachers','message'].forEach(k=>d[k]=fd.get(k)||'');
    d.student_names=names.map((n,i)=>(i+1)+'. '+n).join('\n');
    d.student_list=names;

    let sendErr=null;
    try{await sendForm(fd,'registration')}catch(err){sendErr=err}

    /* A thrown error (offline, or the script returned a non-OK HTTP
       status) is a genuine failure: nothing was saved. Show a clear error,
       leave every field exactly as the visitor typed it, and re-enable the
       button so they can just try again -- never a "received" message,
       and never a made-up reference. */
    if(sendErr){
      msg.textContent=formError(sendErr,'Registration')+' Nothing you entered has been cleared -- you can press "Submit registration" again once you\'re back online.';
      msg.hidden=false;
      btn.disabled=false;btn.textContent='Submit registration';
      msg.scrollIntoView({block:'center'});
      return;
    }

    const ref='SSCPC-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
    /* The PDF is built by the shared engine (js/pdf/docs/register.js). deliver() also
       wires the Download / Share buttons and the PDF options panel. */
    const dl=document.getElementById('reg-dl'),share=document.getElementById('reg-share');
    let pdf=null;
    try{pdf=await window.SSCPCPdf.deliver({id:'register',data:Object.assign({},d,{ref:ref}),dl:dl,share:share,
      shareTitle:'SSCPC visitor registration',shareText:'SSCPC visitor registration '+ref,optionsEl:document.getElementById('reg-pdf-opts')})}catch(err){pdf=null}

    const status=document.getElementById('reg-status');
    status.textContent='Thank you. Your registration has been received. Reference: '+ref+'. Please send it to the president on WhatsApp.'
      +(pdf?'':' The PDF could not be created on this device.');

    const wa=document.getElementById('reg-wa');
    if(wa){
      const num=(typeof PRESIDENT_WHATSAPP==='string'?PRESIDENT_WHATSAPP:'').replace(/\D/g,'');
      const link=(typeof PRESIDENT_WHATSAPP_LINK==='string'?PRESIDENT_WHATSAPP_LINK:'').trim();
      const wmsg='Hello, I registered for Spectrum 2026.\nReference: '+ref+'\nSchool: '+clean(d.school)+'\nTeacher in charge: '+clean(d.mic_name)+'\nStudents: '+clean(d.students)+', Teachers: '+clean(d.teachers)+'\nI can send the PDF of my registration.';
      wa.href=num?'https://wa.me/'+num+'?text='+encodeURIComponent(wmsg):(link||'https://wa.me/?text='+encodeURIComponent(wmsg));
    }

    f.reset();f.hidden=true;
    if(msgText)msgText.readOnly=false;
    renderStudentNames(0);
    document.getElementById('reg-done').hidden=false;
    document.getElementById('reg-done').scrollIntoView({block:'center'});
    btn.disabled=false;btn.textContent='Submit registration';
  });
})();
