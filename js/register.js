(function(){
  const f=document.getElementById('reg-form');
  if(!f)return;
  const msg=document.getElementById('reg-msg'),btn=document.getElementById('reg-btn');
  const confirmBox=f.querySelector('[name="confirm"]');
  const clean=v=>String(v==null?'':v).replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g,'?').trim();

  async function logoData(){
    try{
      const img=document.querySelector('.brand img');
      if(img.decode)await img.decode();
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png');
    }catch(e){return null}
  }

  /* Builds a PDF copy of the registration, same style as the Join Us
     application PDF, so a visitor school always has a copy of what they
     submitted -- to keep, print, or send to the organisers on WhatsApp. */
  async function makePdf(d,ref){
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4'}),W=210;
    const logo=await logoData();
    doc.setFillColor(18,24,63);doc.rect(0,0,W,40,'F');
    doc.setFillColor(125,21,38);doc.rect(0,40,W,2.5,'F');
    if(logo)doc.addImage(logo,'PNG',14,8,24,24);
    doc.setTextColor(244,241,228);doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text('SSCPC',44,20);
    doc.setFont('helvetica','normal');doc.setFontSize(10);
    doc.text("St. Sylvester's College Photography Club",44,27);
    doc.text('Spectrum Visitor Registration',44,33);
    let y=56;
    doc.setTextColor(90,94,130);doc.setFontSize(9);
    doc.text('Reference: '+ref,14,y);
    doc.text('Date: '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),W-14,y,{align:'right'});
    y+=10;
    const rows=[['School name',d.school],['Teacher in charge name',d.mic_name],['Teacher in charge telephone number',d.mic_phone],
      ['Club email',d.email],["President's name",d.president_name],["President's phone / WhatsApp",d.phone],['Students attending',d.students],['Teachers attending',d.teachers],
      ['Student names',d.student_names],['Message',d.message]];
    rows.forEach(([k,v])=>{
      v=clean(v);if(!v)return;
      const lines=doc.splitTextToSize(v,W-28);
      if(y+8+lines.length*5.5>275){doc.addPage();y=20}
      doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(125,21,38);doc.text(k.toUpperCase(),14,y);
      doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(18,24,63);doc.text(lines,14,y+6);
      y+=6+lines.length*5.5+4;
      doc.setDrawColor(216,207,159);doc.line(14,y-2,W-14,y-2);y+=2;
    });
    doc.setFontSize(9);doc.setTextColor(90,94,130);
    doc.text('Please keep this as your copy of the registration.',14,288);
    const name='SSCPC-Registration-'+clean(d.school).replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.pdf';
    return {blob:doc.output('blob'),name};
  }

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
    let pdf=null;
    try{pdf=await makePdf(d,ref)}catch(err){pdf=null}

    const status=document.getElementById('reg-status');
    status.textContent='Thank you. Your registration has been received. Reference: '+ref+'. Please send it to the president on WhatsApp.'
      +(pdf?'':' The PDF could not be created on this device.');

    const dl=document.getElementById('reg-dl'),share=document.getElementById('reg-share');
    dl.hidden=!pdf;share.hidden=true;
    if(pdf){
      dl.href=URL.createObjectURL(pdf.blob);dl.download=pdf.name;
      const file=new File([pdf.blob],pdf.name,{type:'application/pdf'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        share.hidden=false;
        share.onclick=()=>navigator.share({files:[file],title:'SSCPC visitor registration',text:'SSCPC visitor registration '+ref}).catch(()=>{});
      }
    }

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
