import {AXES, createSession, currentQuestion, answerQuestion, previousQuestion, scoreSession, buildLocalCommentary} from './engine.js';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const dialogContent = document.querySelector('#dialog-content');
const state = {page:'home', session:null, selected:null, text:'', result:null, commentary:null, aiStatus:null, aiBusy:false, aiError:'', consent:false};
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {power:'axis-governance',frontier:'axis-security',identity:'axis-openness',meaning:'axis-knowledge'};
const refs = [
  ['16Personalities','https://www.16personalities.com/personality-types','借鉴易读的人格类型卡片与结果摘要。'],
  ['8values','https://8values.github.io/','借鉴四条对立轴与双端分数的表达。'],
  ['Political Compass','https://www.politicalcompass.org/test/en','借鉴将倾向可视化的测评流程。'],
  ['VA-11 Hall-A','https://sukebangames.itch.io/valhalla-bar','借鉴酒馆里的来客、对话与世界切片。'],
  ['Coffee Talk','https://www.togeproductions.com/project/coffee-talk/','借鉴暖饮、夜色和舒缓的互动节奏。'],
  ['Stellaris · 官方帝国测试','https://www.paradoxinteractive.com/games/stellaris/stellaris-quiz','借鉴思潮、政体与文明故事的组合结论。'],
  ['Stellaris · Galactic Paragons','https://www.paradoxinteractive.com/games/stellaris/add-ons/stellaris-galactic-paragons','借鉴用国策让文明倾向变成角色设定。']
];
const descriptions = {
  共治:'重要的决定，应该留给更多人共同参与。你在意声音是否被听见，也在意权力能否被约束。',
  集权:'风暴来临时，总要有人接过船舵。你偏向清晰的职责与有行动力的决策中心。',
  守望:'文明的勇气，也包括守住已有的生活。你倾向谨慎应对冲突、给协商留出时间。',
  扩张:'有些边界，只有走出去才能理解。你倾向主动介入风险，并为未来争取空间。',
  开放:'陌生的来客，也可能带来新的星图。你倾向接纳差异、交换经验与建立连接。',
  内聚:'一张共同的地图，让远航的人记得彼此。你在意共同体的边界、承诺与延续。',
  实证:'在决定方向前，你想先看看证据。你倾向可检验的知识、试验与持续修正。',
  信念:'有些航行，不只为了抵达。你在意意义、价值与让人愿意继续前行的故事。'
};

