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
  API_BASE_URL: "https://cnr-it-ticket-api.broken-rain-fec4.workers.dev",
  DEMO_MODE: false
};
