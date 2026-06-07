/* Admin editor: edits stored to localStorage (projectsDraft) and can be exported as JSON.
   This avoids requiring a server write; to persist changes replace data/projects.json with exported file. */

// -------------------------
// Simple client-side auth
// -------------------------
// WARNING: this is client-side only and not secure for sensitive deployments.
// Edit these constants to change the admin credentials.
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'changeme';

function showLogin(){
  const login = document.getElementById('adminLogin');
  const root = document.getElementById('adminRoot');
  if(login) login.style.display = 'flex';
  if(root) root.style.display = 'none';
}

function unlock(){
  const login = document.getElementById('adminLogin');
  const root = document.getElementById('adminRoot');
  if(login) login.style.display = 'none';
  if(root) root.style.display = '';
}

function isAuthenticated(){
  return sessionStorage.getItem('adminAuth') === '1';
}

function setupLoginHandlers(){
  const btn = document.getElementById('loginBtn');
  const user = document.getElementById('loginUser');
  const pass = document.getElementById('loginPass');
  if(!btn || !user || !pass) return;
  btn.addEventListener('click', ()=>{
    const u = user.value.trim(); const p = pass.value;
    if(u===ADMIN_USER && p===ADMIN_PASS){ sessionStorage.setItem('adminAuth','1'); unlock(); renderAdmin(); }
    else alert('Invalid credentials');
  });
}

// If already authenticated, show admin immediately
document.addEventListener('DOMContentLoaded', ()=>{
  setupLoginHandlers();
  if(!isAuthenticated()) showLogin(); else { unlock(); }
});


async function loadJSON(path){
  try{
    const draft = localStorage.getItem('projectsDraft');
    if(draft) return JSON.parse(draft);
  } catch(e){}
  const r = await fetch(path);
  if(!r.ok) throw new Error('Failed to fetch');
  return r.json();
}

function downloadJSON(obj, name='projects.json'){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

let projectsData = null;

function saveDraft(data){
  localStorage.setItem('projectsDraft', JSON.stringify(data));
  // dispatch storage event for same-tab listeners
  window.dispatchEvent(new Event('storage'));
}

async function renderAdmin(){
  const list = document.getElementById('adminList');
  list.innerHTML = 'Loading...';
  try{
    const data = await loadJSON('data/projects.json');
    projectsData = data;
    list.innerHTML = '';
    data.projects.forEach(p=>{
      const div = document.createElement('div'); div.className='card'; div.style.marginBottom='12px';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${p.title}</strong>
          <div>
            <button data-id="${p.id}" class="btn edit">Edit</button>
            <button data-id="${p.id}" class="btn secondary delete">Delete</button>
          </div>
        </div>
        <div style="margin-top:8px">${p.short || ''}</div>
      `;
      list.appendChild(div);
    });

    // attach handlers
    list.querySelectorAll('.delete').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        if(!confirm('Delete project ' + id + '?')) return;
        const idx = projectsData.projects.findIndex(x=>x.id===id);
        if(idx>-1){ projectsData.projects.splice(idx,1); saveDraft(projectsData); renderAdmin(); alert('Deleted locally — export JSON to persist to disk.'); }
      });
    });

    list.querySelectorAll('.edit').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const p = projectsData.projects.find(x=>x.id===id);
        if(!p) return;
        const title = prompt('Title', p.title); if(title===null) return; p.title = title;
        const short = prompt('Short', p.short||''); if(short===null) return; p.short = short;
        const tags = prompt('Tags (comma)', (p.tags||[]).join(',')); if(tags===null) return; p.tags = tags.split(',').map(s=>s.trim()).filter(Boolean);
        saveDraft(projectsData); renderAdmin(); alert('Edited locally — export JSON to persist to disk.');
      });
    });

  } catch(e){ list.innerHTML = '<p class="muted">Failed to load data</p>'; }
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderAdmin();

  document.getElementById('exportJson').addEventListener('click', async ()=>{
    const data = projectsData || await loadJSON('data/projects.json');
    downloadJSON(data, 'projects.json');
  });

  document.getElementById('reloadData').addEventListener('click', async ()=>{
    localStorage.removeItem('projectsDraft');
    projectsData = null;
    await renderAdmin();
    alert('Reloaded from disk (server) and cleared local draft.');
  });

  document.getElementById('importFile').addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ()=>{
      try{ const obj = JSON.parse(r.result); projectsData = obj; saveDraft(obj); renderAdmin(); alert('Imported into local draft and applied.'); } catch(err){ alert('Invalid JSON'); }
    }; r.readAsText(f);
  });

  document.getElementById('newProjectForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const fm = e.target;
    const idv = fm.id.value.trim(); if(!idv){ alert('Id is required'); return }
    const newObj = { id: idv, title: fm.title.value.trim(), short: fm.short.value, tech: fm.tech.value, image: fm.image.value, tags: fm.tags.value? fm.tags.value.split(',').map(s=>s.trim()):[], content: { overview:'',challenge:'',solution:'',outcome:'' } };
    try{
      const data = projectsData || await loadJSON('data/projects.json');
      data.projects.push(newObj);
      projectsData = data;
      saveDraft(data);
      alert('Project added to local draft. Use Export JSON to download and overwrite `data/projects.json` on disk to persist.');
      fm.reset(); renderAdmin();
    } catch(e){ alert('Failed to add'); }
  });

});

// listen for storage changes from other tabs and re-render admin
window.addEventListener('storage', e=>{
  if(e.key==='projectsDraft') renderAdmin();
});