function focusMain(){ main.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
function setPage(page){state.page=page;render();focusMain();}
function toast(text){const t=document.querySelector('#toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}
function showDialog(html){dialogContent.innerHTML=html;dialog.showModal();}
function render(){
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.action===(state.page==='archive'?'archive':'home')));
  if(state.page==='home')renderHome();
  if(state.page==='question')renderQuestion();
  if(state.page==='result')renderResult();
  if(state.page==='archive')renderArchive();
}
function renderHome(){
  const hasRun = state.session && !state.session.complete;
  main.innerHTML=`<section class="hero hero-v22 fade-in"><div class="hero-v22-visual" role="img" aria-label="星象酒馆的黄昏露台，侍者在灯光中邀请你入座"></div><div class="hero-copy"><div class="hero-content"><span class="eyebrow">DUSKLIGHT TAVERN · 只此一场文明访谈</span><h1>宇宙很大。<br>你会建立<br>怎样的<em>文明</em>？</h1><p class="hero-intro">夜幕将至，暮灯星栈仍为远行者点着灯。<br>一杯酒，十四段对话，见证你心中的文明。</p><div class="hero-actions"><button class="button" data-action="start"><img class="button-icon" src="./assets/icon-play.webp" alt="">${hasRun?'继续这场访谈':state.session?.complete?'查看文明档案':'推开酒馆的门'} <span>↗</span></button><small>约 5–8 分钟<br>14 段随机访谈</small></div><p class="hero-note">无需注册 · 每次相遇都不同 · 免费体验</p></div></div><div class="hero-scroll-note">✧ &nbsp; WELCOME TO THE DUSKLIGHT TAVERN &nbsp; ✧</div></section><section class="feature-row" aria-label="体验特点"><div class="feature"><img src="./assets/icon-compass.webp" alt="" class="feature-icon"><div><h2>每一次航行，都不同</h2><p>随机路线与回答分叉，让每次访谈都留下新的故事。</p></div></div><div class="feature"><img src="./assets/axis-governance.webp" alt="" class="feature-icon"><div><h2>八种思潮，一种属于你的文明</h2><p>四条思潮光谱，勾勒权力、边界、共同体与信念。</p></div></div><div class="feature"><img src="./assets/result-emblem.webp" alt="" class="feature-icon"><div><h2>带走一张文明纪念卡</h2><p>获得国策和酒保赠言，保存属于你的星海档案。</p></div></div></section>`;
}
function renderQuestion(){
  const q=currentQuestion(state.session);
  if(!q){finish();return;}
  const number=state.session.answers.length+1;
  const isOpen=q.type==='open';
  const letters='ABCDEFG';
  const flavor=q.type==='flavor';
  main.innerHTML=`<section class="journey fade-in"><div class="journey-top"><button class="text-button" data-action="back" ${number===1?'disabled':''}>← 上一段对话</button><span>航程 ${String(number).padStart(2,'0')} / ${state.session.total} · ${flavor?'酒馆插曲':isOpen?'留一句话':'星港访谈'}</span></div><div class="progress" aria-label="进度 ${number} / ${state.session.total}">${Array.from({length:state.session.total},(_,i)=>`<span class="${i<number-1?'done':i===number-1?'current':''}"></span>`).join('')}</div><div class="question-layout"><aside class="story-side"><img class="portrait" src="./assets/bartender-head-v22.webp" alt="酒馆侍者柚灯"><h3>${e(q.speaker||'柚灯')}</h3><small>YOUR BARTENDER</small><p>${e(q.scene||'暖色灯光落在杯沿，酒保把下一杯放到了你面前。')}</p></aside><div class="question-panel"><div class="scene-tag">${flavor?'一杯小插曲':isOpen?'在离港之前':'暮灯星栈 · 今夜的话题'}</div><h1>${e(q.prompt)}</h1>${!isOpen?`<div class="options" role="group" aria-label="选择你的回答">${q.options.map((o,i)=>`<button type="button" class="option ${state.selected===o.id?'selected':''}" data-option="${e(o.id)}" aria-pressed="${state.selected===o.id}"><span class="option-letter">${letters[i]}</span><span><strong>${e(o.label)}</strong>${o.detail?`<small>${e(o.detail)}</small>`:''}</span></button>`).join('')}</div>`:''}${(isOpen||q.allowText)?`<label class="optional-note" for="answer-text">${isOpen?'你可以写下自己的想法，也可以直接留白。':'愿意的话，补一句你的理由。'} <span class="tiny-label">选填 · <span id="text-count">${state.text.length}</span>/800</span></label><textarea class="answer-text ${isOpen?'large':''}" id="answer-text" maxlength="800" placeholder="${isOpen?'如果这是你的文明，你希望它被怎样记住？':'比起选项，我更想说……'}">${e(state.text)}</textarea>`:''}<p id="question-error" class="question-error" role="alert"></p><div class="question-actions"><small>${flavor?'这段插曲只调节气氛，随心选择。':isOpen?'你写下的话只在本次浏览器页面中保留。':'没有正确答案，只选此刻更接近你的那一个。'}</small><button class="button" data-action="next">${number===state.session.total?'写下我的文明':'继续聊聊'} <span>→</span></button></div></div></div></section>`;
}
function finish(){state.result=scoreSession(state.session);state.commentary=buildLocalCommentary(state.result,state.session);state.aiError='';state.consent=false;setPage('result');}
function renderResult(){
  const r=state.result,c=state.commentary;
  const configured=false;
  main.innerHTML=`<section class="result fade-in"><div class="result-header"><img src="./assets/result-emblem.webp" alt="文明徽章"><div><span class="eyebrow">YOUR CIVILIZATION · ${e(r.code)}</span><h1>${e(r.title)}</h1><p>${e(r.subtitle)}</p></div></div><div class="result-v22-hero"><div class="result-visual" role="img" aria-label="${e(r.title)}文明档案卡片"><div class="result-visual-title">${e(r.title)}</div><div class="result-visual-slot slot-one">${e(r.civics[0]?.name || '远航者')}</div><div class="result-visual-slot slot-two">${e(r.civics[1]?.name || '星海旅人')}</div><div class="result-visual-slot slot-three">${e(r.code)} · YOUR CIVILIZATION</div></div><div class="result-v22-intro"><span class="eyebrow">YOUR STARBOUND CIVILIZATION</span><h2>每段航程，<br>都值得被记录。</h2><p>由你的回答生成思潮光谱与国策组合。点击下方按钮，就能将这份文明档案保存为图片。</p><button class="button" data-action="download"><img class="button-icon" src="./assets/icon-download.webp" alt="">保存文明纪念卡 ↓</button></div></div><div class="result-grid"><section class="result-box"><div class="box-heading"><h2>你的思潮光谱</h2><span class="tiny-label">ETHOS</span></div>${r.axes.map(a=>`<div class="axis"><div class="axis-labels"><span class="${a.leftPercent>=a.rightPercent?'emphasis':''}">${e(a.left)}</span><span class="${a.rightPercent>=a.leftPercent?'emphasis':''}">${e(a.right)}</span></div><div class="axis-bar" role="img" aria-label="${e(a.left)} ${a.leftPercent}%，${e(a.right)} ${a.rightPercent}%"><span class="axis-left" style="width:${a.leftPercent}%"></span><span class="axis-right" style="width:${a.rightPercent}%"></span></div><div class="axis-meta"><span>${a.leftPercent}%</span><span>${a.evidenceCount} 次情境选择</span><span>${a.rightPercent}%</span></div></div>`).join('')}</section><section class="result-box"><div class="box-heading"><h2>你的文明国策</h2><span class="tiny-label">CIVICS</span></div>${r.civics.map((x,i)=>`<article class="civic"><img src="./assets/${icons[r.dominant[i]?.axisId]||'axis-governance'}.webp" alt=""><div><h3>${e(x.name)}</h3><p>${e(x.description)}</p></div></article>`).join('')}<p class="result-footnote">国策由你的思潮组合生成，是这场银河角色扮演的设定。</p></section></div><section class="result-box commentary-box"><div class="box-heading"><h2>酒保的临别赠言</h2><span class="source-badge">${c.source==='ai'?'DEEPSEEK · AI 评语':'柚灯 · 本地评语'}</span></div><div class="commentary-text"><h3>${e(c.headline)}</h3>${c.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}${c.quote?`<blockquote>“${e(c.quote)}”</blockquote>`:''}</div><p class="result-footnote">这份酒保评语在浏览器内生成，不需要账户，不上传你的回答。</p></section><div class="result-bottom"><button class="text-button" data-action="archive">翻阅其他思潮档案 ↗</button><div><button class="button secondary" data-action="download">下载文明卡 ↓</button><button class="button secondary" data-action="restart">再来一杯 ↻</button></div></div><p class="result-footnote">分数是本次情境回答的倾向分布，不代表概率或测量准确率。这是借鉴太空策略游戏的原创娱乐测试，不是心理诊断，也不定义你的现实政治身份。开放文字与趣味题不改变分数。</p></section>`;
}
function renderArchive(){
  main.innerHTML=`<section class="archive fade-in"><span class="eyebrow">THE CIVILIZATION ARCHIVE</span><h1>同一片星空，不同的航向。</h1><p class="archive-intro">四条对立轴，八种文明思潮。它们描述你在特定情境里的取舍，<br>你可以同时理解两端，也可以随经历改变自己的答案。</p><div class="ethics-grid">${AXES.flatMap(a=>[a.left,a.right].map((name,i)=>`<button class="ethic-card" data-ethic="${e(name)}"><img src="./assets/${icons[a.id]}.webp" alt=""><h2>${e(name)}</h2><p>${e(descriptions[name])}</p><span class="tiny-label">${e(a.left)} / ${e(a.right)} <span>↗</span></span></button>`)).join('')}</div></section>`;
}
function requestRestart(){showDialog('<h2>开启另一场星港访谈？</h2><p>新的航程会重新抽取问题。你可以先下载这一份文明卡，下一场访谈会替换当前结果。</p><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">留在这里</button><button class="button" data-action="confirm-restart">再来一杯 →</button></div>');}
function startNew(){state.session=createSession();state.selected=null;state.text='';state.result=null;state.commentary=null;state.aiBusy=false;state.aiError='';dialog.close();setPage('question');}
async function downloadCard(){
  const r=state.result;
  if(!r)return;
  const image=new Image();
  image.src='./assets/result-card-v22.webp';
  try{
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=900;canvas.height=1125;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0,900,1125);
    ctx.textAlign='center';
    ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=8;
    ctx.fillStyle='#f5e3b9';ctx.font='bold 43px "Songti SC","Microsoft YaHei",serif';
    ctx.fillText(r.title.length>15?r.title.slice(0,15):r.title,450,535,620);
    ctx.fillStyle='#f0e9db';ctx.font='bold 31px "Microsoft YaHei",sans-serif';
    ctx.fillText(r.civics[0]?.name||'星际远行者',500,691,470);
    ctx.fillText(r.civics[1]?.name||'星海旅人',500,808,470);
    ctx.font='20px sans-serif';ctx.fillStyle='#e5c18c';
    ctx.fillText(`${r.code} · 暮灯星栈`,505,921,480);
    canvas.toBlob(blob=>{
      if(!blob){toast('下载失败，请重试。');return;}
      const link=document.createElement('a');const url=URL.createObjectURL(blob);
      link.href=url;link.download=`暮灯星栈-${r.title}.png`;
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),4000);
      toast('文明卡 PNG 已生成，欢迎分享。');
    },'image/png');
  }catch(error){
    toast('纪念卡图片未加载完成，请刷新后重试。');
  }
}

