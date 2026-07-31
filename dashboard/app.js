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

// ── 설명 모드(주황 캐릭터 클릭, Figma 606-32619) 시리즈별 소개 카피 ──
// 레이만 Figma 실카피. 나머지는 톤을 맞춘 임시 초안 — TODO: 실제 마케팅 카피로 교체
const SERIES_DESC={
  "레이":{ title:"수학의 첫 시작,\n재미는 기본!!\n사고력 향상의 첫걸음",
    body:"처음으로 수학을 시작하는 레이키즈 단계는 다양한 생활 속 소재를 바탕으로 아이들의 배경지식을 넓혀주고 교구와 게임 등의 활동을 통해 수학의 흥미를 유발하여 사고력과 창의성을 키워주는 프로그램입니다." },
  "레이플러스":{ title:"한 걸음 더 깊은\n사고력 수학,\n레이플러스", // TODO: 실제 카피로 교체
    body:"레이 과정을 마친 아이들을 위한 심화 단계입니다. 개념을 더 다양한 상황에 적용해보며 스스로 문제를 해결하는 힘을 기릅니다." },
  "레인보우":{ title:"교과와 사고력을\n한번에,\n레인보우", // TODO: 실제 카피로 교체
    body:"교과 수학과 사고력 수학을 균형 있게 다루는 프로그램입니다. 다양한 유형의 문제를 통해 개념을 튼튼히 다지고 응용력을 키웁니다." },
  "레인보우플러스":{ title:"레인보우의 확장,\n더 넓은 사고력", // TODO: 실제 카피로 교체
    body:"레인보우 과정을 마친 아이들이 더 높은 난이도의 문제에 도전하며 사고력을 확장해가는 심화 프로그램입니다." },
  "프리즘":{ title:"다양한 시각으로\n문제를 바라보는\n힘, 프리즘", // TODO: 실제 카피로 교체
    body:"하나의 정답이 아니라 여러 풀이 방법을 탐구하며 창의적 사고력을 기르는 프로그램입니다. 게임과 교구로 즐겁게 배웁니다." },
  "프리즘플러스":{ title:"프리즘 심화,\n한 단계 더 넓게", // TODO: 실제 카피로 교체
    body:"프리즘 과정의 심화 버전으로, 더 복잡한 문제 상황 속에서 다각도로 사고하는 훈련을 합니다." },
  "프리미어 초급":{ title:"기초를 탄탄히,\n프리미어 초급", // TODO: 실제 카피로 교체
    body:"수학의 기본 개념을 차근차근 익히는 입문 단계 프로그램입니다. 쉬운 설명과 반복 학습으로 자신감을 키웁니다." },
  "프리미어 중급":{ title:"실력을 한 단계\n끌어올리는,\n프리미어 중급", // TODO: 실제 카피로 교체
    body:"기초를 다진 아이들이 응용 문제까지 폭넓게 다루며 실력을 키워가는 중급 과정입니다." },
  "프리미어 특강":{ title:"핵심만 콕!\n프리미어 특강", // TODO: 실제 카피로 교체
    body:"특정 단원이나 유형을 집중적으로 다루는 특강 프로그램입니다. 부족한 부분을 빠르게 보완할 수 있습니다." },
  "소마셈":{ title:"연산이 즐거워지는\n시간, 소마셈", // TODO: 실제 카피로 교체
    body:"매일 꾸준한 연산 학습으로 계산력과 수 감각을 길러주는 프로그램입니다. 게임처럼 즐기며 반복할 수 있습니다." },
  "소마 스트라이크":{ title:"교과 진도를\n확실하게, 소마 스트라이크", // TODO: 실제 카피로 교체
    body:"학기별 교과 진도에 맞춰 개념과 문제풀이를 함께 학습하는 진도북 프로그램입니다." },
};

