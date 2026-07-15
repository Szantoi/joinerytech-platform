// JoineryTech DS site shell — sidebar nav, snippet renderer, icon grid helper
(function(){
const PAGES=[
 {file:"index.html",label:"Alapok",sub:"Elvek · hangnem · tokenek"},
 {file:"szinek.html",label:"Színek",sub:"Paletta · world-akcentusok"},
 {file:"tipografia.html",label:"Tipográfia",sub:"Inter · JetBrains Mono"},
 {file:"komponensek.html",label:"Komponensek",sub:"Gombok · pill-ek · kártyák"},
 {file:"mintak.html",label:"Minták",sub:"Táblázat · üres állapot · nav"},
];
const cur=(location.pathname.split("/").pop()||"index.html");
function grainMark(){return '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" rx="5" fill="none" stroke="#0c1322" stroke-opacity=".22"></rect><path d="M5 16 Q 11 6, 17 16" fill="none" stroke="#0c1322" stroke-opacity=".95" stroke-width="1.4" stroke-linecap="round"></path><path d="M5 13 Q 11 5, 17 13" fill="none" stroke="#5eead4" stroke-width="1.4" stroke-linecap="round"></path><path d="M5 19 Q 11 9, 17 19" fill="none" stroke="#0c1322" stroke-opacity=".4" stroke-width="1.4" stroke-linecap="round"></path></svg>';}
document.addEventListener("DOMContentLoaded",function(){
 // sidebar
 const sb=document.createElement("aside");
 sb.className="ds-side";
 sb.innerHTML='<div class="ds-brand">'+grainMark()+'<span><b>joinery</b><i>/</i><em>tech</em></span></div>'+
  '<div class="ds-side-cap">Design System</div>'+
  PAGES.map(p=>'<a href="'+p.file+'" class="'+(p.file===cur?"on":"")+'"><span>'+p.label+'</span><small>'+p.sub+'</small></a>').join("")+
  '<div class="ds-side-foot">v1.0 · 2026 · forrás: élő portál</div>';
 document.body.prepend(sb);
 // snippets: <script type="text/plain" class="snippet" data-title="...">
 document.querySelectorAll("script.snippet").forEach(function(s){
  const wrap=document.createElement("div");wrap.className="snip";
  const head=document.createElement("div");head.className="snip-head";
  head.innerHTML='<span>'+(s.dataset.title||"Kód")+'</span>';
  const btn=document.createElement("button");btn.textContent="Másolás";btn.className="snip-copy";
  const code=s.textContent.replace(/^\n+|\s+$/g,"");
  btn.addEventListener("click",function(){navigator.clipboard.writeText(code).then(function(){btn.textContent="Másolva ✓";setTimeout(function(){btn.textContent="Másolás";},1400);});});
  head.appendChild(btn);
  const pre=document.createElement("pre");const c=document.createElement("code");c.textContent=code;pre.appendChild(c);
  wrap.appendChild(head);wrap.appendChild(pre);
  s.parentNode.replaceChild(wrap,s);
 });
 // inline icons: <i data-icon="name" data-size="18"></i>
 document.querySelectorAll("[data-icon]").forEach(function(el){
  const n=el.dataset.icon,s=el.dataset.size||18;
  if(window.DS_ICONS&&window.DS_ICONS[n]) el.innerHTML='<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+window.DS_ICONS[n]+'</svg>';
 });
 // icon grid: <div data-icon-grid></div>
 document.querySelectorAll("[data-icon-grid]").forEach(function(host){
  Object.keys(window.DS_ICONS||{}).forEach(function(n){
   const cell=document.createElement("button");cell.className="icon-cell";cell.title="Kattints: név másolása";
   cell.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+window.DS_ICONS[n]+'</svg><span>'+n+'</span>';
   cell.addEventListener("click",function(){navigator.clipboard.writeText(n);cell.classList.add("copied");setTimeout(function(){cell.classList.remove("copied");},900);});
   host.appendChild(cell);
  });
 });
});
})();
