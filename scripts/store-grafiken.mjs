// Erzeugt die Grafiken für den Play-Store-Eintrag unter docs/store-grafiken/.
//
//   node scripts/screenshots.mjs && node scripts/store-grafiken.mjs
//
// Grundlage sind die App-Aufnahmen aus docs/screenshots/. Die Überschriften
// sind bewusst eigenständig formuliert: Bei mehreren Apps im selben Konto ist
// "wiederholter Inhalt" das größte Ablehnungsrisiko beim Play-Review.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ZIEL = "docs/store-grafiken";
mkdirSync(ZIEL, { recursive: true });
const bild = p => "data:image/png;base64," + readFileSync(p).toString("base64");
const LOGO = readFileSync("icons/logo.svg", "utf8");

const SCHRIFT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const VERLAUF = "linear-gradient(150deg,#155e9e 0%,#2b87cd 100%)";

const AUFNAHMEN = [
  { datei: "01-dashboard",        text: "Dein Ausbildungsfortschritt,<br>auf einen Blick" },
  { datei: "04-formular",         text: "Ein Skill-Eintrag<br>in 20 Sekunden" },
  { datei: "03-logbuch",          text: "Jede Maßnahme im Logbuch –<br>mit Stufe, Setting und Ort" },
  { datei: "06-statistik",        text: "Beobachtet, assistiert,<br>durchgeführt: Zahlen, die zählen" },
  { datei: "07-export",           text: "PDF-Bericht mit Unterschriftsfeld<br>für Praktikum und PJ" },
  { datei: "08-filter-dunkel",    text: "Nach Zeitraum, Ort und<br>Tags filtern" },
  { datei: "02-dashboard-dunkel", text: "Ohne Konto, ohne Cloud –<br>deine Daten bleiben bei dir" }
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();

/* ---- Store-Screenshots 1080 × 1920 ---- */
for (let i = 0; i < AUFNAHMEN.length; i++){
  const a = AUFNAHMEN[i];
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.setContent(`<style>
    html,body{margin:0;padding:0}
    #b{width:1080px;height:1920px;background:${VERLAUF};font-family:${SCHRIFT};
       display:flex;flex-direction:column;align-items:center;overflow:hidden}
    h1{color:#fff;font-size:62px;line-height:1.18;font-weight:700;letter-spacing:-.02em;
       text-align:center;margin:78px 60px 0}
    img{width:760px;border-radius:38px;margin-top:52px;
        box-shadow:0 26px 70px rgba(4,26,46,.42)}
  </style><div id="b"><h1>${a.text}</h1><img src="${bild(`docs/screenshots/${a.datei}.png`)}"></div>`);
  const name = `${ZIEL}/screenshot-${i + 1}-1080x1920.png`;
  writeFileSync(name, await page.locator("#b").screenshot());
  console.log(name);
}

/* ---- Feature-Grafik 1024 × 500 ---- */
await page.setViewportSize({ width: 1024, height: 500 });
await page.setContent(`<style>
  html,body{margin:0;padding:0}
  /* overflow:hidden ist Pflicht: Läuft der Text über, wächst sonst die
     Elementbreite mit, und der Screenshot wird breiter als 1024 px –
     Google verlangt die Maße aber auf den Pixel genau. */
  #b{width:1024px;height:500px;background:${VERLAUF};font-family:${SCHRIFT};
     display:flex;align-items:center;gap:52px;padding:0 76px;overflow:hidden;
     box-sizing:border-box}
  #s{width:190px;height:190px;flex:none}
  #s svg{width:100%;height:100%;display:block;
    filter:drop-shadow(0 12px 26px rgba(4,26,46,.35))}
  #t{flex:1;min-width:0}
  h1{color:#fff;font-size:74px;font-weight:700;letter-spacing:-.03em;margin:0}
  p{color:#dcefff;font-size:34px;margin:12px 0 0;font-weight:500}
</style><div id="b"><div id="s">${LOGO}</div>
  <div id="t"><h1>SkillLog Med</h1><p>Dein Logbuch für klinische Skills</p></div></div>`);
writeFileSync(`${ZIEL}/feature-grafik-1024x500.png`, await page.locator("#b").screenshot());
console.log(`${ZIEL}/feature-grafik-1024x500.png`);

await browser.close();
