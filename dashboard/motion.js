// 소마챔스 모션 컨트롤러 — 로그인→대시보드 모핑(Phase 2) + 캐릭터 마스터 타임라인(Phase 3~5).
(function(){
  const RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = s => document.querySelector(s);
  const app = $("#app");

  // ── 상단 티커 조립: [텍스트그룹][캐릭터] × 6 → 심리스 루프 위해 2배 복제 ──
  (function buildTicker(){
    const track = $("#tickerTrack"); if(!track) return;
    const unit = document.createDocumentFragment();
    for(let i=1;i<=6;i++){
      const g=document.createElement("div"); g.className="t-group";
      g.innerHTML='<span class="t-item">playing math club</span><span class="t-item t-brand">soma chams</span>';
      const img=document.createElement("img"); img.className="t-char"; img.src="assets/ticker/t"+i+".svg"; img.alt="";
      unit.appendChild(g); unit.appendChild(img);
    }
    track.appendChild(unit.cloneNode(true));   // 1벌
    track.appendChild(unit);                    // 2벌(복제) → -50% 이동 시 심리스
  })();

  // ── 조이스틱 토퍼 흔들기(4번째 비트) ──
  function wiggleJoystick(root){
    const tl=gsap.timeline();
    if(!root) return tl;
    const stick=root.querySelector(".jstick"), led=root.querySelector(".jled");
    gsap.set(stick,{svgOrigin:"15.4 19.5"});
    tl.to(stick,{rotation:-26,duration:.16,ease:"power2.out"})
      .set(led,{attr:{stroke:"#5AB725"}})
      .to(stick,{rotation:26,duration:.26,ease:"power1.inOut"})
      .set(led,{attr:{stroke:"#E19F3C"}})
      .to(stick,{rotation:-10,duration:.16,ease:"power1.inOut"})
      .to(stick,{rotation:0,duration:.22,ease:"back.out(2.2)"})
      .set(led,{attr:{stroke:"#D23040"}});
    return tl;
  }

  // ── 로그인 로고 Lottie(1~3단계) + 조이스틱(4단계) 순차 반복 ──
  function initLogoLottie(){
    const cont=$("#logoLottie"), topper=$("#loginTopper");
    if(!cont || !window.lottie) return;
    // tuck(y:38)은 CSS 기본값으로 처리(로드부터 글자 뒤 숨김). 여기선 rise만.
    const anim=lottie.loadAnimation({container:cont,renderer:"svg",loop:false,autoplay:false,path:"lottie/logo.json"});
    anim.addEventListener("DOMLoaded",()=>{
      const m=anim.markers||[];
      const loopStart=m[1]?m[1].time:90;
      const end=m[1]?(m[1].time+m[1].duration):168;   // 마커 기반(세그먼트 재생 후 totalFrames 변동 회피)
      if(RM){ anim.goToAndStop(end-1,true); gsap.set(topper,{y:0}); return; }
      let introDone=false;
      anim.addEventListener("complete",()=>{
        if(!introDone){                                      // 인트로 끝 → 조이스틱 솟아오름(1회)
          introDone=true;
          gsap.to(topper,{y:0,duration:.5,ease:"back.out(1.7)",onComplete:()=>anim.playSegments([loopStart,end],true)});
        } else {                                             // loop 끝 → 조이스틱 흔들기(4번째 비트) → loop 반복
          wiggleJoystick(topper).eventCallback("onComplete",()=>anim.playSegments([loopStart,end],true));
        }
      });
      anim.playSegments([0,loopStart],true);                 // intro 1회
    });
  }

  // ── GNB 로고: 평소 정지, hover/focus 시에만 조이스틱 인터랙션 ──
  function initGnbTopper(){
    const g=$("#gnbLogo"); if(!g) return;
    const topper=g.querySelector(".logo-topper"), stick=topper.querySelector(".jstick"), led=topper.querySelector(".jled");
    let tl=null;
    const start=()=>{ if(RM||tl) return; tl=gsap.timeline({repeat:-1}); tl.add(wiggleJoystick(topper)); };
    const stop=()=>{ if(tl){tl.kill();tl=null;} gsap.to(stick,{rotation:0,duration:.2,svgOrigin:"15.4 19.5"}); gsap.set(led,{attr:{stroke:"#D23040"}}); };
    g.addEventListener("mouseenter",start); g.addEventListener("mouseleave",stop);
    g.addEventListener("focus",start); g.addEventListener("blur",stop);
  }

  initLogoLottie();
  initGnbTopper();

  // ── 로그인 카드 소품(눈 토글·아이디 저장) ──
  const eye = $("#eye"), pw = $("#userpw");
  if(eye) eye.addEventListener("click", ()=>{
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    eye.querySelector(".off").style.display = show ? "none" : "";
    eye.querySelector(".on").style.display  = show ? "" : "none";
  });
  const remember = $("#remember");
  if(remember){
    const toggle = ()=>{ const on=!remember.classList.contains("checked");
      remember.classList.toggle("checked",on); remember.setAttribute("aria-checked",String(on)); };
    remember.addEventListener("click", toggle);
    remember.addEventListener("keydown", e=>{ if(e.key===" "||e.key==="Enter"){e.preventDefault();toggle();} });
  }
  // 포커스 시 로고 컬러화(state2)
  const loginLogo = $("#loginLogo");
  document.querySelectorAll(".lfield input").forEach(inp=>{
    inp.addEventListener("focus", ()=> loginLogo && loginLogo.classList.add("active"));
  });

  // ── 대시보드 진입(모핑 완료 후 호출) ──
  function enterDashboard(){
    app.dataset.phase = "dashboard";
    try{ sessionStorage.setItem("soma_auth","1"); }catch(e){}   // 새로고침 시 대시보드 유지
    const ov = $("#loginOverlay"); if(ov) ov.classList.add("gone");
    // 캐릭터 마스터 타임라인 시작(Phase 3~5). 아직 미구현 시 안전하게 노출만.
    if(typeof window.startCharacter === "function") window.startCharacter();
    else gsap.set("#gameChar",{opacity:1});
    startBallLoop();   // 캐릭터3 축구공 통통 루프
  }

  // ══════════════════════════════════════════════════════════════
  //  캐릭터 모션 CONFIG (MOTION_SPEC §4 타이밍 테이블 — 여기서 전부 튜닝)
  // ══════════════════════════════════════════════════════════════
  const CFG = {
    // SVG 관절 기준점(1160×1014 좌표계)
    origin:{ bodyBottom:"455 950", shoulderR:"322 669", shoulderL:"640 850",     // shoulderL = 캡슐 든 왼팔 어깨
             c2BodyBottom:"270 414" },                                           // char2 삼각 몸통 밑변 중앙(viewBox 511×435) — 임팩트 스쿼시 피벗
    peek:{   tilt:5, sway:4, swayDur:.40, anticipShift:8, anticipDur:.15 },
    flyIn:{  dur:.9,  ease:"power3.inOut", stretchX:1.15, stretchY:.88 },
    land:{   squashDur:.12, sqX:1.22, sqY:.80, overDur:.16, ovX:.95, ovY:1.06,
             settleDur:.55, settleEase:"elastic.out(1, 0.5)" },
    arm:{    followDelay:.09, upR:-7, upL:-5, outEase:"back.out(2.5)", backEase:"back.out(2)" },   // upL: 미러 래퍼로 부호 반전(시각 동일)·캡슐 과도 스윙 방지
    // 묵찌빠 스윙(착지 직후 1회, 단일 관절=어깨). "스으윽 딱" = 준비(반동)→가속 글라이드→급정지.
    play:{   ready:-10, swingDown:18, restSwing:4,   // 팔 배치 scale 2(내부 미러 제거)로 부호 원복 — 화면상 준비(위)→스윙(아래)
             riseDur:0.22, glideDur:0.85, hold:0.10, glideEase:"power3.in", squashY:0.975 },
    // char2(녹색): char1과 동일 타이밍(charTL)로 팔 스윙+손 토글. 어깨 피벗·등장 슬라이드 시작(오른쪽 밖).
    // 부호 주의: char1은 #soma-char에 CSS scaleX(-1) 미러가 걸려 화면 방향이 반대다. char2는 미러가 없으므로
    // 같은 부호를 쓰면 준비/스윙 방향이 뒤집힌다 → ready 양수(손 올림)·swingDown 음수(내려찍음)로 반전.
    // 진폭도 char1과 화면 이동량이 같아지게 정규화(char1 +0.679px/° · char2 -1.417px/° 실측 → 총 13.5° ≈ 19px).
    play2:{  ready:5, swingDown:-8.5, restSwing:-2, pivot:"154.86 269.18", slideFrom:0.35 },
  };

  // peek(우측 상단, 밑단만 노출) 오프셋 — 착지 홈(0,0) 대비. 실제 렌더 높이 기준.
  function peekOffset(){
    // Figma 448 대응: 홈(우측 76.5%) 대비 중앙(52.3%)·상단 밖. (앱=Figma 프레임 기준)
    return { x: -(innerWidth*0.242), y: -(innerHeight*0.339) };
  }

  let charTL = null;
  function startCharacter(){
    const c="#gameChar", char="#character",
          armFront="#arm-front", armSwing="#arm-swing",
          c2="#gameChar2", c2arm="#c2-arm-swing";
    gsap.set(c,{opacity:1});

    // 관절 기준점
    gsap.set(char,{ svgOrigin:CFG.origin.bodyBottom });
    gsap.set(armFront,{ svgOrigin:CFG.origin.shoulderL });        // 앞 단순 팔(착지 팔로우)
    // 묵찌빠(뒤) 팔 단일 관절: 어깨(로컬 25,19 — arm-play 배치 transform 내부 좌표)
    gsap.set(armSwing,{ transformOrigin:"25px 19px" });
    // char2: 어깨 피벗·손 초기 묵(주먹)·중심 정렬
    gsap.set(c2,{ xPercent:-50, yPercent:-50 });
    gsap.set(c2arm,{ svgOrigin:CFG.play2.pivot });
    gsap.set(["#c2-fingers-jji","#c2-fingers-ppa"],{ opacity:0 });

    if(RM){ gsap.set(c,{xPercent:-50,yPercent:-50,x:0,y:0,rotation:0}); gsap.set(c2,{x:0}); return; }

    gsap.set(c2,{ x: innerWidth*CFG.play2.slideFrom });          // char2 오른쪽 밖에서 시작(등장 슬라이드)

    const pk=peekOffset();
    gsap.set(c,{ xPercent:-50, yPercent:-50, x:pk.x, y:pk.y, rotation:CFG.peek.tilt });

    const tl=gsap.timeline();

    // ── 씬0 peek: 밑단만 보인 채 미세 갸웃 → 발사 직전 위로 움츠림(anticipation) ──
    tl.addLabel("peek")
      .to(c,{ rotation:CFG.peek.tilt-CFG.peek.sway, duration:CFG.peek.swayDur, ease:"sine.inOut", yoyo:true, repeat:1 }, "peek")
      .to(c,{ y:pk.y-CFG.peek.anticipShift, duration:CFG.peek.anticipDur, ease:"power2.in" }, "peek+=0.62");

    // ── 씬1 flyIn: 곡선 궤적으로 슝 → 진행축 스트레치(속도 최고점에서 최대) ──
    tl.addLabel("flyIn")
      .to(c,{ x:0, y:0, rotation:0, duration:CFG.flyIn.dur, ease:CFG.flyIn.ease }, "flyIn")
      .to(char,{ scaleX:CFG.flyIn.stretchX, scaleY:CFG.flyIn.stretchY,
                 duration:CFG.flyIn.dur*0.5, ease:"sine.inOut", yoyo:true, repeat:1 }, "flyIn+=0.05");

    // char2 등장 슬라이드: 오른쪽 밖 → 제자리(char1 비행과 함께)
    tl.to(c2,{ x:0, duration:0.9, ease:"power3.out" }, "flyIn");

    // ── 씬2 land: 스쿼시 → 오버슈트 → elastic 정착 (origin=바닥중앙) ──
    tl.addLabel("land")
      .to(char,{ scaleX:CFG.land.sqX, scaleY:CFG.land.sqY, duration:CFG.land.squashDur, ease:"power2.out" }, "land")
      .to(char,{ scaleX:CFG.land.ovX, scaleY:CFG.land.ovY, duration:CFG.land.overDur, ease:"power2.inOut" }, ">")
      .to(char,{ scaleX:1, scaleY:1, duration:CFG.land.settleDur, ease:CFG.land.settleEase }, ">");

    // ── 씬3 armFollow: 앞 단순 팔이 본체보다 늦게 튀었다 정착(follow-through) ──
    tl.to(armFront,{ rotation:CFG.arm.upL, duration:.32, ease:CFG.arm.outEase }, "land+=0.04")
      .to(armFront,{ rotation:0, duration:.42, ease:CFG.arm.backEase }, "land+=0.30");

    // ── 씬4~ 묵찌빠 2라운드 대결 (playBeats/frontReact 헬퍼로 공용) ──
    const P=CFG.play, beat=P.riseDur+P.glideDur+P.hold;   // ≈1.17s

    // 4비트 스윙(둘 다) + 각자 손 토글 + char1 임팩트 스쿼시 + 마지막 팔 정착
    function playBeats(t0, C1, C2){
      C1.forEach((h1,i)=>{
        const h2=C2[i], last=(i===3);
        const at=t0+i*beat, glideT=at+P.riseDur, hitT=glideT+P.glideDur;
        tl.to(armSwing,{ rotation:P.ready, duration:P.riseDur, ease:"power2.out" }, at)
          .to(armSwing,{ rotation:P.swingDown, duration:P.glideDur, ease:P.glideEase }, glideT);
        tl.to(c2arm,{ rotation:CFG.play2.ready, duration:P.riseDur, ease:"power2.out" }, at)
          .to(c2arm,{ rotation:CFG.play2.swingDown, duration:P.glideDur, ease:P.glideEase }, glideT);
        tl.to("#fingers-jji",{ opacity:h1.jji, duration:0.05 }, hitT)
          .to("#fingers-ppa",{ opacity:h1.ppa, duration:0.05 }, hitT)
          .to("#c2-fingers-jji",{ opacity:h2.jji, duration:0.05 }, hitT)
          .to("#c2-fingers-ppa",{ opacity:h2.ppa, duration:0.05 }, hitT)
          .to(char,{ scaleY:P.squashY, duration:0.08, yoyo:true, repeat:1, ease:"power2.out", svgOrigin:CFG.origin.bodyBottom }, hitT)
          // char2도 같은 임팩트 스쿼시 — 없으면 "딱" 박자감이 char1에서만 나서 동시로 안 읽힌다
          .to("#c2-character",{ scaleY:P.squashY, duration:0.08, yoyo:true, repeat:1, ease:"power2.out", svgOrigin:CFG.origin.c2BodyBottom }, hitT);
        if(last){
          tl.to(armSwing,{ rotation:P.restSwing, duration:0.5, ease:"power2.out" }, hitT+P.hold);
          tl.to(c2arm,{ rotation:CFG.play2.restSwing, duration:0.5, ease:"power2.out" }, hitT+P.hold);
        }
      });
    }

    // 정면 리액션: sad = 지는 캐릭터('c1'|'c2'). 진 쪽 입 뒤집힘(슬픔)+움찔+처짐 / 이긴 쪽 입 정상(웃음)+hop
    const RC1={ mouth:"#mouth", mp:"403.7 746.3", cont:"#gameChar", eye:"#eye", ep:"401 702" };
    const RC2={ mouth:"#c2-mouth", mp:"189.8 215.9", cont:"#gameChar2", eye:null };
    function frontReact(pos, sad){
      const loser=(sad==='c2')?RC2:RC1, winner=(sad==='c2')?RC1:RC2, L=pos.label;
      tl.addLabel(L, pos.at);
      tl.to(loser.mouth,{ scaleY:-1, svgOrigin:loser.mp, duration:0.35, ease:"power2.inOut" }, L)
        .to(loser.cont,{ scaleY:0.9, duration:0.1, ease:"power2.in" }, L)
        .to(loser.cont,{ scaleY:1, y:6, duration:0.45, ease:"back.out(1.4)" }, ">");
      tl.to(winner.mouth,{ scaleY:1, svgOrigin:winner.mp, duration:0.35, ease:"power2.inOut" }, L)
        .to(winner.cont,{ scaleY:1.08, y:0, duration:0.12, ease:"power2.out" }, L)
        .to(winner.cont,{ scaleY:1, duration:0.45, ease:"elastic.out(1,0.5)" }, ">");
      if(winner.eye) tl.to(winner.eye,{ scaleY:0.12, duration:.08, svgOrigin:winner.ep, yoyo:true, repeat:1 }, L+"+=0.12");
    }

    // 정면 정착 오프셋(로컬 SVG 단위). char1은 CSS scaleX(-1) 미러라 화면과 부호 반대(+x=화면 왼쪽).
    const FRONT={ c1FaceX:48, c2FaceX:16 };
    // 마지막: 둘 다 정면 보고 웃음. 얼굴(눈코입)만 이동해 정면 느낌(묵찌빠 손은 이동 안 함).
    function frontSmileBoth(pos){
      const L=pos.label; tl.addLabel(L, pos.at);
      // 입 둘 다 웃음(정상)으로
      tl.to(RC1.mouth,{ scaleY:1, svgOrigin:RC1.mp, duration:0.3, ease:"power2.inOut" }, L)
        .to(RC2.mouth,{ scaleY:1, svgOrigin:RC2.mp, duration:0.3, ease:"power2.inOut" }, L);
      // 얼굴 정면 이동: char1=화면 왼쪽(+x, 미러), char2=화면 오른쪽(+x)
      tl.to("#face",{ x:FRONT.c1FaceX, duration:0.5, ease:"power2.out" }, L)
        .to(["#c2-eyes","#c2-mouth"],{ x:FRONT.c2FaceX, duration:0.5, ease:"power2.out" }, L);
      // 정면 정착 hop(둘 다) + char1 눈 깜빡(웃음 강조)
      tl.to(["#gameChar","#gameChar2"],{ scaleY:1, y:0, duration:0.12, ease:"power2.out" }, L)
        .fromTo(["#gameChar","#gameChar2"],{ scaleY:1.06 },{ scaleY:1, duration:0.5, ease:"elastic.out(1,0.5)" }, ">");
      tl.to(RC1.eye,{ scaleY:0.12, duration:.08, svgOrigin:RC1.ep, yoyo:true, repeat:1 }, L+"+=0.15");
    }

    // ── 라운드1: char1 묵빠찌빠(승) / char2 묵찌빠묵(패=슬픔) ──
    // 1비트는 둘 다 묵(구호 시작), 2~4비트는 양쪽 모두 매 비트 손이 바뀐다.
    // 한쪽만 비트마다 바뀌면 "한 박 늦다"로 읽히기 때문. 4비트 빠(보) vs 묵(바위) → char1 승.
    gsap.set(["#fingers-jji","#fingers-ppa","#c2-fingers-jji","#c2-fingers-ppa"],{ opacity:0 }); // 둘 다 묵
    tl.addLabel("b1", ">+0.15");
    tl.addLabel("b2", tl.labels.b1+beat).addLabel("b3", tl.labels.b1+2*beat).addLabel("b4", tl.labels.b1+3*beat);
    playBeats(tl.labels.b1, [ {jji:0,ppa:0},{jji:0,ppa:1},{jji:1,ppa:0},{jji:0,ppa:1} ],
                            [ {jji:0,ppa:0},{jji:1,ppa:0},{jji:0,ppa:1},{jji:0,ppa:0} ]);
    frontReact({ label:"front", at:">+0.25" }, 'c2');

    // ── 라운드2: 3초 후, 시퀀스 스왑 → char2 승 → 표정 반대 ──
    tl.addLabel("r2", ">+3");
    tl.to(["#fingers-jji","#fingers-ppa","#c2-fingers-jji","#c2-fingers-ppa"],{ opacity:0, duration:0.1 }, "r2") // 둘 다 주먹 리셋
      .to(["#gameChar","#gameChar2"],{ scaleY:1, y:0, duration:0.3, ease:"power2.out" }, "r2")                    // 자세 정렬(재대결 준비)
      .to([RC1.mouth,RC2.mouth],{ scaleY:1, duration:0.2 }, "r2");                                                // 입 웃음으로 리셋(라운드1 슬픔 해제)
    const r2b1=tl.labels.r2+0.4;
    tl.addLabel("b5", r2b1).addLabel("b6", r2b1+beat).addLabel("b7", r2b1+2*beat).addLabel("b8", r2b1+3*beat);
    playBeats(r2b1, [ {jji:0,ppa:0},{jji:1,ppa:0},{jji:0,ppa:1},{jji:0,ppa:0} ],   // char1 묵찌빠묵
                    [ {jji:0,ppa:0},{jji:0,ppa:1},{jji:1,ppa:0},{jji:0,ppa:1} ]);  // char2 묵빠찌빠 → 4비트 빠 vs 묵 = char2 승
    frontSmileBoth({ label:"front2", at:">+0.25" });   // 마지막: 둘 다 정면 보고 웃음

    charTL=tl; window.charTL=tl;
    if(typeof startIdle==="function") tl.eventCallback("onComplete", startIdle);
    return tl;
  }
  window.startCharacter = startCharacter;

  // ── 로그인 → 대시보드 모핑 ──
  function playMorph(){
    const overlay=$("#loginOverlay"), card=$("#loginCard"), foot=$("#loginFoot"),
          logo=$("#loginLogo"), ticker=$("#ticker"),
          topbar=$("#topbar"),
          waves=$(".waves"), elephant=$(".elephant"), shelf=$(".shelf-wrap");

    if(RM){
      gsap.set([topbar,waves,elephant,shelf],{opacity:1,clearProps:"transform"});
      enterDashboard(); return;
    }

    const H = window.innerHeight;
    const tl = gsap.timeline({defaults:{ease:"power2.out"}, onComplete:enterDashboard});

    // 1) 입력 카드·푸터가 아래로 빠지며 페이드 (state3)
    tl.to([card,foot], {y:90, opacity:0, duration:.42, ease:"power2.in"}, 0);
    // 2) 로고가 위(GNB 자리)로 이동·축소하며 페이드
    tl.to(logo, {y:-H*0.30, scale:.44, opacity:0, duration:.62, ease:"power3.inOut"}, .12);
    tl.to(ticker, {y:-50, opacity:0, duration:.4, ease:"power2.in"}, .35);
    // 3) 상단 카드가 위에서 슬라이드 인
    tl.fromTo(topbar, {y:-46, opacity:0}, {y:0, opacity:1, duration:.5}, .5);
    // 4) 웨이브·코끼리·책꽂이가 아래에서 슬라이드 인 (state4)
    tl.fromTo(waves,    {y:70,  opacity:0}, {y:0, opacity:1, duration:.6}, .55);
    tl.fromTo(shelf,    {y:110, opacity:0}, {y:0, opacity:1, duration:.72, ease:"power3.out"}, .58);
    tl.fromTo(elephant, {y:90,  opacity:0}, {y:0, opacity:1, duration:.62, ease:"back.out(1.5)"}, .66);
    // 5) 오버레이 정리
    tl.to(overlay, {opacity:0, duration:.28}, .95);
  }

  // ══════════════════════════════════════════════════════════════
  //  씬7 idle: 숨쉬기 + 랜덤 깜빡임 (무한 루프). 묵찌빠는 1회성이라 손은 빠(편 손) 유지.
  // ══════════════════════════════════════════════════════════════
  function startIdle(){
    if(RM) return;
    gsap.to("#character",{ scaleY:1.015, duration:2.4, ease:"sine.inOut", yoyo:true, repeat:-1, svgOrigin:CFG.origin.bodyBottom });
    (function blink(){
      gsap.to("#eye",{ scaleY:0.12, duration:.08, svgOrigin:"401 702", yoyo:true, repeat:1,
        onComplete:()=>gsap.delayedCall(3+Math.random()*3, blink) });
    })();
  }
  window.startIdle = startIdle;

  // ── 캐릭터3: 머리로 축구공 통통 튀기기(무한 루프) ──
  function startBallLoop(){
    if(RM) return;
    if(!document.getElementById("c3-ball")) return;
    const btl = gsap.timeline({ repeat:-1 });
    btl.to("#c3-ball",{ y:-70, duration:0.5, ease:"power2.out" })                 // 통(위로)
       .to("#c3-ball",{ y:0,   duration:0.42, ease:"power2.in" })                 // 떨어짐(가속)
       .to("#c3-body",{ scaleY:0.95, duration:0.09, yoyo:true, repeat:1,
                        ease:"power2.out", svgOrigin:"131 254" }, ">-0.04");      // 접촉 순간 머리 살짝 눌림(헤딩)
    window.ballTL = btl;
  }
  window.startBallLoop = startBallLoop;

  // ── ?debug 모션 개발툴(씬 점프·구간 반복·속도·스크러버) ──
  function setupDebug(){
    const tl=window.charTL; if(!tl) return;
    tl.eventCallback("onComplete", null); tl.pause();
    const labels=Object.entries(tl.labels).sort((a,b)=>a[1]-b[1]);   // [[name,time]...] 시간순
    let loop=null;   // [start,end] 반복 구간 or null

    const box=document.createElement("div");
    box.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:999;background:rgba(20,22,20,.94);color:#fff;padding:9px 14px;font:12px/1.35 monospace;display:flex;flex-wrap:wrap;align-items:center;gap:7px;";
    const mk=(t,bg)=>{const b=document.createElement("button");b.textContent=t;b.dataset.bg=bg||"#2b2f2b";b.style.cssText=`background:${b.dataset.bg};border:1px solid #4a4f4a;color:#fff;padding:5px 9px;border-radius:6px;cursor:pointer;font:inherit;`;return b;};

    const lbl=document.createElement("b"); lbl.style.cssText="min-width:110px;color:#FFDE59;";
    const rng=document.createElement("input"); rng.type="range"; rng.min=0; rng.max=1000; rng.value=0; rng.style.cssText="flex:1;min-width:150px;";
    const tm=document.createElement("span"); tm.style.minWidth="92px";
    const play=mk("▶ play","#F19A2F");

    const rangeAt=t=>{ let i=0; labels.forEach(([,v],idx)=>{ if(t>=v-1e-3) i=idx; }); return [labels[i][1], labels[i+1]?labels[i+1][1]:tl.duration(), labels[i][0]]; };
    const curLabel=t=>rangeAt(t)[2];

    // 씬 점프 버튼
    const sceneBtns=labels.map(([name,time])=>{ const b=mk(name);
      b.addEventListener("click",()=>{ loop=null; syncLoopBtn(); tl.pause(); tl.time(time); play.textContent="▶ play"; sync(); });
      box.appendChild(b); return b; });
    const restart=mk("⟲ restart"); restart.addEventListener("click",()=>{ loop=null; syncLoopBtn(); tl.timeScale(1); tl.restart(); play.textContent="❚❚ pause"; }); box.appendChild(restart);
    const loopBtn=mk("↻ loop scene");
    function syncLoopBtn(){ loopBtn.style.background = loop? "#F19A2F" : loopBtn.dataset.bg; }
    loopBtn.addEventListener("click",()=>{ if(loop){ loop=null; } else { const r=rangeAt(tl.time()); loop=[r[0],r[1]]; tl.time(r[0]); tl.play(); play.textContent="❚❚ pause"; } syncLoopBtn(); });
    box.appendChild(loopBtn);
    // 속도
    const spd=mk("|","transparent"); spd.textContent="speed:"; spd.style.cssText="color:#9aa;background:none;border:none;padding:5px 2px 5px 8px;"; box.appendChild(spd);
    [["0.5×",.5],["1×",1],["2×",2]].forEach(([t,v])=>{ const b=mk(t); b.addEventListener("click",()=>{ tl.timeScale(v); spdBtns.forEach(x=>x.style.background=x.dataset.bg); b.style.background="#3a7a4a"; }); b._v=v; box.appendChild(b); });
    const spdBtns=[...box.querySelectorAll("button")].filter(b=>b._v);

    box.append(lbl,rng,tm,play); document.body.appendChild(box);

    const sync=()=>{ const t=tl.time(); rng.value=Math.round(tl.progress()*1000);
      const cl=curLabel(t); lbl.textContent="◆ "+cl; tm.textContent=t.toFixed(2)+" / "+tl.duration().toFixed(2)+"s";
      sceneBtns.forEach(b=>b.style.outline = b.textContent===cl ? "2px solid #FFDE59" : "none");
      if(loop && t>=loop[1]-1e-3) tl.time(loop[0]); };
    rng.addEventListener("input",()=>{ loop=null; syncLoopBtn(); tl.pause(); tl.progress(rng.value/1000); play.textContent="▶ play"; sync(); });
    play.addEventListener("click",()=>{ if(tl.paused()){tl.play();play.textContent="❚❚ pause";} else {tl.pause();play.textContent="▶ play";} });
    gsap.ticker.add(sync); sync();
  }

  // ── ?tune 구슬손 튜닝 툴 (엄지·손·구슬 위치/회전을 눈으로 맞춤) ──
  // 코드에 박혀 있는 현재값 = 기준값. 조정값은 localStorage("soma_tune")에 저장되고
  // 확정되면 index.html에 하드코딩으로 옮긴다. ?tune이 없으면 아무 것도 로드/적용되지 않는다.
  const TUNE_BASE = {
    thumb:{ x:1010.4, y:784.1, rot:-82.14, scale:3.786, flipX:false, flipY:true },
    palm: { x:985.5,  y:801.7, r:60.6 },
    ball: { x:1185,   y:640,   r:230 }
  };
  const THUMB_PIVOT="-11 -15.13";   // path bbox 중심 정렬(고정)
  const SHOULDER=[640,850];

  function tuneApply(V){
    const t=V.thumb, p=V.palm, b=V.ball;
    // 엄지
    const sx=(t.flipX?-1:1)*t.scale, sy=(t.flipY?-1:1)*t.scale;
    const tr=`translate(${t.x} ${t.y}) rotate(${t.rot}) scale(${r3(sx)} ${r3(sy)}) translate(${THUMB_PIVOT})`;
    $("#hold-thumb").setAttribute("transform",tr);
    // 손 + 팔 호(끝점 = 손 중심, r=현/√2 → 90° 유지)
    const palm=$("#hold-palm");
    palm.setAttribute("cx",p.x); palm.setAttribute("cy",p.y); palm.setAttribute("r",p.r);
    const ch=Math.hypot(p.x-SHOULDER[0], p.y-SHOULDER[1]), R=r3(ch/Math.SQRT2);
    const d=`M${SHOULDER[0]} ${SHOULDER[1]} A ${R} ${R} 0 0 0 ${p.x} ${p.y}`;
    $("#hold-arm").setAttribute("d",d);
    // 구슬: 중심/반지름 이동 시 내부 요소를 상대 오프셋 유지하며 함께 이동
    const B=TUNE_BASE.ball, k=b.r/B.r;
    const mv=(el,attrs)=>{ for(const a in attrs) el.setAttribute(a, r3(attrs[a])); };
    const off=(bx,by)=>[b.x+(bx-B.x)*k, b.y+(by-B.y)*k];
    $("#marble-clip>circle").setAttribute("cx",b.x);
    $("#marble-clip>circle").setAttribute("cy",b.y);
    $("#marble-clip>circle").setAttribute("r", b.r);
    const fo=$("#marble-bubble>foreignObject");
    mv(fo,{x:b.x-b.r, y:b.y-b.r, width:b.r*2, height:b.r*2});
    const [lx,ly]=off(1194.7,641.4);
    $("#marble-label").parentNode.setAttribute("transform",`translate(${r3(lx)} ${r3(ly)}) rotate(-29.4)`);
    mv($("#marble-label"),{x:-168.6*k, y:-106.9*k, width:337.2*k, height:213.8*k});
    const [gx,gy]=off(1040.5,582.5);
    mv($("#marble-light"),{cx:gx, cy:gy, r:106.9*k});
    $("#marbleLight").setAttribute("gradientTransform",`translate(${r3(gx)} ${r3(gy)}) rotate(90) scale(${r3(106.9*k)})`);
    const [ax,ay]=off(1121,531.8);
    $("#marble-lightline").setAttribute("transform",
      `translate(${r3(ax)} ${r3(ay)}) rotate(-78.78) scale(${r3(4.0734*k)}) translate(-26.96 -26.96)`);
    return {thumbTransform:tr, armD:d, palm:`cx="${p.x}" cy="${p.y}" r="${p.r}"`, ballR:R};
  }
  const r3=v=>Math.round(v*1000)/1000;

  function setupTune(){
    if(!$("#hold-thumb")) return;
    const tl=window.charTL;
    // 팔이 정착한 시점으로 고정 — 안 그러면 슬라이더 값이 타임라인에 덮인다
    if(tl){ tl.eventCallback("onComplete",null); tl.pause(); tl.time(tl.labels.b1-0.2); }

    let V; try{ V=JSON.parse(localStorage.getItem("soma_tune")||"null"); }catch(e){}
    if(!V || !V.thumb) V=JSON.parse(JSON.stringify(TUNE_BASE));

    const SPEC={
      thumb:[["x","x",TUNE_BASE.thumb.x-250,TUNE_BASE.thumb.x+250,.1],
             ["y","y",TUNE_BASE.thumb.y-250,TUNE_BASE.thumb.y+250,.1],
             ["rot","회전°",-180,180,.01],
             ["scale","크기",1,8,.001]],
      palm: [["x","x",TUNE_BASE.palm.x-250,TUNE_BASE.palm.x+250,.1],
             ["y","y",TUNE_BASE.palm.y-250,TUNE_BASE.palm.y+250,.1],
             ["r","반지름",30,110,.1]],
      ball: [["x","x",TUNE_BASE.ball.x-250,TUNE_BASE.ball.x+250,.1],
             ["y","y",TUNE_BASE.ball.y-250,TUNE_BASE.ball.y+250,.1],
             ["r","반지름",150,320,.1]]
    };
    const NAME={thumb:"엄지",palm:"손",ball:"구슬"};
    let target="thumb";

    const box=document.createElement("div");
    box.style.cssText="position:fixed;right:12px;top:76px;z-index:1000;width:290px;background:rgba(20,22,20,.95);color:#fff;"+
      "padding:12px 14px;border-radius:12px;font:12px/1.45 monospace;box-shadow:0 12px 32px rgba(0,0,0,.4);";
    const mkBtn=(t,bg)=>{const b=document.createElement("button");b.textContent=t;
      b.style.cssText=`background:${bg||"#2b2f2b"};border:1px solid #4a4f4a;color:#fff;padding:5px 9px;border-radius:6px;cursor:pointer;font:inherit;`;return b;};
    const row=()=>{const d=document.createElement("div");d.style.cssText="display:flex;align-items:center;gap:6px;margin-bottom:6px;";return d;};

    // 대상 선택
    const head=row();
    const sel=document.createElement("select");
    sel.style.cssText="flex:1;background:#2b2f2b;color:#fff;border:1px solid #4a4f4a;border-radius:6px;padding:5px;font:inherit;";
    ["thumb","palm","ball"].forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=NAME[k];sel.appendChild(o);});
    head.append(document.createTextNode("대상"), sel); box.appendChild(head);

    // 슬라이더 영역
    const fields=document.createElement("div"); box.appendChild(fields);

    // 플립(엄지 전용)
    const flipRow=row();
    const fx=document.createElement("input"); fx.type="checkbox";
    const fy=document.createElement("input"); fy.type="checkbox";
    const lx=document.createElement("label"), ly=document.createElement("label");
    lx.style.cssText=ly.style.cssText="display:flex;align-items:center;gap:4px;cursor:pointer;";
    lx.append(fx,document.createTextNode("flipX")); ly.append(fy,document.createTextNode("flipY"));
    flipRow.append(lx,ly); box.appendChild(flipRow);

    // 줌 · 레퍼런스 오버레이
    const hr=()=>{const d=document.createElement("div");d.style.cssText="border-top:1px solid #3a3f3a;margin:8px 0;";return d;};
    box.appendChild(hr());
    const mkRange=(label,min,max,step,val,oninput)=>{
      const d=row(); const s=document.createElement("span"); s.textContent=label; s.style.cssText="width:74px;color:#9aa;";
      const r=document.createElement("input"); r.type="range"; r.min=min; r.max=max; r.step=step; r.value=val; r.style.cssText="flex:1;min-width:0;";
      const n=document.createElement("span"); n.style.cssText="width:44px;text-align:right;color:#FFDE59;"; n.textContent=val;
      r.addEventListener("input",()=>{ n.textContent=r.value; oninput(+r.value); });
      d.append(s,r,n); return {row:d, range:r, num:n};
    };
    const char=$("#gameChar"), stage=$("#stage");
    const zoomCtl=mkRange("줌(px)",314,1600,2,314,v=>applyZoom(v));
    box.appendChild(zoomCtl.row);
    const opaCtl=mkRange("레퍼런스",0,100,1,0,v=>{ ref.style.opacity=v/100; });
    box.appendChild(opaCtl.row);

    // 레퍼런스 오버레이: Figma 렌더(구슬 코어 Ø130px @중심 148.5,94) → SVG 460 units에 정렬
    const ref=document.createElement("img");
    ref.src="assets/dev/marble-ref.png";
    ref.style.cssText="position:absolute;z-index:11;pointer-events:none;opacity:0;transform-origin:0 0;";
    stage.appendChild(ref);
    const REF={cx:148.5, cy:94.0, d:130.0};   // 레퍼런스 PNG 내 구슬 코어(실측)

    function applyZoom(px){
      char.style.width=px+"px";
      // 구슬이 스테이지 중앙에 오도록 보정.
      // #soma-char엔 CSS scaleX(-1)이 있지만 #arm-front는 미러 래퍼(translate(1160) scale(-1,1))로 이중반전 상쇄
      // → 래퍼 로컬 X의 화면 오프셋 = px - (1160-X)*u = X*u (1160*u = px 이므로).
      const u=px/1160;                                  // 1 unit = u CSS px
      const bx=V.ball.x*u, by=V.ball.y*u;               // 캐릭터 좌상단 기준 구슬 중심(화면 좌표)
      const sw=stage.clientWidth, sh=stage.clientHeight;
      char.style.left="0px"; char.style.top="0px"; char.style.transform="none";
      char.style.marginLeft=(sw/2-bx)+"px"; char.style.marginTop=(sh/2-by)+"px";
      placeRef(px);
    }
    function placeRef(px){
      const u=px/1160, k=(460*u)/REF.d;                 // 구슬 지름 460 units ↔ 레퍼런스 130px
      const w=ref.naturalWidth||244, h=ref.naturalHeight||190;
      const bx=V.ball.x*u, by=V.ball.y*u;
      const left=(stage.clientWidth/2) - REF.cx*k, top=(stage.clientHeight/2) - REF.cy*k;
      ref.style.left=left+"px"; ref.style.top=top+"px";
      ref.style.width=(w*k)+"px"; ref.style.height=(h*k)+"px";
    }
    ref.addEventListener("load",()=>placeRef(+zoomCtl.range.value));

    // 출력
    box.appendChild(hr());
    const out=document.createElement("textarea");
    out.readOnly=true; out.rows=5;
    out.style.cssText="width:100%;box-sizing:border-box;background:#12140f;color:#8f8;border:1px solid #3a3f3a;border-radius:6px;padding:6px;font:11px/1.4 monospace;resize:vertical;";
    box.appendChild(out);
    const btns=row(); btns.style.marginTop="6px";
    const copy=mkBtn("복사","#F19A2F"), reset=mkBtn("초기화");
    btns.append(copy,reset); box.appendChild(btns);
    copy.addEventListener("click",()=>{ navigator.clipboard.writeText(out.value).then(()=>{copy.textContent="복사됨";setTimeout(()=>copy.textContent="복사",900);}); });
    reset.addEventListener("click",()=>{ V=JSON.parse(JSON.stringify(TUNE_BASE));
      try{localStorage.removeItem("soma_tune");}catch(e){} build(); refresh(); });

    function refresh(){
      const r=tuneApply(V);
      out.value =
        `<!-- #hold-thumb -->\ntransform="${r.thumbTransform}"\n\n`+
        `<!-- #hold-palm -->  ${r.palm}\n`+
        `<!-- #hold-arm -->   d="${r.armD}"\n`+
        `<!-- 구슬 -->        중심 ${V.ball.x} ${V.ball.y} · r ${V.ball.r}`;
      try{ localStorage.setItem("soma_tune", JSON.stringify(V)); }catch(e){}
    }

    function build(){
      fields.innerHTML="";
      SPEC[target].forEach(([key,label,min,max,step])=>{
        const c=mkRange(label,min,max,step,V[target][key],v=>{ V[target][key]=v; refresh(); if(target==="ball"){applyZoom(+zoomCtl.range.value);} });
        // 숫자 직접 입력
        c.num.contentEditable="true"; c.num.style.cursor="text"; c.num.style.outline="none";
        c.num.addEventListener("blur",()=>{ const v=parseFloat(c.num.textContent); if(!isNaN(v)){ c.range.value=v; V[target][key]=v; refresh(); } });
        c.num.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); c.num.blur(); } });
        // 방향키 넛지: 1 unit / Shift 10
        c.range.addEventListener("keydown",e=>{
          if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight"&&e.key!=="ArrowUp"&&e.key!=="ArrowDown") return;
          e.preventDefault();
          const dir=(e.key==="ArrowRight"||e.key==="ArrowUp")?1:-1, st=e.shiftKey?10:1;
          const nv=Math.min(max,Math.max(min, (+c.range.value)+dir*st));
          c.range.value=nv; c.num.textContent=r3(nv); V[target][key]=nv; refresh();
          if(target==="ball") applyZoom(+zoomCtl.range.value);
        });
        fields.appendChild(c.row);
      });
      flipRow.style.display = target==="thumb" ? "flex" : "none";
      fx.checked=!!V.thumb.flipX; fy.checked=!!V.thumb.flipY;
    }
    fx.addEventListener("change",()=>{ V.thumb.flipX=fx.checked; refresh(); });
    fy.addEventListener("change",()=>{ V.thumb.flipY=fy.checked; refresh(); });
    sel.addEventListener("change",()=>{ target=sel.value; build(); });

    document.body.appendChild(box);
    build(); refresh(); applyZoom(314);
  }

  const btn = $("#btnLogin");
  if(btn) btn.addEventListener("click", playMorph);

  // 세션 인증 상태 or ?skip/?debug → 로그인 건너뛰고 대시보드 바로
  const params=new URLSearchParams(location.search);
  let authed=false; try{ authed=sessionStorage.getItem("soma_auth")==="1"; }catch(e){}
  if(authed || params.has("skip") || params.has("debug") || params.has("tune")){
    gsap.set(["#topbar",".waves",".shelf-wrap",".elephant"],{opacity:1});
    enterDashboard();
  }
  if(params.has("tune")) setupTune();   // 구슬손 튜닝(엄지·손·구슬). 없으면 아무 영향 없음
  if(params.has("debug")) setupDebug();
})();
