// Erzeugt alle Icon-Dateien aus icons/logo-motiv.png.
//
// Das Motiv (Klemmbrett mit EKG-Linie und Haken) stammt aus Higgsfield –
// feine schwarze Linien auf Weiß. Hier wird es zur Alpha-Maske umgerechnet,
// weiß eingefärbt und auf die Markenkachel (Blau-Verlauf) gesetzt. Gerendert
// wird mit dem vorinstallierten Chromium (kein zusätzliches Grafikwerkzeug
// nötig, kein "playwright install").
//
//   node scripts/icons-bauen.mjs
//
// Ergebnis:
//   icons/icon-192.png, icon-512.png, icon-maskable-512.png   (Web/PWA)
//   android/.../mipmap-*/ic_launcher.png, ic_launcher_round.png,
//                        ic_launcher_foreground.png            (App)
//   android/.../values/ic_launcher_background.xml              (Markenfarbe)
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const MOTIV_B64 = readFileSync("icons/logo-motiv.png").toString("base64");
const RES = "android/app/src/main/res";

/* Markenfarben – dieselben wie in index.html (--accent/--accent2). Die
   Adaptive-Icon-Hintergrundfarbe ist der Verlaufsmittelwert; sie muss zur
   Kachel passen, sonst entsteht auf dem Startbildschirm eine Kante. */
const FARBE_1 = "#155e9e", FARBE_2 = "#2b87cd", FARBE_MITTE = "#1B6AAC";

/* Android-Dichten. 48 dp Symbolkante bzw. 108 dp beim adaptiven Icon. */
const DICHTEN = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();

/* Das Motiv einmal zur Alpha-Maske umrechnen (schwarz → deckend). */
await page.setContent("<div></div>");
const MASKE = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej;
    img.src = "data:image/png;base64," + b64; });
  const S = 512;
  const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, S, S);
  const d = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < d.data.length; i += 4){
    const lum = 0.299 * d.data[i] + 0.587 * d.data[i+1] + 0.114 * d.data[i+2];
    const a = lum > 235 ? 0 : Math.round(255 - lum);
    d.data[i] = 0; d.data[i+1] = 0; d.data[i+2] = 0; d.data[i+3] = a;
  }
  ctx.putImageData(d, 0, 0);
  return cv.toDataURL("image/png");
}, MOTIV_B64);

/* Seite, die die Kachel in einer definierten Größe zeichnet.
   - rund:   beschneidet kreisförmig (ic_launcher_round)
   - anteil: Größe des Motivs relativ zur Fläche. Beim adaptiven Vordergrund
     muss das Motiv in die innere Sicherheitszone passen (Android beschneidet
     ringsum bis zu 18 dp von 108 dp), beim maskierbaren Web-Icon ebenso.
   - hintergrund: false lässt die Fläche transparent (Vordergrund-Ebene).
   - eckig: true lässt die runden Ecken weg (maskierbares Web-Icon). */
function seite(px, { rund = false, anteil = 1, hintergrund = true, eckig = false } = {}){
  const inner = Math.round(px * anteil);
  const radius = rund ? "border-radius:50%;" : (hintergrund && !eckig ? "border-radius:22%;" : "");
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    #b{width:${px}px;height:${px}px;position:relative;overflow:hidden;
       display:grid;place-items:center;
       ${hintergrund ? `background:linear-gradient(135deg,${FARBE_1},${FARBE_2});` : ""}
       ${radius}}
    #m{width:${inner}px;height:${inner}px;background:#ffffff;
       -webkit-mask:url("${MASKE}") center/contain no-repeat;
       mask:url("${MASKE}") center/contain no-repeat}
  </style><div id="b"><div id="m"></div></div>`;
}

async function schreibe(pfad, px, opts){
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(seite(px, opts));
  const buf = await page.locator("#b").screenshot({ omitBackground: true });
  mkdirSync(pfad.replace(/\/[^/]+$/, ""), { recursive: true });
  writeFileSync(pfad, buf);
  console.log(pfad + "  (" + px + "px)");
}

writeFileSync(`${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n` +
  `    <!-- Verlaufsmittelwert der Markenkachel (siehe scripts/icons-bauen.mjs). -->\n` +
  `    <color name="ic_launcher_background">${FARBE_MITTE}</color>\n</resources>\n`);
console.log("Adaptive-Icon-Hintergrund: " + FARBE_MITTE);

/* ---- Web / PWA ---- */
await schreibe("icons/icon-192.png", 192, { anteil: 0.92 });
await schreibe("icons/icon-512.png", 512, { anteil: 0.92 });
/* Maskierbar: Startbildschirme beschneiden bis zu 20 % Rand, deshalb das
   Motiv kleiner und die Farbfläche durchgehend (keine runden Ecken). */
await schreibe("icons/icon-maskable-512.png", 512, { anteil: 0.7, eckig: true });

/* ---- Android ---- */
for (const [name, f] of Object.entries(DICHTEN)){
  const dir = `${RES}/mipmap-${name}`;
  await schreibe(`${dir}/ic_launcher.png`, Math.round(48 * f), { anteil: 0.92 });
  await schreibe(`${dir}/ic_launcher_round.png`, Math.round(48 * f), { rund: true, anteil: 0.86 });
  /* Adaptives Icon: 108 dp Ebene, Motiv auf 66 dp begrenzt, transparent. */
  await schreibe(`${dir}/ic_launcher_foreground.png`, Math.round(108 * f),
    { anteil: 66 / 108, hintergrund: false });
}

/* ---- Startbildschirm (Splash) ----
   Markenverlauf mit Motiv und Schriftzug. Die Abmessungen entsprechen denen,
   die Capacitor anlegt. */
const SPLASH = {
  "drawable": [480, 320],
  "drawable-port-mdpi": [320, 480], "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280], "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
  "drawable-land-mdpi": [480, 320], "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720], "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280]
};
for (const [dir, [w, h]] of Object.entries(SPLASH)){
  const marke = Math.round(Math.min(w, h) * 0.3);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0}
    #b{width:${w}px;height:${h}px;
       background:linear-gradient(150deg,${FARBE_1},#0a2138 115%);
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       gap:${Math.round(marke * 0.14)}px;
       font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
    #m{width:${marke}px;height:${marke}px;background:#ffffff;
       -webkit-mask:url("${MASKE}") center/contain no-repeat;
       mask:url("${MASKE}") center/contain no-repeat}
    #t{color:#fff;font-size:${Math.round(marke * 0.26)}px;font-weight:700;letter-spacing:-.01em}
  </style><div id="b"><div id="m"></div><div id="t">SkillLog Med</div></div>`);
  const buf = await page.locator("#b").screenshot();
  writeFileSync(`${RES}/${dir}/splash.png`, buf);
  console.log(`${RES}/${dir}/splash.png  (${w}x${h})`);
}

await browser.close();
