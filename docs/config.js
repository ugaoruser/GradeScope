// Initialize theme early so all pages respect dark mode
(function(){
  try{
    const t = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = t;
  }catch{}
})();

// Ensure a favicon exists even on GitHub Pages (prevents 404 requests)
(function(){
  try{
    const has = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (!has){
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ayv0XQAAAAASUVORK5CYII=';
      document.head.appendChild(link);
    }
  }catch{}
})();

// API base resolution without hardcoded deploy URL
window.API_BASE = (function(){
  // Allow explicit override first
  if (window.ENV_API_BASE) {
    try { localStorage.setItem('API_BASE_OVERRIDE', String(window.ENV_API_BASE)); } catch {}
    return window.ENV_API_BASE;
  }

  // Persistent override via localStorage
  try {
    const saved = localStorage.getItem('API_BASE_OVERRIDE');
    if (saved) return saved;
  } catch {}

  const host = location.hostname || '';
  const port = String(location.port || '');
  // When opened from local files, default to the Render API to avoid file:/// fetch errors
  if (location.protocol === 'file:') {
    return 'https://gradescope-a4hw.onrender.com';
  }
  const isLoopback = ['localhost','127.0.0.1','0.0.0.0','::1'].includes(host);


  const isLan = host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
  const isLiveServer = ['5500','5501','3001'].includes(port);

  // When hosted on GitHub Pages, call the Render API
  if (host.endsWith('github.io')) return 'https://gradescope-a4hw.onrender.com';

  // Fallback: same origin
  return `${location.protocol}//${location.host}`;
})();

