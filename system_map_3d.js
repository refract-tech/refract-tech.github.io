/* Refract 3D System Map v4 — distinct shapes per role */
(function(){
  const container = document.getElementById('map3d');
  if(!container) return;
  const tooltip = document.getElementById('tooltip3d');
  const ttTitle = document.getElementById('tt-title');
  const ttBadge = document.getElementById('tt-badge');
  const ttDesc = document.getElementById('tt-desc');
  const W = container.clientWidth, H = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0x303050, 0.4));
  const keyL = new THREE.DirectionalLight(0xffffff, 0.5); keyL.position.set(4,10,6); scene.add(keyL);
  const gL = new THREE.PointLight(0xd4a843, 0.9, 22); gL.position.set(0,1,0); scene.add(gL);
  const bL = new THREE.PointLight(0x4f8efe, 0.3, 18); bL.position.set(-6,-3,4); scene.add(bL);
  const pL = new THREE.PointLight(0x9b7ff0, 0.3, 15); pL.position.set(2,0,5); scene.add(pL);

  const COL = {cyan:0x00bcd4, grn:0x00c48c, gold:0xd4a843, blu:0x4f8efe, prp:0x9b7ff0};
  const hitTargets = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-9,-9);
  let hoveredNode = null;

  // Tooltip info
  const NI = {en:{}, it:{}};
  function ri(id,badge,bc,bb,en,it){NI.en[id]={title:id,badge,badgeColor:bc,badgeBg:bb,desc:en};NI.it[id]={title:id,badge,badgeColor:bc,badgeBg:bb,desc:it};}
  ri('NEWS','LIVE','var(--grn)','var(--grn-dim)','15+ feeds. Gemini classifies: BULLISH/BEARISH + score + p_bullish.','15+ feed. Gemini classifica: BULLISH/BEARISH + score + p_bullish.');
  ri('PRICE + MACRO','LIVE','var(--grn)','var(--grn-dim)','TwelveData M15 + DXY + US10Y yield. RSI, ATR, EMA, SMA100.','TwelveData M15 + DXY + rendimento US10Y. RSI, ATR, EMA, SMA100.');
  ri('NLP SIGNALS','IC +0.25','var(--grn)','var(--grn-dim)','pb6, pb12, pb48, belief. News-derived. Best at 8-12h.','pb6, pb12, pb48, belief. Dalle news. Migliori a 8-12h.');
  ri('TECHNICALS','IC +0.14','var(--grn)','var(--grn-dim)','RSI, Bollinger %B, SMA20. Price-derived. Best at 2-4h.','RSI, Bollinger %B, SMA20. Dal prezzo. Migliori a 2-4h.');
  ri('MECH SCORE','SOFT','var(--gold)','var(--gold-dim)','0-13 composite. Crash detection. Casario +3 baseline.','Composito 0-13. Rileva crash. Baseline Casario +3.');
  ri('PLAYBOOK','SOFT','var(--gold)','var(--gold-dim)','Gate 1: Regime detection. Permits/blocks archetypes.','Gate 1: Rileva regime. Permette/blocca archetipi.');
  ri('SELECTOR','SHADOW','var(--org)','var(--org-dim)','Gate 2: Daily 21 UTC. Top 3 configs per archetype.','Gate 2: Giornaliero 21 UTC. Top 3 config per archetipo.');
  ri('TQS','SOFT','var(--gold)','var(--gold-dim)','Gate 3: Quality 0-100. Min B in HEADWIND.','Gate 3: Qualit\u00e0 0-100. Min B in HEADWIND.');
  ri('EXIT ROUTER','SHADOW v2','var(--org)','var(--org-dim)','Gate 4: Policy dispatcher. Assigns exit policy at entry based on regime + volatility. 4 context states.','Gate 4: Policy dispatcher. Assegna exit policy all\'entry in base a regime + volatilit\u00e0. 4 stati di contesto.');
  ri('SIMENGINE','1370 cfg','var(--prp)','var(--prp-dim)','Parallel lab. 5 tiers. T5: 53 exit family configs (Step-Lock, Scale-Out, Hybrid, MFE).','Lab parallelo. 5 tier. T5: 53 config exit families (Step-Lock, Scale-Out, Hybrid, MFE).');
  ri('LIVE TRADES','LIVE','var(--grn)','var(--grn-dim)','5 strategies. REF_S1 (PF 1.88). Adaptive.','5 strategie. REF_S1 (PF 1.88). Adattive.');
  ri('EXIT SYSTEM','14 groups','var(--blu)','var(--blu-dim)','A1-F5. F5 best SHORT (PF 6.70).','A1-F5. F5 migliore SHORT (PF 6.70).');
  ri('EXIT ADVISOR','SHADOW','var(--org)','var(--org-dim)','Gemini LLM: HOLD / EXIT / TIGHTEN.','Gemini LLM: HOLD / EXIT / TIGHTEN.');

  // ═══ HELPERS ═══
  function mkLabel(text, width, yOff) {
    const c=document.createElement('canvas'); c.width=512; c.height=80;
    const x=c.getContext('2d'); x.fillStyle='#e8e8f0'; x.font='600 26px Inter,Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,256,42);
    const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));
    s.scale.set(width*1.1, width*0.17, 1); s.position.y=yOff||0.8; return s;
  }

  // ═══ DATA: particle stream (data rain) ═══
  const dataStreams = [];
  function dataStream(id, color, x, y, z, count) {
    count = count || 25;
    const g = new THREE.Group(); g.userData = {id, origY:y};

    // Invisible hit target (thin box for raycasting)
    const hitGeo = new THREE.BoxGeometry(1.2, 2, 0.5);
    const hitMat = new THREE.MeshBasicMaterial({visible:false});
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = {nodeId:id}; g.add(hitMesh); hitTargets.push(hitMesh);

    // Particle rain
    const particles = [];
    for(let i=0; i<count; i++) {
      const size = 0.03 + Math.random()*0.04;
      const pg = new THREE.SphereGeometry(size, 6, 6);
      const pm = new THREE.MeshBasicMaterial({color, transparent:true, opacity:0});
      const p = new THREE.Mesh(pg, pm);
      p.userData = {
        offX: (Math.random()-0.5)*0.8,
        offZ: (Math.random()-0.5)*0.4,
        speed: 0.4 + Math.random()*0.6,
        phase: Math.random(),
        height: 2.0
      };
      g.add(p);
      particles.push(p);
    }

    g.add(mkLabel(id, 2.8, 1.5));
    g.position.set(x, y, z);
    scene.add(g);
    dataStreams.push({group:g, particles, color});
    return g;
  }

  // ═══ SIGNALS: glowing icosahedrons ═══
  function signalOrb(id, color, x, y, z, r) {
    r=r||0.55;
    const g=new THREE.Group(); g.userData={id, origY:y};
    const geo=new THREE.IcosahedronGeometry(r, 1);
    const mat=new THREE.MeshPhysicalMaterial({color, transparent:true, opacity:0.2, metalness:0.2, roughness:0.3, emissive:color, emissiveIntensity:0.15, clearcoat:0.8});
    const mesh=new THREE.Mesh(geo, mat); mesh.userData={nodeId:id}; g.add(mesh); hitTargets.push(mesh);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color, transparent:true, opacity:0.5})));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r*0.4,12,12), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.15})));
    g.add(mkLabel(id, r*4.5, r+0.5));
    g.position.set(x,y,z); scene.add(g); return g;
  }

  // ═══ CONTROL: hexagonal gates ═══
  function hexGate(id, color, x, y, z, radius) {
    radius=radius||1.0;
    const g=new THREE.Group(); g.userData={id, origY:y};
    const shape=new THREE.Shape();
    for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6; i===0?shape.moveTo(Math.cos(a)*radius,Math.sin(a)*radius):shape.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);}
    shape.closePath();
    const extGeo=new THREE.ExtrudeGeometry(shape,{depth:0.25,bevelEnabled:true,bevelThickness:0.03,bevelSize:0.03,bevelSegments:2});
    extGeo.rotateX(-Math.PI/2);
    const mat=new THREE.MeshPhysicalMaterial({color, transparent:true, opacity:0.5, metalness:0.4, roughness:0.3, emissive:color, emissiveIntensity:0.22, clearcoat:0.6});
    const mesh=new THREE.Mesh(extGeo, mat); mesh.userData={nodeId:id}; g.add(mesh); hitTargets.push(mesh);
    const pts=[]; for(let i=0;i<=6;i++){const a=Math.PI/3*(i%6)-Math.PI/6; pts.push(new THREE.Vector3(Math.cos(a)*radius,0.26,Math.sin(a)*radius));}
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color, transparent:true, opacity:0.9})));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>p.clone().setY(0))), new THREE.LineBasicMaterial({color, transparent:true, opacity:0.35})));
    g.add(mkLabel(id, radius*2.2, radius*0.5+0.5));
    g.position.set(x,y,z); scene.add(g); return g;
  }

  // ═══ SIMENGINE: torus (continuous loop) ═══
  function torusNode(id, color, x, y, z) {
    const g=new THREE.Group(); g.userData={id, origY:y};
    const geo=new THREE.TorusGeometry(0.7, 0.2, 16, 32);
    const mat=new THREE.MeshPhysicalMaterial({color, transparent:true, opacity:0.25, metalness:0.5, roughness:0.2, emissive:color, emissiveIntensity:0.2, clearcoat:1});
    const mesh=new THREE.Mesh(geo, mat); mesh.userData={nodeId:id}; g.add(mesh); hitTargets.push(mesh);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color, transparent:true, opacity:0.4})));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.6})));
    g.add(mkLabel(id, 3, 1.3));
    g.position.set(x,y,z); scene.add(g); return g;
  }

  // ═══ EXECUTION: solid cubes ═══
  function solidCube(id, color, x, y, z, s) {
    s=s||0.7;
    const g=new THREE.Group(); g.userData={id, origY:y};
    const geo=new THREE.BoxGeometry(s*2, s*0.6, s);
    const mat=new THREE.MeshPhysicalMaterial({color, transparent:true, opacity:0.4, metalness:0.3, roughness:0.5, emissive:color, emissiveIntensity:0.06});
    const mesh=new THREE.Mesh(geo, mat); mesh.userData={nodeId:id}; g.add(mesh); hitTargets.push(mesh);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color, transparent:true, opacity:0.7})));
    g.add(mkLabel(id, s*3, s*0.5+0.4));
    g.position.set(x,y,z); scene.add(g); return g;
  }

  // ═══ CONNECTIONS ═══
  function neonLine(from, to, color, dashed) {
    const pts=[from.position.clone(), to.position.clone()];
    const mat=dashed ? new THREE.LineDashedMaterial({color, dashSize:0.25, gapSize:0.12, transparent:true, opacity:0.5}) : new THREE.LineBasicMaterial({color, transparent:true, opacity:0.5});
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    if(dashed) line.computeLineDistances(); scene.add(line);
  }

  const flowP=[];
  function flowLine(from, to, color) {
    const p1=from.position.clone(), p2=to.position.clone();
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1,p2]), new THREE.LineBasicMaterial({color, transparent:true, opacity:0.25})));
    const p=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.9}));
    p.userData={p1,p2, speed:0.2+Math.random()*0.15, phase:Math.random()};
    scene.add(p); flowP.push(p);
  }

  // ═══ BUILD SCENE ═══

  // DATA (particle streams — data rain)
  const nNews = dataStream('NEWS', COL.cyan, -2.5, 4.2, 0, 30);
  const nPrice = dataStream('PRICE + MACRO', COL.cyan, 3, 4.2, 0, 30);

  // SIGNALS (glowing orbs)
  const nNlp = signalOrb('NLP SIGNALS', COL.grn, -3.5, 2.2, 0, 0.6);
  const nTech = signalOrb('TECHNICALS', COL.grn, 1.5, 2.2, 0, 0.55);
  const nMech = signalOrb('MECH SCORE', COL.grn, 5.5, 2.2, 0, 0.55);

  // CONTROL LAYER — dominant glowing platform centered at x=1.25
  // Gates at -3, 0, 3, 6 → center = 1.5, span = 9 → platform width 12
  const CL_CENTER = 1.5;
  const platGeo=new THREE.BoxGeometry(12, 0.15, 4.5);
  const platMat=new THREE.MeshPhysicalMaterial({color:0xd4a843, transparent:true, opacity:0.08, metalness:0.5, roughness:0.4, emissive:0xd4a843, emissiveIntensity:0.05});
  const plat=new THREE.Mesh(platGeo, platMat);
  plat.position.set(CL_CENTER,-0.2,0); scene.add(plat);
  const pe=new THREE.LineSegments(new THREE.EdgesGeometry(platGeo), new THREE.LineBasicMaterial({color:0xd4a843, transparent:true, opacity:0.6}));
  pe.position.copy(plat.position); scene.add(pe);
  // (no glowPlane — was intersecting lower nodes)
  const glowMat = null;
  const clC=document.createElement('canvas'); clC.width=512; clC.height=64;
  const clx=clC.getContext('2d'); clx.fillStyle='#d4a843'; clx.font='bold 22px Inter,sans-serif'; clx.textAlign='center'; clx.fillText('CONTROL LAYER',256,38);
  const cls=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(clC),transparent:true,depthTest:false}));
  cls.scale.set(6,0.7,1); cls.position.set(CL_CENTER,1.0,-2.6); scene.add(cls);

  // GATES (hexagons — equidistant, centered on platform)
  // Positions: -3, 0, 3, 6 → equidistant 3 apart, centered at 1.5
  const nPb = hexGate('PLAYBOOK', COL.gold, -3, 0, 0, 1.15);
  const nSel = hexGate('SELECTOR', COL.gold, 0, 0, 0, 1.1);
  const nTqs = hexGate('TQS', COL.gold, 3, 0, 0, 1.0);
  const nRtr = hexGate('EXIT ROUTER', COL.gold, 6, 0, 0, 1.15);

  // SIMENGINE (torus — left of center, behind at z=3 like before, between signals and CL)
  const nSim = torusNode('SIMENGINE', COL.prp, -1, 1.8, 3);

  // EXIT LAYER (intermediate — exit system + advisor, just below CL)
  const nExit = solidCube('EXIT SYSTEM', COL.blu, 0, -2, 0, 0.8);
  const nAdv = solidCube('EXIT ADVISOR', COL.blu, 4, -2, 0, 0.8);

  // LIVE TRADES (final output — diamond/octahedron, the gem at the bottom)
  const nLive = (function(){
    const g=new THREE.Group(); g.userData={id:'LIVE TRADES', origY:-3.8};
    const geo=new THREE.OctahedronGeometry(0.8);
    const mat=new THREE.MeshPhysicalMaterial({color:COL.blu, transparent:true, opacity:0.35, metalness:0.5, roughness:0.2, emissive:COL.blu, emissiveIntensity:0.2, clearcoat:1.0});
    const mesh=new THREE.Mesh(geo, mat);
    mesh.userData={nodeId:'LIVE TRADES'}; g.add(mesh); hitTargets.push(mesh);
    // Bright wireframe
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color:COL.blu, transparent:true, opacity:0.8})));
    g.add(mkLabel('LIVE TRADES', 3, 1.3));
    g.position.set(1.5,-3.8,0); scene.add(g); return g;
  })();

  // ═══ CONNECTIONS — simplified main flow ═══
  // Principle: Data → Signals → Control Layer → Execution. SimEngine loop on the side.
  // No cross-links between individual nodes — the platform CONTAINS the gates.

  // DATA → SIGNALS (1 line per pair)
  flowLine(nNews, nNlp, COL.cyan);
  flowLine(nPrice, nTech, COL.cyan);
  flowLine(nPrice, nMech, COL.cyan);

  // SIGNALS → CONTROL LAYER (each signal drops into the platform — one line each)
  flowLine(nNlp, nPb, COL.grn);     // NLP → first gate (Playbook)
  flowLine(nTech, nTqs, COL.grn);   // Tech → TQS
  flowLine(nMech, nPb, COL.grn);    // Mech → Playbook

  // INSIDE CONTROL LAYER: gate chain (bright gold)
  neonLine(nPb, nSel, COL.gold);
  neonLine(nSel, nTqs, COL.gold);
  neonLine(nTqs, nRtr, COL.gold);

  // SIMENGINE ↔ SELECTOR (dashed, feedback)
  neonLine(nSim, nSel, COL.prp, true);

  // CONTROL LAYER → EXIT LAYER
  flowLine(nTqs, nExit, COL.gold);    // quality check → exit system
  flowLine(nRtr, nAdv, COL.gold);     // exit policy → exit advisor

  // EXIT LAYER → LIVE TRADES (final output)
  flowLine(nExit, nLive, COL.blu);   // exits → actual trades

  // Feedback loop: Execution → SimEngine
  const fbCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.5,-3.8,0), new THREE.Vector3(4,-2,1),
    new THREE.Vector3(-1,0.5,2), new THREE.Vector3(-1,1.8,3)
  ]);
  const fbLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(fbCurve.getPoints(40)),
    new THREE.LineDashedMaterial({color:COL.prp, dashSize:0.2, gapSize:0.1, transparent:true, opacity:0.35}));
  fbLine.computeLineDistances(); scene.add(fbLine);
  const fbP=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,8), new THREE.MeshBasicMaterial({color:COL.prp, transparent:true}));
  scene.add(fbP);

  // ═══ CAMERA ═══
  let isDrag=false, pX=0, pY=0, rY=-0.1, rX=0.3, dist=18;
  const pivot=new THREE.Vector3(1.5,0.5,0.5);
  function upCam(){camera.position.set(pivot.x+dist*Math.sin(rY)*Math.cos(rX),pivot.y+dist*Math.sin(rX),pivot.z+dist*Math.cos(rY)*Math.cos(rX));camera.lookAt(pivot);}
  upCam();

  let tapStartX=0,tapStartY=0;
  renderer.domElement.addEventListener('pointerdown',e=>{isDrag=true;pX=e.clientX;pY=e.clientY;tapStartX=e.clientX;tapStartY=e.clientY;autoRot=false;});
  window.addEventListener('pointerup',e=>{
    isDrag=false;
    // Tap detection: if pointer didn't move much, it's a tap (mobile tooltip)
    const dx=Math.abs(e.clientX-tapStartX),dy=Math.abs(e.clientY-tapStartY);
    if(dx<6&&dy<6){
      const rect=renderer.domElement.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(hitTargets);
      const id=hits.length>0?hits[0].object.userData.nodeId:null;
      if(id&&id!==hoveredNode){
        hoveredNode=id;
        hitTargets.forEach(m=>{if(m.userData.nodeId===id&&m.material){m.material.emissiveIntensity=0.6;}});
        const info=NI[typeof currentLang!=='undefined'?currentLang:'it'][id]||NI.en[id];
        if(info){ttTitle.textContent=info.title;ttTitle.style.color=info.badgeColor;ttBadge.textContent=info.badge;ttBadge.style.color=info.badgeColor;ttBadge.style.background=info.badgeBg;ttDesc.textContent=info.desc;tooltip.style.display='block';
          var tw=Math.min(280,rect.width-20);
          var tx=Math.min(e.clientX-rect.left+10,rect.width-tw-10);
          if(tx<5)tx=5;
          var ty=e.clientY-rect.top-80;
          if(ty<5)ty=e.clientY-rect.top+20;
          if(ty+100>rect.height)ty=rect.height-110;
          tooltip.style.left=tx+'px';
          tooltip.style.top=Math.max(ty,5)+'px';}
      } else {
        // Tap on empty or same node = close
        if(hoveredNode)hitTargets.forEach(m=>{if(m.userData.nodeId===hoveredNode&&m.material){m.material.emissiveIntensity=m.material._baseE||0.1;}});
        hoveredNode=null;tooltip.style.display='none';
      }
    }
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    const rect=renderer.domElement.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1; mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    if(isDrag){rY+=(e.clientX-pX)*0.008;rX+=(e.clientY-pY)*0.005;rX=Math.max(-0.6,Math.min(1.2,rX));pX=e.clientX;pY=e.clientY;upCam();}
  });
  renderer.domElement.addEventListener('wheel',e=>{dist+=e.deltaY*0.01;dist=Math.max(8,Math.min(28,dist));upCam();e.preventDefault();},{passive:false});
  let autoRot=true;

  // ═══ ANIMATE ═══
  const clock=new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const t=clock.getElapsedTime();
    if(autoRot){rY+=0.0008;upCam();}

    // Torus rotation
    if(nSim.children[0]){nSim.children[0].rotation.x=t*0.4;nSim.children[0].rotation.z=t*0.2;}
    if(nSim.children[1]){nSim.children[1].rotation.x=t*0.4;nSim.children[1].rotation.z=t*0.2;}
    nSim.position.y=nSim.userData.origY+Math.sin(t*0.6)*0.12;

    // Signal orbs rotate + pulse
    [nNlp,nTech,nMech].forEach((n,i)=>{
      if(n.children[0])n.children[0].rotation.y=t*0.3+i;
      if(n.children[1])n.children[1].rotation.y=-t*0.2+i;
      if(n.children[0]&&n.children[0].material)n.children[0].material.emissiveIntensity=0.12+0.06*Math.sin(t*2+i);
    });

    // Data stream particles (rain effect)
    dataStreams.forEach(ds=>{
      ds.particles.forEach(p=>{
        const d=p.userData;
        const prog=((t*d.speed+d.phase)%1);
        p.position.set(d.offX, d.height*(1-prog)-d.height*0.5, d.offZ);
        p.material.opacity = Math.sin(prog*Math.PI)*0.7;
      });
    });

    // Hex gate pulse
    [nPb,nSel,nTqs,nRtr].forEach((n,i)=>{if(n.children[0]&&n.children[0].material)n.children[0].material.emissiveIntensity=0.1+0.05*Math.sin(t*1.5+i*1.2);});

    // Live Trades diamond rotation + pulse
    if(nLive.children[0]){nLive.children[0].rotation.y=t*0.2;}
    if(nLive.children[1]){nLive.children[1].rotation.y=t*0.2;}
    if(nLive.children[0]&&nLive.children[0].material) nLive.children[0].material.emissiveIntensity=0.15+0.08*Math.sin(t*1.2);

    // Platform glow pulse
    if(platMat) platMat.emissiveIntensity=0.04+0.02*Math.sin(t*0.8);

    // Flow particles
    flowP.forEach(p=>{const d=p.userData,prog=((t*d.speed+d.phase)%1);p.position.lerpVectors(d.p1,d.p2,prog);p.material.opacity=0.3+0.7*Math.sin(prog*Math.PI);});

    // Feedback particle
    const ft=(t*0.1)%1;fbP.position.copy(fbCurve.getPoint(ft));fbP.material.opacity=0.4+0.5*Math.sin(ft*Math.PI);

    // Raycasting
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(hitTargets);
    let nh=hits.length>0?hits[0].object.userData.nodeId:null;
    if(nh!==hoveredNode){
      if(hoveredNode)hitTargets.forEach(m=>{if(m.userData.nodeId===hoveredNode&&m.material){m.material.emissiveIntensity=m.material._baseE||0.1;}});
      hoveredNode=nh;
      if(hoveredNode){
        hitTargets.forEach(m=>{if(m.userData.nodeId===hoveredNode&&m.material){if(!m.material._baseE)m.material._baseE=m.material.emissiveIntensity;m.material.emissiveIntensity=0.6;}});
        const info=NI[typeof currentLang!=='undefined'?currentLang:'it'][hoveredNode]||NI.en[hoveredNode];
        if(info){ttTitle.textContent=info.title;ttTitle.style.color=info.badgeColor;ttBadge.textContent=info.badge;ttBadge.style.color=info.badgeColor;ttBadge.style.background=info.badgeBg;ttDesc.textContent=info.desc;tooltip.style.display='block';}
        renderer.domElement.style.cursor='pointer';
      } else {tooltip.style.display='none';renderer.domElement.style.cursor='grab';}
    }
    if(hoveredNode&&tooltip.style.display==='block'){
      const r=container.getBoundingClientRect();
      var tw=Math.min(280,r.width-20);
      let tx=((mouse.x+1)/2)*r.width+16,ty=((1-mouse.y)/2)*r.height-10;
      if(tx+tw>r.width)tx=r.width-tw-10;if(tx<5)tx=5;
      if(ty+100>r.height)ty=r.height-110;if(ty<5)ty=5;
      tooltip.style.left=tx+'px';tooltip.style.top=ty+'px';
    }
    renderer.render(scene,camera);
  }
  animate();

  window.addEventListener('resize',()=>{const w=container.clientWidth,h=container.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);});
})();
