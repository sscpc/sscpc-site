(function(){
  const f=document.getElementById('join-form');
  if(!f)return;
  const $=id=>document.getElementById(id);
  const clean=v=>String(v==null?'':v).replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g,'?').trim();

  async function logoData(){
    try{
      const img=document.querySelector('.brand img');
      if(img.decode)await img.decode();
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png');
    }catch(e){return null}
  }

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
    doc.text('Membership Application',44,33);
    let y=56;
    doc.setTextColor(90,94,130);doc.setFontSize(9);
    doc.text('Membership No.: '+(ref||'pending -- contact the club'),14,y);
    doc.text('Date: '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),W-14,y,{align:'right'});
    y+=10;
    const rows=[['Full name',d.name],['Grade',d.grade],['Admission number',d.admission],['Phone / WhatsApp',d.phone],['Email',d.email],
      ['Parent / guardian',d.guardian],['Guardian phone',d.guardian_phone],['Photography experience',d.experience],
      ['Equipment',d.equipment],['Interests',d.interests],['Why I want to join',d.why]];
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
    doc.text('Please send this application to the President of SSCPC.',14,288);
    const name='SSCPC-Application-'+clean(d.name).replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.pdf';
    return {blob:doc.output('blob'),name};
  }

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

    let pdf=null;
    try{pdf=await makePdf(d,ref)}catch(err){pdf=null}

    const first=clean(d.name).split(' ')[0]||'';
    const refLine=ref?' Membership number: '+ref+'.':' Your membership number will be confirmed by the club.';
    $('join-status').textContent='Thank you'+(first?', '+first:'')+'. Your application has been received.'+refLine
      +(pdf?'':' The PDF could not be created on this device, but you can message the president on WhatsApp.');

    const dl=$('join-dl'),share=$('join-share'),wa=$('join-wa');
    dl.hidden=!pdf;share.hidden=true;
    if(pdf){
      dl.href=URL.createObjectURL(pdf.blob);dl.download=pdf.name;
      const file=new File([pdf.blob],pdf.name,{type:'application/pdf'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        share.hidden=false;
        share.onclick=()=>navigator.share({files:[file],title:'SSCPC membership application',text:'SSCPC membership application'+(ref?' '+ref:'')}).catch(()=>{});
      }
    }
    const num=(typeof PRESIDENT_WHATSAPP==='string'?PRESIDENT_WHATSAPP:'').replace(/\D/g,'');
    const msg='Hello, I applied to join SSCPC.\n'+(ref?'Membership number: '+ref+'\n':'')+'Name: '+clean(d.name)+'\nGrade: '+clean(d.grade)+'\nPhone: '+clean(d.phone)+'\nI can send the PDF of my application.';
    const link=(typeof PRESIDENT_WHATSAPP_LINK==='string'?PRESIDENT_WHATSAPP_LINK:'').trim();
    wa.href=num?'https://wa.me/'+num+'?text='+encodeURIComponent(msg):(link||'https://wa.me/?text='+encodeURIComponent(msg));

    f.reset();f.hidden=true;$('join-done').hidden=false;
    btn.disabled=false;btn.textContent='Submit application';
    $('join-done').scrollIntoView({block:'center'});
  });
})();
