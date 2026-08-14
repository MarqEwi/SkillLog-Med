// Bedienung: die wichtigsten Abläufe über die echte Oberfläche –
// Eintrag anlegen, filtern, bearbeiten, Stammdaten, Statistik, Export.
import { test, expect } from "@playwright/test";
import { appOeffnen, eintragAnlegen, inTagen, schalter } from "./helfer.mjs";

test.beforeEach(async ({ page }) => { await appOeffnen(page); });

test("Flow: schneller Alltagseintrag mit Stufe, Setting und Ort", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "intubation", stufe: "assistiert",
    setting: "simulator", ort: "op", notiz: "Videolaryngoskop" });

  await expect(page.locator("#detail-inhalt h2")).toHaveText("Intubation");
  await expect(page.locator("#detail-inhalt .pill")).toContainText("assistiert");
  await expect(page.locator("#detail-inhalt")).toContainText("Simulator");
  await expect(page.locator("#detail-inhalt")).toContainText("OP");
  await expect(page.locator("#detail-inhalt")).toContainText("Videolaryngoskop");

  /* Das Dashboard zählt mit. */
  await page.click('nav.tabs button[data-tab="home"]');
  await expect(page.locator("#home-inhalt .hero .big")).toContainText("1");
});

test("Formular: Datum und Uhrzeit sind mit jetzt vorbelegt", async ({ page }) => {
  await page.click("#btn-neu");
  const datum = await page.inputValue("#f-datum");
  const zeit = await page.inputValue("#f-zeit");
  expect(datum).toBe(inTagen(0));
  expect(zeit).toMatch(/^\d{2}:\d{2}$/);
});

test("Formular: ohne Maßnahme wird nicht gespeichert", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click("#f-speichern");
  await expect(page.locator("#f-m-err")).toBeVisible();
  await expect(page.locator("#view-form")).toHaveClass(/active/);
  const anzahl = await page.evaluate(() => window.SLM.Daten.alle().length);
  expect(anzahl).toBe(0);
});

test("Maßnahmensuche filtert die Auswahl, Schnellwahl übernimmt Zuletzt-Genutztes", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "reanimation" });
  await page.click("#btn-neu");
  /* Zuletzt genutzte Maßnahme steht in der Schnellwahl. */
  await expect(page.locator("#f-schnell")).toContainText("Reanimation");
  await page.fill("#f-msuche", "intub");
  await expect(page.locator("#f-mgrid [data-m]")).toHaveCount(1);
  await expect(page.locator("#f-mgrid")).toContainText("Intubation");
});

test("Speichern + Neu behält Ort und Tags für den nächsten Eintrag", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="blutentnahme"]');
  await page.selectOption("#f-ort", "station");
  await page.fill("#f-tag-neu", "Famulatur");
  await page.click("#f-tag-add");
  await page.click("#f-speichern-neu");

  /* Formular bleibt offen, Maßnahme ist geleert, Ort und Tag bleiben. */
  await expect(page.locator("#view-form")).toHaveClass(/active/);
  expect(await page.inputValue("#f-ort")).toBe("station");
  await expect(page.locator('#f-tags .chip.active')).toContainText("Famulatur");
  await expect(page.locator("#f-mgrid button.active")).toHaveCount(0);
});

test("Nochmal erfasst: Duplikat übernimmt alles außer Zeitpunkt und Notiz", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "wundversorgung", stufe: "assistiert",
    setting: "mensch", ort: "rtw", datum: "2026-01-05", zeit: "09:00", notiz: "alte Notiz" });
  await page.click("#d-duplizieren");
  await expect(page.locator("#view-form")).toHaveClass(/active/);
  await expect(page.locator("#f-mgrid button.active")).toContainText("Wundversorgung");
  expect(await page.inputValue("#f-ort")).toBe("rtw");
  expect(await page.inputValue("#f-datum")).toBe(inTagen(0));
  expect(await page.inputValue("#f-notiz")).toBe("");
});

test("Eintrag bearbeiten und löschen", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "harnkatheter", notiz: "erster Versuch" });
  await page.click("#d-bearbeiten");
  await page.fill("#f-notiz", "zweiter Versuch");
  await page.click("#f-speichern");
  await expect(page.locator("#detail-inhalt")).toContainText("zweiter Versuch");

  page.on("dialog", d => d.accept());
  await page.click("#d-loeschen");
  const anzahl = await page.evaluate(() => window.SLM.Daten.alle().length);
  expect(anzahl).toBe(0);
});

