// 전자칠판 교재 뷰어 — 이미지 기준 카탈로그(books.json), 전 교재 개별 노출(그룹/드로어 없음).
const GRADE_L={"유아":"유아",cho1:"초1",cho2:"초2",cho3:"초3",cho4:"초4",cho5:"초5",cho6:"초6"};
const SEM_L={s1:"1학기",s2:"2학기"};
const YEAR_L={"2022":"2022 개정","2015":"2015 개정"};
const SUBJ_L={"연산":"연산","교과":"교과","사고력":"사고력","경시":"경시"};
const HQ_L={central:"중앙교육본사",south:"남부교육본사"};
const BRANCH_L={seoul:"서울지사",gyeonggi:"경기지사",incheon:"인천지사",busan:"부산지사"};

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>(s||"").replace(/\s/g,"").toLowerCase();

// ── 전방호환 경계: 나중에 교체 ──────────────────────────────────
async function loadCatalog(){ const r=await fetch("data/books.json",{cache:"no-store"}); return r.json(); } // → API
function openVolume(v){ toast(v.title+" 교재로 수업을 시작합니다"); }                                        // → openPdfViewer(v.pdfUrl)
function openGame(v){ toast(v.title+" 연동 게임을 실행합니다","▶"); }                                        // → 게임 런처
const store={ get:(k,d)=>{try{return JSON.parse(localStorage.getItem("wb_"+k))??d}catch{return d}}, set:(k,v)=>localStorage.setItem("wb_"+k,JSON.stringify(v)) };

// ── 상태 ────────────────────────────────────────────────────────
let VOLS=[];
const state={ f:{hq:"",branch:"",grade:"",sem:"",year:"",subject:""}, q:"", view:store.get("view","grid"), favs:store.get("favs",[]).slice(), layout:store.get("layout","A"), sidebarCollapsed:store.get("sbcollapsed",false) };
let toastTimer=null, suppressClick=false;
const persist=()=>{ store.set("favs",state.favs); store.set("view",state.view); store.set("layout",state.layout); store.set("sbcollapsed",state.sidebarCollapsed); };
function applyLayout(){ const st=document.querySelector(".stage"); st.classList.remove("layout-A","layout-B"); st.classList.add("layout-"+state.layout);
  st.classList.toggle("sidebar-collapsed",state.sidebarCollapsed);
  document.querySelectorAll("#abToggle button").forEach(b=>b.classList.toggle("on",b.dataset.layout===state.layout)); }
const toggleFav=id=>{ const i=state.favs.indexOf(id); i>=0?state.favs.splice(i,1):state.favs.push(id); persist(); render(); };
const volById=id=>VOLS.find(v=>v.id===id);

// ── 헬퍼 ────────────────────────────────────────────────────────
function metaText(v){ return [SUBJ_L[v.subject], v.grade&&GRADE_L[v.grade], v.sem&&SEM_L[v.sem]].filter(Boolean).join(" · "); }
function matchVol(v){ const f=state.f,nq=norm(state.q);
  if(f.grade&&v.grade!==f.grade)return false;
  if(f.sem&&v.sem!==f.sem)return false;
  if(f.year&&v.year!==f.year)return false;
  if(f.subject&&v.subject!==f.subject)return false;
  if(nq&&norm(v.title).indexOf(nq)===-1)return false;
  return true; }

// 큰 카드: 교재(책) 프레임. 표지 있으면 프레임 안 이미지, 없으면 정보형 자동커버.
function bookFrame(v){
  if(v.cover) return `<div class="book3d"><div class="bk"><img class="bk-cover" src="${v.cover}" alt="${esc(v.title)}" loading="lazy" draggable="false"></div></div>`;
  // 표지 없음 → 자동커버: 과목색 스파인 + 상단 과목라벨 + 제목 + 하단 학년·학기
  const subj=SUBJ_L[v.subject]||"";
  const gs=[v.grade&&GRADE_L[v.grade], v.sem&&SEM_L[v.sem]].filter(Boolean).join(" · ");
  return `<div class="book3d"><div class="bk auto" style="--spine:${v.color||'#C7CCC4'}">
    ${subj?`<div class="bk-subj">${esc(subj)}</div>`:""}
    <div class="bk-t">${esc(v.title)}</div>
    ${gs?`<div class="bk-gs">${esc(gs)}</div>`:""}
  </div></div>`; }
// 작은 썸네일(리스트 행): 프레임리스.
function miniThumb(v){ return v.cover
  ? `<img src="${v.cover}" alt="${esc(v.title)}" loading="lazy" draggable="false">`
  : `<div class="mini-ph"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="#B7BCB4" stroke-width="1.6"/><path d="M9 7.5h6M9 11h6M9 14.5h4" stroke="#C7CCC4" stroke-width="1.6" stroke-linecap="round"/></svg></div>`; }
