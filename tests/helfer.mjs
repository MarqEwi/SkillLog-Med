// Gemeinsame Helfer für die Playwright-Tests.

/* Öffnet die App mit übersprungener Kurzeinführung, damit die Tests direkt
   auf dem Dashboard landen. */
export async function appOeffnen(page, opts = {}){
  await page.addInitScript(() => {
    localStorage.setItem("slm_onboarding_done", "true");
  });
  if (opts.vorher) await page.addInitScript(opts.vorher);
  await page.goto("/index.html");
  await page.waitForFunction(() => !!window.SLM);
}

/* Legt über die Oberfläche einen Eintrag an – der schnelle Alltagsweg:
   Maßnahme antippen, ggf. Stufe/Setting/Datum setzen, speichern. */
export async function eintragAnlegen(page, opts = {}){
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="' + (opts.massnahme || "iv-zugang") + '"]');
  if (opts.stufe) await page.click('#f-stufe [data-v="' + opts.stufe + '"]');
  if (opts.setting) await page.click('#f-setting [data-v="' + opts.setting + '"]');
  if (opts.datum) await page.fill("#f-datum", opts.datum);
  if (opts.zeit) await page.fill("#f-zeit", opts.zeit);
  if (opts.ort != null) await page.selectOption("#f-ort", opts.ort);
  if (opts.notiz) await page.fill("#f-notiz", opts.notiz);
  if (opts.tag){
    await page.fill("#f-tag-neu", opts.tag);
    await page.click("#f-tag-add");
  }
  await page.click("#f-speichern");
  await page.waitForSelector("#view-detail.active");
}

/* Schiebeschalter umlegen: Das Kontrollkästchen selbst ist visuell versteckt
   (opacity:0), geklickt wird – wie von Hand – die Schiene daneben. */
export async function schalter(page, id){
  await page.click('.switch:has(#' + id + ') .track');
}

/* ISO-Datum n Tage relativ zu heute (lokale Zeit, wie die App rechnet). */
export function inTagen(n){
  const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
    + "-" + String(d.getDate()).padStart(2, "0");
}

/* Stellt die Android-App-Umgebung nach: window.Capacitor mit den Plugins,
   die die App tatsächlich benutzt. Alle Aufrufe landen in window.__calls,
   damit die Tests prüfen können, dass der native Zweig wirklich läuft.
   Der Ersatz verhält sich bewusst wie das echte Plugin – ein Testersatz,
   der freundlicher ist als die Wirklichkeit, ist schlimmer als keiner. */
export function capacitorMock(){
  window.__calls = [];
  const merke = (name, arg) => window.__calls.push({ name, arg });
  window.Capacitor = {
    isNativePlatform: () => true,
    Plugins: {
      App: {
        addListener: (ev, cb) => { (window.__listener ||= {})[ev] = cb; return { remove(){} }; },
        exitApp: () => merke("App.exitApp")
      },
      Filesystem: {
        writeFile: async o => {
          merke("Filesystem.writeFile", { path: o.path, directory: o.directory, data: o.data });
          return {};
        },
        getUri: async o => {
          merke("Filesystem.getUri", { path: o.path, directory: o.directory });
          return { uri: "file:///cache/" + o.path };
        }
      },
      Share: {
        share: async o => { merke("Share.share", { title: o.title, files: o.files }); return {}; }
      }
    }
  };
}