test("Logbuch: Suche und Stufenfilter grenzen die Liste ein", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await page.click('nav.tabs button[data-tab="liste"]');

  /* Volltextsuche */
  await page.fill("#such-feld", "megacode");
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(1);
  await page.click("#such-clear");

  /* Detailfilter: Stufe beobachtet */
  await page.click('#filter-zeit [data-panel]');
  await page.selectOption("#fp-stufe", "beobachtet");
  const beobachtet = await page.evaluate(() =>
    window.SLM.Core.filtern(window.SLM.Daten.alle(), { stufe: "beobachtet" }).length);
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(beobachtet);

  /* Zurücksetzen zeigt wieder alles */
  await page.click("#fp-reset");
  const alle = await page.evaluate(() => window.SLM.Daten.alle().length);
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(alle);
});

test("Logbuch: Tag-Filter über das Panel", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await page.click('nav.tabs button[data-tab="liste"]');
  await page.click('#filter-zeit [data-panel]');
  await page.selectOption("#fp-tag", "Skills Lab");
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(3);
});

test("Statistik: Stufenverteilung und Maßnahmenliste erscheinen", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await page.click('nav.tabs button[data-tab="stats"]');
  await page.click('#stats-zeit [data-z="alle"]');

  await expect(page.locator("#stats-inhalt .stapel")).toBeVisible();
  await expect(page.locator("#stats-inhalt")).toContainText("Maßnahmen");
  const bars = await page.locator("#stats-inhalt .bars .fill").count();
  expect(bars).toBeGreaterThan(3);
});

test("Stammdaten: eigene Maßnahme aus dem Formular anlegen und direkt nutzen", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click("#f-m-neu");
  await page.fill("#m-name", "Lumbalpunktion");
  await page.click("#m-ok");
  /* Die neue Maßnahme ist sofort ausgewählt. */
  await expect(page.locator("#f-mgrid button.active")).toContainText("Lumbalpunktion");
  await page.click("#f-speichern");
  await expect(page.locator("#detail-inhalt h2")).toHaveText("Lumbalpunktion");
});

test("Stammdaten: Favorit erscheint in der Schnellwahl, Archiviertes verschwindet", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-stamm");
  await expect(page.locator("#view-stamm")).toHaveClass(/active/);

  /* Thoraxdrainage als Favorit markieren */
  await page.click('[data-fav="thoraxdrainage"]');
  /* Magensonde archivieren */
  await page.click('[data-arch="magensonde"]');

  await page.click("#btn-neu");
  await expect(page.locator("#f-schnell")).toContainText("Thoraxdrainage");
  await expect(page.locator('#f-mgrid [data-m="magensonde"]')).toHaveCount(0);
});

test("Stammdaten: eigene Kategorie direkt aus dem Maßnahmen-Dialog anlegen", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click("#f-m-neu");
  await page.fill("#m-name", "Kindernotfall-Check");
  /* "Neue Kategorie …" öffnet den Kategorie-Dialog über dem Maßnahmen-Dialog. */
  await page.selectOption("#m-kategorie", "__neu");
  await page.fill("#k-name", "Pädiatrie");
  await page.click("#k-ok");
  /* Die neue Kategorie ist im Select vorausgewählt. */
  const gewaehlt = await page.inputValue("#m-kategorie");
  const label = await page.evaluate(id => window.SLM.Core.mkategorie(id).label, gewaehlt);
  expect(label).toBe("Pädiatrie");
  await page.click("#m-ok");
  /* Die Maßnahme erscheint im Formular unter ihrer Kategorie-Gruppe. */
  await expect(page.locator("#f-mgrid .mgruppe", { hasText: "Pädiatrie" })).toBeVisible();
  await expect(page.locator("#f-mgrid button.active")).toContainText("Kindernotfall-Check");
});

