// 소마챔스 대시보드 — 책꽂이 렌더 + 필터/검색 + 커스텀 드롭다운. (데이터는 whiteboard 카탈로그 재사용)
const GRADE_L={"유아":"유아",cho1:"초1",cho2:"초2",cho3:"초3",cho4:"초4",cho5:"초5",cho6:"초6"};
const SEM_L={s1:"1학기",s2:"2학기"};
const SUBJ_L={"연산":"연산","교과":"교과","사고력":"사고력","경시":"경시"};
const COVER_BASE="../whiteboard/";   // cover 경로가 whiteboard 기준 상대경로

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>(s||"").replace(/\s/g,"").toLowerCase();
// 고해상도 커버(real/hi) 사용
const coverURL=v=>COVER_BASE+(v.cover||"").replace("assets/covers/real/","assets/covers/real/hi/");

async function loadCatalog(){ const r=await fetch("../whiteboard/data/books.json",{cache:"no-store"}); return r.json(); }

let VOLS=[];
const state={ f:{grade:"",sem:"",year:"",subject:""}, q:"" };

function metaText(v){ return [SUBJ_L[v.subject], v.grade&&GRADE_L[v.grade], v.sem&&SEM_L[v.sem]].filter(Boolean).join(" · "); }
function matchVol(v){ const f=state.f,nq=norm(state.q);
  if(f.grade&&v.grade!==f.grade)return false;
  if(f.sem&&v.sem!==f.sem)return false;
  if(f.year&&v.year!==f.year)return false;
  if(f.subject&&v.subject!==f.subject)return false;
  if(nq&&norm(v.title).indexOf(nq)===-1)return false;
  return true; }

// ── 시리즈 큐레이션(기본 책꽂이) ──
const FIRST5=["레이 A1-1","레이 B1-1","프리미어 중급 6","소마셈 A","프리즘 D1-1"];
function seriesKey(v){ const t=v.title;
  if(t.startsWith("소마 스트라이크"))return "소마 스트라이크";
  if(t.startsWith("소마셈"))return "소마셈";
  if(t.startsWith("레이플러스"))return "레이플러스";
  if(t.startsWith("레이"))return "레이";
  if(t.startsWith("레인보우플러스"))return "레인보우플러스";
  if(t.startsWith("레인보우"))return "레인보우";
  if(t.startsWith("프리즘플러스"))return "프리즘플러스";
  if(t.startsWith("프리즘"))return "프리즘";
  if(t.startsWith("프리미어 초급"))return "프리미어 초급";
  if(t.startsWith("프리미어 중급"))return "프리미어 중급";
  return "프리미어 특강"; }
function curatedList(){
  const first=FIRST5.map(t=>VOLS.find(v=>v.title===t)).filter(Boolean);
  const shown=new Set(first.map(seriesKey));
  const rest=[];
  VOLS.forEach(v=>{ const k=seriesKey(v); if(!shown.has(k)){ shown.add(k); rest.push(v); } });  // 시리즈별 1권
  return [...first,...rest];
}

function coverInner(v){
  if(v.cover) return `<img src="${coverURL(v)}" alt="${esc(v.title)}" loading="lazy" draggable="false">`;
  const subj=SUBJ_L[v.subject]||"";
  const gs=[v.grade&&GRADE_L[v.grade], v.sem&&SEM_L[v.sem]].filter(Boolean).join(" · ");
  return `<div class="auto" style="--spine:${v.color||'#C7CCC4'}">
    ${subj?`<div class="a-subj">${esc(subj)}</div>`:""}
    <div class="a-title">${esc(v.title)}</div>
    ${gs?`<div class="a-gs">${esc(gs)}</div>`:""}</div>`;
}
function bookCard(v){ return `<div class="book" data-open="${v.id}" title="${esc(v.title)}">
  <div class="cover">${coverInner(v)}</div></div>`; }

function renderShelf(){
  const active=!!(state.f.grade||state.f.sem||state.f.year||state.f.subject||state.q.trim());
  const results=active?VOLS.filter(matchVol):curatedList();   // 무필터 = 시리즈 큐레이션
  const shelf=document.getElementById("shelf");
  shelf.innerHTML = results.length ? results.map(bookCard).join("")
    : `<div style="padding:0 40px 8%;color:#8C918B;font-weight:600;">조건에 맞는 교재가 없습니다.</div>`;
}