// ── 설명 모드 부위별 확대 설정 (레퍼런스 606-32619 실측) ──
// 비균일 확대: 몸통 5.104× · 얼굴 3.9× · 반짝이 1.86×.
// svgOrigin = 배율의 고정점(SVG 로컬 좌표). dx/dy도 SVG 로컬 단위 —
// 주의: #soma-char에 CSS scaleX(-1)이 걸려 있어 **양수 dx는 화면에서 왼쪽**으로 이동한다.
// 배율·오프셋은 ?tune 설명모드 섹션에서 눈으로 맞춘 확정값
// (레퍼런스 실측 초기값은 몸통 5.104 · 얼굴 3.9 · 반짝이 2.12/dx477.6/dy12 · 흔들기 4였음)
const NARR={
  body: { scale:4.061, origin:"580.6 485.37" },     // 회전 rect의 시각 중심
  face: { scale:3.6,   origin:"401.662 702.248" },  // 두 눈 중심
  // 이동은 #sparkle-move, 배율은 #sparkle-scale로 분리 — 한 트윈에 x/y와 svgOrigin을 섞으면 값이 누적된다
  spark:{ scale:3.0,   origin:"45.25 45.25" },
  sparkMove:{ dx:480.0, dy:-30 },   // #sparkle의 scale(1.7) 안쪽이라 화면에서는 1.7배로 반영됨
  armSwing:8, armDur:1.6
};
let narrSaved=null, narrArmTL=null;

// 진입 시 GSAP이 남긴 트랜스폼을 중립화한다. 특히 front2가 남기는 #face x=48은
// 얼굴 배율 3.9배와 겹쳐 크게 증폭되므로 반드시 0으로 돌려야 위치가 결정적으로 잡힌다.
function narrateFreezeGSAP(){
  if(!window.gsap) return;
  const get=(sel,props)=>{ const o={}; props.forEach(p=>o[p]=gsap.getProperty(sel,p)); return o; };
  narrSaved={
    char:  get("#gameChar",["xPercent","yPercent","x","y","rotation","scaleX","scaleY"]),
    inner: get("#character",["scaleX","scaleY"]),
    face:  get("#face",["x","y"]),
    tlPaused: window.charTL? window.charTL.paused() : null
  };
  if(window.charTL) window.charTL.pause();
  // gsap.set(즉시 적용)을 쓴다 — gsap.to + overwrite:true 를 쓰면 이 타깃들에 걸린
  // **charTL 내부 트윈까지 kill** 돼서 이탈 후 인트로·묵찌빠 모션이 영구적으로 깨진다.
  // 설명모드 동안 charTL은 pause 상태라 경쟁할 트윈이 없으므로 즉시 적용이 안전하다.
  gsap.set("#gameChar",{xPercent:-50,yPercent:-50,x:0,y:0,rotation:0,scaleX:1,scaleY:1});
  gsap.set("#character",{scaleX:1,scaleY:1});
  gsap.set("#face",{x:0,y:0});
}
function narrateRestoreGSAP(){
  if(!window.gsap||!narrSaved) return;
  gsap.set("#gameChar",narrSaved.char);
  gsap.set("#character",narrSaved.inner);
  gsap.set("#face",narrSaved.face);
  if(window.charTL && narrSaved.tlPaused===false) window.charTL.resume();   // 진입 전에 재생 중이었으면 이어서
  narrSaved=null;
}
// 부위별 배율 적용/해제 — CSS transform이 아니라 GSAP svgOrigin을 쓴다(motion.js와 동일한 방식,
// SVG 그룹의 transform-origin 브라우저 차이를 피하고 애니메이션도 자연스럽다)
function narrateScale(on){
  if(!window.gsap) return;
  const E="back.out(1.3)", D=.55;
  // 배율(svgOrigin 사용) — x/y는 절대 같이 넣지 않는다
  const go=(sel,c)=>gsap.to(sel, on
    ? {scale:c.scale, svgOrigin:c.origin, duration:D, ease:E, overwrite:true}
    : {scale:1, svgOrigin:c.origin, duration:D, ease:"power2.inOut", overwrite:true});
  go("#body-scale",NARR.body); go("#face-scale",NARR.face); go("#sparkle-scale",NARR.spark);
  // 이동(순수 translate — 원점 개념이 없으니 누적되지 않는다)
  const m=NARR.sparkMove;
  gsap.to("#sparkle-move", on
    ? {x:m.dx, y:m.dy, duration:D, ease:E, overwrite:true}
    : {x:0, y:0, duration:D, ease:"power2.inOut", overwrite:true});
}
// 필 툴바: GNB가 사라진 자리를 채우도록 최상단으로 올린다(레퍼런스 606-32619는 y 4).
// 위치는 initNavPill/clampPill이 인라인 style로 관리하므로(드래그 위치가 localStorage에 저장됨)
// CSS !important로 덮지 않고 인라인 값을 저장·교체·복원한다 → 설명모드 중 드래그도 그대로 동작.
let pillSaved=null;
function narratePill(on){
  const p=document.getElementById("navPill"); if(!p) return;
  if(on){ pillSaved={left:p.style.left, top:p.style.top}; p.style.left="16px"; p.style.top="8px"; }
  else if(pillSaved){ p.style.left=pillSaved.left; p.style.top=pillSaved.top; pillSaved=null; }
}

