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
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeAllDropdowns(); closeAnySheet(); } });
}

// ── 검색결과 버텀시트 (Figma 484-20580) ──
let favs=new Set(); try{ favs=new Set(JSON.parse(localStorage.getItem("soma_favs")||"[]")); }catch(e){}
function saveFavs(){ try{ localStorage.setItem("soma_favs", JSON.stringify([...favs])); }catch(e){} }
function sheetResults(){ const f=state.f, active=!!(f.grade||f.sem||f.year||f.subject||state.q.trim()); return active?VOLS.filter(matchVol):VOLS; }
let sheetView="list";
const SR_STAR='<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.97 6.2 20.46l1.11-6.46-4.7-4.58 6.49-.94L12 2.6z" fill="currentColor"/></svg>';
const SR_CHEV='<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function srRow(v){ return `<div class="sr-row" data-id="${v.id}">
    <div class="sr-title">${esc(v.title)}</div>
    <div class="sr-meta">${metaText(v).split(" · ").filter(Boolean).map(s=>`<span>${esc(s)}</span>`).join("")}</div>
    <div class="sr-pagewrap"><input class="sr-page" type="number" min="1" value="1" aria-label="페이지"><span class="sr-punit">p <i>/</i> <b>116</b></span></div>
    <button class="sr-star${favs.has(v.id)?' on':''}" data-fav="${v.id}" aria-label="즐겨찾기">${SR_STAR}</button>
    <button class="sr-go" data-go="${v.id}" aria-label="열기">${SR_CHEV}</button>
  </div>`; }
function srCard(v){ return `<div class="sr-card" data-go="${v.id}" title="${esc(v.title)}"><div class="cover">${coverInner(v)}</div><div class="cap">${esc(v.title)}</div></div>`; }
function renderSheet(){ const res=sheetResults();
  document.getElementById("sheetCount").textContent=res.length;
  const list=document.getElementById("sheetList");
  list.classList.toggle("grid", sheetView==="grid");
  list.innerHTML=res.map(sheetView==="grid"?srCard:srRow).join("");
}
function openSheet(){ renderSheet();
  const scr=document.getElementById("sheetScrim"), sh=document.getElementById("resultSheet");
  scr.hidden=false; sh.setAttribute("aria-hidden","false"); document.body.classList.add("sheet-open");
  void sh.offsetHeight;   // 강제 리플로우 → 닫힘 상태 커밋 후 전이 시작(rAF 의존 X)
  scr.classList.add("on"); sh.classList.add("on");
}
function closeSheet(){
  const scr=document.getElementById("sheetScrim"), sh=document.getElementById("resultSheet");
  if(!sh || !sh.classList.contains("on")) return;
  scr.classList.remove("on"); sh.classList.remove("on"); sh.setAttribute("aria-hidden","true");
  document.body.classList.remove("sheet-open");
  setTimeout(()=>{ scr.hidden=true; }, 340);
}

// ── 교재 카탈로그 버텀시트 (Figma 484-23598) — 목업 밀도에 맞춘 샘플 생성 ──
function catPages(i){ const pool=[116,116,90,116,98,116,102,116,116,90,116,116]; return pool[i%pool.length]; }
function buildCatalog(seriesName){
  const real=VOLS.filter(v=>seriesKey(v)===seriesName);
  const byLetter={};   // 하위 시리즈 문자 → 대표(실권)
  real.forEach(v=>{ const rest=v.title.slice(seriesName.length).trim(); const m=rest.match(/([A-Za-z])/); const L=m?m[1].toUpperCase():"A"; if(!byLetter[L])byLetter[L]=v; });
  const letters=Object.keys(byLetter).sort();
  let total=0, pi=0;
  const subs=letters.map((L,si)=>{
    const rv=byLetter[L];
    const levels=[1,2,3,4].map(ln=>{
      const lvName=L+ln;
      const vols=[1,2,3].map(vn=>{ total++;
        return { id:`cat-${seriesName}-${lvName}-${vn}`, title:`소마 ${seriesName} ${lvName}-${vn}`, pages:catPages(pi++), recent:(si===0&&ln===1&&vn===2) };
      });
      return { name:lvName, vols };
    });
    return { card:{ name:`소마${seriesName}${L}`, count:12, cover:(rv&&rv.cover)?coverURL(rv):"", coverVol:rv,
             desc:"생각할 수 있는 힘을 키우고 소통능력, 문해력까지 단계별로 차근차근!", tags:["수학","7세","1학기"] }, levels };
  });
  return { series:seriesName, total, subs };
}
function catRow(vol){ return `<div class="cat-row" data-id="${vol.id}">
    <div class="cat-row-title"><span class="name">${esc(vol.title)}</span>${vol.recent?'<span class="cat-badge">최근열람</span>':''}</div>
    <div class="cat-row-meta"><span>수학</span><span>7세</span><span>1학기</span></div>
    <div class="cat-page"><input type="number" min="1" value="1" aria-label="페이지"><span class="u">p <i>/</i> <b>${vol.pages}</b></span></div>
    <button class="cat-star${favs.has(vol.id)?' on':''}" data-fav="${vol.id}" aria-label="즐겨찾기">${SR_STAR}</button>
    <button class="cat-go" data-go="${vol.id}" aria-label="열기">${SR_CHEV}</button>
  </div>`; }
function catCard(card){ const cover=card.cover?`<img src="${card.cover}" alt="${esc(card.name)}" loading="lazy" draggable="false">`:(card.coverVol?coverInner(card.coverVol):"");
  return `<div class="cat-card">
    <div class="cat-card-h"><b>${esc(card.name)}</b> <span class="count">${card.count}<i>개</i></span></div>
    <div class="cat-card-cover">${cover}</div>
    <div class="cat-card-desc">${esc(card.desc)}</div>
    <div class="cat-card-tags">${card.tags.map(t=>`<span># ${esc(t)}</span>`).join("")}</div>
  </div>`; }
function renderCatalog(cat){
  document.getElementById("catLogo").textContent=cat.series;
  document.getElementById("catTotal").textContent=cat.total;
  document.getElementById("catBody").innerHTML=cat.subs.map(s=>`<div class="cat-sub">${catCard(s.card)}<div class="cat-sub-groups">${
    s.levels.map(lv=>`<div class="cat-lv-bar">${esc(lv.name)}</div>${lv.vols.map(catRow).join("")}`).join("")
  }</div></div>`).join("");
}
function openCatalog(seriesName){ renderCatalog(buildCatalog(seriesName));
  const scr=document.getElementById("sheetScrim"), sh=document.getElementById("catalogSheet");
  scr.hidden=false; sh.setAttribute("aria-hidden","false"); document.body.classList.add("sheet-open");
  void sh.offsetHeight;
  scr.classList.add("on"); sh.classList.add("on");
}
function closeCatalog(){ const sh=document.getElementById("catalogSheet");
  if(!sh || !sh.classList.contains("on")) return;
  const scr=document.getElementById("sheetScrim");
  scr.classList.remove("on"); sh.classList.remove("on"); sh.setAttribute("aria-hidden","true");
  document.body.classList.remove("sheet-open");
  setTimeout(()=>{ scr.hidden=true; }, 340);
}
function closeAnySheet(){ closeSheet(); closeCatalog(); }   // 열린 시트 판별 후 닫기

// 준비중 토스트(흰색 카드)
let toastT=null;
function showToast(msg){ const t=document.getElementById("toast"); if(!t)return;
  t.textContent=msg; t.classList.add("on");
  if(toastT)clearTimeout(toastT); toastT=setTimeout(()=>{ t.classList.remove("on"); }, 1800);
}

function bind(){
  const si=document.getElementById("searchInput");
  si.addEventListener("input",e=>{state.q=e.target.value;renderShelf();});
  const runSearch=()=>{ state.q=si.value; renderShelf(); openSheet(); };   // 검색 → 결과 버텀시트
  document.getElementById("searchBtn").addEventListener("click",runSearch);
  si.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); runSearch(); } });
  document.getElementById("vtoggle").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b){document.querySelectorAll("#vtoggle button").forEach(x=>x.classList.toggle("on",x===b));}});
  document.getElementById("logoutBtn").addEventListener("click",()=>{ try{sessionStorage.removeItem("soma_auth");}catch(e){} location.href="index.html"; });  // 세션 해제 → 로그인 화면
  // 교재 shelf 마우스 드래그 가로 스크롤(마우스만 hijack, 터치는 네이티브 스크롤 유지)
  const shelf=document.getElementById("shelf");
  let sx=0, ss=0, down=false, justDragged=false;
  shelf.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="mouse"||e.button!==0) return;   // 마우스 좌클릭만
    down=true; justDragged=false; sx=e.clientX; ss=shelf.scrollLeft;
    // setPointerCapture는 여기서 걸지 않는다 → 걸면 단순 클릭의 click 이벤트가 <html>로 재타깃돼 표지 클릭이 안 먹음
  });
  shelf.addEventListener("pointermove",e=>{ if(!down)return; const dx=e.clientX-sx;
    if(!justDragged && Math.abs(dx)>4){ justDragged=true; shelf.classList.add("dragging"); try{shelf.setPointerCapture(e.pointerId);}catch(_){} }  // 실제 드래그 시작 시에만 캡처
    if(justDragged) shelf.scrollLeft=ss-dx;
  });
  const endDrag=e=>{ if(!down)return; down=false; shelf.classList.remove("dragging"); shelf.scrollLeft=Math.round(shelf.scrollLeft); try{shelf.releasePointerCapture(e.pointerId);}catch(_){} };
  shelf.addEventListener("pointerup",endDrag);
  shelf.addEventListener("pointercancel",endDrag);
  shelf.addEventListener("click",e=>{ if(justDragged){justDragged=false;return;}
    const b=e.target.closest("[data-open]"); if(!b) return;
    const idx=[...shelf.querySelectorAll(".book")].indexOf(b);
    if(idx===1){ const v=VOLS.find(x=>x.id===b.dataset.open); openCatalog(v?seriesKey(v):"레이"); }   // 두 번째 표지 → 카탈로그
    else showToast("준비 중입니다");
  });
  initDropdowns();
  // ── 버텀시트 인터랙션 ──
  document.getElementById("sheetScrim").addEventListener("click", closeAnySheet);
  document.getElementById("sheetHandle").addEventListener("click", closeSheet);
  document.getElementById("catHandle").addEventListener("click", closeCatalog);
  document.getElementById("catBody").addEventListener("click", e=>{
    const fav=e.target.closest("[data-fav]");
    if(fav){ const id=fav.dataset.fav; if(favs.has(id))favs.delete(id); else favs.add(id); saveFavs(); fav.classList.toggle("on"); return; }
    if(e.target.closest("[data-go]")) showToast("준비 중입니다");   // 뷰어 없음 → 자리표시
  });
  document.getElementById("sheetView").addEventListener("click", e=>{ const b=e.target.closest("[data-v]"); if(!b)return;
    sheetView=b.dataset.v;
    document.querySelectorAll("#sheetView button").forEach(x=>x.classList.toggle("on", x===b));
    renderSheet();
  });
  document.getElementById("sheetList").addEventListener("click", e=>{
    const fav=e.target.closest("[data-fav]");
    if(fav){ const id=fav.dataset.fav; if(favs.has(id))favs.delete(id); else favs.add(id); saveFavs(); fav.classList.toggle("on"); return; }
    const go=e.target.closest("[data-go]"); if(go){ const v=VOLS.find(x=>x.id===go.dataset.go); if(v)console.log("교재 열기:", v.title); }  // TODO 뷰어 연결
  });
}

(async function init(){
  const cat=await loadCatalog();
  VOLS=(cat.books||[]).filter(b=>!b.hidden);
  bind(); renderShelf();
})();
