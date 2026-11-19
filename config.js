/*
 * PRODUKTIVBETRIEB:
 * API_BASE_URL auf die URL eures Cloudflare Workers setzen.
 * DEMO_MODE auf false stellen.
 *
 * LOKALE VORSCHAU:
 * DEMO_MODE true lassen. Testtickets werden nur lokal im Browser
 * gespeichert und es werden KEINE echten E-Mails versendet.
 */
window.TICKET_CONFIG = {
  API_BASE_URL: "https://DEIN-WORKER.DEIN-ACCOUNT.workers.dev", // nach Cloudflare-Deployment ersetzen
  DEMO_MODE: true
};
