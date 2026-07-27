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
function bookCard(v,isRecent){ return `<div class="book" data-open="${v.id}" title="${esc(v.title)}">
  ${isRecent?'<span class="book-badge">최근 열람</span>':''}
  <div class="cover">${coverInner(v)}</div></div>`; }

// ── 최근열람 (Figma 506-20998): 실권 id 1건을 localStorage에 기록 → 책꽂이 선두 + 배지 ──
let recentId=null; try{ recentId=localStorage.getItem("soma_recent")||null; }catch(e){}
function saveRecent(id){
  if(!id || !VOLS.find(v=>v.id===id)) return;   // 실권만
  recentId=id; try{ localStorage.setItem("soma_recent",id); }catch(e){}
  renderShelf();
}

function renderShelf(){
  const results=curatedList();   // 메인 = 큐레이션 고정(추후 관리자 설정 연동). 필터·검색은 버텀시트에만 반영
  const rv=recentId && VOLS.find(v=>v.id===recentId);
  if(rv){ const i=results.findIndex(v=>v.id===recentId); if(i>-1) results.splice(i,1); results.unshift(rv); }  // 최근열람 → 맨 앞
  const shelf=document.getElementById("shelf");
  shelf.innerHTML = results.length ? results.map(v=>bookCard(v, v.id===recentId)).join("")
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
      if(isFilter){ state.f[key]=cur; }   // 필터는 상태만 갱신 — 검색 버튼 눌러야 시트에 반영
    });
  });
  document.addEventListener("click",e=>{ closeAllDropdowns(); closeWhoMenu();
    if(!e.target.closest("#topbar")) closeFavPanel(); });   // GNB 밖 클릭 → 즐겨찾기 패널 닫기
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeAllDropdowns(); closeWhoMenu(); closeFavPanel(); closeAnySheet(); } });
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
// 페이지네이션: 번호형(현재±2 윈도 + … 생략 + ‹›). ~700권(35p) 대응. 페이지당 개수 10/20/30/50 선택 가능
let sheetPage=1, SHEET_PS=20;
function pagerHTML(total){
  const last=Math.max(1, Math.ceil(total/SHEET_PS));
  if(last<=1) return "";
  const p=Math.min(sheetPage,last), win=[];
  for(let i=Math.max(1,p-2); i<=Math.min(last,p+2); i++) win.push(i);
  const parts=[`<button type="button" class="pg-nav" data-p="${p-1}" ${p===1?"disabled":""} aria-label="이전">‹</button>`];
  if(win[0]>1){ parts.push(`<button type="button" data-p="1">1</button>`); if(win[0]>2) parts.push(`<span class="pg-ell">…</span>`); }
  win.forEach(i=>parts.push(`<button type="button" data-p="${i}" class="${i===p?'cur':''}">${i}</button>`));
  if(win[win.length-1]<last){ if(win[win.length-1]<last-1) parts.push(`<span class="pg-ell">…</span>`); parts.push(`<button type="button" data-p="${last}">${last}</button>`); }
  parts.push(`<button type="button" class="pg-nav" data-p="${p+1}" ${p===last?"disabled":""} aria-label="다음">›</button>`);
  return parts.join("");
}
function renderSheet(){ const res=sheetResults();
  const last=Math.max(1, Math.ceil(res.length/SHEET_PS));
  if(sheetPage>last) sheetPage=last;
  document.getElementById("sheetCount").textContent=res.length;
  const list=document.getElementById("sheetList");
  list.classList.toggle("grid", sheetView==="grid");
  const pageItems=res.slice((sheetPage-1)*SHEET_PS, sheetPage*SHEET_PS);
  list.innerHTML=pageItems.map(sheetView==="grid"?srCard:srRow).join("");
  document.getElementById("sheetPager").innerHTML=pagerHTML(res.length);
}
function openSheet(){ sheetPage=1; renderSheet();
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
// 카탈로그 구성 맵: 시리즈 → [하위시리즈(시리즈, 문자)] (레이A는 다른 교재 — 제외, 사용자 확정)
const CAT_COMP={ "레이":[ ["레이","B"],["레이","C"],["레이플러스","B"],["레이플러스","C"] ] };
function buildCatalog(seriesName){
  let pairs=CAT_COMP[seriesName];
  if(!pairs){   // 구성 미정 시리즈: 실권 문자 스캔 폴백
    const seen=new Set(); pairs=[];
    VOLS.filter(v=>seriesKey(v)===seriesName).forEach(v=>{
      const m=v.title.slice(seriesName.length).trim().match(/([A-Za-z])/);
      const L=m?m[1].toUpperCase():"A";
      if(!seen.has(L)){ seen.add(L); pairs.push([seriesName,L]); }
    });
  }
  let total=0, pi=0;
  const subs=pairs.map(([series,L],si)=>{
    const rv=VOLS.find(v=>seriesKey(v)===series && v.title.includes(" "+L));   // 대표 실권(커버·메타)
    const levels=[1,2,3,4].map(ln=>{
      const lvName=L+ln;
      const vols=[1,2,3].map(vn=>{ total++;
        return { id:`cat-${series}-${lvName}-${vn}`, title:`소마 ${series} ${lvName}-${vn}`, pages:catPages(pi++), recent:(si===0&&ln===1&&vn===2) };
      });
      return { name:lvName, label:(series==="레이플러스"?"플러스":"")+lvName, vols };   // 레벨바 표시명(id/제목은 lvName 유지)
    });
    return { card:{ name:`소마${series}${L}`, count:12, cover:(rv&&rv.cover)?coverURL(rv):"", coverVol:rv,
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
  document.getElementById("catBody").innerHTML=cat.subs.map(s=>`<div class="cat-sub">${catCard(s.card)}<div class="cat-sub-groups"><div class="cat-lv-line"></div>${
    s.levels.map(lv=>`<div class="cat-lv-bar">${esc(lv.label||lv.name)}</div>${lv.vols.map(catRow).join("")}`).join("")
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

// 프로필 툴팁 메뉴 닫기
function closeWhoMenu(){ const m=document.getElementById("whoMenu"), b=document.getElementById("whoBtn");
  if(m) m.classList.remove("open"); if(b) b.setAttribute("aria-expanded","false"); }

// 준비중 토스트(흰색 카드)
let toastT=null;
function showToast(msg){ const t=document.getElementById("toast"); if(!t)return;
  t.textContent=msg; t.classList.add("on");
  if(toastT)clearTimeout(toastT); toastT=setTimeout(()=>{ t.classList.remove("on"); }, 1800);
}

// ── GNB 즐겨찾기 패널 (Figma 539-22450 + 카드 301-11913) ──
function closeFavPanel(){
  const p=document.getElementById("favPanel"), b=document.getElementById("favBtn");
  if(!p || !p.classList.contains("open")) return;
  p.classList.remove("open");
  document.getElementById("topbar").classList.remove("fav-open");
  if(b) b.setAttribute("aria-expanded","false");
}
function favItems(){
  return [...favs].map(id=>{
    const v=VOLS.find(x=>x.id===id);
    if(v) return { id, title:v.title, meta:metaText(v), vol:v };
    const m=id.match(/^cat-(.+)-([A-Z]\d+)-(\d+)$/);           // 카탈로그 샘플 id → 제목 재구성 + 대표 실권 커버
    if(m){
      const title=`소마 ${m[1]} ${m[2]}-${m[3]}`, letter=m[2][0];
      const rep=VOLS.find(x=>seriesKey(x)===m[1] && x.title.includes(" "+letter));   // 예: 레이+B → "레이 B1-1"
      if(rep) return { id, title, meta:metaText(rep), vol:rep };
      return { id, title, meta:"", vol:{ title, color:"#C7CCC4" } };
    }
    return { id, title:id, meta:"", vol:{ title:id, color:"#C7CCC4" } };
  });
}
function renderFavPanel(){
  const body=document.getElementById("favBody"), cnt=document.getElementById("favCount");
  if(!body||!cnt) return;
  const items=favItems();
  cnt.textContent=items.length;
  if(!items.length){
    body.innerHTML=`<div class="fav-empty"><b>즐겨찾기한 교재가 없습니다</b><p>교재의 <i>★</i>를 눌러 자주 쓰는 교재를 추가하세요</p></div>`;
    return;
  }
  body.innerHTML=`<div class="fav-list">${items.map(it=>`<div class="fav-card" data-card="${esc(it.id)}">
      <div class="fc-cover">${coverInner(it.vol)}</div>
      <button type="button" class="fc-star" data-fav="${esc(it.id)}" aria-label="즐겨찾기 해제">${SR_STAR}</button>
      <div class="fc-title">${esc(it.title)}</div>
      ${it.meta?`<div class="fc-meta">${esc(it.meta)}</div>`:""}
    </div>`).join("")}</div>`;
}

function bind(){
  const si=document.getElementById("searchInput");
  si.addEventListener("input",e=>{state.q=e.target.value;});               // 입력은 상태만(메인 불변)
  const runSearch=()=>{ state.q=si.value; openSheet(); };                  // 검색 → 결과 버텀시트
  document.getElementById("searchBtn").addEventListener("click",runSearch);
  si.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); runSearch(); } });
  document.getElementById("logoutBtn").addEventListener("click",()=>{ try{sessionStorage.removeItem("soma_auth");}catch(e){} location.href="index.html"; });  // 세션 해제 → 로그인 화면
  // 프로필 툴팁 메뉴: 교재 큐레이션 / 모드설정 (UI만 — 클릭 시 준비중 토스트)
  const whoBtn=document.getElementById("whoBtn"), whoMenu=document.getElementById("whoMenu");
  whoBtn.addEventListener("click",e=>{ e.stopPropagation(); closeAllDropdowns();
    const open=!whoMenu.classList.contains("open");
    whoMenu.classList.toggle("open",open); whoBtn.setAttribute("aria-expanded",String(open)); });
  whoMenu.addEventListener("click",e=>{ e.stopPropagation();
    const mi=e.target.closest("[data-m]"); if(!mi) return;
    closeWhoMenu(); showToast("준비 중입니다"); });
  // GNB 즐겨찾기: 버튼 토글(아코디언) + 패널 카드 위임
  const favBtn=document.getElementById("favBtn"), favPanel=document.getElementById("favPanel");
  favBtn.addEventListener("click",()=>{
    const open=!favPanel.classList.contains("open");
    if(open) renderFavPanel();
    favPanel.classList.toggle("open",open);
    document.getElementById("topbar").classList.toggle("fav-open",open);
    favBtn.setAttribute("aria-expanded",String(open));
  });
  document.getElementById("favBody").addEventListener("click",e=>{
    e.stopPropagation();   // 재렌더로 타깃이 DOM에서 분리되면 document의 외부클릭 판정이 오작동(closest null) → 전파 차단
    const st=e.target.closest(".fc-star[data-fav]");
    if(st){ favs.delete(st.dataset.fav); saveFavs(); renderFavPanel(); return; }
    if(e.target.closest(".fc-cover")){
      const card=e.target.closest(".fav-card");
      if(card) saveRecent(card.dataset.card);              // 실권이면 최근열람 기록
      showToast("준비 중입니다");                            // 뷰어 없음 → 자리표시
    }
  });
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
    if(idx===1){ const v=VOLS.find(x=>x.id===b.dataset.open); saveRecent(b.dataset.open); openCatalog(v?seriesKey(v):"레이"); }   // 두 번째 표지 → 열람 기록 + 카탈로그
    else showToast("준비 중입니다");
  });
  initDropdowns();
  // ── 버텀시트 인터랙션 ──
  document.getElementById("sheetScrim").addEventListener("click", closeAnySheet);
  document.getElementById("sheetHandle").addEventListener("click", closeSheet);
  document.getElementById("catHandle").addEventListener("click", closeCatalog);
  document.getElementById("catBody").addEventListener("click", e=>{
    const fav=e.target.closest("[data-fav]");
    if(fav){ const id=fav.dataset.fav; if(favs.has(id))favs.delete(id); else favs.add(id); saveFavs(); fav.classList.toggle("on"); renderFavPanel(); return; }
    if(e.target.closest("[data-go]")) showToast("준비 중입니다");   // 뷰어 없음 → 자리표시
  });
  // 페이지당 개수 드롭다운(20/30/50/80) — 기존 .dropdown 인프라(바깥클릭/ESC 닫기) 재사용
  const psDD=document.getElementById("sheetPs"), psTrigger=psDD.querySelector(".dd-trigger"), psLabel=psDD.querySelector(".dd-label");
  psTrigger.addEventListener("click",e=>{ e.stopPropagation(); const wasOpen=psDD.classList.contains("open"); closeAllDropdowns();
    if(!wasOpen){ psDD.classList.add("open"); psTrigger.setAttribute("aria-expanded","true"); } });
  psDD.querySelector(".dd-panel").addEventListener("click",e=>{ const o=e.target.closest(".dd-opt[data-ps]"); if(!o)return;
    const ps=parseInt(o.dataset.ps,10);
    psDD.querySelectorAll(".dd-opt").forEach(x=>x.classList.toggle("sel",x===o));
    psLabel.textContent=o.textContent; closeAllDropdowns();
    if(ps===SHEET_PS)return;
    SHEET_PS=ps; sheetPage=1; renderSheet(); document.getElementById("sheetList").scrollTop=0;
  });
  document.getElementById("sheetPager").addEventListener("click", e=>{ const b=e.target.closest("button[data-p]"); if(!b||b.disabled)return;
    const p=parseInt(b.dataset.p,10); if(!p||p===sheetPage)return;
    sheetPage=p; renderSheet(); document.getElementById("sheetList").scrollTop=0;
  });
  document.getElementById("sheetView").addEventListener("click", e=>{ const b=e.target.closest("[data-v]"); if(!b)return;
    sheetView=b.dataset.v;
    document.querySelectorAll("#sheetView button").forEach(x=>x.classList.toggle("on", x===b));
    renderSheet();
  });
  document.getElementById("sheetList").addEventListener("click", e=>{
    const fav=e.target.closest("[data-fav]");
    if(fav){ const id=fav.dataset.fav; if(favs.has(id))favs.delete(id); else favs.add(id); saveFavs(); fav.classList.toggle("on"); renderFavPanel(); return; }
    const go=e.target.closest("[data-go]"); if(go){ const v=VOLS.find(x=>x.id===go.dataset.go); if(v){ saveRecent(v.id); console.log("교재 열기:", v.title); } }  // 열람 기록. TODO 뷰어 연결
  });
}

// ── 전자칠판 비례 스케일: 화면이 낮아지면 책·캐릭터를 함께 축소(1440×900 = 1, 1280×600 ≈ 0.74) ──
// 지수 0.6 → 오브젝트는 화면보다 덜 줄어 "여백만 압축"되며 자연스러운 중첩 유지.
function applyScale(){
  const tb=document.getElementById("topbar");
  const stageH=Math.max(240, window.innerHeight-(tb?tb.offsetHeight:136));
  const s=Math.min(1, Math.max(0.70, Math.pow(stageH/764, 0.6)));
  const sl=Math.min(1, Math.max(0.66, (window.innerHeight-96)/680));   // 로그인 스택(실측 자연높이 680) + 티커/여백 96 → 잘림 방지
  const r=document.documentElement.style;
  r.setProperty("--s", s.toFixed(4));
  r.setProperty("--s-login", sl.toFixed(4));
}

(async function init(){
  applyScale();
  window.addEventListener("resize", applyScale);
  const cat=await loadCatalog();
  VOLS=(cat.books||[]).filter(b=>!b.hidden);
  bind(); renderShelf();
})();
