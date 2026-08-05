// Erzeugt die Grafiken für den Play-Store-Eintrag unter docs/store-grafiken/.
//
//   node scripts/screenshots.mjs && node scripts/store-grafiken.mjs
//
// Grundlage sind die App-Aufnahmen aus docs/screenshots/ und zwei mit
// Higgsfield erzeugte Marken-Hintergründe (docs/store-grafiken/quellen/):
// tiefes Klinik-Blau mit leiser EKG-Linie. Die Überschriften sind bewusst
// eigenständig formuliert: Bei mehreren Apps im selben Konto ist
// "wiederholter Inhalt" das größte Ablehnungsrisiko beim Play-Review.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ZIEL = "docs/store-grafiken";
mkdirSync(ZIEL, { recursive: true });
const bild = p => "data:image/png;base64," + readFileSync(p).toString("base64");
const LOGO = bild("icons/icon-512.png");
const BG_QUER = bild(`${ZIEL}/quellen/hintergrund-quer.png`);
const BG_HOCH = bild(`${ZIEL}/quellen/hintergrund-hoch.png`);

const SCHRIFT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

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

/* ---- Store-Screenshots 1080 × 1920 ----
   Marken-Hintergrund, Überschrift oben im dunklen Bereich, darunter das
   "Telefon" mit feinem hellem Rand – die EKG-Linie des Hintergrunds bleibt
   unten sichtbar. */
for (let i = 0; i < AUFNAHMEN.length; i++){
  const a = AUFNAHMEN[i];
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.setContent(`<style>
    html,body{margin:0;padding:0}
    #b{width:1080px;height:1920px;font-family:${SCHRIFT};position:relative;
       background:#0a1c31 url("${BG_HOCH}") center/cover no-repeat;
       display:flex;flex-direction:column;align-items:center;overflow:hidden}
    /* Leichte Abdunklung oben, damit die Überschrift immer sauber steht. */
    #b::before{content:"";position:absolute;inset:0;
       background:linear-gradient(to bottom, rgba(5,16,30,.55) 0%, rgba(5,16,30,.12) 26%, transparent 40%)}
    h1{position:relative;color:#fff;font-size:61px;line-height:1.2;font-weight:700;
       letter-spacing:-.02em;text-align:center;margin:80px 60px 0;
       text-shadow:0 2px 18px rgba(4,16,30,.5)}
    #tel{position:relative;width:764px;margin-top:54px;border-radius:42px;
       padding:10px;background:rgba(255,255,255,.09);
       border:1px solid rgba(255,255,255,.22);
       box-shadow:0 34px 90px rgba(2,12,24,.6), inset 0 1px 0 rgba(255,255,255,.25)}
    #tel img{display:block;width:100%;border-radius:34px}
  </style><div id="b"><h1>${a.text}</h1>
    <div id="tel"><img src="${bild(`docs/screenshots/${a.datei}.png`)}"></div></div>`);
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
  #b{width:1024px;height:500px;font-family:${SCHRIFT};position:relative;
     background:#0a1c31 url("${BG_QUER}") center/cover no-repeat;
     display:flex;align-items:center;gap:52px;padding:0 76px;overflow:hidden;
     box-sizing:border-box}
  /* Kühle Angleichung des warmen Lichtflecks + Lesbarkeit links. */
  #b::before{content:"";position:absolute;inset:0;
     background:linear-gradient(100deg, rgba(7,22,40,.5) 0%, rgba(7,22,40,.12) 55%, rgba(21,70,120,.18) 100%)}
  #s{position:relative;width:196px;height:196px;flex:none}
  #s img{width:100%;height:100%;display:block;border-radius:22%;
    filter:drop-shadow(0 14px 30px rgba(2,12,24,.5))}
  #t{position:relative;flex:1;min-width:0}
  h1{color:#fff;font-size:74px;font-weight:700;letter-spacing:-.03em;margin:0;
     text-shadow:0 2px 16px rgba(4,16,30,.45)}
  p{color:#d5e9fa;font-size:34px;margin:12px 0 0;font-weight:500}
</style><div id="b"><div id="s"><img src="${LOGO}"></div>
  <div id="t"><h1>SkillLog Med</h1><p>Dein Logbuch für klinische Skills</p></div></div>`);
writeFileSync(`${ZIEL}/feature-grafik-1024x500.png`, await page.locator("#b").screenshot());
console.log(`${ZIEL}/feature-grafik-1024x500.png`);

await browser.close();
