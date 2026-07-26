
(()=>{
const $=id=>document.getElementById(id);
let mode=null,stages=[],index=0,remaining=0,running=false,timer=null,endAt=0,audioUnlocked=false;
const warningBellAudio=$('warningBellAudio'),fourBellAudio=$('fourBellAudio'),announcementAudio=$('announcementAudio');
const els={home:$('home'),view:$('timerView'),title:$('appTitle'),back:$('backBtn'),round:$('roundLabel'),stage:$('stageLabel'),clock:$('clock'),next:$('nextLabel'),progress:$('progress'),status:$('status'),start:$('startPause'),automaticAction:$('automaticAction'),compSettings:$('competitionSettings'),dropSettings:$('dropoffSettings'),audioLock:$('audioLock'),sequenceCard:$('sequenceCard'),sequenceTitle:$('sequenceTitle'),sequenceList:$('sequenceList')};
const competitionDefaultIds=['rounds','halfMinutes','halftimeMinutes','changeMinutes','warningEnabled','voiceEnabled','hornVolume'];
const dropoffDefaultIds=['dropWarningMinutes','dropIntervalMinutes','dropHornCount','dropVoiceEnabled','hornVolume'];

function fmt(s){s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}

function playAudio(audio,statusText,done){
  try{
    warningBellAudio.pause();fourBellAudio.pause();announcementAudio.pause();
    audio.currentTime=0;
    audio.volume=+$('hornVolume').value;
    const p=audio.play();
    if(p&&typeof p.then==='function'){
      p.then(()=>{
        els.status.textContent=statusText;
        const finish=()=>{audio.removeEventListener('ended',finish);if(done)done()};
        audio.addEventListener('ended',finish,{once:true});
      }).catch(()=>{
        els.status.textContent='Bell sound was blocked. Tap Enable & Test Sound again.';
        if(done)done();
      });
    }
  }catch(e){
    els.status.textContent='Bell sound could not start. Tap Enable & Test Sound.';
    if(done)done();
  }
}

function horn(done){playAudio(fourBellAudio,'Four church-bell chimes playing.',done)}

function playAnnouncement(done){
  const enabled=mode==='dropoff' ? $('dropVoiceEnabled').checked : $('voiceEnabled').checked;
  if(!enabled){if(done)done();return}
  announcementAudio.pause();
  announcementAudio.currentTime=0;
  announcementAudio.volume=1;
  const p=announcementAudio.play();
  if(p&&typeof p.then==='function'){
    p.then(()=>{
      els.status.textContent='Voice announcement playing.';
      const finish=()=>{announcementAudio.removeEventListener('ended',finish);if(done)done()};
      announcementAudio.addEventListener('ended',finish,{once:true});
    }).catch(()=>{
      els.status.textContent='Announcement was blocked. Tap Enable & Test Sound again.';
      if(done)done();
    });
  }
}

function warningSequence(){
  const enabled=mode==='dropoff' ? $('dropVoiceEnabled').checked : $('voiceEnabled').checked;
  playAudio(warningBellAudio,'Three warning chimes playing.',()=>{if(enabled)playAnnouncement()});
}

async function unlockAudio(){
  try{
    fourBellAudio.volume=+$('hornVolume').value;
    fourBellAudio.currentTime=0;
    await fourBellAudio.play();
    audioUnlocked=true;
    els.audioLock.classList.add('hidden');
    els.status.textContent='Four church-bell chimes test playing. Sound is enabled.';
  }catch(e){
    audioUnlocked=false;
    els.status.textContent='Safari blocked the bells. Tap Enable & Test Sound again.';
  }
}

function buildCompetition(){
  stages=[];
  const rounds=+$('rounds').value;
  const half=+$('halfMinutes').value*60;
  const halfTime=+$('halftimeMinutes').value*60;
  const change=+$('changeMinutes').value*60;
  const warnings=$('warningEnabled').checked;

  for(let r=1;r<=rounds;r++){
    if(r===1 && warnings){
      stages.push({
        label:`ROUND ${r} OF ${rounds}`,
        name:'One-minute warning',
        sec:60,
        type:'warning',
        hornAtEnd:true,
        warningAtStart:true,
        next:'First half'
      });
    }

    stages.push({
      label:`ROUND ${r} OF ${rounds}`,
      name:'First half',
      sec:half,
      type:'play',
      hornAtEnd:true,
      next:'Half-Time Break'
    });

    stages.push({
      label:`ROUND ${r} OF ${rounds}`,
      name:'Half-Time Break',
      sec:halfTime,
      type:'break',
      hornAtEnd:true,
      warningAtRemaining:warnings?60:null,
      next:'Second half'
    });

    stages.push({
      label:`ROUND ${r} OF ${rounds}`,
      name:'Second half',
      sec:half,
      type:'play',
      hornAtEnd:true,
      next:r<rounds?'Changeover between Games':'Competition complete'
    });

    if(r<rounds){
      stages.push({
        label:`NEXT: ROUND ${r+1}`,
        name:'Changeover between Games',
        sec:change,
        type:'break',
        hornAtEnd:true,
        warningAtRemaining:warnings?60:null,
        next:`Round ${r+1} first half`
      });
    }
  }
  resetState();
}

function buildDropoff(){
  stages=[];
  const w=+$('dropWarningMinutes').value*60,interval=+$('dropIntervalMinutes').value*60,count=+$('dropHornCount').value;
  stages.push({label:'DROP-OFF TIMER',name:'One-minute warning',sec:w,type:'warning',hornAtEnd:true,warningAtStart:true,next:'Drop-off starts'});
  for(let n=1;n<=count;n++){
    stages.push({label:'DROP-OFF TIMER',name:`Drop-off period ${n} of ${count}`,sec:interval,type:'dropoff',hornAtEnd:true,next:n<count?`Bell signal ${n+1} of ${count}`:'Drop-off complete'});
  }
  resetState();
}

function collectSettings(ids){
  const saved={};
  ids.forEach(id=>{
    const el=$(id);
    saved[id]=el.type==='checkbox'?el.checked:el.value;
  });
  return saved;
}

function applySettings(saved,ids){
  ids.forEach(id=>{
    const el=$(id);
    if(saved[id]===undefined)return;
    if(el.type==='checkbox')el.checked=Boolean(saved[id]);
    else el.value=String(saved[id]);
  });
}

function saveDefaults(){
  localStorage.setItem('gordonvaleCompetitionDefaults',JSON.stringify(collectSettings(competitionDefaultIds)));
  els.status.textContent='Competition settings saved as your defaults.';
}

function saveDropoffDefaults(){
  localStorage.setItem('gordonvaleDropoffDefaults',JSON.stringify(collectSettings(dropoffDefaultIds)));
  els.status.textContent='Drop-Off settings saved as your defaults.';
}

function loadDefaults(){
  try{
    const oldSaved=JSON.parse(localStorage.getItem('gordonvaleTouchTimerDefaults')||'{}');
    const competitionSaved=JSON.parse(localStorage.getItem('gordonvaleCompetitionDefaults')||'{}');
    const dropoffSaved=JSON.parse(localStorage.getItem('gordonvaleDropoffDefaults')||'{}');
    applySettings({...oldSaved,...competitionSaved},competitionDefaultIds);
    applySettings(dropoffSaved,dropoffDefaultIds);
  }catch(e){
    localStorage.removeItem('gordonvaleTouchTimerDefaults');
    localStorage.removeItem('gordonvaleCompetitionDefaults');
    localStorage.removeItem('gordonvaleDropoffDefaults');
  }
}


function renderSequence(){
  if(!mode){els.sequenceCard.classList.add('hidden');return}
  els.sequenceCard.classList.remove('hidden');
  els.sequenceTitle.textContent=mode==='competition'?'Competition sequence':'Drop-Off sequence';
  const iconFor=s=>s.type==='warning'?'🔔':s.type==='play'?'▶️':s.type==='dropoff'?'⏱️':'↔️';
  els.sequenceList.innerHTML=stages.map((s,i)=>`<div class="sequence-row"><span>${iconFor(s)}</span><strong>${i+1}. ${s.name}</strong><span>${fmt(s.sec)}</span></div>`).join('')+
    (mode==='competition'?'<div class="sequence-note">The sequence repeats automatically for each selected round.</div>':'<div class="sequence-note">No completion voice announcement is played.</div>');
}

function resetState(){
  clearInterval(timer);
  running=false;
  index=0;
  stages.forEach(stage=>stage.warningPlayed=false);
  remaining=stages[0]?.sec||0;
  renderSequence();
  render();
}

function setMode(m){
  mode=m;els.home.classList.add('hidden');els.view.classList.add('active');els.back.classList.remove('hidden');
  els.compSettings.classList.toggle('hidden',m!=='competition');els.dropSettings.classList.toggle('hidden',m!=='dropoff');
  els.title.textContent=m==='competition'?'Competition Timer':'Drop-Off Timer';
  document.documentElement.style.setProperty('--accent','var(--gold)');
  m==='competition'?buildCompetition():buildDropoff();
  els.status.textContent='Tap Enable & Test Sound before starting.';
}

function goHome(){pause();mode=null;els.view.classList.remove('active');els.home.classList.remove('hidden');els.back.classList.add('hidden');els.title.textContent='Touch Timer';els.status.textContent='Select a timer mode.';els.sequenceCard.classList.add('hidden')}

function automaticActionText(s){
  if(!s)return mode==='dropoff'?'Drop-Off complete':'Competition complete';

  if(s.type==='warning'){
    return `Four bell chimes and ${s.next} in ${fmt(remaining)}`;
  }

  if(s.warningAtRemaining && !s.warningPlayed && remaining>60){
    return `One-minute warning in ${fmt(remaining-60)}`;
  }

  if(s.name==='Half-Time Break'){
    return `Four bell chimes and Second half starts in ${fmt(remaining)}`;
  }

  if(s.name==='Changeover between Games'){
    return `Four bell chimes and ${s.next} starts in ${fmt(remaining)}`;
  }

  if(s.type==='dropoff'){
    const final=index===stages.length-1;
    return `${final?'Final four-bell signal':'Next four-bell signal'} in ${fmt(remaining)}`;
  }

  if(s.name==='First half'){
    return `Four bell chimes and Half-Time Break begins in ${fmt(remaining)}`;
  }

  if(s.name==='Second half'){
    return s.next==='Competition complete'
      ? `Final four bell chimes in ${fmt(remaining)}`
      : `Four bell chimes and Changeover begins in ${fmt(remaining)}`;
  }

  return `${s.next} in ${fmt(remaining)}`;
}

function render(){
  const s=stages[index];
  document.body.dataset.state=s?.type||'finished';
  els.round.textContent=s?s.label:(mode==='dropoff'?'DROP-OFF COMPLETE':'COMPETITION COMPLETE');
  els.stage.textContent=s?s.name:'Complete';
  els.clock.textContent=fmt(remaining);
  els.next.textContent=s?`Next: ${s.next}`:'No further automatic stages';
  els.automaticAction.textContent=automaticActionText(s);
  els.progress.style.width=s&&s.sec?`${Math.min(100,Math.max(0,(1-remaining/s.sec)*100))}%`:'100%';
  els.start.textContent=running?'Pause':index>=stages.length?'Finished':(index===0&&remaining===stages[0]?.sec?'Start':'Resume');
  els.start.disabled=index>=stages.length;
  $('reset').textContent=mode==='dropoff'?'Reset Drop-Off Timer':'Reset Competition Timer';
  $('skip').textContent='Skip to Next Stage';
}

function triggerStageWarningIfDue(){
  const s=stages[index];
  if(!s || s.warningPlayed)return;
  const dueAtStart=s.warningAtStart;
  const dueDuringStage=s.warningAtRemaining && remaining<=s.warningAtRemaining;
  if(dueAtStart || dueDuringStage){
    s.warningPlayed=true;
    warningSequence();
  }
}

function start(){
  if(!audioUnlocked){els.status.textContent='Tap Enable & Test Sound first so iPhone permits audio.';return}
  const s=stages[index];if(!s)return;
  triggerStageWarningIfDue();
  running=true;
  endAt=Date.now()+remaining*1000;
  clearInterval(timer);
  timer=setInterval(tick,200);
  render();
}

function pause(){
  if(running)remaining=Math.max(0,(endAt-Date.now())/1000);
  running=false;
  clearInterval(timer);
  render();
}

function tick(){
  remaining=Math.max(0,(endAt-Date.now())/1000);
  triggerStageWarningIfDue();
  if(remaining<=0){
    clearInterval(timer);
    completeStage();
  }
  render();
}

function completeStage(){
  const finished=stages[index];
  const proceed=()=>{
    index++;
    if(index>=stages.length){
      running=false;
      remaining=0;
      render();
      els.status.textContent=mode==='dropoff'
        ?'Drop-off complete. No voice announcement.'
        :'Competition complete.';
      return;
    }

    remaining=stages[index].sec;
    triggerStageWarningIfDue();
    running=true;
    endAt=Date.now()+remaining*1000;
    clearInterval(timer);
    timer=setInterval(tick,200);
    render();
  };

  if(finished?.hornAtEnd)horn(proceed);
  else proceed();
}

$('competitionMode').onclick=()=>setMode('competition');
$('dropoffMode').onclick=()=>setMode('dropoff');
els.back.onclick=goHome;
$('enableAudio').onclick=unlockAudio;
els.start.onclick=()=>running?pause():start();
$('manualHorn').onclick=()=>horn();
$('manualVoice').onclick=()=>playAnnouncement();
$('skip').onclick=()=>{clearInterval(timer);running=false;completeStage()};
$('reset').onclick=()=>mode==='competition'?buildCompetition():buildDropoff();
$('plusMinute').onclick=()=>{remaining+=60;if(running)endAt+=60000;render()};
$('minusMinute').onclick=()=>{remaining=Math.max(0,remaining-60);if(running)endAt=Math.max(Date.now(),endAt-60000);triggerStageWarningIfDue();render()};
$('saveDefaults').onclick=saveDefaults;
$('saveDropoffDefaults').onclick=saveDropoffDefaults;
['rounds','halfMinutes','halftimeMinutes','changeMinutes','warningEnabled'].forEach(id=>$(id).onchange=()=>{if(mode==='competition'&&!running)buildCompetition()});
['dropWarningMinutes','dropIntervalMinutes','dropHornCount','dropVoiceEnabled'].forEach(id=>$(id).onchange=()=>{if(mode==='dropoff'&&!running)buildDropoff()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running)tick()});
loadDefaults();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