// ── 커스텀 셀렉트 드롭다운 (Figma 382-19195) ──
const DD_ARROW='<svg class="dd-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="#7A7E7B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function closeAllDropdowns(){ document.querySelectorAll(".dropdown.open").forEach(d=>{ d.classList.remove("open"); d.querySelector(".dd-trigger").setAttribute("aria-expanded","false"); }); }
function initDropdowns(){
  document.querySelectorAll("select.fsel, select.nsel").forEach(sel=>{
    const isFilter=sel.classList.contains("fsel"), key=sel.dataset.f;
    const opts=[...sel.options].map(o=>({value:o.value,label:o.textContent.trim()}));
    let cur=sel.value;
    const labelOf=()=> (opts.find(o=>o.value===cur)||opts[0]).label;
    const dd=document.createElement("div");
    dd.className="dropdown "+(sel.classList.contains("nsel")?"dd-org":"dd-filter");
    dd.innerHTML=
      `<button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="dd-label">${esc(labelOf())}</span>${DD_ARROW}</button>`+
      `<div class="dd-panel" role="listbox">${opts.map(o=>`<div class="dd-opt${o.value===cur?' sel':''}" role="option" data-v="${esc(o.value)}">${esc(o.label)}</div>`).join("")}</div>`;
    sel.replaceWith(dd);
    const trigger=dd.querySelector(".dd-trigger"), panel=dd.querySelector(".dd-panel"), lbl=dd.querySelector(".dd-label");
    trigger.addEventListener("click",e=>{ e.stopPropagation(); const wasOpen=dd.classList.contains("open"); closeAllDropdowns(); if(!wasOpen){ dd.classList.add("open"); trigger.setAttribute("aria-expanded","true"); } });
    panel.addEventListener("click",e=>{ const o=e.target.closest(".dd-opt"); if(!o)return;
      cur=o.dataset.v; lbl.textContent=o.textContent;
      panel.querySelectorAll(".dd-opt").forEach(x=>x.classList.toggle("sel",x===o));
      closeAllDropdowns();
      if(isFilter){ state.f[key]=cur; renderShelf(); }
    });
  });
  document.addEventListener("click",closeAllDropdowns);
  document.addEventListener("keydown",e=>{ if(e.key==="Escape")closeAllDropdowns(); });
}

function bind(){
  const si=document.getElementById("searchInput");
  si.addEventListener("input",e=>{state.q=e.target.value;renderShelf();});
  document.getElementById("searchBtn").addEventListener("click",()=>{state.q=si.value;renderShelf();si.focus();});
  document.getElementById("vtoggle").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b){document.querySelectorAll("#vtoggle button").forEach(x=>x.classList.toggle("on",x===b));}});
  document.getElementById("logoutBtn").addEventListener("click",()=>{ try{sessionStorage.removeItem("soma_auth");}catch(e){} location.href="index.html"; });  // 세션 해제 → 로그인 화면
  // 교재 shelf 마우스 드래그 가로 스크롤(마우스만 hijack, 터치는 네이티브 스크롤 유지)
  const shelf=document.getElementById("shelf");
  let sx=0, ss=0, down=false, justDragged=false;
  shelf.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="mouse"||e.button!==0) return;   // 마우스 좌클릭만
    down=true; justDragged=false; sx=e.clientX; ss=shelf.scrollLeft;
    shelf.classList.add("dragging"); try{shelf.setPointerCapture(e.pointerId);}catch(_){}
  });
  shelf.addEventListener("pointermove",e=>{ if(!down)return; const dx=e.clientX-sx; if(Math.abs(dx)>4)justDragged=true; shelf.scrollLeft=ss-dx; });
  const endDrag=e=>{ if(!down)return; down=false; shelf.classList.remove("dragging"); shelf.scrollLeft=Math.round(shelf.scrollLeft); try{shelf.releasePointerCapture(e.pointerId);}catch(_){} };
  shelf.addEventListener("pointerup",endDrag);
  shelf.addEventListener("pointercancel",endDrag);
  shelf.addEventListener("click",e=>{ if(justDragged){justDragged=false;return;} const b=e.target.closest("[data-open]"); if(b){const v=VOLS.find(x=>x.id===b.dataset.open); if(v)console.log("open",v.title);} });  // 드래그 후엔 열기 억제
  initDropdowns();
}

(async function init(){
  const cat=await loadCatalog();
  VOLS=(cat.books||[]).filter(b=>!b.hidden);
  bind(); renderShelf();
})();
