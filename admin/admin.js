(() => {
  const cfg = window.TICKET_CONFIG || {};
  const api = (cfg.API_BASE_URL || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  let token = ""; // Absichtlich nur im Arbeitsspeicher: nach Neuladen ist eine neue Anmeldung nötig.
  let tickets = [];
  const statusClass = s => s === "Neu" ? "p-neu" : s === "In Bearbeitung" ? "p-work" : s === "Erledigt" ? "p-done" : "p-wait";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const setMessage = (el, msg, bad=true) => {el.textContent=msg;el.style.color=bad?"#b52f32":"#187447";};
  function authHeaders(extra={}) { return {...extra, Authorization:`Bearer ${token}`}; }
  async function request(path, options={}) {
    if(!api || api.includes("DEIN-WORKER")) throw new Error("Die API-Adresse ist in frontend/config.js noch nicht eingetragen.");
    const r=await fetch(api+path,{...options,headers:authHeaders(options.headers||{})});
    const data=await r.json().catch(()=>({}));
    if(r.status===401){logout();throw new Error(data.error||"Sitzung abgelaufen. Bitte erneut anmelden.");}
    if(!r.ok)throw new Error(data.error||"Anfrage fehlgeschlagen.");
    return data;
  }
  function showDashboard(){ $("loginView").classList.add("hidden");$("dashboardView").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");loadTickets(); }
  function showLogin(){ $("dashboardView").classList.add("hidden");$("loginView").classList.remove("hidden");$("logoutBtn").classList.add("hidden"); }
  function logout(){token="";showLogin();}
  $("logoutBtn").addEventListener("click",logout);

  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const btn=$("loginBtn");btn.disabled=true;setMessage($("loginMessage"),"Anmeldung wird geprüft …",false);
    try{
      const r=await fetch(api+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("username").value,password:$("password").value})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Anmeldung fehlgeschlagen.");
      token=d.token;$("password").value="";showDashboard();
    }catch(err){setMessage($("loginMessage"),err.message);}
    finally{btn.disabled=false;}
  });

  async function loadTickets(){
    $("listMessage").textContent="Tickets werden geladen …";
    try{const d=await request("/api/admin/tickets");tickets=d.tickets||[];render();$("listMessage").textContent="";}
    catch(e){setMessage($("listMessage"),e.message);}
  }
  function render(){
    const newN=tickets.filter(t=>t.status==="Neu").length;
    const workN=tickets.filter(t=>t.status==="In Bearbeitung").length;
    const doneN=tickets.filter(t=>t.status==="Erledigt").length;
    $("totalCount").textContent=tickets.length;$("newCount").textContent=newN;$("progressCount").textContent=workN;$("doneCount").textContent=doneN;
    const q=$("searchInput").value.toLowerCase(),s=$("statusFilter").value,c=$("categoryFilter").value;
    const filtered=tickets.filter(t=>(!s||t.status===s)&&(!c||t.category===c)&&[t.ticket_number,t.room,t.reporter,t.email,t.category].some(v=>String(v||"").toLowerCase().includes(q)));
    $("ticketRows").innerHTML=filtered.length?filtered.map(t=>`<tr data-id="${t.id}"><td class="ticket-id">${esc(t.ticket_number)}</td><td>${esc(t.category)}</td><td>${esc(t.room)}</td><td>${esc(t.reporter)}</td><td>${esc(new Date(t.created_at).toLocaleString("de-DE"))}</td><td><span class="pill ${statusClass(t.status)}">${esc(t.status)}</span></td></tr>`).join(""):`<tr><td colspan="6" class="empty">Keine passenden Tickets gefunden.</td></tr>`;
    [...$("ticketRows").querySelectorAll("tr[data-id]")].forEach(tr=>tr.addEventListener("click",()=>openTicket(tr.dataset.id)));
  }
  ["searchInput","statusFilter","categoryFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",render));
  $("refreshBtn").addEventListener("click",loadTickets);

  async function openTicket(id){
    try{
      const d=await request(`/api/admin/tickets/${id}`),t=d.ticket,notes=d.notes||[];
      $("detailTitle").textContent=t.ticket_number;
      $("detailContent").innerHTML=`
        <div class="detail-grid">
          ${detail("Gerätegruppe",t.category)}${detail("Raum",t.room)}
          ${detail("Meldende Person",t.reporter)}${detail("E-Mail",`<a href="mailto:${esc(t.email)}">${esc(t.email)}</a>`,true)}
          ${detail("Eingegangen",new Date(t.created_at).toLocaleString("de-DE"))}${detail("Aktueller Status",`<span class="pill ${statusClass(t.status)}">${esc(t.status)}</span>`,true)}
        </div>
        <div class="block-title">Fehlerbeschreibung</div><div class="detail-item description">${esc(t.description)}</div>
        <div class="block-title">Status ändern</div>
        <div class="actions"><select id="newStatus"><option ${t.status==="Neu"?"selected":""}>Neu</option><option ${t.status==="In Bearbeitung"?"selected":""}>In Bearbeitung</option><option ${t.status==="Wartet auf Rückmeldung"?"selected":""}>Wartet auf Rückmeldung</option><option ${t.status==="Erledigt"?"selected":""}>Erledigt</option></select><button id="saveStatus">Status speichern</button></div>
        <div class="block-title">Interne Bearbeitungsnotiz</div>
        <form id="noteForm" class="note-form"><textarea id="noteText" maxlength="3000" placeholder="Was wurde geprüft oder erledigt?"></textarea><button class="primary" type="submit">Notiz hinzufügen</button></form>
        <div class="block-title">Bearbeitungshistorie</div>
        <div id="notes">${notes.length?notes.map(n=>`<div class="note"><small>${esc(new Date(n.created_at).toLocaleString("de-DE"))} · CNR IT-Administration</small>${esc(n.note)}</div>`).join(""):"<p class='muted'>Noch keine Notizen vorhanden.</p>"}</div>
        <p id="detailMessage" class="message"></p>`;
      $("detailModal").classList.remove("hidden");
      $("saveStatus").addEventListener("click",async()=>{try{await request(`/api/admin/tickets/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:$("newStatus").value})});await loadTickets();await openTicket(id);}catch(e){setMessage($("detailMessage"),e.message);}});
      $("noteForm").addEventListener("submit",async e=>{e.preventDefault();const note=$("noteText").value.trim();if(!note)return;try{await request(`/api/admin/tickets/${id}/notes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({note})});await openTicket(id);}catch(err){setMessage($("detailMessage"),err.message);}});
    }catch(e){setMessage($("listMessage"),e.message);}
  }
  function detail(label,value,html=false){return `<div class="detail-item"><small>${esc(label)}</small><strong>${html?value:esc(value)}</strong></div>`;}
  $("closeDetail").addEventListener("click",()=>$("detailModal").classList.add("hidden"));
  $("detailModal").addEventListener("click",e=>{if(e.target===$("detailModal"))$("detailModal").classList.add("hidden");});
  if(token)showDashboard();else showLogin();
})();