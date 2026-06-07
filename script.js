// Small interactive helpers: typed roles, menu toggle, current year
(function(){
  const roles = ['web apps','interfaces','design systems','server APIs'];
  const el = document.getElementById('typed');
  let idx=0,char=0,forward=true;
  function tick(){
    const word = roles[idx];
    if(forward){
      char++;
      if(char>word.length){ forward=false; setTimeout(tick,900); return }
    } else {
      char--;
      if(char===0){ forward=true; idx=(idx+1)%roles.length }
    }
    el.textContent = word.slice(0,char);
    setTimeout(tick, forward?80:40);
  }
  if(el) tick();

  const toggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  if(toggle && nav){
    toggle.addEventListener('click', ()=> nav.classList.toggle('open'));
  }

  // Nav sliding indicator and active-section highlighting
  (function(){
    const navEl = document.querySelector('.nav');
    if(!navEl) return;
    const navLinks = Array.from(navEl.querySelectorAll('a'));
    const indicator = document.createElement('div'); indicator.className='nav-indicator'; navEl.appendChild(indicator);

    function moveIndicatorTo(el){
      if(!el){ indicator.style.width='0px'; return }
      const rect = el.getBoundingClientRect();
      const parentRect = navEl.getBoundingClientRect();
      indicator.style.left = (rect.left - parentRect.left) + 'px';
      indicator.style.width = rect.width + 'px';
    }

    // update active link when clicking nav links (smooth scroll already handled)
    navLinks.forEach(a=> a.addEventListener('click', ()=>{
      navLinks.forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      moveIndicatorTo(a);
    }));

    // Highlight active section using IntersectionObserver
    const sections = document.querySelectorAll('main section[id]');
    try{
      const obs = new IntersectionObserver(entries=>{
        entries.forEach(en=>{
          if(en.isIntersecting){
            const id = en.target.id;
            const target = navEl.querySelector(`a[href="#${id}"]`);
            if(target){ navLinks.forEach(x=>x.classList.toggle('active', x===target)); moveIndicatorTo(target); }
          }
        });
      },{threshold:0.36});
      sections.forEach(s=>obs.observe(s));
    }catch(e){ /* ignore */ }

    // initial placement
    setTimeout(()=> moveIndicatorTo(navEl.querySelector('a.active') || navEl.querySelector('a')), 120);
    window.addEventListener('resize', ()=> setTimeout(()=> moveIndicatorTo(navEl.querySelector('a.active') || navEl.querySelector('a')), 120));
  })();

  // Header bird behavior: fade and drift on scroll, auto-show on top hover
  (function(){
    const header = document.querySelector('.site-header');
    const bird = document.getElementById('headerBird');
    if(!header || !bird) return;
    const maxFade = 220; // px - how far to scroll before fully faded
    let ticking = false;
    window.addEventListener('scroll', ()=>{
      if(ticking) return; ticking = true;
      window.requestAnimationFrame(()=>{
        const y = window.scrollY || 0;
        // continuous header fade + slight upward translate
        const frac = Math.min(1, y / maxFade);
        header.style.opacity = String(1 - frac);
        header.style.transform = `translateY(${ -frac * 12 }px)`;
        header.style.pointerEvents = frac > 0.95 ? 'none' : '';

        // bird fades and drifts as well
        const birdOpacity = Math.max(0, 1 - y / 600);
        bird.style.opacity = birdOpacity;
        bird.style.transform = `translateX(${(y % 220) / 6}px)`;

        ticking = false;
      });
    }, {passive:true});

    // reveal when mouse near top — restore inline styles
    window.addEventListener('mousemove', e=>{
      if(e.clientY <= 96){ header.style.opacity = ''; header.style.transform = ''; header.style.pointerEvents = ''; }
    });
  })();

  // On project pages, fade the logo text as the user scrolls
  (function(){
    const projectContent = document.getElementById('projectContent');
    const logo = document.querySelector('.site-header .logo');
    if(!projectContent || !logo) return;
    let ticking = false;
    const fadePx = 120; // pixels to fully fade
    window.addEventListener('scroll', ()=>{
      if(ticking) return; ticking = true;
      window.requestAnimationFrame(()=>{
        const y = window.scrollY || 0;
        const f = Math.min(1, y / fadePx);
        logo.style.opacity = String(1 - f);
        logo.style.transform = `translateY(${ -f * 6 }px)`;
        ticking = false;
      });
    }, {passive:true});
  })();

  document.getElementById('year').textContent = new Date().getFullYear();
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const href = a.getAttribute('href');
      if(href.length>1){
        e.preventDefault(); document.querySelector(href).scrollIntoView({behavior:'smooth'});
        if(nav) nav.classList.remove('open');
      }
    })
  })

  // JSON-driven rendering for index and project pages
  async function loadJSON(path){
    try{
      // prefer local draft if present
      const draft = localStorage.getItem('projectsDraft');
      if(draft) return JSON.parse(draft);
    } catch(e){}
    try{
      const r = await fetch(path);
      if(!r.ok) throw new Error('Failed to fetch '+path);
      return await r.json();
    } catch(e){ console.warn(e); return null }
  }

  // Render projects on index.html — interactive two-column list + detail pane
  async function renderIndex(){
    const listEl = document.getElementById('projectsList');
    const detailEl = document.getElementById('projectsDetail');
    if(!listEl || !detailEl) return;
    const data = await loadJSON('data/projects.json');
    if(!data || !data.projects){ listEl.innerHTML = '<p>No projects found.</p>'; detailEl.innerHTML=''; return }
    listEl.innerHTML = '';
    detailEl.innerHTML = '';
    data.projects.forEach((p, idx)=>{
      const a = document.createElement('a');
      a.className = 'card project-card';
      a.dataset.id = p.id;
      a.dataset.index = idx;
      a.dataset.title = (p.title||'').toLowerCase();
      a.dataset.tags = (p.tags||[]).join(' ').toLowerCase();
      a.href = `project.html?id=${encodeURIComponent(p.id)}`;
      a.innerHTML = `<div class="card-body"><h3>${p.title}</h3><div class="muted">${p.tags? p.tags.map(t=>`<span class='tag'>${t}</span>`).join(' '):''}</div><div style="margin-top:8px;font-size:13px;color:var(--muted)">${p.short}</div></div>`;
      // quick view control (opens modal) — separate interactive element inside the card
      const q = document.createElement('button'); q.className='btn secondary quick-view'; q.textContent='Quick view';
      q.addEventListener('click', (ev)=>{ ev.preventDefault(); ev.stopPropagation(); showDetail(idx); openProjectModal(p.id); });
      // preview on hover/focus, click will navigate to the full project page
      a.addEventListener('mouseenter', ()=> showDetail(idx));
      a.addEventListener('focus', ()=> showDetail(idx));
      a.appendChild(q);
      listEl.appendChild(a);
    });

    // search/filtering
    const searchEl = document.getElementById('projectSearch');
    function filterProjects(q){
      const v = (q||'').trim().toLowerCase();
      listEl.querySelectorAll('.project-card').forEach(el=>{
        const title = el.dataset.title || '';
        const tags = el.dataset.tags || '';
        if(!v || title.includes(v) || tags.includes(v)) el.style.display='block'; else el.style.display='none';
      });
    }
    if(searchEl){ searchEl.addEventListener('input', e=> filterProjects(e.target.value)); }

    let current = 0;
    function showDetail(i){
      if(!data || !data.projects || data.projects.length===0) return;
      if(i<0) i = data.projects.length-1;
      if(i>=data.projects.length) i = 0;
      current = i;
      const p = data.projects[i];
      listEl.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));
      const active = listEl.querySelector(`.card[data-index="${i}"]`);
      if(active) active.classList.add('selected');
      const content = p.content || {overview:'',challenge:'',solution:'',outcome:''};
      detailEl.innerHTML = `
        <div class="project-nav"><button id="prevProject" class="btn">← Prev</button><div style="flex:1"></div><button id="nextProject" class="btn">Next →</button></div>
        <h3>${p.title}</h3>
        <p class="lead">${p.short}</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px">
          <div class="card" style="flex:1;min-width:220px"><h4>Overview</h4><p>${content.overview}</p></div>
          <div class="card" style="flex:1;min-width:220px"><h4>Challenge</h4><p>${content.challenge}</p></div>
          <div class="card" style="flex:1;min-width:220px"><h4>Outcome</h4><p>${content.outcome}</p></div>
        </div>
        <h4 style="margin-top:12px">Solution</h4>
        <p>${content.solution}</p>
      `;
      const prev = document.getElementById('prevProject');
      const next = document.getElementById('nextProject');
      if(prev) prev.addEventListener('click', ()=> showDetail(current-1));
      if(next) next.addEventListener('click', ()=> showDetail(current+1));
    }

    showDetail(0);
    // keyboard navigation
    document.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft') showDetail(current-1);
      if(e.key==='ArrowRight') showDetail(current+1);
    });
  }

  

  // Render single project page (project.html)
  async function renderProject(){
    const root = document.getElementById('projectRoot');
    const content = document.getElementById('projectContent');
    if(!content) return;
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const data = await loadJSON('data/projects.json');
    if(!data || !data.projects){ content.innerHTML = '<p>Project data not available.</p>'; return }
    const p = data.projects.find(x=>x.id===id);
    if(!p){ content.innerHTML = '<p>Project not found.</p>'; return }
    const contentObj = p.content || {overview:'',challenge:'',solution:'',outcome:''};
    const imageTag = p.image? `<div class="card-media" style="height:280px;background-image:url(${p.image});background-size:cover;background-position:center;border-radius:12px;margin-top:12px"></div>`:'';
    content.innerHTML = `
      <h1>${p.title}</h1>
      <p class="lead">${p.short}</p>
      ${imageTag}
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:18px">
        <div class="card" style="flex:1;min-width:260px">
          <h3>Overview</h3>
          <p>${contentObj.overview}</p>
        </div>
        <div class="card" style="flex:1;min-width:260px">
          <h3>Challenge</h3>
          <p>${contentObj.challenge}</p>
        </div>
        <div class="card" style="flex:1;min-width:260px">
          <h3>Outcome</h3>
          <p>${contentObj.outcome}</p>
        </div>
      </div>
      <h2 style="margin-top:22px">Solution</h2>
      <p>${contentObj.solution}</p>
      <p style="margin-top:18px"><a class="btn" href="index.html">← Back to portfolio</a></p>
    `;
  }

  // Modal: open project details in-page
  async function openProjectModal(id){
    const data = await loadJSON('data/projects.json');
    if(!data || !data.projects) return;
    const p = data.projects.find(x=>x.id===id);
    if(!p) return;
    const modal = document.getElementById('projectModal');
    const inner = document.getElementById('modalInner');
    if(!modal || !inner) return;
    const contentObj = p.content || {overview:'',challenge:'',solution:'',outcome:''};
    const imageHTML = p.image? `<div style="margin-top:12px"><img src="${p.image}" alt="${p.title}" style="width:100%;border-radius:8px;max-height:220px;object-fit:cover"/></div>`:'';
    inner.innerHTML = `
      <div style="display:flex;gap:18px;flex-wrap:wrap">
        <div style="flex:1;min-width:320px">
          <h2 id="modalTitle">${p.title}</h2>
          <div class="modal-meta">
            <div class="badge">${p.tech||''}</div>
            ${p.tags? p.tags.map(t=>`<div class="badge">${t}</div>`).join(' '):''}
          </div>
          <p class="lead" style="margin-top:8px">${p.short}</p>
          ${imageHTML}
        </div>
        <div style="width:320px;max-width:38%">
          <aside class="card">
            <h4>Overview</h4>
            <p>${contentObj.overview}</p>
            <h4 style="margin-top:12px">Challenge</h4>
            <p>${contentObj.challenge}</p>
            <h4 style="margin-top:12px">Solution</h4>
            <p>${contentObj.solution}</p>
            <p style="margin-top:12px"><a class="btn" href="project.html?id=${encodeURIComponent(p.id)}">Open full page</a></p>
          </aside>
        </div>
      </div>
    `;
    // highlight the source card in the host page (include featured)
    document.querySelectorAll('#projectsList .card').forEach(c=>c.classList.remove('selected'));
    const sel = document.querySelector(`#projectsList .card[data-id="${p.id}"]`);
    if(sel) sel.classList.add('selected');
    // record current id for keyboard navigation
    modal.dataset.currentId = p.id;
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }

  // modal close handlers and keyboard navigation
  function clearSelectedCard(){ document.querySelectorAll('#projectsList .card').forEach(c=>c.classList.remove('selected')); }

  document.addEventListener('click', e=>{
    const modal = document.getElementById('projectModal');
    if(!modal) return;
    const close = e.target.closest('[data-close]');
    if(close){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; clearSelectedCard(); }
  });

  document.addEventListener('keydown', async e=>{
    const modal = document.getElementById('projectModal');
    // ESC: close modal and clear highlight
    if(e.key==='Escape'){
      if(modal && modal.getAttribute('aria-hidden')==='false'){
        modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; clearSelectedCard();
      }
      return;
    }
    if(!modal || modal.getAttribute('aria-hidden')==='true') return;
    if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
      const current = modal.dataset.currentId;
      if(!current) return;
      const data = await loadJSON('data/projects.json');
      if(!data || !data.projects) return;
      const ids = data.projects.map(p=>p.id);
      const idx = ids.indexOf(current);
      if(idx===-1) return;
      let nextIdx = idx + (e.key==='ArrowRight'? 1 : -1);
      if(nextIdx < 0) nextIdx = ids.length - 1;
      if(nextIdx >= ids.length) nextIdx = 0;
      const nextId = ids[nextIdx];
      if(nextId) openProjectModal(nextId);
    }
  });

  // IntersectionObserver for reveal animations and skill progress
  function setupRevealObserver(){
    const obs = new IntersectionObserver(entries=>{
      for(const en of entries){
        if(en.isIntersecting){
          en.target.classList.add('visible');
          // animate skill fills
          if(en.target.classList.contains('skills') || en.target.classList.contains('skill')){
            en.target.querySelectorAll('.skill').forEach(s=>{
              const lvl = s.dataset.level || s.getAttribute('data-level');
              const fill = s.querySelector('.skill-fill');
              if(fill && lvl) fill.style.width = lvl + '%';
            });
          }
          obs.unobserve(en.target);
        }
      }
    },{threshold:0.18});
    document.querySelectorAll('.reveal').forEach(n=>obs.observe(n));
    // also observe skill blocks
    document.querySelectorAll('.skill').forEach(n=>obs.observe(n));
  }

  // initialize reveals after DOMContentLoaded
  document.addEventListener('DOMContentLoaded', ()=> setupRevealObserver());

  // Kick off appropriate rendering
  document.addEventListener('DOMContentLoaded', ()=>{
    renderIndex();
    renderProject();
    attachContactHandlers();
  });

  // Listen for changes to projectsDraft (from admin) and refresh index in other tabs
  window.addEventListener('storage', e=>{
    if(e.key==='projectsDraft'){
      // small delay to allow write to finish
      setTimeout(()=>{ renderIndex(); }, 50);
    }
  });

  // Contact form handlers
  function validateEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showContactStatus(msg, type=''){
    const el = document.getElementById('contactStatus');
    if(!el) return;
    el.textContent = msg;
    el.classList.remove('success','error');
    if(type) el.classList.add(type);
  }

  function attachContactHandlers(){
    const form = document.getElementById('contactForm');
    if(!form) return;
    const emailLink = document.getElementById('primaryEmail');

    // copy email button
    const copyBtn = document.getElementById('copyEmail');
    if(copyBtn && emailLink){
      copyBtn.addEventListener('click', async ()=>{
        try{
          await navigator.clipboard.writeText(emailLink.textContent.trim());
          showContactStatus('Email copied to clipboard', 'success');
        } catch(e){
          showContactStatus('Copy failed — please copy manually', 'error');
        }
      });
    }

    form.addEventListener('submit', e=>{
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if(!name){ showContactStatus('Please enter your name', 'error'); form.name.focus(); return }
      if(!validateEmail(email)){ showContactStatus('Please enter a valid email', 'error'); form.email.focus(); return }
      if(message.length < 10){ showContactStatus('Message is too short', 'error'); form.message.focus(); return }

      // simulate sending
      const submitBtn = document.getElementById('contactSubmit');
      submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
      showContactStatus('Sending message...', '');
      setTimeout(()=>{
        submitBtn.disabled = false; submitBtn.textContent = 'Send message';
        showContactStatus('Thanks — your message was sent (simulated).', 'success');
        form.reset();
        // persist a short copy in localStorage
        try{ localStorage.setItem('lastMessage', JSON.stringify({name,email,ts:Date.now()})) }catch(e){}
      }, 900);
    });
  }
})();
