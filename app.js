(async function(){
  const CSV_URL = "Menus - Menu (6).csv";

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
      const r = await fetch(CSV_URL, {cache:'no-store'});
      if(!r.ok) throw new Error('CSV file not found. Make sure "Menus - Menu (6).csv" is in the same folder as index.html');
      const txt = await r.text();
      const rows = parseCSV(txt);
      if(!rows || rows.length < 2) throw new Error('No data found in sheet');
      const header = rows[0].map(h=>h.trim().toLowerCase());
      const items = rows.slice(1).map(rw=>{
        const o={};
        for(let i=0;i<header.length;i++) o[header[i]] = rw[i] ? rw[i].trim() : '';
        // Map CSV columns to standard format
        o.name = o.item_name || o.name || '';
        o.image = o.image_url || o.image || '';
        // Convert ImgBB links to direct image URLs
        if(o.image && o.image.includes('ibb.co')){
          // Convert https://ibb.co/XZ0rydHN to https://i.ibb.co/XZ0rydHN/image.jpg
          const match = o.image.match(/ibb\.co\/([a-zA-Z0-9]+)$/);
          if(match) {
            o.image = `https://i.ibb.co/${match[1]}/image.jpg`;
          }
        }
        // Convert Google Drive links to direct download URLs
        else if(o.image && o.image.includes('drive.google.com')){
          const match = o.image.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if(match) {
            o.image = `https://drive.google.com/uc?export=view&id=${match[1]}`;
          }
        }
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
        const img = it.image || '';
        const src = img ? img : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
        return `<div class="card" onclick="showItemDetails(${escape(JSON.stringify(it))})">
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
    
    // Agar local/Claude artifact hai to placeholder URL
    if (baseUrl.includes('claude.ai') || baseUrl.includes('localhost')) {
      baseUrl = 'https://yourwebsite.com/menu'; // YAHAN APNI WEBSITE URL DAALO
    }
    
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
  
  // Global functions for item details modal
  window.showItemDetails = function(itemData) {
    const item = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
    const src = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
    
    // Parse ingredients (comma-separated in sheet)
    const ingredients = (item.ingredients || item.materials || '').split(',').map(i => i.trim()).filter(Boolean);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <img src="${src}" alt="${escape(item.name)}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'" />
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <h2 class="modal-title">${escape(item.name)}</h2>
          <div class="modal-price">${escape(item.price)}</div>
          
          <div class="modal-section">
            <div class="modal-section-title">📝 Description</div>
            <div class="modal-section-content">${escape(item.description || 'A delicious dish prepared with care and quality ingredients.')}</div>
          </div>
          
          ${ingredients.length > 0 ? `
          <div class="modal-section">
            <div class="modal-section-title">🥘 Ingredients & Materials</div>
            <div class="ingredient-list">
              ${ingredients.map(ing => `<span class="ingredient-tag">${escape(ing)}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="modal-section">
            <div class="modal-section-title">ℹ️ Item Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value">${escape(item.category || 'Special')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Prep Time</div>
                <div class="info-value">${escape(item.prep_time || item.time || '15-20 min')}</div>
              </div>
              
              
            </div>
          </div>
          
          ${item.allergens || item.dietary_info ? `
          <div class="modal-section">
            <div class="modal-section-title">⚠️ Dietary Information</div>
            <div class="modal-section-content">${escape(item.allergens || item.dietary_info)}</div>
          </div>
          ` : ''}
          
          ${item.calories || item.nutrition ? `
          <div class="modal-section">
            <div class="modal-section-title">🔥 Nutritional Info</div>
            <div class="modal-section-content">${escape(item.calories || item.nutrition)} calories per serving</div>
          </div>
          ` : ''}
          
          <div class="modal-actions">
            <button class="modal-btn modal-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            
          </div>
        </div>
      </div>
    `;
    
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
  };
  
  window.addToOrder = function(itemName) {
    alert(`✅ ${itemName} added to your order!`);
    // Yahan actual order functionality add kar sakte ho
  };
})();