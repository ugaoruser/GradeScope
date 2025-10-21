// API base resolution without hardcoded deploy URL
window.API_BASE = (function(){
  const isLocal = ['localhost','127.0.0.1'].includes(location.hostname);
  if (isLocal) return 'http://localhost:3000';
  if (window.ENV_API_BASE) return window.ENV_API_BASE;
  return `${location.protocol}//${location.host}`;
})();

// Ensure cookies are sent with all requests (supports cookie-based auth cross-origin)
(function(){
  try{
    const of = window.fetch.bind(window);
    window.fetch = (input, init)=>{
      const opts = Object.assign({ credentials: 'include' }, init||{});
      return of(input, opts).then(r=>{
        if (r && r.status === 401) {
          try{ localStorage.clear(); }catch{}
          if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
        }
        return r;
      });
    };
  }catch{}
})();

;(function(){
  'use strict';

  const Page = { is: (name) => location.pathname.endsWith(name) };
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));

  // Messaging helpers (scoped per page)
  function setText(id, text){ const el = qs(id); if (el){ el.textContent = text; el.style.display = 'block'; } }
  function hide(id){ const el = qs(id); if (el){ el.style.display = 'none'; } }
  function showError(msg){ setText('#error-message', msg); }
  function showSuccess(msg){ setText('#success-message', msg); }
  function hideMessages(){ hide('#error-message'); hide('#success-message'); }

  // Session helpers
  const getToken = () => localStorage.getItem('token');
  const getRole = () => localStorage.getItem('role');
  // Cookie-based auth; no Authorization header needed for same-origin
  const authHeaders = () => ({ });

  // ---------- Auth ----------
  async function handleLogin(event){
    event.preventDefault();
    const email = qs('#email')?.value.trim();
    const password = qs('#password')?.value;
    if (!email || !password) { showError('Please fill in all fields'); return; }
    hideMessages(); setLoading('#login-btn','#loading', true, 'Logging in...');
    try{
      const res = await fetch(`${window.API_BASE}/api/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid email or password.');
      persistAuth(data, email);
      if (data.role === 'parent') { await parentFlow(); return; }
      showSuccess('Login successful!'); redirectByRole(data.role);
    }catch(err){ console.error(err); showError(err.message || 'Server unreachable.'); }
    finally{ setLoading('#login-btn','#loading', false, 'Log In'); }
  }

  function persistAuth(data, email){
    const items = {
      // Do not store JWT in localStorage; rely on httpOnly cookie
      role: data.role,
      userId: data.userId,
      user: JSON.stringify({ name: data.name, userId: data.userId, role: data.role }),
      email: email,
      fullName: data.name || ''
    };
    Object.entries(items).forEach(([k,v])=> localStorage.setItem(k, v));
  }

  async function parentFlow(){
    try{
      const r = await fetch(`${window.API_BASE}/api/children`, { headers: authHeaders() });
      if (!r.ok) throw new Error('Failed to load children');
      const children = await r.json();
      if (!children.length){ showError('No children found. Contact your school.'); return; }
      // Always ask parent to choose explicitly, even if only one child
      showParentSelection(children);
    }catch(e){ showError('Failed to load children: ' + e.message); }
  }

  function showParentSelection(children){
    const modal = qs('#parent-modal'); const selector = qs('#child-selector'); const btn = qs('#continue-btn');
    if (!modal || !selector || !btn) { redirectByRole('parent'); return; }
    selector.innerHTML = '';
    let selectedId = null; btn.disabled = true;
    children.forEach(child=>{
      const div = document.createElement('div');
      div.className = 'parent-child-option';
      div.textContent = child.full_name; div.tabIndex = 0;
      div.addEventListener('click', ()=>{ qsa('#child-selector > div').forEach(d=> d.classList.remove('selected')); div.classList.add('selected'); selectedId = child.id; btn.disabled = false; });
      selector.appendChild(div);
    });
    // Preselect automatically if there's only one, but still require explicit Continue
    if (children.length === 1){
      selectedId = children[0].id; btn.disabled = false;
      const first = selector.firstElementChild; if (first) first.classList.add('selected');
    }
    btn.onclick = ()=>{ if (!selectedId) return; const c = children.find(x=> x.id === selectedId); localStorage.setItem('selectedChildId', String(selectedId)); localStorage.setItem('selectedChildName', c?.full_name || 'Student'); modal.style.display='none'; redirectByRole('parent'); };
    modal.style.display = 'flex';
  }

  async function handleSignup(event){
    event.preventDefault(); hideMessages();
    const f = (id)=> qs(id)?.value.trim();
    const firstName=f('#firstName'), lastName=f('#lastName'), email=f('#email');
    const password=qs('#password')?.value, confirm=qs('#confirmPassword')?.value, role=f('#role');
    if (!firstName||!lastName||!email||!password||!confirm||!role){ showError('Please fill in all fields'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showError('Please enter a valid email'); return; }
    if (password !== confirm){ showError('Passwords do not match'); return; }
    setLoading('#signup-btn','#loading', true, 'Creating Account...');
    try{
      const res = await fetch(`${window.API_BASE}/api/signup`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ firstName, lastName, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      showSuccess('Account created successfully! Redirecting to login...');
      setTimeout(()=> location.href='login.html', 800);
    }catch(e){ showError(e.message || 'Network error. Please try again.'); }
    finally{ setLoading('#signup-btn','#loading', false, 'Create Account'); }
  }

  function logout(){
    ['token','role','user','fullName','email','selectedChildId','selectedChildName','firstName','lastName','userId'].forEach(k=> localStorage.removeItem(k));
    location.href = 'login.html';
  }

  function redirectByRole(role){
    const dest = role==='teacher' ? 'homepage2.html' : 'homepage1.html';
    setTimeout(()=> location.replace(dest), 200);
  }

  function setLoading(btnSel, loaderSel, loading, label){
    const btn = qs(btnSel), loader = qs(loaderSel);
    if (btn){ btn.disabled = !!loading; if (label && loading) btn.textContent = label; if (!loading && btn.dataset.defaultText) btn.textContent = btn.dataset.defaultText; }
    if (loader){ loader.style.display = loading ? 'block' : 'none'; }
  }

  // Real-time via SSE
  let sse;
  function connectEvents(){
    if (sse) return;
    try{
      sse = new EventSource(`${window.API_BASE}/api/events`);
      const refresh = debounce(()=>{
        try{
          if (Page.is('homepage1.html')) loadClasses();
          if (Page.is('homepage2.html')) loadTeacherSubjects();
        }catch(e){}
      }, 400);
      sse.addEventListener('classCreated', refresh);
      sse.addEventListener('enrollmentUpdated', refresh);
      sse.addEventListener('scoreUpdated', ()=>{
        // handled per-page where needed
      });
      sse.onerror = () => { try { sse.close(); } catch{} sse = null; setTimeout(connectEvents, 2000); };
    }catch(e){ sse = null; }
  }
  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

  // Shared UI components (header/sidebar) without new files
  const Components = {
    renderHeader(role, title){
      const isTeacher = role === 'teacher';
      const btnId = isTeacher ? 'accountBtnT' : 'accountBtn';
      return `
        <div class="header-title">${title || 'Welcome'}</div>
        <div class="account-menu">
          <button class="account-btn" id="${btnId}"><span id="accountInitial">A</span></button>
          <div class="account-dropdown" id="accountDropdown" aria-hidden="true">
            <div class="account-info">
              <div id="userFullName">User Name</div>
              <div id="userEmail"></div>
            </div>
            <button id="${isTeacher?'logoutBtnT':'logoutBtn'}">Log Out</button>
          </div>
        </div>`;
    },
    renderSidebar(role, active){
      const isTeacher = role === 'teacher';
      const homeId = isTeacher ? 'navHomeT' : 'navHome';
      const settingsId = isTeacher ? 'navSettingsT' : 'navSettings';
      const isHome = /homepage\d?\.html$/.test(active) || /index\.html$/.test(active);
      return `
        <div class="top">
          <ul class="nav">
            <li id="${homeId}" class="${isHome?'active':''}">Home</li>
            <li id="${settingsId}">Settings</li>
            <li id="aboutBtn">About</li>
          </ul>
        </div>
        <div class="bottom">
          <div class="app-version">Grade Tracker v1.0</div>
        </div>`;
    },
    mount(){
      try{
        const role = localStorage.getItem('role');
        const header = document.querySelector('.header[data-shared="header"]');
        if (header){
          const title = header.querySelector('.header-title')?.textContent || 'Welcome';
          header.innerHTML = this.renderHeader(role, title);
        }
        const sidebar = document.querySelector('.sidebar[data-shared="sidebar"]');
        if (sidebar){
          const active = location.pathname.split('/').pop() || '';
          sidebar.innerHTML = this.renderSidebar(role, active);
        }
      }catch{}
    }
  };

  // ---------- Page initializers ----------
  async function initIndex(){
    const token = getToken(); const role = getRole();
    if (token && role) { redirectByRole(role); return; }
    // Try cookie session
    try{
      const r = await fetch(`${window.API_BASE}/api/me`);
      if (r.ok){ const me = await r.json(); redirectByRole(me.role); return; }
    }catch{}
    location.replace('login.html');
  }

  async function initLogin(){
    const token=getToken(), role=getRole(); if (token && role){ redirectByRole(role); return; }
    try{ const r = await fetch(`${window.API_BASE}/api/me`); if (r.ok){ const me=await r.json(); redirectByRole(me.role); return; } }catch{}
    const form = qs('#login-form'); if (form){ form.addEventListener('submit', handleLogin); }
    qs('#email')?.focus();
  }

  async function initSignup(){
    const token=getToken(); if (token){ redirectByRole(getRole()); return; }
    try{ const r = await fetch(`${window.API_BASE}/api/me`); if (r.ok){ const me=await r.json(); redirectByRole(me.role); return; } }catch{}
    const form = qs('#signup-form'); if (form){ form.addEventListener('submit', handleSignup); }
  }

  async function initHomepage1(){
    let role = getRole();
    if (!role){ try{ const r=await fetch(`${window.API_BASE}/api/me`); if (r.ok){ const me=await r.json(); role = me.role; localStorage.setItem('role', role); } }catch{}
    }
    if (!role){ location.href='login.html'; return; }
    if (role==='teacher'){ location.href='homepage2.html'; return; }
    document.body.dataset.role = role;
    bindHomepage1UI(); fetchMeAndHeader(); loadClasses(); connectEvents();
  }

  function bindHomepage1UI(){
    qs('#navHome')?.addEventListener('click', ()=> location.href='homepage1.html');
    qs('#navSettings')?.addEventListener('click', ()=> location.href='settings.html');
    qs('#accountBtn')?.addEventListener('click', (e)=>{ e.stopPropagation(); qs('#accountDropdown')?.classList.toggle('show'); });
    document.addEventListener('click', (e)=>{
      const dd = qs('#accountDropdown'); const btn = qs('#accountBtn');
      if (dd && btn && !dd.contains(e.target) && !btn.contains(e.target)) dd.classList.remove('show');
    });
    qs('#logoutBtn')?.addEventListener('click', logout);
    qs('#aboutBtn')?.addEventListener('click', ()=> showAbout());
    qs('#closeAboutBtn')?.addEventListener('click', ()=> closeAbout());
    qs('#joinBtn')?.addEventListener('click', ()=> toggleJoinModal(true));
    qs('#closeJoin')?.addEventListener('click', ()=> toggleJoinModal(false));
    qs('#cancelJoin')?.addEventListener('click', ()=> toggleJoinModal(false));
    qs('#confirmJoin')?.addEventListener('click', joinClass);
    qs('#switchChildBtn')?.addEventListener('click', switchChild);
  }

  async function fetchMeAndHeader(){
    try{
      const res = await fetch(`${window.API_BASE}/api/me`);
      const userData = await res.json();
      if (!res.ok) throw new Error('Unauthorized');
      localStorage.setItem('firstName', userData.firstName || '');
      localStorage.setItem('lastName', userData.lastName || '');
      localStorage.setItem('fullName', userData.fullName || `${userData.firstName||''} ${userData.lastName||''}`.trim());
      if (userData.email) localStorage.setItem('email', userData.email);
    }catch(e){ console.warn('me failed', e); }
    const role = getRole(); const isParent = role==='parent';
    const selectedChildName = localStorage.getItem('selectedChildName');
    const user = JSON.parse(localStorage.getItem('user')||'{}');
    const display = isParent && selectedChildName ? selectedChildName : (localStorage.getItem('fullName') || user.name || 'User');
    const init = display?.charAt(0)?.toUpperCase() || 'A';
    const initialEl = qs('#accountInitial'); if (initialEl) initialEl.textContent = init;
    const userNameEl = qs('#userFullName'); const emailEl = qs('#userEmail');
    if (userNameEl){
      if (isParent && selectedChildName){
        userNameEl.innerHTML = `<div style="font-weight:600;">${localStorage.getItem('fullName') || display} (Parent)</div><div style="font-size:0.85em;color:#666;margin-top:2px;">Viewing: ${selectedChildName}</div>`;
      } else { userNameEl.textContent = display; }
    }
    if (emailEl){ emailEl.textContent = localStorage.getItem('email') || ''; }
    if (isParent && selectedChildName){
      const pc = qs('#parentContext'); if (pc){ pc.style.display='block'; qs('#childNameDisplay').textContent = selectedChildName; qs('#classesHeader').textContent = `${selectedChildName}'s Classes`; }
    }
  }

  function toggleJoinModal(show){ const m = qs('#joinModal'); if (!m) return; m.style.display = show? 'block':'none'; }

  async function joinClass(){
    const accessCode = qs('#joinCode')?.value.trim(); if (!accessCode){ alert('Access code is required'); return; }
    try{
      const payload = { accessCode };
      const r = localStorage.getItem('role');
      const childId = localStorage.getItem('selectedChildId');
      if (r === 'parent' && childId) payload.childId = childId;
      const resp = await fetch(`${window.API_BASE}/api/subjects/join`, {
        method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)
      });
      const data = await resp.json(); if (!resp.ok) throw new Error(data.message || 'Failed to join');
      alert('Joined successfully'); toggleJoinModal(false); location.reload();
    }catch(e){
      const input = qs('#joinCode');
      if (input){ input.style.borderColor = '#ef4444'; input.title = e.message; }
      alert('Error: ' + e.message);
    }
  }

  async function loadClasses(){
    const cont = qs('#classroomTabs'); if (!cont) return;
    cont.innerHTML = '<div class="loading-placeholder" style="height:140px;border-radius:12px;"></div>';
    try{
      const isParent = getRole()==='parent'; const childId = localStorage.getItem('selectedChildId');
      let url = `${window.API_BASE}/api/classes`;
      if (isParent && childId) url += `?childId=${encodeURIComponent(childId)}`;
      const r = await fetch(url);
      if (r.status===401){ localStorage.clear(); location.replace('login.html'); return; }
      if (!r.ok) throw new Error('Failed to load classes');
      const classes = await r.json();
      renderClasses(classes);
    }catch(e){ console.error('load classes', e); cont.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px;">Failed to load classes. <button onclick="location.reload()" style="background:none;border:1px solid #ef4444;color:#ef4444;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;">Retry</button></div>'; }
  }

  function renderClasses(classes){
    const cont = qs('#classroomTabs'); if (!cont) return; cont.innerHTML='';
    if (!classes || !classes.length){ cont.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No classes found.</div>'; return; }
    const frag = document.createDocumentFragment(); const isParent = getRole()==='parent'; const selectedChildId = localStorage.getItem('selectedChildId');
    classes.forEach(cls=>{
      const div = document.createElement('div'); div.className='class-tab';
      const meta = `${cls.grade_level || cls.gradeLevel || 'Grade'} - ${cls.section}`;
      div.innerHTML = `<div class="class-title">${cls.title}</div><div class="class-section">${meta}</div>`;
      const url = isParent && selectedChildId ? `student-grades.html?id=${encodeURIComponent(cls.id)}&title=${encodeURIComponent(cls.title)}&childId=${encodeURIComponent(selectedChildId)}` : `student-grades.html?id=${encodeURIComponent(cls.id)}&title=${encodeURIComponent(cls.title)}`;
      div.addEventListener('click', ()=> location.href=url);
      frag.appendChild(div);
    });
    cont.appendChild(frag);
  }

  async function switchChild(){
    if (getRole()!=='parent') return;
    try{
      const r = await fetch(`${window.API_BASE}/api/children`);
      if (!r.ok) throw new Error('Failed to load children');
      const children = await r.json();
      if (children.length<=1){ alert('Only one child found in your account.'); return; }
      const id = await showChildSwitch(children); if (!id) return;
      const chosen = children.find(c=> c.id===id); localStorage.setItem('selectedChildId', String(id)); localStorage.setItem('selectedChildName', chosen?.full_name || 'Student'); location.reload();
    }catch(e){ console.error(e); alert('Failed to switch child. Please try again.'); }
  }

  function showChildSwitch(children){
    return new Promise((resolve)=>{
      const modal = document.createElement('div'); modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:200;';
      const content = document.createElement('div'); content.style.cssText='background:#fff;border-radius:12px;padding:2rem;max-width:400px;width:90%;';
      content.innerHTML = `<h3 style="margin-bottom:1rem;">Switch Child</h3><div id="childOptions" style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;"></div><div style="display:flex;justify-content:flex-end;gap:0.5rem;"><button id="cancelSwitch" style="padding:0.5rem 1rem;background:#e5e7eb;border:none;border-radius:6px;cursor:pointer;">Cancel</button></div>`;
      const options = content.querySelector('#childOptions');
      children.forEach(child=>{ const b=document.createElement('button'); b.style.cssText='padding:1rem;background:#f8fafc;border:2px solid #e5e7eb;border-radius:8px;cursor:pointer;text-align:left;'; b.textContent=child.full_name; b.onclick=()=>{ modal.remove(); resolve(child.id); }; options.appendChild(b); });
      content.querySelector('#cancelSwitch').onclick = ()=>{ modal.remove(); resolve(null); };
      modal.appendChild(content); document.body.appendChild(modal);
      modal.onclick = (e)=>{ if (e.target===modal){ modal.remove(); resolve(null); } };
    });
  }

  function showAbout(){ const m=qs('#aboutModal'); if (!m) return; m.style.display='flex'; requestAnimationFrame(()=> m.classList.add('show')); }
  function closeAbout(){ const m=qs('#aboutModal'); if (!m) return; m.classList.remove('show'); setTimeout(()=> m.style.display='none', 180); }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', ()=>{
    // Build shared components if page opted-in
    Components.mount();
    // Attach account dropdown handlers globally (any page)
    attachAccountDropdownHandlers();
    // Global logout handlers on any page
    const bindLogout = ()=>{
      const l1 = document.getElementById('logoutBtn');
      const l2 = document.getElementById('logoutBtnT');
      l1 && l1.addEventListener('click', logout);
      l2 && l2.addEventListener('click', logout);
    };
    bindLogout();

    if (Page.is('index.html')) return initIndex();
    if (Page.is('login.html')) return initLogin();
    if (Page.is('signup.html')) return initSignup();
    if (Page.is('homepage1.html')) return initHomepage1();
    if (Page.is('homepage2.html')) return initHomepage2();
  });

  function attachAccountDropdownHandlers(){
    const btn = document.getElementById('accountBtn') || document.getElementById('accountBtnT');
    const dd = document.getElementById('accountDropdown');
    if (!btn || !dd) return;
    const setExpanded = (v)=>{ btn.setAttribute('aria-expanded', v ? 'true' : 'false'); dd.setAttribute('aria-hidden', v ? 'false' : 'true'); };
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); const willShow = !dd.classList.contains('show'); dd.classList.toggle('show'); setExpanded(willShow); });
    document.addEventListener('click', (e)=>{
      if (!dd.contains(e.target) && !btn.contains(e.target)) { dd.classList.remove('show'); setExpanded(false); }
    });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape'){ dd.classList.remove('show'); setExpanded(false); document.querySelectorAll('.modal.show').forEach(m=> m.classList.remove('show')); document.querySelectorAll('.modal[style*="display: block"], .modal[style*="display:block"]').forEach(m=> m.style.display='none'); } });
  }

  // ---------- Teacher page ----------
  async function initHomepage2(){
    let role = getRole();
    if (role!=='teacher'){
      try{ const r=await fetch(`${window.API_BASE}/api/me`); if (r.ok){ const me=await r.json(); role = me.role; localStorage.setItem('role', role); } }catch{}
    }
    if (role!=='teacher'){ location.href = role==='teacher' ? 'login.html' : 'homepage1.html'; return; }
    bindHomepage2UI();
    setupTeacherHeader();
    loadTeacherSubjects();
    setupChatbotToggle();
    connectEvents();
  }

  function bindHomepage2UI(){
    qs('#navHomeT')?.addEventListener('click', ()=> location.href='homepage2.html');
    qs('#navSettingsT')?.addEventListener('click', ()=> location.href='settings.html');
    qs('#accountBtnT')?.addEventListener('click', (e)=>{ e.stopPropagation(); qs('#accountDropdown')?.classList.toggle('show'); });
    document.addEventListener('click', (e)=>{
      const dd = qs('#accountDropdown'); const btn = qs('#accountBtnT');
      if (dd && btn && !dd.contains(e.target) && !btn.contains(e.target)) dd.classList.remove('show');
    });
    qs('#logoutBtnT')?.addEventListener('click', logout);
    // About modal
    qs('#aboutBtn')?.addEventListener('click', ()=> showAbout());
    qs('#closeAboutBtnT')?.addEventListener('click', ()=> closeAbout());
    // Add class modal
    qs('#createClassBtn')?.addEventListener('click', ()=> toggleAddClass(true));
    qs('#closeAddClassX')?.addEventListener('click', ()=> toggleAddClass(false));
    qs('#cancelCreate')?.addEventListener('click', ()=> toggleAddClass(false));
    qs('#confirmCreate')?.addEventListener('click', confirmAddClass);
  }

  async function setupTeacherHeader(){
    try{
      const res = await fetch(`${window.API_BASE}/api/me`);
      const userData = await res.json();
      if (res.ok){
        localStorage.setItem('firstName', userData.firstName || '');
        localStorage.setItem('lastName', userData.lastName || '');
        localStorage.setItem('fullName', userData.fullName || `${userData.firstName||''} ${userData.lastName||''}`.trim());
        if (userData.email) localStorage.setItem('email', userData.email);
      }
    }catch{}
    const display = localStorage.getItem('fullName') || (JSON.parse(localStorage.getItem('user')||'{}').name) || 'Teacher';
    const init = display?.charAt(0) || 'T';
    qs('#accountInitial') && (qs('#accountInitial').textContent = init);
    qs('#userFullName') && (qs('#userFullName').textContent = display);
    qs('#userEmail') && (qs('#userEmail').textContent = localStorage.getItem('email') || '');
  }

  function toggleAddClass(show){ const m = qs('#addClassModal'); if (!m) return; m.style.display = show? 'block':'none'; if (!show){ const f=(id)=>{const el=qs(id); if(el) el.value='';}; f('#className'); f('#section'); } }

  async function confirmAddClass(){
    const className = qs('#className')?.value.trim();
    const gradeLevel = qs('#gradeLevel')?.value.trim();
    const section = qs('#section')?.value.trim();
    if (!className || !gradeLevel || !section){ alert('Please fill in all fields'); return; }
    const btn = qs('#confirmCreate'); const prev = btn?.textContent; if (btn){ btn.disabled = true; btn.textContent = 'Creating...'; }
    try{
      const res = await fetch(`${window.API_BASE}/api/subjects`,{
        method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ title: className, gradeLevel, section })
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Failed to create class');
      const accessCode = data.accessCode || data.access_code || data.code || '';
      toggleAddClass(false);
      const c = qs('#classroomTabs'); if (c){ const div=document.createElement('div'); div.className='class-tab'; div.innerHTML = `<div class="class-title">${data.title || className}</div><div class="class-section">${data.section || section}</div>${accessCode?`<div class="small">Access Code: <strong>${accessCode}</strong></div>`:''}`; div.addEventListener('click', ()=> location.href = `subject.html?subject=${encodeURIComponent(data.title || className)}`); c.appendChild(div);} 
      try{ if (accessCode) await navigator.clipboard.writeText(accessCode);}catch{}
      alert('Class created!' + (accessCode? ` Access Code: ${accessCode}`:''));
    }catch(e){ alert('Error creating class: ' + e.message); }
    finally{ if (btn){ btn.disabled = false; btn.textContent = prev; } }
  }

  async function loadTeacherSubjects(){
    const container = qs('#classroomTabs'); if (!container) return;
    container.innerHTML = '<div class="loading-placeholder" style="height:140px;border-radius:12px;"></div><div class="loading-placeholder" style="height:140px;border-radius:12px;"></div>';
    try{
      let res = await fetch(`${window.API_BASE}/api/subjects`, { headers: authHeaders() });
      let list; if (res.ok){ list = await res.json(); } else {
        const res2 = await fetch(`${window.API_BASE}/api/classes`);
        if (!res2.ok) throw new Error('Failed to load classes'); list = await res2.json();
      }
      renderTeacherSubjects(list);
    }catch(e){ console.error('Error loading classes:', e); container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No classes found. Click "+ Create Class" to create your first class.</div>'; }
  }

  function renderTeacherSubjects(subjects){
    const container = qs('#classroomTabs'); if (!container) return; container.innerHTML='';
    if (!subjects || !subjects.length){ container.innerHTML = '<div>No classes found. Click "+ Create Class" to add your first class.</div>'; return; }
    subjects.forEach(subj=>{ const div=document.createElement('div'); div.className='class-tab'; div.innerHTML = `<div class="class-title">${subj.title}</div><div class="class-section">${subj.section||''}</div>`; div.addEventListener('click', ()=> location.href = `subject.html?subject=${encodeURIComponent(subj.title)}`); container.appendChild(div); });
  }

  function setupChatbotToggle(){ const sidebar=qs('#chatbotSidebar'); const tog=qs('#chatbotToggle'); const close=qs('#closeChatbot'); if (tog && sidebar){ tog.addEventListener('click', ()=>{ sidebar.style.right = sidebar.style.right==='0px' ? '-360px' : '0px'; }); } if (close && sidebar){ close.addEventListener('click', ()=> sidebar.style.right='-360px'); } }

  // Expose minimal globals only if needed elsewhere
  window.App = { logout };
})();
