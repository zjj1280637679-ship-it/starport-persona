// 素材槽契约：graphic(图形) → image(静态) → gif(动图)，页面结构不变。
// 把文件放到 ./assets/，再改下面的 mode 和 src。例如：
// "home.hero": {mode:"image",src:"./assets/hero.webp",alt:"晚明宫城远景"}
// "question.q-p1": {mode:"gif",src:"./assets/q-p1.gif",alt:"议事场景"}。
// 支持 slot: home.background, home.hero, question.default, question.<题目ID>,
// character.default, character.<人物ID>, result.banner, icon.brand, icon.<名称>, card.frame.
export const MEDIA={
 "home.background":{mode:"graphic"}, "home.hero":{mode:"graphic"},
 "question.default":{mode:"graphic"}, "character.default":{mode:"graphic"},
 "result.banner":{mode:"graphic"}, "icon.brand":{mode:"graphic"},
 "icon.scroll":{mode:"graphic"}, "icon.strategy":{mode:"graphic"},
 "icon.compass":{mode:"graphic"}, "icon.crown":{mode:"graphic"},
 "card.frame":{mode:"graphic"}
};
// Historic fantasy asset slots: graphic → image → GIF.
Object.assign(MEDIA,{
"story.jiashen.background":{mode:"graphic"},
"scene.archive-night":{mode:"graphic"},
"scene.paper-servant":{mode:"graphic"},
"scene.revival-altar":{mode:"graphic"},
"scene.star-map":{mode:"graphic"},
"scene.river-inn":{mode:"graphic"},
"scene.future-edict":{mode:"graphic"},
"scene.finale":{mode:"graphic"},
"card.future-edict":{mode:"graphic"},
"card.paper-servant":{mode:"graphic"},
"card.revival-pellet":{mode:"graphic"},
"card.star-map":{mode:"graphic"},
"card.old-copper-key":{mode:"graphic"},
"card.sealed-account":{mode:"graphic"},
"card.broken-oath":{mode:"graphic"},
"card.border-scout":{mode:"graphic"},
"card.river-ferry-token":{mode:"graphic"},
"card.blood-ink-brush":{mode:"graphic"},
"card.guest-pass":{mode:"graphic"},
"card.ink-cicada":{mode:"graphic"},
"ending.lantern-survival":{mode:"graphic"},
"ending.ink-history":{mode:"graphic"},
"ending.mountain-exile":{mode:"graphic"},
"achievement.first-revelation":{mode:"graphic"}
});
function svg(kind){
 const common='<defs><linearGradient id="a" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#8b6142" stop-opacity=".09"/><stop offset=".55" stop-color="#d3ae6b" stop-opacity=".30"/><stop offset="1" stop-color="#9e5540" stop-opacity=".07"/></linearGradient></defs>';
 if(kind==="portrait")return '<svg viewBox="0 0 320 410" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+common+'<circle cx="162" cy="151" r="113" fill="none" stroke="#c3a277" stroke-width="1.4" opacity=".55"/><circle cx="162" cy="151" r="91" fill="none" stroke="#b18b65" opacity=".4"/><path d="M48 399 Q55 266 163 259 Q279 263 280 399Z" fill="url(#a)" stroke="#c3a277" stroke-width="1.5"/><path d="M124 135 Q130 83 162 83 Q198 83 199 135 L193 203 Q180 232 162 240 Q137 232 130 200Z" fill="#bb9461" fill-opacity=".23" stroke="#c3a277" stroke-width="1.4"/><path d="M117 114 Q163 61 212 113 M120 104 H209 M144 89 V73 H179 V89" stroke="#d6bc8b" fill="none" stroke-width="2"/><path d="M90 308 Q162 288 233 309 M67 361 Q162 344 256 361" stroke="#d3ae6b" fill="none" opacity=".65"/></svg>';
 if(kind==="icon")return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="39" fill="none" stroke="#c9a16d"/><path d="M50 14V86M14 50H86M26 26L74 74M74 26L26 74" stroke="#c9a16d" opacity=".3"/><circle cx="50" cy="50" r="17" fill="#c9a16d" fill-opacity=".15" stroke="#c9a16d"/></svg>';
 return '<svg viewBox="0 0 800 470" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+common+'<g fill="none" stroke="#d4b583" stroke-width="1.4" opacity=".55"><circle cx="400" cy="215" r="171"/><circle cx="400" cy="215" r="135"/><circle cx="400" cy="215" r="90"/><path d="M0 400 Q160 250 295 338 Q380 250 483 316 Q645 184 800 366 M0 441Q180 329 315 411 Q474 305 601 393 Q701 343 800 413" opacity=".8"/><path d="M313 325V200L400 151L487 200V325M339 306V214H462V306M362 183V126H437V183M385 147V106H414V147"/><path d="M320 208H480M346 238H455M346 267H455"/><path d="M36 47H180M620 421H768M44 421V345M756 58V122" stroke-dasharray="5 7"/></g><path d="M215 427Q400 357 585 427" stroke="#e2c897" stroke-width="2" fill="none" opacity=".32"/></svg>';
}
export function art(slot,kind="scene",extra=""){
 const m=MEDIA[slot]||MEDIA[slot.split(".")[0]+".default"]||{mode:"graphic"};
 const graphic='<span class="art-graphic">'+svg(kind)+'</span>';
 const prefersReduced=typeof window!=="undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 let phase=m.mode==="gif"?"gif":m.mode==="image"?"image":"graphic";
 const chosenSrc=phase==="gif"&&prefersReduced?(m.poster||null):m.src;
 if(phase==="gif"&&prefersReduced)phase=chosenSrc?"image":"graphic";
 const picture=phase==="graphic"?"":'<img class="art-image" src="'+String(chosenSrc||"").replaceAll('"',"&quot;")+'" alt="'+String(m.alt||"装饰插画").replaceAll('"',"&quot;")+'" loading="lazy"/>';
 return '<div class="art-slot art-'+kind+' '+extra+'" data-art-slot="'+slot+'" data-phase="'+phase+'">'+graphic+picture+'</div>';
}
const backgroundHost=document.querySelector(".site-surface");
if(backgroundHost) backgroundHost.innerHTML=art("home.background","scene","wallpaper");
const brandHost=document.querySelector(".brand-seal");
if(brandHost&&MEDIA["icon.brand"]?.mode!=="graphic") brandHost.innerHTML=art("icon.brand","icon");
// 若日后换图资源不存在，自动回退原图形层。
document.addEventListener("error",e=>{if(e.target?.classList?.contains("art-image")){const host=e.target.closest(".art-slot");e.target.remove();host?.setAttribute("data-phase","graphic");}},true);
