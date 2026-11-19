(() => {
  const form = document.getElementById("ticketForm");
  const status = document.getElementById("status");
  const button = document.getElementById("submitBtn");
  const description = document.getElementById("description");
  const counter = document.getElementById("counter");
  const config = window.TICKET_CONFIG || {};

  description.addEventListener("input", () => {
    counter.textContent = `${description.value.length} / 5000`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    status.className = "status";
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.category) return showError("Bitte wähle eine Gerätegruppe aus.");
    button.disabled = true;
    button.querySelector("span").textContent = config.DEMO_MODE ? "Demo-Ticket wird erstellt …" : "Meldung wird gesendet …";

    try {
      let result;
      if (config.DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 650));
        const tickets = JSON.parse(localStorage.getItem("cnr-demo-tickets") || "[]");
        const nextId = Number(localStorage.getItem("cnr-demo-next-id") || "1");
        const ticketNumber = `DEMO-${new Date().getFullYear()}-${String(nextId).padStart(4, "0")}`;
        const ticket = {
          ticketNumber, category: data.category, room: data.room,
          reporter: data.reporter, email: data.email, description: data.description,
          createdAt: new Date().toLocaleString("de-DE"), status: "Neu"
        };
        tickets.unshift(ticket);
        localStorage.setItem("cnr-demo-tickets", JSON.stringify(tickets));
        localStorage.setItem("cnr-demo-next-id", String(nextId + 1));
        result = {ticketNumber, demo: true};
      } else {
        const api = config.API_BASE_URL;
        if (!api || api.includes("DEIN-WORKER")) throw new Error("Die Schnittstelle ist noch nicht eingerichtet. Bitte informiere die IT-Administration.");
        const response = await fetch(`${api.replace(/\/$/, "")}/api/tickets`, {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            category: data.category, room: data.room, reporter: data.reporter,
            email: data.email, description: data.description, website: data.website || ""
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Die Meldung konnte nicht übermittelt werden.");
        result = payload;
      }
      showSuccess(result.ticketNumber, data, !!result.demo, result.emailStatus);
    } catch (error) {
      showError(error.message || "Verbindungsfehler. Bitte versuche es später erneut.");
      button.disabled = false;
      button.querySelector("span").textContent = "Störungsmeldung absenden";
    }
  });

  function showError(message) {
    status.textContent = message;
    status.className = "status error";
    button.disabled = false;
    button.querySelector("span").textContent = "Störungsmeldung absenden";
  }
  function showSuccess(ticketNumber, data, demo, emailStatus) {
    const card = document.querySelector(".form-card");
    card.innerHTML = `
      <div class="success-panel">
        <div class="success-icon">✓</div>
        <span class="step-label">${demo ? "DEMO-MODUS" : "MELDUNG ERFOLGREICH"}</span>
        <h2>${demo ? "Dein Testticket wurde erstellt." : "Vielen Dank! Deine Meldung wurde aufgenommen."}</h2>
        <p>${demo ? "Dieses Ticket wurde nur in diesem Browser gespeichert. Es wurden keine E-Mails versendet." : "Deine Störungsmeldung wurde an das IT-Team übermittelt."}</p>
        <p>Deine Ticketnummer:</p>
        <div class="ticket-number">${escapeHtml(ticketNumber)}</div>
        <p><strong>${escapeHtml(data.category)}</strong> · Raum ${escapeHtml(data.room)}</p>
        <p>Eine Dokumentation ${demo ? "würde" : "wird"} an <strong>${escapeHtml(data.email)}</strong> gesendet.</p>
        ${demo ? '<p>Du kannst weitere Testmeldungen erstellen. Die Demo-Tickets bleiben im lokalen Browser gespeichert.</p>' : (emailStatus && emailStatus.reporter && emailStatus.admin ? '<p>Bitte bewahre die Bestätigungsmail auf.</p>' : `<p><strong>Hinweis:</strong> Dein Ticket wurde gespeichert. ${emailStatus && !emailStatus.reporter ? 'Die Bestätigungs-E-Mail konnte nicht versendet werden.' : ''} ${emailStatus && !emailStatus.admin ? 'Die IT-Administration konnte nicht automatisch benachrichtigt werden.' : ''} Bitte notiere dir die Ticketnummer.</p>`)}
        <button type="button" id="newTicket">Weitere Störung melden</button>
        ${demo ? '<button type="button" class="secondary" id="showDemoTickets">Gespeicherte Demo-Tickets anzeigen</button>' : ''}
      </div>`;
    document.getElementById("newTicket").addEventListener("click", () => location.reload());
    const show = document.getElementById("showDemoTickets");
    if (show) show.addEventListener("click", showTickets);
  }
  function showTickets() {
    const tickets = JSON.parse(localStorage.getItem("cnr-demo-tickets") || "[]");
    const card = document.querySelector(".form-card");
    const rows = tickets.map(t => `<article class="demo-ticket">
      <strong>${escapeHtml(t.ticketNumber)} · ${escapeHtml(t.category)}</strong>
      <span>${escapeHtml(t.room)} · ${escapeHtml(t.reporter)} · ${escapeHtml(t.createdAt)}</span>
      <p>${escapeHtml(t.description)}</p>
    </article>`).join("");
    card.innerHTML = `<div class="success-panel"><span class="step-label">LOKALE DEMO-ÜBERSICHT</span><h2>Testtickets (${tickets.length})</h2>${rows || "<p>Noch keine Testtickets gespeichert.</p>"}<button id="back">Zurück zur Meldung</button><button id="clear" class="secondary">Demo-Tickets löschen</button></div>`;
    document.getElementById("back").onclick = () => location.reload();
    document.getElementById("clear").onclick = () => {
      localStorage.removeItem("cnr-demo-tickets");
      localStorage.removeItem("cnr-demo-next-id");
      location.reload();
    };
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
})();