test("Stammdaten: Kategorien-Tab verwaltet die Gruppen", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-stamm");
  await page.click('#stamm-seg [data-v="kategorien"]');
  await expect(page.locator("#stamm-inhalt")).toContainText("Zugänge & Punktionen");
  await expect(page.locator("#stamm-inhalt")).toContainText("Sonstiges");
  /* "Sonstiges" hat keinen Löschknopf. */
  const rows = page.locator("#stamm-inhalt .stammliste li", { hasText: "Sonstiges" });
  await expect(rows.locator(".loesch")).toHaveCount(0);

  await page.click("#stamm-k-neu");
  await page.fill("#k-name", "Geburtshilfe");
  await page.click("#k-ok");
  await expect(page.locator("#stamm-inhalt")).toContainText("Geburtshilfe");
});

test("Logbuch: Kategorie-Filter grenzt auf die Maßnahmen der Gruppe ein", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await page.click('nav.tabs button[data-tab="liste"]');
  await page.click('#filter-zeit [data-panel]');
  await page.selectOption("#fp-mkat", "atemweg");
  const erwartet = await page.evaluate(() =>
    window.SLM.Core.filtern(window.SLM.Daten.alle(), { mkategorie: "atemweg" }).length);
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(erwartet);
  expect(erwartet).toBeGreaterThan(2);
});

test("Mehrfach an einem Tag: fünf Einträge ohne Uhrzeit", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="blutentnahme"]');
  await page.fill("#f-datum", "2026-03-10");
  await schalter(page, "f-mehr-an");
  await page.fill("#f-anzahl", "5");
  await page.click("#f-speichern");

  const r = await page.evaluate(() => {
    const liste = window.SLM.Daten.alle();
    return { anzahl: liste.length, zeiten: liste.map(e => e.zeit),
      daten: Array.from(new Set(liste.map(e => e.datum))) };
  });
  expect(r.anzahl).toBe(5);
  /* Ohne Einzelzeiten bleibt die Uhrzeit bewusst leer. */
  expect(r.zeiten).toEqual(["", "", "", "", ""]);
  expect(r.daten).toEqual(["2026-03-10"]);
});

test("Mehrfach mit einzelnen Uhrzeiten", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="iv-zugang"]');
  await page.fill("#f-datum", "2026-03-10");
  await schalter(page, "f-mehr-an");
  await page.fill("#f-anzahl", "3");
  await schalter(page, "f-zeiten-an");
  await expect(page.locator("#f-zeitliste input")).toHaveCount(3);
  await page.fill('#f-zeitliste [data-zeit="0"]', "08:00");
  await page.fill('#f-zeitliste [data-zeit="1"]', "11:30");
  await page.fill('#f-zeitliste [data-zeit="2"]', "17:45");
  await page.click("#f-speichern");

  const zeiten = await page.evaluate(() =>
    window.SLM.Core.sortieren(window.SLM.Daten.alle()).map(e => e.zeit));
  expect(zeiten).toEqual(["17:45", "11:30", "08:00"]);
});

test("Beim Bearbeiten gibt es keine Mehrfach-Erfassung", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "reanimation" });
  await page.click("#d-bearbeiten");
  await expect(page.locator("#f-mehr-zeile")).toBeHidden();
});

test("Trainingsblock: im Formular wählen, Detail und Logbuch-Filter", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="intubation"]');
  await page.selectOption("#f-block", "klinik-op");
  await page.click("#f-speichern");
  await expect(page.locator("#detail-inhalt")).toContainText("Klinikpraktikum · OP");

  /* Der Oberblock-Filter findet den Unterblock-Eintrag. */
  await page.click('nav.tabs button[data-tab="liste"]');
  await page.click('#filter-zeit [data-panel]');
  await page.selectOption("#fp-block", "klinikpraktikum");
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(1);
  await page.selectOption("#fp-block", "rettungswache");
  await expect(page.locator("#liste-inhalt")).toContainText("Keine Einträge gefunden");
});

test("Statistik: Blöcke sind anklickbar und führen ins gefilterte Logbuch", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  /* Beispieldaten mit Blöcken versehen, damit die Auswertung etwas zeigt. */
  await page.evaluate(() => {
    const { Daten } = window.SLM;
    Daten.alle().slice(0, 4).forEach(e => Daten.upsert(Object.assign({}, e, { blockId: "klinik-op" })));
    Daten.alle().slice(4, 6).forEach(e => Daten.upsert(Object.assign({}, e, { blockId: "rettungswache" })));
  });
  await page.click('nav.tabs button[data-tab="stats"]');
  await page.click('#stats-zeit [data-z="alle"]');
  await expect(page.locator("#stats-inhalt")).toContainText("Trainingsblöcke");

  await page.click('#stats-inhalt [data-block="klinikpraktikum"]');
  await expect(page.locator("#view-liste")).toHaveClass(/active/);
  await expect(page.locator("#liste-inhalt .row")).toHaveCount(4);
});