// 대형 팔 흔들기 — Figma 레이어명이 "왼쪽팔_회전으로 팔을 움직이는 효과"
function narrateArmSwing(on){
  if(narrArmTL){ narrArmTL.kill(); narrArmTL=null; }
  const g=document.getElementById("narrateArmSwing"); if(!g) return;
  if(!on){ if(window.gsap) gsap.set(g,{rotation:0}); return; }
  if(!window.gsap) return;
  gsap.set(g,{svgOrigin:"434.656 143.159"});   // 어깨(호의 시작점)를 피벗으로
  narrArmTL=gsap.fromTo(g,{rotation:-NARR.armSwing},
    {rotation:NARR.armSwing, duration:NARR.armDur, ease:"sine.inOut", yoyo:true, repeat:-1});
}

// ── 설명 모드 상태 머신 ──
let narrateList=[], narrateIdx=0, narrateTimer=null;
function narrateBookEl(id){ return document.querySelector(`#shelf .book[data-open="${id}"]`); }
function renderNarrateCard(){
  const v=narrateList[narrateIdx]; if(!v) return;
  const d=SERIES_DESC[seriesKey(v)]; if(!d) return;
  const card=document.getElementById("narrateCard");
  document.getElementById("narrateTitle").textContent=d.title;
  document.getElementById("narrateBody").textContent=d.body;
  card.classList.add("on");
  document.querySelectorAll("#shelf .book.narrate-on").forEach(b=>b.classList.remove("narrate-on"));
  const el=narrateBookEl(v.id);
  if(el){ el.classList.add("narrate-on"); el.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"}); }
}
function narrateNext(){ narrateIdx=(narrateIdx+1)%narrateList.length; renderNarrateCard(); }
function narrateGoTo(id){
  const i=narrateList.findIndex(v=>v.id===id); if(i<0) return;
  narrateIdx=i; renderNarrateCard();
  clearInterval(narrateTimer); narrateTimer=setInterval(narrateNext,6000);
}
function enterNarrate(){
  if(document.getElementById("app").dataset.mode==="narrate") return;
  narrateList=curatedList(); if(!narrateList.length) return;
  narrateIdx=0;
  document.getElementById("app").dataset.mode="narrate";
  narrateFreezeGSAP(); narrateScale(true); narrateArmSwing(true); narratePill(true);
  renderNarrateCard();
  narrateTimer=setInterval(narrateNext,6000);
}
function exitNarrate(){
  if(document.getElementById("app").dataset.mode!=="narrate") return;
  clearInterval(narrateTimer); narrateTimer=null;
  delete document.getElementById("app").dataset.mode;
  narrateScale(false); narrateArmSwing(false); narratePill(false); narrateRestoreGSAP();
  document.getElementById("narrateCard").classList.remove("on");
  document.querySelectorAll("#shelf .book.narrate-on").forEach(b=>b.classList.remove("narrate-on"));
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
    // GNB·필 툴바 밖 클릭 → 즐겨찾기 패널 닫기 (툴바에 즐겨찾기 버튼이 있으므로 함께 예외)
    if(!e.target.closest("#topbar") && !e.target.closest("#navPill")) closeFavPanel();
    // 설명모드: 책·카드 클릭이 아닌 곳(캐릭터 몸통·웨이브·필 툴바 등 어디든) → 종료. 책 클릭은 shelf 핸들러가 이미 narrateGoTo로 처리.
    if(document.getElementById("app").dataset.mode==="narrate" && !e.target.closest(".book") && !e.target.closest(".narrate-card")){
      exitNarrate();
    }
  });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeAllDropdowns(); closeWhoMenu(); closeFavPanel(); closeAnySheet(); exitNarrate(); } });
}