// Ensure cookies are sent with all requests (supports cookie-based auth cross-origin)
(function(){
  try{
    const of = window.fetch.bind(window);
    window.fetch = (input, init)=>{
      const opts = Object.assign({ credentials: 'include' }, init||{});
      const headers = new Headers(opts.headers || {});
      const t = localStorage.getItem('token');
      if (t && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${t}`);
      opts.headers = headers;
      return of(input, opts).then(r=>{
        if (r && r.status === 401) {
          try{ localStorage.clear(); }catch{}
          const path = location.pathname;
          const isLogin = path.endsWith('login.html');
          const isSignup = path.endsWith('signup.html');
          if (!isLogin && !isSignup) location.href = 'login.html';
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
  // Prefer cookie for same-origin; add Authorization header automatically when token exists (needed for cross-origin)
  const authHeaders = () => {
    const t = localStorage.getItem('token');
    return t ? { 'Authorization': `Bearer ${t}` } : {};
  };

  // ---------- Auth ----------
  async function handleLogin(event){
    event.preventDefault();
    const email = qs('#email')?.value.trim();
    const password = qs('#password')?.value;
    if (!email || !password) { showError('Please fill in all fields'); return; }
    hideMessages(); setLoading('#login-btn','#loading', true, 'Logging in...');
    try{
      const res = await fetch(`${window.API_BASE}/api/login`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const ctype = res.headers.get('content-type') || '';
      let data;
      if (ctype.includes('application/json')){
        data = await res.json();
      } else {
        const text = await res.text();
        const brief = (text || '').toString().slice(0,140).replace(/\s+/g,' ').trim();
        const msg = res.status===0 ? 'Network error. Is the server running?' : `Server error (${res.status}). ${brief || 'Unexpected non-JSON response.'}`;
        throw new Error(msg);
      }
      if (!res.ok) throw new Error(data.message || 'Invalid email or password.');
      // Immediately persist and stop loading for snappier UX
      persistAuth(data, email);
      setLoading('#login-btn','#loading', false, 'Log In');
      if (data.role === 'parent') {
        // Don't block UI; show selection modal asynchronously
        parentFlow();
        return;
      }
      // Redirect immediately for students/teachers
      redirectByRole(data.role);
    }catch(err){ console.error(err); showError(err.message || 'Server unreachable.'); setLoading('#login-btn','#loading', false, 'Log In'); }
  }

  function persistAuth(data, email){
    const items = {
      token: data.token || localStorage.getItem('token') || '',
      role: data.role,
      userId: data.userId,
      user: JSON.stringify({ name: data.name, userId: data.userId, role: data.role }),
      email: email,
      fullName: data.name || ''
    };
    Object.entries(items).forEach(([k,v])=> (v!==undefined && v!==null) && localStorage.setItem(k, v));
  }

  async function parentFlow(){
    try{
      const r = await fetch(`${window.API_BASE}/api/children`, { headers: authHeaders() });
      if (!r.ok) throw new Error('Failed to load children');
      const children = await r.json();
      if (!children.length){
        showParentSelection([]);
        return;
      }
      // Always ask parent to choose explicitly, even if only one child
      showParentSelection(children);
    }catch(e){ showError('Failed to load children: ' + e.message); }
  }

  function showParentSelection(children){
    const modal = qs('#parent-modal'); const selector = qs('#child-selector'); const btn = qs('#continue-btn');
    if (!modal || !selector || !btn) { redirectByRole('parent'); return; }
    renderChildSelector(children);
    // Setup link child functionality
    const linkBtn = qs('#link-child-btn');
    if (linkBtn) {
      linkBtn.onclick = () => showLinkChildModal();
    }
    modal.style.display = 'flex';
  }

  function renderChildSelector(children) {
    const selector = qs('#child-selector'); const btn = qs('#continue-btn');
    if (!selector || !btn) return;
    selector.innerHTML = '';
    let selectedId = null; btn.disabled = true;
    if (!children || children.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:#666;padding:8px 0;';
      empty.textContent = 'No child linked yet. Use "Link Child" to add a child to your account.';
      selector.appendChild(empty);
      return;
    }
    children.forEach(child=>{
      const div = document.createElement('div');
      div.className = 'parent-child-option';
      div.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px;">${child.full_name}</div>
        <div style="font-size:0.85rem;color:#666;">${child.email || 'Student'}</div>
      `;
      div.tabIndex = 0;
      div.addEventListener('click', ()=>{ qsa('#child-selector > div').forEach(d=> d.classList.remove('selected')); div.classList.add('selected'); selectedId = child.id; btn.disabled = false; });
      selector.appendChild(div);
    });
    // Preselect automatically if there's only one, but still require explicit Continue
    if (children.length === 1){
      selectedId = children[0].id; btn.disabled = false;
      const first = selector.firstElementChild; if (first) first.classList.add('selected');
    }
    btn.onclick = ()=>{ if (!selectedId) return; const c = children.find(x=> x.id === selectedId); localStorage.setItem('selectedChildId', String(selectedId)); localStorage.setItem('selectedChildName', c?.full_name || 'Student'); qs('#parent-modal').style.display='none'; redirectByRole('parent'); };
  }

  function showLinkChildModal() {
    const linkModal = qs('#link-child-modal');
    if (!linkModal) return;
    linkModal.style.display = 'flex';
    const emailInput = qs('#child-email');
    const cancelBtn = qs('#cancel-link');
    const confirmBtn = qs('#confirm-link');
    
    if (emailInput) emailInput.value = '';
    
    if (cancelBtn) {
      cancelBtn.onclick = () => linkModal.style.display = 'none';
    }
    
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const email = emailInput?.value.trim();
        if (!email) {
          alert('Please enter a valid email address');
          return;
        }
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Linking...';
        
        try {
          const res = await fetch(`${window.API_BASE}/api/parent/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childEmail: email })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to link child');
          
          linkModal.style.display = 'none';
          alert('Child linked successfully!');
          
          // Refresh children list
          const childrenRes = await fetch(`${window.API_BASE}/api/children`, { headers: authHeaders() });
          if (childrenRes.ok) {
            const updatedChildren = await childrenRes.json();
            renderChildSelector(updatedChildren);
          }
        } catch (err) {
          alert('Error linking child: ' + err.message);
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Link Child';
        }
      };
    }
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
      setTimeout(()=> location.href='login.html', 2000);
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
    // Always hide external loader blocks in favor of inline spinner
    if (loader) loader.style.display = 'none';
    if (!btn) return;
    btn.disabled = !!loading;
    if (loading){
      // Preserve original HTML to restore later
      if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML || btn.textContent || '';
      const lbl = label || btn.textContent || 'Loading...';
      btn.classList.add('is-loading');
      btn.innerHTML = `<span class="spinner-inline" aria-hidden="true"></span><span>${lbl}</span>`;
    } else {
      btn.classList.remove('is-loading');
      if (btn.dataset.defaultHtml){ btn.innerHTML = btn.dataset.defaultHtml; }
    }
  }

  // Real-time via SSE
  let sse;
  function connectEvents(){
    if (sse) return;
    try{
      const tok = getToken();
      sse = new EventSource(`${window.API_BASE}/api/events${tok?`?token=${encodeURIComponent(tok)}`:''}`);
      const refresh = debounce(()=>{
        try{
          if (Page.is('homepage1.html')) loadClasses();
          if (Page.is('homepage2.html')) loadTeacherSubjects();
          // Refresh teacher-grades student list on enrollment updates
          if (Page.is('teacher-grades.html') && typeof window.loadStudents === 'function') {
            window.loadStudents();
          }
        }catch(e){}
      }, 400);
      sse.addEventListener('classCreated', refresh);
      sse.addEventListener('enrollmentUpdated', (ev)=>{
        try { document.dispatchEvent(new CustomEvent('enrollment:updated', { detail: ev?.data||null })); } catch {}
        refresh();
      });
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
    // On same-origin (Render) we can safely probe /api/me to auto-redirect logged-in users.
    // On GitHub Pages this would be a cross-origin request and can produce noisy CORS errors,
    // so skip the probe there and rely purely on explicit login.
    const host = location.hostname || '';
    if (!host.endsWith('github.io')){
      try{
        const r = await fetch(`${window.API_BASE}/api/me`);
        if (r.ok){ const me=await r.json(); redirectByRole(me.role); return; }
      }catch{}
    }
    const form = qs('#login-form');
    if (form){
      // Robust binding and default navigation guard
      form.setAttribute('novalidate','novalidate');
      form.setAttribute('action','javascript:void(0)');
      form.addEventListener('submit', handleLogin);
      // Fallback: ensure button click also triggers login
      const btn = qs('#login-btn');
      btn && btn.addEventListener('click', (e)=>{ e.preventDefault(); handleLogin(e); });
    }
    qs('#email')?.focus();
  }

  async function initSignup(){
    const token=getToken(); if (token){ redirectByRole(getRole()); return; }
    try{ const r = await fetch(`${window.API_BASE}/api/me`); if (r.ok){ const me=await r.json(); redirectByRole(me.role); return; } }catch{}
    const form = qs('#signup-form');
    if (form){
      form.setAttribute('novalidate','novalidate');
      form.setAttribute('action','javascript:void(0)');
      form.addEventListener('submit', handleSignup);
      const btn = qs('#signup-btn');
      btn && btn.addEventListener('click', (e)=>{ e.preventDefault(); handleSignup(e); });
    }
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
    // Sidebar navigation
    qs('#navHome')?.addEventListener('click', (e)=> {
      e.preventDefault();
      console.log('Home clicked');
      location.href='homepage1.html';
    });
    qs('#navSettings')?.addEventListener('click', (e)=> {
      e.preventDefault();
      console.log('Settings clicked');
      location.href='settings.html';
    });
    // Account dropdown handled globally in attachAccountDropdownHandlers
    qs('#logoutBtn')?.addEventListener('click', logout);
    qs('#aboutBtn')?.addEventListener('click', (e)=> {
      e.preventDefault();
      showAbout();
    });
    qs('#closeAboutBtn')?.addEventListener('click', ()=> closeAbout());
    // Modal handlers
    qs('#joinBtn')?.addEventListener('click', (e)=> {
      e.preventDefault();
      toggleJoinModal(true);
    });
    qs('#closeJoin')?.addEventListener('click', (e)=> {
      e.preventDefault();
      toggleJoinModal(false);
    });
    qs('#cancelJoin')?.addEventListener('click', (e)=> {
      e.preventDefault();
      toggleJoinModal(false);
    });
    qs('#confirmJoin')?.addEventListener('click', (e)=> {
      e.preventDefault();
      joinClass();
    });
    qs('#switchChildBtn')?.addEventListener('click', switchChild);
    
    // Additional safety: bind to any elements that might exist after DOM updates
    setTimeout(() => {
      qs('#navHome')?.addEventListener('click', (e)=> {
        e.preventDefault();
        location.href='homepage1.html';
      });
      qs('#navSettings')?.addEventListener('click', (e)=> {
        e.preventDefault();
        location.href='settings.html';
      });
    }, 100);
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
    
    // Force update localStorage for cross-page consistency
    localStorage.setItem('displayName', display);
    localStorage.setItem('displayEmail', localStorage.getItem('email') || '');
    localStorage.setItem('displayInitial', init);
    if (isParent && selectedChildName){
      const pc = qs('#parentContext'); if (pc){ pc.style.display='block'; qs('#childNameDisplay').textContent = selectedChildName; qs('#classesHeader').textContent = `${selectedChildName}'s Classes`; }
    }
  }

  function toggleJoinModal(show){ 
    const m = qs('#joinModal'); 
    if (!m) return; 
    
    if (show) {
      document.body.classList.add('modal-open');
      m.style.display = 'flex';
      // Force a reflow before adding show class to prevent flash
      m.offsetHeight;
      requestAnimationFrame(() => {
        m.classList.add('show');
        m.setAttribute('aria-hidden', 'false');
      });
      // Clear any previous error states
      const input = qs('#joinCode');
      if (input) {
        input.style.borderColor = '';
        input.value = '';
        input.focus();
      }
    } else {
      document.body.classList.remove('modal-open');
      m.classList.remove('show');
      m.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        m.style.display = 'none';
      }, 250);
    }
  }

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

    // 1) Try to render from cache immediately for a fast UI when returning
    let cacheKey = '';
    try{
      const role = getRole() || 'student';
      const isParent = role === 'parent';
      const childId = isParent ? (localStorage.getItem('selectedChildId') || '') : '';
      cacheKey = `classes:${role}${isParent && childId ? ':'+childId : ''}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw){
        const cached = JSON.parse(raw);
        if (cached && Array.isArray(cached.classes) && cached.classes.length){
          renderClasses(cached.classes);
        }
      }
    }catch{/* ignore cache errors */}

    // If nothing was rendered, show a loading skeleton
    if (!cont.children.length){
      cont.innerHTML = '<div class="loading-placeholder" style="height:140px;border-radius:12px;"></div>';
    }

    // 2) Always refresh from server in the background to stay up to date
    try{
      const isParent = getRole()==='parent'; const childId = localStorage.getItem('selectedChildId');
      let url = `${window.API_BASE}/api/classes`;
      if (isParent && childId) url += `?childId=${encodeURIComponent(childId)}`;
      const r = await fetch(url);
      if (r.status===401){ localStorage.clear(); location.replace('login.html'); return; }
      if (!r.ok) throw new Error('Failed to load classes');
      const classes = await r.json();
      renderClasses(classes);
      // Update cache with fresh data
      if (cacheKey){
        try{ localStorage.setItem(cacheKey, JSON.stringify({ classes, ts: Date.now() })); }catch{}
      }
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

  function showAbout(){ 
    const m=qs('#aboutModal'); 
    if (!m) return; 
    document.body.classList.add('modal-open');
    m.style.display='flex'; 
    m.offsetHeight; // Force reflow
    requestAnimationFrame(()=> {
      m.classList.add('show');
      m.setAttribute('aria-hidden', 'false');
    }); 
  }
  function closeAbout(){ 
    const m=qs('#aboutModal'); 
    if (!m) return; 
    document.body.classList.remove('modal-open');
    m.classList.remove('show'); 
    m.setAttribute('aria-hidden', 'true');
    setTimeout(()=> m.style.display='none', 250); 
  }

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
    
    // Global modal handlers to prevent stuck modals
    setupGlobalModalHandlers();
    
    // Universal navigation handlers (fallback for all pages)
    setupUniversalNavigation();

    if (Page.is('index.html')) return initIndex();
    if (Page.is('login.html')) return initLogin();
    if (Page.is('signup.html')) return initSignup();
    if (Page.is('homepage1.html')) return initHomepage1();
    if (Page.is('homepage2.html')) return initHomepage2();
    // subject.html is deprecated; navigate directly to teacher-grades
    // if (Page.is('subject.html')) return initSubject();
    if (Page.is('teacher-grades.html')) return initTeacherGrades();
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
    // Teacher sidebar navigation
    qs('#navHomeT')?.addEventListener('click', (e)=> {
      e.preventDefault();
      console.log('Teacher Home clicked');
      location.href='homepage2.html';
    });
    qs('#navSettingsT')?.addEventListener('click', (e)=> {
      e.preventDefault();
      console.log('Teacher Settings clicked');
      location.href='settings.html';
    });
    // Account dropdown handled globally in attachAccountDropdownHandlers
    qs('#logoutBtnT')?.addEventListener('click', logout);
    // About modal
    qs('#aboutBtn')?.addEventListener('click', (e)=> {
      e.preventDefault();
      showAbout();
    });
    qs('#closeAboutBtnT')?.addEventListener('click', ()=> closeAbout());
    // Add class modal
    qs('#createClassBtn')?.addEventListener('click', (e)=> {
      e.preventDefault();
      toggleAddClass(true);
    });
    qs('#closeAddClassX')?.addEventListener('click', (e)=> {
      e.preventDefault();
      toggleAddClass(false);
    });
    qs('#cancelCreate')?.addEventListener('click', (e)=> {
      e.preventDefault();
      toggleAddClass(false);
    });
    qs('#confirmCreate')?.addEventListener('click', (e)=> {
      e.preventDefault();
      confirmAddClass();
    });
    
    // Additional safety binding after DOM updates
    setTimeout(() => {
      qs('#navHomeT')?.addEventListener('click', (e)=> {
        e.preventDefault();
        location.href='homepage2.html';
      });
      qs('#navSettingsT')?.addEventListener('click', (e)=> {
        e.preventDefault();
        location.href='settings.html';
      });
    }, 100);
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
      const c = qs('#classroomTabs'); if (c){ const div=document.createElement('div'); div.className='class-tab'; div.innerHTML = `<div class="class-title">${data.title || className}</div><div class="class-section">${data.section || section}</div>${accessCode?`<div class="small">Access Code: <strong>${accessCode}</strong></div>`:''}`; div.addEventListener('click', ()=> location.href = `teacher-grades.html?id=${encodeURIComponent(data.id||'')}&name=${encodeURIComponent(data.title || className)}`); c.appendChild(div);} 
      try{ if (accessCode) await navigator.clipboard.writeText(accessCode);}catch{}
      alert('Class created!' + (accessCode? ` Access Code: ${accessCode}`:''));
    }catch(e){ alert('Error creating class: ' + e.message); }
    finally{ if (btn){ btn.disabled = false; btn.textContent = prev; } }
  }

  async function loadTeacherSubjects(){
    const container = qs('#classroomTabs'); if (!container) return;

    // 1) Try to render from cache immediately so returning to Home is instant
    const cacheKey = 'teacherSubjects';
    try{
      const raw = localStorage.getItem(cacheKey);
      if (raw){
        const cached = JSON.parse(raw);
        if (cached && Array.isArray(cached.subjects) && cached.subjects.length){
          renderTeacherSubjects(cached.subjects);
        }
      }
    }catch{/* ignore cache errors */}

    // If nothing is rendered yet, show a loading skeleton
    if (!container.children.length){
      container.innerHTML = '<div class="loading-placeholder" style="height:140px;border-radius:12px;"></div><div class="loading-placeholder" style="height:140px;border-radius:12px;"></div>';
    }

    // 2) Refresh from server in the background
    try{
      let res = await fetch(`${window.API_BASE}/api/subjects`, { headers: authHeaders() });
      let list; 
      if (res.ok){ 
        list = await res.json(); 
      } else {
        console.warn('Failed to load from /api/subjects, trying /api/classes');
        const res2 = await fetch(`${window.API_BASE}/api/classes`, { headers: authHeaders() });
        if (!res2.ok) throw new Error(`Failed to load classes: ${res2.status} ${res2.statusText}`); 
        list = await res2.json();
      }
      console.log('Loaded classes/subjects:', list);
      renderTeacherSubjects(list);
      try{ localStorage.setItem(cacheKey, JSON.stringify({ subjects: list, ts: Date.now() })); }catch{}
    }catch(e){ 
      console.error('Error loading classes:', e); 
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No classes found. Click "+ Create Class" to create your first class.</div>'; 
    }
  }

  async function renderTeacherSubjects(subjects){
    const container = qs('#classroomTabs'); if (!container) return;
    container.innerHTML = '';
    
    if (!subjects || !subjects.length){ 
      container.innerHTML = '<div style="text-align:center;color:#666;padding:40px;background:#f8fafc;border-radius:12px;border:2px dashed #e2e8f0;">📚 No classes found.<br><span style="font-size:0.9rem;margin-top:8px;display:block;">Click "+ Create Class" to create your first class.</span></div>'; 
      return; 
    }
    
    subjects.forEach((subj) => {
      const div = document.createElement('div');
      div.className = 'class-tab';
      div.innerHTML = `
        <div class="class-header">
          <div class="class-title">${subj.title}</div>
          <div class="class-actions">
            <button class="copy-code-btn" data-code="" title="Copy class code" style="display:none;">📋</button>
          </div>
        </div>
        <div class="class-meta">
          <div class="class-section">${subj.section || subj.grade_level || ''}</div>
          <div class="class-stats">
            <span class="student-count" data-sid="${subj.id}">—</span>
            <span class="class-code" data-sid="${subj.id}" style="display:none;">Code: <strong></strong></span>
          </div>
        </div>
      `;
      
      // Navigate to class management page on card click (except copy button)
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-code-btn')) return;
        location.href = `teacher-grades.html?id=${encodeURIComponent(subj.id)}&name=${encodeURIComponent(subj.title)}`;
      });
      
      container.appendChild(div);
      
      // Fetch student count (non-blocking)
      fetch(`${window.API_BASE}/api/subjects/${subj.id}/students`).then(async (res)=>{
        if (!res.ok) return [];
        return res.json();
      }).then((students)=>{
        const count = Array.isArray(students) ? students.length : 0;
        const badge = div.querySelector(`.student-count[data-sid="${subj.id}"]`);
        if (badge) badge.textContent = `${count} student${count !== 1 ? 's' : ''}`;
      }).catch(()=>{});
      
      // Fetch class code (non-blocking)
      fetch(`${window.API_BASE}/api/subjects?id=${encodeURIComponent(subj.id)}`).then(async (res)=>{
        if (!res.ok) return null;
        const details = await res.json();
        const classDetail = Array.isArray(details) ? details.find(d => d.id === subj.id) : details;
        const code = classDetail?.code || '';
        if (!code) return;
        const codeSpan = div.querySelector(`.class-code[data-sid="${subj.id}"]`);
        if (codeSpan) { codeSpan.style.display='inline'; codeSpan.querySelector('strong').textContent = code; }
        const copyBtn = div.querySelector('.copy-code-btn');
        if (copyBtn) {
          copyBtn.dataset.code = code;
          copyBtn.style.display = 'inline-block';
          copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(code);
              copyBtn.textContent = '✅';
              setTimeout(() => copyBtn.textContent = '📋', 1500);
            } catch (err) {
              alert(`Class Code: ${code}`);
            }
          });
        }
      }).catch(()=>{});
    });
  }

  function setupChatbotToggle(){ const sidebar=qs('#chatbotSidebar'); const tog=qs('#chatbotToggle'); const close=qs('#closeChatbot'); if (tog && sidebar){ tog.addEventListener('click', ()=>{ sidebar.style.right = sidebar.style.right==='0px' ? '-360px' : '0px'; }); } if (close && sidebar){ close.addEventListener('click', ()=> sidebar.style.right='-360px'); } }

  function setupUniversalNavigation() {
    // Universal navigation handlers that work on any page
    const role = getRole();
    
    // Home navigation
    document.addEventListener('click', (e) => {
      if (e.target.id === 'navHome' || e.target.id === 'navHomeT') {
        e.preventDefault();
        const homeUrl = role === 'teacher' ? 'homepage2.html' : 'homepage1.html';
        location.href = homeUrl;
      }
      
      // Settings navigation
      if (e.target.id === 'navSettings' || e.target.id === 'navSettingsT') {
        e.preventDefault();
        location.href = 'settings.html';
      }
      
      // About modal
      if (e.target.id === 'aboutBtn') {
        e.preventDefault();
        showAbout();
      }
      
      // Join class button
      if (e.target.id === 'joinBtn') {
        e.preventDefault();
        toggleJoinModal(true);
      }
    });
    
    // Additional safety: try to bind specific elements after a delay
    setTimeout(() => {
      ['navHome', 'navHomeT', 'navSettings', 'navSettingsT', 'aboutBtn', 'joinBtn'].forEach(id => {
        const element = document.getElementById(id);
        if (element && !element.dataset.bound) {
          element.dataset.bound = 'true';
          element.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (id === 'navHome' || id === 'navHomeT') {
              const homeUrl = role === 'teacher' ? 'homepage2.html' : 'homepage1.html';
              location.href = homeUrl;
            } else if (id === 'navSettings' || id === 'navSettingsT') {
              location.href = 'settings.html';
            } else if (id === 'aboutBtn') {
              showAbout();
            } else if (id === 'joinBtn') {
              toggleJoinModal(true);
            }
          });
        }
      });
    }, 500);
  }
  
  function setupGlobalModalHandlers() {
    // ESC key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close any open modals
        const openModals = document.querySelectorAll('.modal.show, .modal[style*="display: flex"], .modal[style*="display:flex"]');
        openModals.forEach(modal => {
          if (modal.id === 'joinModal') toggleJoinModal(false);
          else if (modal.id === 'aboutModal') closeAbout();
          else {
            modal.classList.remove('show');
            modal.style.display = 'none';
          }
        });
        document.body.classList.remove('modal-open');
      }
    });
    
    // Click outside to close modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        const modalId = e.target.id;
        if (modalId === 'joinModal') toggleJoinModal(false);
        else if (modalId === 'aboutModal') closeAbout();
        else {
          e.target.classList.remove('show');
          setTimeout(() => e.target.style.display = 'none', 250);
          document.body.classList.remove('modal-open');
        }
      }
    });
  }

  // Global account dropdown updater for all pages
  window.updateAccountDropdown = async function() {
    try {
      const response = await fetch(`${window.API_BASE}/api/me`);
      const userData = await response.json();
      
      if (response.ok) {
        const firstName = userData.firstName || localStorage.getItem('firstName') || '';
        const lastName = userData.lastName || localStorage.getItem('lastName') || '';
        const email = userData.email || localStorage.getItem('email') || '';
        const fullName = userData.fullName || `${firstName} ${lastName}`.trim() || 'User';
        
        // Update localStorage
        localStorage.setItem('firstName', firstName);
        localStorage.setItem('lastName', lastName);
        localStorage.setItem('email', email);
        localStorage.setItem('fullName', fullName);
        
        // Update UI elements on ALL pages
        const initialEl = document.getElementById('accountInitial');
        const nameEl = document.getElementById('userFullName');
        const emailEl = document.getElementById('userEmail');
        
        if (initialEl) initialEl.textContent = (fullName.charAt(0) || 'U').toUpperCase();
        if (nameEl) nameEl.textContent = fullName;
        if (emailEl) emailEl.textContent = email;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to localStorage
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      const email = localStorage.getItem('email') || '';
      const fullName = localStorage.getItem('fullName') || `${firstName} ${lastName}`.trim() || 'User';
      
      const initialEl = document.getElementById('accountInitial');
      const nameEl = document.getElementById('userFullName');
      const emailEl = document.getElementById('userEmail');
      
      if (initialEl) initialEl.textContent = (fullName.charAt(0) || 'U').toUpperCase();
      if (nameEl) nameEl.textContent = fullName;
      if (emailEl) emailEl.textContent = email;
    }
  };
  
  // Auto-call on every page load
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(window.updateAccountDropdown, 100);
  });

  // Loading utilities for consistent UX
  window.LoadingUtils = {
    show: function(loadingElementId, contentElementId) {
      const loading = document.getElementById(loadingElementId);
      const content = document.getElementById(contentElementId);
      if (loading) loading.style.display = 'block';
      if (content) content.style.display = 'none';
    },
    
    hide: function(loadingElementId, contentElementId) {
      const loading = document.getElementById(loadingElementId);
      const content = document.getElementById(contentElementId);
      if (loading) loading.style.display = 'none';
      if (content) content.style.display = 'block';
    },
    
    showWithDelay: async function(loadingElementId, contentElementId, minDelay = 300) {
      this.show(loadingElementId, contentElementId);
      await new Promise(resolve => setTimeout(resolve, minDelay));
    }
  };

  // ---------- Subject page ----------
  async function initSubject() {
    let role = getRole();
    if (!role) { 
      try { 
        const r = await fetch(`${window.API_BASE}/api/me`); 
        if (r.ok) { 
          const me = await r.json(); 
          role = me.role; 
          localStorage.setItem('role', role); 
        } 
      } catch{}
    }
    if (!role) { location.href = 'login.html'; return; }
    if (role !== 'teacher') { location.href = 'homepage1.html'; return; }
    
    document.body.dataset.role = role;
    setupSubjectPage();
    loadEnrolledStudents();
    setupChatbotToggle();
    connectEvents();
  }

  function setupSubjectPage() {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get('id');
    const subjectName = params.get('name') || 'Subject';
    
    // Update page title and header
    document.title = `${subjectName} - GradeTracker`;
    const titleEl = document.getElementById('subjectTitle');
    if (titleEl) titleEl.textContent = subjectName;
    
    // Setup back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
      backBtn.onclick = () => {
        window.location.href = 'homepage2.html';
      };
    }
    
    // Setup manage grades buttons
    setupManageGradesButtons(subjectId);
  }

  function setupManageGradesButtons(subjectId) {
    const manageGradeBtns = document.querySelectorAll('.btn-primary');
    manageGradeBtns.forEach(btn => {
      if (btn.textContent.includes('Manage Grades')) {
        btn.onclick = () => {
          const params = new URLSearchParams(window.location.search);
          const subjectName = params.get('name') || 'Subject';
          window.location.href = `teacher-grades.html?subjectId=${subjectId}&subjectName=${encodeURIComponent(subjectName)}`;
        };
      }
    });
  }

  async function loadEnrolledStudents() {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get('id');
    
    if (!subjectId) {
      showEmptyStudents();
      return;
    }
    
    const studentsGrid = document.getElementById('studentsGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    
    // Show loading
    if (loadingState) loadingState.style.display = 'block';
    if (studentsGrid) studentsGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    try {
      const response = await fetch(`${window.API_BASE}/api/subjects/${subjectId}/students`);
      if (!response.ok) throw new Error('Failed to load students');
      
      const students = await response.json();
      
      // Hide loading
      if (loadingState) loadingState.style.display = 'none';
      
      if (Array.isArray(students) && students.length > 0) {
        renderStudents(students, subjectId);
        if (studentsGrid) studentsGrid.style.display = 'grid';
      } else {
        showEmptyStudents();
      }
      
    } catch (error) {
      console.error('Error loading students:', error);
      if (loadingState) loadingState.style.display = 'none';
      showEmptyStudents();
    }
  }

  function renderStudents(students, subjectId) {
    const studentsGrid = document.getElementById('studentsGrid');
    if (!studentsGrid) return;
    
    studentsGrid.innerHTML = students.map(student => `
      <div class="student-card">
        <div class="student-header">
          <i class="ri-user-3-line student-icon"></i>
          <div class="student-name">${student.firstName} ${student.lastName}</div>
        </div>
        <div class="student-meta">
          Student ID: ${student.id} • Email: ${student.email}
        </div>
        <div class="student-actions">
          <button class="action-btn" onclick="viewStudentGrades('${student.id}', '${student.firstName} ${student.lastName}', '${subjectId}')" title="View Grades">
            <i class="ri-eye-line"></i>
          </button>
          <button class="action-btn" onclick="manageStudentGrades('${student.id}', '${student.firstName} ${student.lastName}', '${subjectId}')" title="Manage Grades">
            <i class="ri-edit-line"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  function showEmptyStudents() {
    const studentsGrid = document.getElementById('studentsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (studentsGrid) studentsGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
  }

  // Global functions for student actions
  window.viewStudentGrades = function(studentId, studentName, subjectId) {
    const params = new URLSearchParams();
    params.set('studentId', studentId);
    params.set('studentName', studentName);
    params.set('subjectId', subjectId);
    window.location.href = `student-grades.html?${params.toString()}`;
  };

  window.manageStudentGrades = function(studentId, studentName, subjectId) {
    const params = new URLSearchParams();
    // teacher-grades.html expects: id (subject), name (subject title), and student_id
    const subjectName = new URLSearchParams(window.location.search).get('name') || 'Subject';
    params.set('id', subjectId);
    params.set('name', subjectName);
    params.set('student_id', studentId);
    params.set('studentName', studentName);
    window.location.href = `teacher-grades.html?${params.toString()}`;
  };

  window.goBack = function() {
    window.location.href = 'homepage2.html';
  };

  // ---------- Teacher Grades page ----------
  async function initTeacherGrades() {
    let role = getRole();
    if (!role) { 
      try { 
        const r = await fetch(`${window.API_BASE}/api/me`); 
        if (r.ok) { 
          const me = await r.json(); 
          role = me.role; 
          localStorage.setItem('role', role); 
        } 
      } catch{}
    }
    if (!role) { location.href = 'login.html'; return; }
    if (role !== 'teacher') { location.href = 'homepage1.html'; return; }
    
    document.body.dataset.role = role;
    setupTeacherGradesPage();
    loadStudentsForGrading();
    setupChatbotToggle();
    connectEvents();
  }

  function setupTeacherGradesPage() {
    const params = new URLSearchParams(window.location.search);
    const subjectName = params.get('subjectName') || 'Subject';
    const studentName = params.get('studentName');
    
    // Update page title and header
    document.title = `${subjectName} Grades - GradeTracker`;
    const titleEl = document.getElementById('subjectTitle');
    if (titleEl) {
      if (studentName) {
        titleEl.textContent = `${subjectName} - ${studentName}`;
      } else {
        titleEl.textContent = `${subjectName} Grades`;
      }
    }
    
    // Setup back button
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
      backBtn.onclick = () => {
        window.location.href = 'homepage2.html';
      };
    }
  }

  async function loadStudentsForGrading() {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get('subjectId');
    const studentId = params.get('studentId');
    
    if (!subjectId) return;
    
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect) return;
    
    try {
      const response = await fetch(`${window.API_BASE}/api/subjects/${subjectId}/students`);
      if (!response.ok) throw new Error('Failed to load students');
      
      const students = await response.json();
      
      studentSelect.innerHTML = '<option value="">Select a student...</option>';
      
      if (Array.isArray(students)) {
        students.forEach(student => {
          const option = document.createElement('option');
          option.value = student.id;
          option.textContent = `${student.firstName} ${student.lastName}`;
          if (studentId && student.id.toString() === studentId) {
            option.selected = true;
          }
          studentSelect.appendChild(option);
        });
        
        // If a specific student was selected, load their grades
        if (studentId) {
          loadStudentGrades();
        }
      }
      
    } catch (error) {
      console.error('Error loading students:', error);
      studentSelect.innerHTML = '<option value="">Error loading students</option>';
    }
  }

  window.loadStudentGrades = async function() {
    const studentSelect = document.getElementById('studentSelect');
    const selectedStudentId = studentSelect?.value;
    
    if (!selectedStudentId) {
      clearGradesDisplay();
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get('subjectId');
    
    try {
      const response = await fetch(`${window.API_BASE}/api/students/${selectedStudentId}/grades?subjectId=${subjectId}`);
      if (!response.ok) throw new Error('Failed to load grades');
      
      const grades = await response.json();
      displayStudentGrades(grades, selectedStudentId, subjectId);
      
    } catch (error) {
      console.error('Error loading student grades:', error);
      clearGradesDisplay();
    }
  };

  function displayStudentGrades(grades, studentId, subjectId) {
    // This would display the grades in the appropriate sections
    // For now, show a simple message
    const gradesContainer = document.querySelector('.grades-container') || document.querySelector('.main');
    if (gradesContainer) {
      const existingGradesSection = gradesContainer.querySelector('.grades-display');
      if (existingGradesSection) {
        existingGradesSection.remove();
      }
      
      const gradesSection = document.createElement('div');
      gradesSection.className = 'grades-display';
      gradesSection.innerHTML = `
        <div class="control-card">
          <h3>Student Grades</h3>
          <p>Grades for student ID: ${studentId}</p>
          <p>Subject ID: ${subjectId}</p>
          <p>Total grades: ${Array.isArray(grades) ? grades.length : 0}</p>
        </div>
      `;
      
      gradesContainer.appendChild(gradesSection);
    }
  }

  function clearGradesDisplay() {
    const gradesContainer = document.querySelector('.grades-container') || document.querySelector('.main');
    if (gradesContainer) {
      const existingGradesSection = gradesContainer.querySelector('.grades-display');
      if (existingGradesSection) {
        existingGradesSection.remove();
      }
    }
  }

  // Expose minimal globals only if needed elsewhere
  window.App = { logout };
})();