test("Stammdaten: Unterblock anlegen und wieder löschen", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-stamm");
  await page.click('#stamm-seg [data-v="bloecke"]');
  await expect(page.locator("#stamm-inhalt")).toContainText("Klinikpraktikum");

  /* "+" an der Zeile legt einen Unterblock an. */
  await page.click('[data-sub="klinikpraktikum"]');
  await page.fill("#b-name", "Kreißsaal");
  await page.click("#b-ok");
  await expect(page.locator("#stamm-inhalt .stammliste li.unter", { hasText: "Kreißsaal" })).toBeVisible();

  const drin = await page.evaluate(() =>
    window.SLM.Core.bloecke.some(b => b.label === "Kreißsaal" && b.elternId === "klinikpraktikum"));
  expect(drin).toBe(true);

  page.on("dialog", d => d.accept());
  const id = await page.evaluate(() =>
    window.SLM.Core.bloecke.find(b => b.label === "Kreißsaal").id);
  await page.click('[data-del="' + id + '"]');
  await expect(page.locator("#stamm-inhalt")).not.toContainText("Kreißsaal");
});

test("Tags: mehrere setzen, bekannte darunter antippbar", async ({ page }) => {
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="wundversorgung"]');
  await page.fill("#f-tag-neu", "Klinik");
  await page.click("#f-tag-add");
  await page.fill("#f-tag-neu", "Nachtdienst");
  await page.click("#f-tag-add");
  /* Beide gewählt – Mehrfachwahl ist ausdrücklich möglich. */
  await expect(page.locator("#f-tags .chip.active")).toHaveCount(2);
  await page.click("#f-speichern");
  const tags = await page.evaluate(() => window.SLM.Daten.alle()[0].tags);
  expect(tags).toEqual(["Klinik", "Nachtdienst"]);

  /* Im nächsten Eintrag stehen sie als Vorschlag bereit und lassen sich
     mit einem Tipp übernehmen. */
  await page.click('nav.tabs button[data-tab="home"]');
  await page.click("#btn-neu");
  await page.click('#f-mgrid [data-m="blutentnahme"]');
  await expect(page.locator("#f-tags .chip")).toHaveCount(2);
  await page.click('#f-tags [data-t="Klinik"]');
  await page.click("#f-speichern");
  await expect(page.locator("#detail-inhalt")).toContainText("#Klinik");
});

test("Stammdaten: eigenen Ort anlegen und im Formular wählen", async ({ page }) => {
  await page.click("#btn-neu");
  await page.selectOption("#f-ort", "__neu");
  await page.fill("#o-name", "ZNA Haus 3");
  await page.click("#o-ok");
  const wert = await page.inputValue("#f-ort");
  const label = await page.evaluate(id => window.SLM.Core.ort(id).label, wert);
  expect(label).toBe("ZNA Haus 3");
});

test("Export: Zähler folgt dem Zeitraum, Druckansicht baut den Bericht auf", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await page.click('nav.tabs button[data-tab="export"]');

  await page.click('#ex-quick [data-z="alle"]');
  const alle = await page.evaluate(() => window.SLM.Daten.alle().length);
  await expect(page.locator("#ex-anzahl")).toContainText(alle + " Einträge");

  /* Druckansicht (Web): Bericht mit Unterschriftsblock im Print-Bereich */
  await page.click("#ex-druck");
  await expect(page.locator("#print-bereich")).toContainText("Ausbildungs- und Kompetenznachweis");
  await expect(page.locator("#print-bereich")).toContainText("Unterschrift Praxisanleitung");
});