function favBtn(id){ const on=state.favs.includes(id); return `<button class="fav-btn" data-fav="${id}" title="즐겨찾기" style="background:${on?'#FFF2DD':'rgba(255,255,255,.94)'};"><span style="font-size:18px;line-height:1;color:${on?'#F19A2F':'#C6CBC3'};">★</span></button>`; }
const gameBadge=v=>v.game?`<span class="game-badge">게임</span>`:"";

function volCardGrid(v){ return `<div class="card" data-open="${v.id}">
  <div class="card-img">${bookFrame(v)}${gameBadge(v)}${favBtn(v.id)}</div>
  <div class="title">${esc(v.title)}</div><div class="meta">${metaText(v)}</div></div>`; }
function volRow(v){ return `<div class="row" data-open="${v.id}">
  <div class="thumb">${miniThumb(v)}</div>
  <div class="r-main"><div class="r-title">${esc(v.title)}</div>
    <div class="r-meta">${metaText(v)}${v.game?'<span class="gtag">게임</span>':''}</div></div>
  <div class="r-actions">
    <button class="rfav" data-fav="${v.id}" title="즐겨찾기"><span style="font-size:17px;color:${state.favs.includes(v.id)?'#F19A2F':'#C6CBC3'};">★</span></button>
    ${v.game?`<button class="act game" data-game="${v.id}">게임</button>`:''}
    <button class="act primary" data-open="${v.id}">열기</button></div></div>`; }
const renderCollection=(vols,view)=>view==="grid"?`<div class="grid">${vols.map(volCardGrid).join("")}</div>`:`<div class="rows">${vols.map(volRow).join("")}</div>`;