document.addEventListener('click',event=>{
  const option=event.target.closest('[data-option]');
  if(option){state.selected=option.dataset.option;document.querySelectorAll('.option').forEach(b=>{const selected=b.dataset.option===state.selected;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});document.querySelector('#question-error').textContent='';return;}
  const ethic=event.target.closest('[data-ethic]');if(ethic){const name=ethic.dataset.ethic;showDialog(`<h2>${e(name)}</h2><p>${e(descriptions[name])}</p><p>思潮不是固定标签。同一人在不同问题里，可能选择这条轴的不同方向。结果会综合你的情境选择，而开放回答不参与计分。</p>`);return;}
  const button=event.target.closest('[data-action]');if(!button)return;event.preventDefault();
  switch(button.dataset.action){
    case 'home':setPage('home');break;
    case 'archive':setPage('archive');break;
    case 'start':if(state.session?.complete){setPage('result');}else if(state.session){setPage('question');}else startNew();break;
    case 'restart':requestRestart();break;
    case 'confirm-restart':startNew();break;
    case 'back':if(state.session.answers.length){state.session=previousQuestion(state.session);const q=currentQuestion(state.session);state.selected=null;state.text='';setPage('question');}break;
    case 'next':try{const q=currentQuestion(state.session);if(q.type!=='open'&&!state.selected)throw new Error('先选一个更接近你的回答吧。');state.session=answerQuestion(state.session,{optionId:state.selected,text:state.text.trim()});state.selected=null;state.text='';if(state.session.complete)finish();else{renderQuestion();focusMain();}}catch(error){document.querySelector('#question-error').textContent=error.message;}break;
    case 'close-dialog':dialog.close();break;
    case 'references':showDialog(`<h2>从这些世界采样。</h2><p>我们借鉴体验与结构，题目、酒馆世界观、插画与国策描述均为原创。这不是任何参考作品的官方测试。</p><ul class="reference-list">${refs.map(([name,url,desc])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${e(name)} ↗</a><small>${e(desc)}</small></li>`).join('')}</ul>`);break;
    case 'about':showDialog('<h2>一场访谈，不是一张定论。</h2><p>14 段对话中，每条思潮轴至少有两道核心题，再加入回答触发的追问、随机话题、两道零分插曲和一段开放回答。相同的人重测，也可能遇见不同的情境。</p><p>思潮分数由明确选择计算；趣味题与开放文字不参与计分。百分比是倾向分布，不是概率或科学测量的准确率。国策是思潮组合形成的原创角色设定。</p><p>当前公开版本仅在浏览器内运行。没有账号或答题数据库，也不上传答案；刷新网页会结束当前访谈。将来若接入 AI 服务，会另行说明发送范围和征求同意。</p><p>网站免费使用，目前无需后端 AI 服务。本项目与 Paradox 及其他参考作品没有官方关联。</p>');break;
    case 'download':downloadCard();break;
  }
});
document.addEventListener('input',event=>{if(event.target.id==='answer-text'){state.text=event.target.value;document.querySelector('#text-count').textContent=state.text.length;}});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
render();