test("Profil: gespeicherte Angaben landen im Bericht", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-profil");
  await page.fill("#p-name", "Alex Muster");
  await page.click("#p-rolle-neu");
  await page.selectOption("#p-rolle-wahl", "PJ-Student:in");
  await page.click("#p-rolle-ok");
  await page.fill("#p-institution", "Uniklinik Beispielstadt");
  await page.click("#p-ok");

  const meta = await page.evaluate(() => {
    const b = window.SLM.Core.berichtDaten(window.SLM.Daten.alle(), {}, window.SLM.Profil.werte);
    return Object.fromEntries(b.meta);
  });
  expect(meta["Name"]).toBe("Alex Muster");
  expect(meta["Rolle / Berufsgruppe"]).toBe("PJ-Student:in");
  expect(meta["Ausbildungsstätte"]).toBe("Uniklinik Beispielstadt");
});

test("Profil: mehrere Rollen anlegen, eigene ergänzen, eine entfernen", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-profil");

  /* Erste Rolle aus der Vorschlagsliste */
  await page.click("#p-rolle-neu");
  await page.selectOption("#p-rolle-wahl", "Physician-Assistant-Student:in");
  await page.click("#p-rolle-ok");
  /* Zweite Rolle – der Knopf heißt jetzt "Weitere Rolle hinzufügen" */
  await expect(page.locator("#p-rolle-neu-text")).toHaveText("Weitere Rolle hinzufügen");
  await page.click("#p-rolle-neu");
  await page.selectOption("#p-rolle-wahl", "Notfallsanitäter:in");
  await page.click("#p-rolle-ok");
  /* Dritte Rolle als eigene Bezeichnung */
  await page.click("#p-rolle-neu");
  await page.selectOption("#p-rolle-wahl", "__frei");
  await page.fill("#p-rolle-frei", "Praxisanleiter:in i. A.");
  await page.click("#p-rolle-ok");

  await expect(page.locator("#p-rollen li")).toHaveCount(3);
  await page.click("#p-ok");

  const r = await page.evaluate(() => {
    const b = window.SLM.Core.berichtDaten([], {}, window.SLM.Profil.werte);
    return { rollen: window.SLM.Profil.werte.rollen, meta: Object.fromEntries(b.meta) };
  });
  expect(r.rollen).toEqual(["Physician-Assistant-Student:in", "Notfallsanitäter:in",
    "Praxisanleiter:in i. A."]);
  /* Bei mehreren Rollen steht das Feld im Plural. */
  expect(r.meta["Rollen / Berufsgruppen"])
    .toBe("Physician-Assistant-Student:in · Notfallsanitäter:in · Praxisanleiter:in i. A.");

  /* Entfernen wirkt erst nach dem Speichern. */
  await page.click("#btn-settings");
  await page.click("#s-profil");
  await page.click('#p-rollen [data-weg="1"]');
  await page.click("#p-ok");
  const nachher = await page.evaluate(() => window.SLM.Profil.werte.rollen);
  expect(nachher).toEqual(["Physician-Assistant-Student:in", "Praxisanleiter:in i. A."]);
});

test("Zurück-Taste im Browser: schließt erst Dialoge, dann Ansichten", async ({ page }) => {
  await eintragAnlegen(page, { massnahme: "sono-assistiert" });
  await page.click("#btn-settings");
  await expect(page.locator("#modal-settings")).toHaveClass(/open/);

  await page.goBack();
  await expect(page.locator("#modal-settings")).not.toHaveClass(/open/);
  /* Die Detailansicht ist noch da – erst die nächste Geste verlässt sie. */
  await expect(page.locator("#view-detail")).toHaveClass(/active/);

  await page.goBack();
  await expect(page.locator("#view-home")).toHaveClass(/active/);
});

test("Alle Daten löschen setzt App und Stammdaten zurück", async ({ page }) => {
  await page.click("#btn-settings");
  await page.click("#s-beispiele");
  await page.evaluate(() => window.SLM.Katalog.hinzufuegen("Eigene Maßnahme"));
  page.on("dialog", d => d.accept());
  await page.click("#btn-settings");
  await page.click("#s-reset");

  const r = await page.evaluate(() => ({
    eintraege: window.SLM.Daten.alle().length,
    eigene: window.SLM.Core.katalog.filter(m => m.eigen).length,
    standard: window.SLM.Core.katalog.length
  }));
  expect(r.eintraege).toBe(0);
  expect(r.eigene).toBe(0);
  expect(r.standard).toBe(20);
  await expect(page.locator("#home-inhalt")).toContainText("Noch keine Einträge vorhanden");
});