// ── 검색결과 버텀시트 (Figma 484-20580) ──
let favs=new Set(); try{ favs=new Set(JSON.parse(localStorage.getItem("soma_favs")||"[]")); }catch(e){}
function saveFavs(){ try{ localStorage.setItem("soma_favs", JSON.stringify([...favs])); }catch(e){} }
function sheetResults(){ const f=state.f, active=!!(f.grade||f.sem||f.year||f.subject||state.q.trim()); return active?VOLS.filter(matchVol):VOLS; }
let sheetView="list";   // 리스트 전용(그리드 경로는 코드만 보존 — 디자인에서 뷰 토글 제거)
// ★ 아이콘 — Figma 원본 경로(둥근 5각별, 484:10764). 행·즐겨찾기·필 툴바 공용
const SR_STAR='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path transform="translate(2.11 1.89)" fill="currentColor" d="M4.54155 0.836151C5.09177 -0.278718 6.68153 -0.278717 7.23175 0.836152L7.88879 2.16744C8.10728 2.61016 8.52963 2.91701 9.01819 2.988L10.4874 3.20149C11.7177 3.38026 12.209 4.89222 11.3187 5.76003L10.2556 6.79629C9.90205 7.1409 9.74073 7.6374 9.82418 8.12399L10.0751 9.58722C10.2853 10.8126 8.99916 11.747 7.89872 11.1685L6.58466 10.4776C6.14767 10.2479 5.62562 10.2479 5.18864 10.4776L3.87458 11.1685C2.77413 11.747 1.48799 10.8126 1.69815 9.58722L1.94912 8.12399C2.03257 7.6374 1.87125 7.1409 1.51772 6.79629L0.454621 5.76003C-0.435654 4.89222 0.0556119 3.38026 1.28594 3.20149L2.75511 2.988C3.24367 2.91701 3.66602 2.61016 3.88451 2.16744L4.54155 0.836151Z"/></svg>';
const SR_CHEV='<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function srRow(v){ return `<div class="sr-row" data-id="${v.id}">
    <div class="sr-title">${esc(v.title)}</div>
    <div class="sr-meta">${metaText(v).split(" · ").filter(Boolean).map(s=>`<span>${esc(s)}</span>`).join("")}</div>
    <div class="sr-pagewrap"><input class="sr-page" type="number" min="1" value="1" aria-label="페이지"><span class="sr-punit">p <i>/</i> <b>116</b></span></div>
    <button class="sr-star${favs.has(v.id)?' on':''}" data-fav="${v.id}" aria-label="즐겨찾기">${SR_STAR}</button>
    <button class="sr-go" data-go="${v.id}" aria-label="열기">${SR_CHEV}</button>
  </div>`; }
function srCard(v){ return `<div class="sr-card" data-go="${v.id}" title="${esc(v.title)}"><div class="cover">${coverInner(v)}</div><div class="cap">${esc(v.title)}</div></div>`; }
// 페이지네이션: 번호형(현재±2 윈도 + … 생략 + 화살표). 페이지당 20개 고정(디자인 590-42404: 개수 드롭다운 없음)
let sheetPage=1, SHEET_PS=20;
const PG_PREV='<svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true"><path d="M5 1L1 5l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PG_NEXT='<svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true"><path d="M1 1l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function pagerHTML(total){
  const last=Math.max(1, Math.ceil(total/SHEET_PS));
  if(last<=1) return "";
  const p=Math.min(sheetPage,last), win=[];
  for(let i=Math.max(1,p-2); i<=Math.min(last,p+2); i++) win.push(i);
  const parts=[`<button type="button" class="pg-nav" data-p="${p-1}" ${p===1?"disabled":""} aria-label="이전">${PG_PREV}</button>`];
  if(win[0]>1){ parts.push(`<button type="button" data-p="1">1</button>`); if(win[0]>2) parts.push(`<span class="pg-ell">…</span>`); }
  win.forEach(i=>parts.push(`<button type="button" data-p="${i}" class="${i===p?'cur':''}">${i}</button>`));
  if(win[win.length-1]<last){ if(win[win.length-1]<last-1) parts.push(`<span class="pg-ell">…</span>`); parts.push(`<button type="button" data-p="${last}">${last}</button>`); }
  parts.push(`<button type="button" class="pg-nav" data-p="${p+1}" ${p===last?"disabled":""} aria-label="다음">${PG_NEXT}</button>`);
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
  const sb=document.getElementById("searchOpenBtn"); if(sb) sb.classList.add("on");   // press 상태
}
function closeSheet(){
  const scr=document.getElementById("sheetScrim"), sh=document.getElementById("resultSheet");
  if(!sh || !sh.classList.contains("on")) return;
  scr.classList.remove("on"); sh.classList.remove("on"); sh.setAttribute("aria-hidden","true");
  document.body.classList.remove("sheet-open");
  const sb=document.getElementById("searchOpenBtn"); if(sb) sb.classList.remove("on");
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
  if(b){ b.setAttribute("aria-expanded","false"); b.classList.remove("on"); }
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
  // 검색 실행: 시트가 이미 열려 있으면(필터가 시트 안) 재검색만, 아니면 시트 열기
  const runSearch=()=>{ state.q=si.value;
    if(document.getElementById("resultSheet").classList.contains("on")){ sheetPage=1; renderSheet(); document.getElementById("sheetList").scrollTop=0; }
    else openSheet();
  };
  document.getElementById("searchBtn").addEventListener("click",runSearch);
  document.getElementById("searchOpenBtn").addEventListener("click",openSheet);   // 필 툴바 '검색하기'
  si.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); runSearch(); } });
  // 전체 교재 보기: 필터·검색어 초기화 후 전체 목록(디자인 590-42404)
  document.getElementById("btnAllBooks").addEventListener("click",()=>{
    state.f={grade:"",sem:"",year:"",subject:""}; state.q=""; si.value="";
    document.querySelectorAll("#filterbar .dropdown").forEach(dd=>{           // 커스텀 드롭다운 라벨·선택 표시 리셋
      const opts=dd.querySelectorAll(".dd-opt");
      opts.forEach((o,i)=>o.classList.toggle("sel", i===0));
      const lbl=dd.querySelector(".dd-label"); if(lbl&&opts[0]) lbl.textContent=opts[0].textContent;
    });
    sheetPage=1;
    if(document.getElementById("resultSheet").classList.contains("on")){ renderSheet(); document.getElementById("sheetList").scrollTop=0; }
    else openSheet();
  });
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
    favBtn.classList.toggle("on",open);   // press 상태(디자인 591-42642)
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
    if(document.getElementById("app").dataset.mode==="narrate"){ narrateGoTo(b.dataset.open); return; }   // 설명모드: 클릭한 책부터 설명 재시작
    const idx=[...shelf.querySelectorAll(".book")].indexOf(b);
    if(idx===1){ const v=VOLS.find(x=>x.id===b.dataset.open); saveRecent(b.dataset.open); openCatalog(v?seriesKey(v):"레이"); }   // 두 번째 표지 → 열람 기록 + 카탈로그
    else showToast("준비 중입니다");
  });
  // 주황 캐릭터 클릭(또는 Enter/Space) → 설명 모드 진입(Figma 606-32619)
  // 진입 클릭은 stopPropagation 필수 — 안 그러면 같은 클릭이 document 핸들러까지 버블돼 "바깥 클릭"으로 오인, 그 자리에서 즉시 종료된다.
  // 단, 이미 설명모드일 때 캐릭터(화면 대부분을 덮은 상태)를 다시 클릭하면 그건 진짜 "바깥 클릭"이므로 그대로 버블시켜 종료되게 둔다.
  const gameChar=document.getElementById("gameChar");
  gameChar.addEventListener("click",e=>{
    if(document.getElementById("app").dataset.mode==="narrate") return;
    e.stopPropagation(); enterNarrate();
  });
  gameChar.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); enterNarrate(); } });
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
  // 페이지네이션(개수 드롭다운·뷰 토글은 디자인 590-42404에서 제거 — 20개 고정·리스트 전용)
  document.getElementById("sheetPager").addEventListener("click", e=>{ const b=e.target.closest("button[data-p]"); if(!b||b.disabled)return;
    const p=parseInt(b.dataset.p,10); if(!p||p===sheetPage)return;
    sheetPage=p; renderSheet(); document.getElementById("sheetList").scrollTop=0;
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
  const stageH=Math.max(240, window.innerHeight-(tb?tb.offsetHeight:63));
  const s=Math.min(1, Math.max(0.70, Math.pow(stageH/837, 0.6)));       // 잔여 용도(즐겨찾기 카드 등)
  const s2=Math.min(1, Math.max(0.72, Math.pow(stageH/837, 0.62)));     // 교재 전용: 1280×600 → 0.761(188px), 1440×900 → 1(247px)
  const sl=Math.min(1, Math.max(0.66, (window.innerHeight-96)/680));    // 로그인 스택(실측 자연높이 680) + 티커/여백 96 → 잘림 방지
  const r=document.documentElement.style;
  r.setProperty("--s", s.toFixed(4));
  r.setProperty("--s2", s2.toFixed(4));
  r.setProperty("--s-login", sl.toFixed(4));
}

// ── 플로팅 네비 툴바: ☰ 그립으로 드래그 이동 + 위치 저장 ──
const PILL_HOME={l:16, t:68};
// 이동 가능 영역 = 스테이지(GNB 아래). GNB(z20) 뒤로 들어가면 보이지도 눌리지도 않아 복구 불가 → 상단을 GNB 아래로 제한
function pillBounds(p){
  const tb=document.getElementById("topbar");
  // 설명모드에는 GNB가 없으니 최상단(8)까지 허용 — 안 그러면 clampPill()이 다시 69로 끌어내린다
  const narr=document.getElementById("app").dataset.mode==="narrate";
  const m=8, gnb=narr ? m : (tb?tb.offsetHeight:63)+5;
  return { minL:m, minT:gnb,
           maxL:Math.max(m, window.innerWidth-p.offsetWidth-m),
           maxT:Math.max(gnb, window.innerHeight-p.offsetHeight-m) };
}
function pillClampXY(p,x,y){
  const b=pillBounds(p);
  return { x:Math.min(Math.max(b.minL,x), b.maxL), y:Math.min(Math.max(b.minT,y), b.maxT) };
}
function clampPill(){
  const p=document.getElementById("navPill"); if(!p) return;
  const c=pillClampXY(p, parseFloat(p.style.left)||PILL_HOME.l, parseFloat(p.style.top)||PILL_HOME.t);
  p.style.left=c.x+"px"; p.style.top=c.y+"px";
}
function resetPill(){
  const p=document.getElementById("navPill"); if(!p) return;
  p.style.left=PILL_HOME.l+"px"; p.style.top=PILL_HOME.t+"px"; clampPill();
  try{ localStorage.removeItem("soma_navpos"); }catch(_){}
}
function initNavPill(){
  const p=document.getElementById("navPill"), grip=document.getElementById("npGrip");
  if(!p||!grip) return;
  try{ const s=JSON.parse(localStorage.getItem("soma_navpos")||"null");
       if(s&&typeof s.l==="number"){ p.style.left=s.l+"px"; p.style.top=s.t+"px"; } }catch(e){}
  clampPill();

  let pid=null, sx=0, sy=0, l0=0, t0=0, nx=0, ny=0, raf=0;
  let resumePid=null, resumeAt=0, lastTap=0;

  function begin(e){
    pid=e.pointerId; sx=e.clientX; sy=e.clientY;
    const r=p.getBoundingClientRect(); l0=r.left; t0=r.top; nx=l0; ny=t0;
    grip.classList.add("dragging"); p.style.willChange="transform";
    try{ grip.setPointerCapture(e.pointerId); }catch(_){}
  }
  // 드래그 중엔 transform으로만 이동(리플로우 0회) → 저사양 전자칠판에서도 매끄럽게 추종
  function paint(){ raf=0; p.style.transform="translate3d("+(nx-l0)+"px,"+(ny-t0)+"px,0)"; }
  function commit(){
    if(raf){ cancelAnimationFrame(raf); raf=0; }
    p.style.transform=""; p.style.willChange="";
    p.style.left=nx+"px"; p.style.top=ny+"px";
    grip.classList.remove("dragging");
    try{ localStorage.setItem("soma_navpos", JSON.stringify({l:nx,t:ny})); }catch(_){}
  }
  grip.addEventListener("pointerdown",e=>{
    // 더블탭/더블클릭 = 제자리로(GNB 뒤로 숨었을 때의 복구 수단). 터치에서도 확실히 잡히게 pointerdown으로 판정
    const t=Date.now();
    if(t-lastTap<350){ lastTap=0;
      if(pid!==null){ try{grip.releasePointerCapture(pid);}catch(_){} }
      pid=null; resumePid=null;
      if(raf){ cancelAnimationFrame(raf); raf=0; }
      p.style.transform=""; p.style.willChange=""; grip.classList.remove("dragging");
      resetPill(); showToast("툴바를 제자리로"); return;
    }
    lastTap=t;
    if(pid!==null) return;
    begin(e);
    if(e.cancelable) e.preventDefault();
  });
  // 캡처가 풀려도 놓치지 않게 window에서 수신. passive:false → pointermove에서 preventDefault 가능
  window.addEventListener("pointermove",e=>{
    if(pid===null){
      // 브라우저가 pointercancel을 냈지만 손가락이 아직 붙어 있는 경우 → 같은 포인터로 드래그 이어받기
      if(resumePid!==null && e.pointerId===resumePid && Date.now()<resumeAt) begin(e);
      else return;
    } else if(e.pointerId!==pid) return;   // 다중 터치의 다른 손가락 무시
    const c=pillClampXY(p, l0+e.clientX-sx, t0+e.clientY-sy);
    nx=c.x; ny=c.y;
    if(!raf) raf=requestAnimationFrame(paint);
    if(e.cancelable) e.preventDefault();
  },{passive:false});
  window.addEventListener("pointerup",e=>{
    if(pid===null||e.pointerId!==pid) return;
    try{ grip.releasePointerCapture(pid); }catch(_){}
    pid=null; resumePid=null; commit();
  });
  // pointercancel을 '드래그 종료'로 처리하면 1~2cm마다 끊긴다 → 위치만 확정하고 재개 가능 상태로 둔다
  window.addEventListener("pointercancel",e=>{
    if(pid===null||e.pointerId!==pid) return;
    resumePid=pid; resumeAt=Date.now()+900;
    pid=null; commit();
  });
  window.addEventListener("resize", clampPill);
}

(async function init(){
  applyScale();
  window.addEventListener("resize", applyScale);
  initNavPill();
  const cat=await loadCatalog();
  VOLS=(cat.books||[]).filter(b=>!b.hidden);
  bind(); renderShelf();
})();