function render(){
  const f=state.f,q=state.q.trim();
  const contentActive=!!(f.grade||f.sem||f.year||f.subject||q);
  const anyActive=contentActive||!!(f.hq||f.branch);
  document.getElementById("resetBtn").style.display=anyActive?"flex":"none";
  document.querySelectorAll("#vtoggle button").forEach(b=>b.classList.toggle("on",b.dataset.view===state.view));

  // 즐겨찾기(흰 배경 카드 스트립). 검색/필터 중엔 접어 결과 우선.
  const favVols=state.favs.map(volById).filter(Boolean);
  document.getElementById("favSection").style.display=contentActive?"none":"block";
  document.getElementById("favCount").textContent=favVols.length;
  document.getElementById("favArea").innerHTML=favVols.length
    ? `<div class="fav-strip brd-scroll">${favVols.map(volCardGrid).join("")}</div>`
    : `<div class="empty"><span style="font-size:26px;color:#D2D5CE;">☆</span><div><div style="font-size:14.5px;font-weight:700;">즐겨찾기한 교재가 없습니다</div><div style="font-size:12.5px;color:#A2A6A0;margin-top:2px;">교재의 <b>★</b>를 눌러 자주 쓰는 교재를 추가하세요</div></div></div>`;

  // 전체 교재 = 개별 교재 flat (필터=내비)
  const results=contentActive?VOLS.filter(matchVol):VOLS;
  document.getElementById("headingText").textContent=contentActive?"검색 결과":"전체 교재";
  document.getElementById("countLine").innerHTML=`총 <b style="color:#69BE00;font-weight:800;">${results.length}</b>권`;
  document.getElementById("mainArea").innerHTML=results.length?renderCollection(results,state.view):noResults();

  // 필터칩
  const chips=[]; const add=(k,l)=>chips.push({k,l});
  if(f.hq)add("hq",HQ_L[f.hq]); if(f.branch)add("branch",BRANCH_L[f.branch]);
  if(f.grade)add("grade",GRADE_L[f.grade]); if(f.sem)add("sem",SEM_L[f.sem]); if(f.year)add("year",YEAR_L[f.year]); if(f.subject)add("subject",SUBJ_L[f.subject]);
  if(q)add("q","“"+q+"”");
  document.getElementById("chipsArea").innerHTML=anyActive?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">${chips.map(c=>`<button class="chip" data-chip="${c.k}">${esc(c.l)}<span style="font-size:14px;color:#D9A24E;">✕</span></button>`).join("")}</div>`:"";
}
function noResults(){ return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:300px;">
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="19" cy="19" r="13" stroke="#B9BDB5" stroke-width="3"/><path d="M29 29L39 39" stroke="#B9BDB5" stroke-width="3" stroke-linecap="round"/></svg>
  <div style="font-size:18px;font-weight:800;color:#5B605A;">검색 결과가 없습니다</div>
  <div style="font-size:14px;color:#9A9E98;text-align:center;line-height:1.6;">선택하신 조건에 맞는 교재를 찾지 못했어요.<br>필터를 조정하거나 검색어를 바꿔보세요.</div>
  <button class="act primary" style="height:44px;padding:0 22px;font-size:14.5px;margin-top:6px;" data-reset>전체 교재 보기</button></div>`; }

// ── 이벤트 ──────────────────────────────────────────────────────
function bind(){
  document.querySelectorAll(".fsel").forEach(sel=>sel.addEventListener("change",()=>{state.f[sel.dataset.f]=sel.value;render();}));
  document.getElementById("searchInput").addEventListener("input",e=>{state.q=e.target.value;render();});
  document.getElementById("resetBtn").addEventListener("click",resetAll);
  document.getElementById("vtoggle").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b){state.view=b.dataset.view;persist();render();}});
  document.getElementById("abToggle").addEventListener("click",e=>{const b=e.target.closest("[data-layout]");if(b){state.layout=b.dataset.layout;persist();applyLayout();}});
  document.getElementById("sideToggle").addEventListener("click",()=>{state.sidebarCollapsed=true;persist();applyLayout();});
  document.getElementById("sideReopen").addEventListener("click",()=>{state.sidebarCollapsed=false;persist();applyLayout();});
  document.getElementById("searchBtn").addEventListener("click",()=>{const i=document.getElementById("searchInput");state.q=i.value;render();i.focus();});
  bindFavDrag();
  document.body.addEventListener("click",onClick);
}
// 즐겨찾기 드래그 순서변경(포인터 기반: 마우스+터치)
function bindFavDrag(){
  const area=document.getElementById("favArea"); let drag=null;
  area.addEventListener("pointerdown",e=>{
    const card=e.target.closest(".card"); if(!card||e.target.closest("[data-fav],[data-game]"))return;
    drag={id:card.dataset.open,x0:e.clientX,y0:e.clientY,moved:false,card,overId:null,before:false};
    try{card.setPointerCapture(e.pointerId);}catch{}
  });
  area.addEventListener("pointermove",e=>{
    if(!drag)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>6){drag.moved=true;drag.card.classList.add("dragging");}
    if(!drag.moved)return; e.preventDefault();
    const cards=[...area.querySelectorAll(".card")]; cards.forEach(c=>c.classList.remove("drop-before","drop-after"));
    const over=cards.find(c=>{if(c===drag.card)return false;const r=c.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right;});
    if(over){const r=over.getBoundingClientRect();drag.before=e.clientX<r.left+r.width/2;drag.overId=over.dataset.open;over.classList.add(drag.before?"drop-before":"drop-after");}
    else drag.overId=null;
  });
  const end=()=>{
    if(!drag)return; const d=drag; drag=null; d.card.classList.remove("dragging");
    area.querySelectorAll(".card").forEach(c=>c.classList.remove("drop-before","drop-after"));
    if(!d.moved)return;                       // 짧은 탭 → 클릭(교재 열기) 유지
    suppressClick=true; setTimeout(()=>suppressClick=false,0);
    if(d.overId&&d.overId!==d.id){
      const arr=state.favs.slice(); const from=arr.indexOf(d.id); if(from>=0)arr.splice(from,1);
      let to=arr.indexOf(d.overId); if(to<0)to=arr.length; if(!d.before)to+=1;
      arr.splice(to,0,d.id); state.favs=arr; persist(); render();
    }
  };
  area.addEventListener("pointerup",end); area.addEventListener("pointercancel",end);
}
function onClick(e){
  if(suppressClick)return;                    // 드래그 직후 클릭 무시
  const fav=e.target.closest("[data-fav]"); if(fav){e.stopPropagation();toggleFav(fav.dataset.fav);return;}
  const game=e.target.closest("[data-game]"); if(game){e.stopPropagation();const v=volById(game.dataset.game);if(v)openGame(v);return;}
  const chip=e.target.closest("[data-chip]"); if(chip){const k=chip.dataset.chip;if(k==="q")state.q="";else state.f[k]="";syncControls();render();return;}
  if(e.target.closest("[data-reset]")){resetAll();return;}
  const op=e.target.closest("[data-open]"); if(op){const v=volById(op.dataset.open);if(v)openVolume(v);return;}
}
function resetAll(){ state.f={hq:"",branch:"",grade:"",sem:"",year:"",subject:""}; state.q=""; syncControls(); render(); }
function syncControls(){ document.querySelectorAll(".fsel").forEach(s=>s.value=state.f[s.dataset.f]); document.getElementById("searchInput").value=state.q; }

function toast(msg,icon="▶"){ const a=document.getElementById("toastArea");
  a.innerHTML=`<div style="position:fixed;left:50%;bottom:60px;transform:translateX(-50%);background:#222824;color:#fff;padding:14px 22px;border-radius:12px;font-size:14.5px;font-weight:600;box-shadow:0 12px 34px rgba(0,0,0,.32);animation:toastIn .22s ease;display:flex;align-items:center;gap:10px;z-index:80;white-space:nowrap;"><span style="color:#AEE289;font-size:16px;">${icon}</span>${esc(msg)}</div>`;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>a.innerHTML="",2200); }

(async function init(){ const cat=await loadCatalog(); VOLS=(cat.books||[]).filter(b=>!b.hidden);
  // 미리보기 스위치: ?nocover=1(전체 무표지) / ?nocover=교과|연산|사고력|경시(해당 과목만). 파라미터 없으면 정상 표시.
  const nc=new URLSearchParams(location.search).get("nocover");
  if(nc) VOLS.forEach(v=>{ if(nc==="1"||nc===v.subject) v.cover=""; });
  bind(); applyLayout(); render(); })();
