(async function(){
  const SHEET_ID = "1vS73gWSiVe5WRCo6RtCVYumtjjnOxGSX3PT4fGgRY0SZYtlUh--ZjxkNR38KKlKIboitEIz9Sj5ij8p";
  const CSV_PUB_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-${SHEET_ID}/pub?output=csv`;

  const status = document.getElementById('status');
  const grid = document.getElementById('grid');
  const cat = document.getElementById('cat');
  const search = document.getElementById('search');
  const refresh = document.getElementById('refresh');
  const qrLink = document.getElementById('qrLink');
  const tableInfo = document.getElementById('tableInfo');
  const stats = document.getElementById('stats');
  const totalItems = document.getElementById('totalItems');
  const totalCategories = document.getElementById('totalCategories');
  const showingItems = document.getElementById('showingItems');

  const t = new URLSearchParams(location.search).get('table');
  if(t) {
    tableInfo.textContent = 'Table ' + t;
  } else {
    tableInfo.textContent = 'Walk-in';
  }

  function parseCSV(text){
    const rows=[]; let cur=[], field='', inQ=false;
    for(let i=0;i<text.length;i++){
      const ch = text[i];
      if(inQ){
        if(ch === '"'){
          if(text[i+1]==='"'){ field+='"'; i++; } else inQ=false;
        } else field+=ch;
      } else {
        if(ch === '"'){ inQ=true; }
        else if(ch === ','){ cur.push(field); field=''; }
        else if(ch === '\r'){ continue; }
        else if(ch === '\n'){ cur.push(field); rows.push(cur); cur=[]; field=''; }
        else field+=ch;
      }
    }
    if(field!=='' || cur.length) { cur.push(field); rows.push(cur); }
    return rows;
  }

  function escape(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function load(){
    try{
      const r = await fetch(CSV_PUB_URL, {cache:'no-store'});
      if(!r.ok) throw new Error('Sheet fetch failed: ' + r.status);
      const txt = await r.text();
      const rows = parseCSV(txt);
      if(!rows || rows.length < 2) throw new Error('No data found in sheet');
      const header = rows[0].map(h=>h.trim().toLowerCase());
      const items = rows.slice(1).map(rw=>{
        const o={};
        for(let i=0;i<header.length;i++) o[header[i]] = rw[i] ? rw[i].trim() : '';
        return o;
      }).filter(it => it.name); // Filter out empty rows
      render(items);
    } catch(err){
      status.innerHTML = `<div class="error">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Unable to load menu</div>
        <div>${escape(err.message || err)}</div>
      </div>`;
      console.error(err);
    }
  }

  function render(items){
    const cats = new Set();
    items.forEach(it=>{ if(it.category) cats.add(it.category); });
    
    totalItems.textContent = items.length;
    totalCategories.textContent = cats.size;
    
    cat.innerHTML = '<option value="">All Categories</option>' + 
      [...cats].sort().map(c=>`<option value="${escape(c)}">${escape(c)}</option>`).join('');

    function show(){
      const q = (search.value||'').toLowerCase();
      const c = cat.value;
      const filtered = items.filter(it=>{
        const matchesCat = !c || (it.category||'').toLowerCase() === c.toLowerCase();
        const hay = ((it.name||'')+' '+(it.description||'')+' '+(it.category||'')).toLowerCase();
        const matchesQ = !q || hay.includes(q);
        return matchesCat && matchesQ;
      });
      
      showingItems.textContent = filtered.length;
      
      if(filtered.length === 0) { 
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">No items match your search</div>
        </div>`; 
        return; 
      }
      
      grid.innerHTML = filtered.map(it=>{
        const img = it.image_url || it.image || '';
        const src = img ? escape(img) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
        return `<div class="card">
          <div class="card-image-wrapper">
            <img class="thumb" src="${src}" alt="${escape(it.name)}" loading="lazy" 
                 onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'"/>
          </div>
          <div class="card-content">
            <div class="row">
              <div class="name">${escape(it.name)}</div>
              <div class="price">${escape(it.price)}</div>
            </div>
            <div class="desc">${escape(it.description || 'Delicious dish from our kitchen')}</div>
            <div class="card-footer">
              <div class="category-tag">${escape(it.category || 'Special')}</div>
              
            </div>
          </div>
        </div>`;
      }).join('');
    }

    status.style.display='none';
    stats.style.display='flex';
    grid.style.display='grid';
    show();

    search.addEventListener('input', show);
    cat.addEventListener('change', show);
    refresh.addEventListener('click', ()=>{ 
      status.style.display='block';
      stats.style.display='none';
      grid.style.display='none';
      load(); 
    });

    // QR code ke liye proper URL - yahan apni actual website URL daalo
    let baseUrl = location.href.split('?')[0];
    
    qrLink.href = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(baseUrl + '?table=1');
    qrLink.onclick = (e) => {
      e.preventDefault();
      // QR modal dikhao
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(10px);';
      modal.innerHTML = `
        <div style="background:white;padding:30px;border-radius:20px;text-align:center;max-width:90%;animation:fadeIn 0.3s;">
          <h2 style="color:#0a0e27;margin-bottom:20px;font-size:24px;">Scan QR Code</h2>
          <img src="${qrLink.href}" style="width:300px;height:300px;border-radius:12px;margin-bottom:20px;" />
          <div style="color:#64748b;margin-bottom:20px;font-size:14px;">Table 1 Menu</div>
          <button onclick="this.closest('div').parentElement.remove()" 
                  style="background:#ff6b35;color:white;border:none;padding:12px 32px;border-radius:10px;font-weight:700;cursor:pointer;font-size:16px;">
            Close
          </button>
        </div>
      `;
      modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    };
  } 

  await load();
})();