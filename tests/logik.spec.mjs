// Fachlogik: Der Core ist DOM-frei und wird über window.SLM direkt geprüft –
// Datumsrechnung, Normalisierung, Filter, Statistik, CSV und PDF, ohne Klicks.
import { test, expect } from "@playwright/test";
import { appOeffnen, inTagen } from "./helfer.mjs";

test.beforeEach(async ({ page }) => { await appOeffnen(page); });

function core(page, fn, arg){
  return page.evaluate(([f, a]) => {
    /* eslint-disable no-new-func */
    return new Function("Core", "arg", "return (" + f + ")(Core, arg)")(window.SLM.Core, a);
  }, [fn.toString(), arg]);
}

test("Datumsprüfung fängt unmögliche Daten ab", async ({ page }) => {
  const r = await core(page, (Core) => ({
    ok: Core.istIso("2026-02-28"),
    schalt: Core.istIso("2028-02-29"),
    rollover: Core.istIso("2026-02-31"),   /* JS würde still auf den 3. März rollen */
    murks: Core.istIso("31.02.2026"),
    leer: Core.istIso("")
  }));
  expect(r.ok).toBe(true);
  expect(r.schalt).toBe(true);
  expect(r.rollover).toBe(false);
  expect(r.murks).toBe(false);
  expect(r.leer).toBe(false);
});

test("Monate addieren kappt aufs Monatsende", async ({ page }) => {
  const r = await core(page, (Core) => ({
    a: Core.addMonate("2026-01-31", 1),    /* → 28.02. */
    b: Core.addMonate("2026-08-31", 1),    /* → 30.09. */
    c: Core.addMonate("2026-05-15", 12)
  }));
  expect(r.a).toBe("2026-02-28");
  expect(r.b).toBe("2026-09-30");
  expect(r.c).toBe("2027-05-15");
});

test("Uhrzeitprüfung akzeptiert nur HH:MM", async ({ page }) => {
  const r = await core(page, (Core) => ({
    ok: Core.istZeit("08:15"), mitternacht: Core.istZeit("00:00"),
    spaet: Core.istZeit("23:59"), falsch: Core.istZeit("24:00"),
    murks: Core.istZeit("8:15"), leer: Core.istZeit("")
  }));
  expect(r).toEqual({ ok: true, mitternacht: true, spaet: true,
    falsch: false, murks: false, leer: false });
});

test("Schnellfilter ergeben die richtigen Zeiträume", async ({ page }) => {
  const r = await core(page, (Core) => {
    const h = "2026-08-04";
    return {
      heute: Core.zeitraum("heute", h),
      sieben: Core.zeitraum("7", h),
      monat: Core.zeitraum("monat", h),
      letzterMonat: Core.zeitraum("letzter-monat", h),
      alle: Core.zeitraum("alle", h)
    };
  });
  expect(r.heute).toEqual({ von: "2026-08-04", bis: "2026-08-04" });
  expect(r.sieben).toEqual({ von: "2026-07-29", bis: "2026-08-04" });
  expect(r.monat).toEqual({ von: "2026-08-01", bis: "2026-08-04" });
  expect(r.letzterMonat).toEqual({ von: "2026-07-01", bis: "2026-07-31" });
  expect(r.alle).toEqual({ von: "", bis: "" });
});

test("Normalisierung setzt Standardwerte und Schnappschüsse", async ({ page }) => {
  const r = await core(page, (Core) => {
    const e = Core.normalisieren({ massnahmeId: "iv-zugang", datum: "2026-05-01" });
    const kaputt = Core.normalisieren({ massnahmeId: "gibts-nicht",
      massnahmeLabel: "Alte Bezeichnung", stufe: "quatsch", setting: "quatsch",
      zeit: "99:99", tags: ["A", "a", " B ", "A"] });
    return { e, kaputt };
  });
  expect(r.e.massnahmeLabel).toBe("i.v.-Zugang");         /* Schnappschuss aus dem Katalog */
  expect(r.e.stufe).toBe("durchgefuehrt");
  expect(r.e.setting).toBe("mensch");
  expect(r.e.tags).toEqual([]);
  expect(r.kaputt.massnahmeLabel).toBe("Alte Bezeichnung"); /* unbekannte ID → Schnappschuss bleibt */
  expect(r.kaputt.stufe).toBe("durchgefuehrt");
  expect(r.kaputt.zeit).toBe("");
  expect(r.kaputt.tags).toEqual(["A", "B"]);              /* Groß/klein-Duplikate fliegen raus */
});

test("Filter: Zeitraum, Stufe, Tag (unabhängig von Groß/Klein) und Suche", async ({ page }) => {
  const r = await core(page, (Core) => {
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang", datum: "2026-03-10",
        stufe: "durchgefuehrt", tags: ["PJ Chirurgie"], notiz: "schwierige Vene" }),
      Core.normalisieren({ massnahmeId: "intubation", datum: "2026-03-20",
        stufe: "assistiert", tags: ["Skills Lab"] }),
      Core.normalisieren({ massnahmeId: "reanimation", datum: "2026-04-02",
        stufe: "beobachtet", tags: [] })
    ];
    return {
      zeitraum: Core.filtern(liste, { von: "2026-03-15", bis: "2026-03-31" }).length,
      stufe: Core.filtern(liste, { stufe: "assistiert" }).length,
      tag: Core.filtern(liste, { tag: "pj chirurgie" }).length,
      suche: Core.filtern(liste, { suche: "vene" }).length,
      sucheOrt: Core.filtern(liste, { suche: "intub" }).length,
      alles: Core.filtern(liste, {}).length
    };
  });
  expect(r).toEqual({ zeitraum: 1, stufe: 1, tag: 1, suche: 1, sucheOrt: 1, alles: 3 });
});

test("Sortierung: das Neueste zuerst, bei gleichem Datum nach Uhrzeit", async ({ page }) => {
  const r = await core(page, (Core) => {
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang", datum: "2026-03-10", zeit: "08:00" }),
      Core.normalisieren({ massnahmeId: "intubation", datum: "2026-03-12", zeit: "07:00" }),
      Core.normalisieren({ massnahmeId: "reanimation", datum: "2026-03-10", zeit: "14:00" })
    ];
    return Core.sortieren(liste).map(e => e.massnahmeId);
  });
  expect(r).toEqual(["intubation", "reanimation", "iv-zugang"]);
});

test("Statistik zählt Stufen, Settings und Maßnahmen korrekt", async ({ page }) => {
  const r = await core(page, (Core) => {
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang", stufe: "durchgefuehrt", setting: "mensch" }),
      Core.normalisieren({ massnahmeId: "iv-zugang", stufe: "assistiert", setting: "mensch" }),
      Core.normalisieren({ massnahmeId: "intubation", stufe: "beobachtet", setting: "simulator" })
    ];
    const s = Core.statistik(liste);
    return { gesamt: s.gesamt, stufen: s.stufen, settings: s.settings,
      erste: s.massnahmen[0].label, ersteZahl: s.massnahmen[0].gesamt };
  });
  expect(r.gesamt).toBe(3);
  expect(r.stufen).toEqual({ beobachtet: 1, assistiert: 1, durchgefuehrt: 1 });
  expect(r.settings).toEqual({ simulator: 1, praeparat: 0, mensch: 2 });
  expect(r.erste).toBe("i.v.-Zugang");
  expect(r.ersteZahl).toBe(2);
});

test("CSV: Semikolons, Anführungszeichen und Umlaute überleben", async ({ page }) => {
  const csv = await core(page, (Core) => {
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang", datum: "2026-03-10", zeit: "08:15",
        notiz: 'Zeile mit; Semikolon und "Zitat"', tags: ["Anästhesie-Woche"] })
    ];
    return Core.csv(liste);
  });
  const zeilen = csv.trim().split("\r\n");
  expect(zeilen[0]).toBe("Datum;Uhrzeit;Maßnahme;Kompetenzstufe;Setting;Ort;Trainingsblock;Tags;Notiz;Erstellt am");
  expect(zeilen[1]).toContain("2026-03-10;08:15;i.v.-Zugang;durchgeführt;Mensch");
  expect(zeilen[1]).toContain('"Zeile mit; Semikolon und ""Zitat"""');
  expect(zeilen[1]).toContain("Anästhesie-Woche");
});

test("Berichtsdaten: Zeitraum, Filter und Statuszeile stimmen", async ({ page }) => {
  const r = await core(page, (Core) => {
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang", datum: "2026-03-10", tags: ["PJ"] }),
      Core.normalisieren({ massnahmeId: "intubation", datum: "2026-05-01" })
    ];
    const b = Core.berichtDaten(liste, { von: "2026-03-01", bis: "2026-03-31",
      status: "unterschrift", blockText: "PJ Chirurgie" },
      { name: "Alex Muster", rollen: ["PJ-Student:in"] });
    return {
      anzahl: b.eintraege.length,
      meta: b.meta,
      titel: b.titel
    };
  });
  expect(r.anzahl).toBe(1);
  expect(r.titel).toBe("Ausbildungs- und Kompetenznachweis");
  const metaMap = Object.fromEntries(r.meta);
  expect(metaMap["Name"]).toBe("Alex Muster");
  expect(metaMap["Praktikum / Block"]).toBe("PJ Chirurgie");
  expect(metaMap["Zeitraum"]).toBe("01.03.2026 bis 31.03.2026");
  expect(metaMap["Status"]).toBe("Zur Unterschrift vorgesehen");
  expect(metaMap["Einträge"]).toBe("1");
});

test("PDF: Bericht ist ein echtes PDF mit Inhalt und Unterschriftsblock", async ({ page }) => {
  const r = await page.evaluate(async () => {
    const { Core, Pdf } = window.SLM;
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang", datum: "2026-03-10", zeit: "08:15",
        notiz: "Übungsnotiz äöüß", tags: ["PJ Chirurgie"] }),
      Core.normalisieren({ massnahmeId: "intubation", datum: "2026-03-12", stufe: "assistiert" })
    ];
    const blob = Pdf.bericht(Core.berichtDaten(liste, { von: "2026-03-01", bis: "2026-03-31" },
      { name: "Alex Muster" }));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let text = "";
    for (let i = 0; i < buf.length; i++) text += String.fromCharCode(buf[i]);
    return { typ: blob.type, groesse: buf.length, kopf: text.slice(0, 8),
      hatEof: text.indexOf("%%EOF") > 0,
      hatSeiten: /\/Count (\d+)/.exec(text)[1],
      hatUnterschrift: text.indexOf("Unterschrift Praxisanleitung") > 0,
      hatZusammenfassung: text.indexOf("Zusammenfassung nach Ma") > 0 };
  });
  expect(r.typ).toBe("application/pdf");
  expect(r.kopf).toContain("%PDF-1.4");
  expect(r.groesse).toBeGreaterThan(1500);
  expect(r.hatEof).toBe(true);
  expect(Number(r.hatSeiten)).toBeGreaterThan(0);
  expect(r.hatUnterschrift).toBe(true);
  expect(r.hatZusammenfassung).toBe(true);
});

test("Katalog: Umbenennen frischt die Schnappschüsse der Einträge auf", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Katalog } = window.SLM;
    const e = Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-10" });
    Katalog.umbenennen("iv-zugang", "i.v.-Zugang gelegt");
    return { label: Core.mLabel(Daten.get(e.id)), schnappschuss: Daten.get(e.id).massnahmeLabel };
  });
  expect(r.label).toBe("i.v.-Zugang gelegt");
  expect(r.schnappschuss).toBe("i.v.-Zugang gelegt");
});

test("Katalog: Symbol überlebt Speichern und Neuladen", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Katalog } = window.SLM;
    const a = Katalog.hinzufuegen("Auskultation", "diagnostik", "stethoskop");
    const b = Katalog.hinzufuegen("Impfung", "sonstiges", "💉");
    Katalog.laden();                       /* wie ein App-Neustart */
    const Core = window.SLM.Core;
    return {
      icons: [Core.massnahme(a.id).icon, Core.massnahme(b.id).icon],
      ohne: Core.massnahme("iv-zugang").icon
    };
  });
  expect(r.icons).toEqual(["stethoskop", "💉"]);
  expect(r.ohne).toBeUndefined();
});

test("Orte: RTW-Einsatz und NEF-Einsatz sind Standard, Bestände ziehen nach", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Orte, Core } = window.SLM;
    const frisch = Orte.alle().map(o => o.label);
    /* Alten Speicherstand nachstellen: "RTW" ohne Standmarke. */
    localStorage.setItem("slm_orte", JSON.stringify([{ id: "rtw", label: "RTW", eigen: false }]));
    localStorage.removeItem("slm_orte_stand");
    Orte.laden();
    const migriert = Core.orte.map(o => o.label).sort();
    /* Bewusst gelöschter Ort kehrt nicht zurück (Standmarke gesetzt). */
    Orte.entfernen("nef-einsatz");
    Orte.laden();
    const geloescht = Core.orte.some(o => o.id === "nef-einsatz");
    return { frisch, migriert, geloescht };
  });
  expect(r.frisch).toContain("RTW-Einsatz");
  expect(r.frisch).toContain("NEF-Einsatz");
  /* "Praktikum" ist kein Ort mehr – das übernimmt der Trainingsblock. */
  expect(r.frisch).not.toContain("Praktikum");
  expect(r.migriert).toEqual(["NEF-Einsatz", "RTW-Einsatz"]);
  expect(r.geloescht).toBe(false);
});

test("PDF-Encoder übersetzt typografische Zeichen in sichere ASCII-Formen", async ({ page }) => {
  const r = await page.evaluate(() =>
    window.SLM.Pdf._enc("Klinikpraktikum · OP – heute… „gut“"));
  expect(r).toBe('Klinikpraktikum / OP - heute... "gut"');
});

test("Orte: Löschen lässt Einträge über den Schnappschuss lesbar", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Orte } = window.SLM;
    const e = Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-10", ortId: "notaufnahme" });
    Orte.entfernen("notaufnahme");
    return Core.oLabel(Daten.get(e.id));
  });
  expect(r).toBe("Notaufnahme");
});

test("Tags: Umbenennen schreibt alle Einträge um", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Daten, TagDaten } = window.SLM;
    const e1 = Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-10", tags: ["PJ"] });
    const e2 = Daten.upsert({ massnahmeId: "intubation", datum: "2026-03-11", tags: ["pj"] });
    const n = TagDaten.umbenennen("PJ", "PJ Innere");
    return { n, t1: Daten.get(e1.id).tags, t2: Daten.get(e2.id).tags };
  });
  expect(r.n).toBe(2);
  expect(r.t1).toEqual(["PJ Innere"]);
  expect(r.t2).toEqual(["PJ Innere"]);
});

test("Sicherung: Export und Import erhalten eigene Stammdaten", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Katalog, Orte } = window.SLM;
    const m = Katalog.hinzufuegen("Lumbalpunktion");
    const o = Orte.hinzufuegen("Notaufnahme Haus B");
    Daten.upsert({ massnahmeId: m.id, datum: "2026-03-10", ortId: o.id, tags: ["Famulatur"] });
    const sicherung = JSON.parse(JSON.stringify(Daten.exportObjekt()));
    /* Alles löschen und aus der Sicherung wiederherstellen. */
    Daten.alleLoeschen();
    localStorage.removeItem(Katalog.KEY); localStorage.removeItem(Orte.KEY);
    Katalog.laden(); Orte.laden();
    const n = Daten.importObjekt(sicherung);
    const e = Daten.alle()[0];
    return { n, label: Core.mLabel(e), ort: Core.oLabel(e), tags: e.tags };
  });
  expect(r.n).toBe(1);
  expect(r.label).toBe("Lumbalpunktion");
  expect(r.ort).toBe("Notaufnahme Haus B");
  expect(r.tags).toEqual(["Famulatur"]);
});

test("Import lehnt fremde Dateien mit klarer Meldung ab", async ({ page }) => {
  const fehler = await page.evaluate(() => {
    try { window.SLM.Daten.importObjekt({ irgendwas: true }); return null; }
    catch(e){ return e.message; }
  });
  expect(fehler).toContain("keine SkillLog-Med-Einträge");
});

test("Maßnahmen-Kategorien: anlegen, filtern, löschen fällt auf Sonstiges zurück", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Katalog, MKategorien } = window.SLM;
    /* Eigene Kategorie mit eigener Maßnahme */
    const k = MKategorien.hinzufuegen("Pädiatrie");
    const m = Katalog.hinzufuegen("Neugeborenen-Check", k.id);
    Daten.upsert({ massnahmeId: m.id, datum: "2026-03-10" });
    Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-11" });
    const gefiltert = Core.filtern(Daten.alle(), { mkategorie: k.id }).length;
    const zugaenge = Core.filtern(Daten.alle(), { mkategorie: "zugaenge" }).length;
    /* Löschen: Maßnahme wandert nach Sonstiges */
    const betroffen = MKategorien.entfernen(k.id);
    const sonstigesNichtLoeschbar = MKategorien.entfernen("sonstiges");
    return { gefiltert, zugaenge, betroffen,
      neueKategorie: Core.massnahme(m.id).kategorie,
      sonstigesNichtLoeschbar,
      standard: Core.massnahme("iv-zugang").kategorie };
  });
  expect(r.gefiltert).toBe(1);
  expect(r.zugaenge).toBe(1);
  expect(r.betroffen).toBe(1);
  expect(r.neueKategorie).toBe("sonstiges");
  expect(r.sonstigesNichtLoeschbar).toBe(0);
  expect(r.standard).toBe("zugaenge");
});

test("Sicherung erhält eigene Kategorien samt Zuordnung", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Katalog, MKategorien } = window.SLM;
    const k = MKategorien.hinzufuegen("Anästhesie-Rotation");
    const m = Katalog.hinzufuegen("Spinalanästhesie assistiert", k.id);
    Daten.upsert({ massnahmeId: m.id, datum: "2026-03-10" });
    const sicherung = JSON.parse(JSON.stringify(Daten.exportObjekt()));
    Daten.alleLoeschen();
    [MKategorien.KEY, Katalog.KEY].forEach(key => localStorage.removeItem(key));
    MKategorien.laden(); Katalog.laden();
    Daten.importObjekt(sicherung);
    const wieder = Core.massnahme(m.id);
    return { label: wieder.label, katLabel: Core.mkLabel(wieder) };
  });
  expect(r.label).toBe("Spinalanästhesie assistiert");
  expect(r.katLabel).toBe("Anästhesie-Rotation");
});

test("Statistik zählt auch je Kategorie", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core } = window.SLM;
    const liste = [
      Core.normalisieren({ massnahmeId: "iv-zugang" }),
      Core.normalisieren({ massnahmeId: "blutentnahme" }),
      Core.normalisieren({ massnahmeId: "intubation" })
    ];
    return Core.statistik(liste).kategorien;
  });
  expect(r[0]).toEqual({ label: "Zugänge & Punktionen", gesamt: 2 });
  expect(r[1]).toEqual({ label: "Atemweg & Beatmung", gesamt: 1 });
});

test("Profil: alter Einzelwert wird auf die Rollenliste gehoben", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Profil } = window.SLM;
    /* Speicherstand aus Schema 1: genau eine Rolle im Feld `rolle` */
    localStorage.setItem(Profil.KEY, JSON.stringify({
      name: "Alt Nutzer", rolle: "Notfallsanitäter:in", institution: "", standardOrt: "" }));
    Profil.laden();
    return Profil.werte.rollen;
  });
  expect(r).toEqual(["Notfallsanitäter:in"]);
});

test("Profil: Rollen werden entdoppelt und begrenzt", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Profil } = window.SLM;
    return {
      doppelt: Profil.rollenSaeubern(["PJ-Student:in", "pj-student:in", "  Notfallsanitäter:in  "]),
      grenze: Profil.rollenSaeubern(["a", "b", "c", "d", "e", "f", "g"]).length
    };
  });
  expect(r.doppelt).toEqual(["PJ-Student:in", "Notfallsanitäter:in"]);
  expect(r.grenze).toBe(5);
});

test("Blöcke: Unterblock zählt auf seinen Oberblock, Filter schließt ihn ein", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten } = window.SLM;
    Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-10", blockId: "klinik-op" });
    Daten.upsert({ massnahmeId: "intubation", datum: "2026-03-11", blockId: "klinik-intensiv" });
    Daten.upsert({ massnahmeId: "blutentnahme", datum: "2026-03-12", blockId: "rettungswache" });
    const stat = Core.statistik(Daten.alle());
    return {
      /* Der Oberblock-Filter holt OP und Intensivstation zusammen. */
      ober: Core.filtern(Daten.alle(), { block: "klinikpraktikum" }).length,
      unter: Core.filtern(Daten.alle(), { block: "klinik-op" }).length,
      andere: Core.filtern(Daten.alle(), { block: "rettungswache" }).length,
      bloecke: stat.bloecke.map(b => [b.label, b.gesamt, !!b.unter]),
      pfad: Core.blockPfad("klinik-op")
    };
  });
  expect(r.ober).toBe(2);
  expect(r.unter).toBe(1);
  expect(r.andere).toBe(1);
  expect(r.pfad).toBe("Klinikpraktikum · OP");
  /* Oberblock mit Summe, direkt gefolgt von seinen Unterblöcken. */
  expect(r.bloecke).toEqual([
    ["Rettungswachenpraktikum", 1, false],
    ["Klinikpraktikum", 2, false],
    ["OP", 1, true],
    ["Intensivstation", 1, true]
  ]);
});

test("Blöcke: eigener Unterblock, Umbenennen frischt Schnappschüsse auf", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Bloecke } = window.SLM;
    const unter = Bloecke.hinzufuegen("Anästhesie", "klinikpraktikum");
    const e = Daten.upsert({ massnahmeId: "intubation", datum: "2026-03-10", blockId: unter.id });
    Bloecke.umbenennen("klinikpraktikum", "Klinikrotation");
    return { pfad: Core.bLabel(Daten.get(e.id)), schnapp: Daten.get(e.id).blockLabel };
  });
  expect(r.pfad).toBe("Klinikrotation · Anästhesie");
  expect(r.schnapp).toBe("Klinikrotation · Anästhesie");
});

test("Blöcke: Löschen nimmt Unterblöcke mit, Einträge bleiben lesbar", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Bloecke } = window.SLM;
    const e = Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-10", blockId: "klinik-op" });
    const betroffen = Bloecke.entfernen("klinikpraktikum");
    return {
      betroffen,
      weg: Core.bloecke.filter(b => b.id === "klinik-op" || b.id === "klinik-intensiv").length,
      label: Core.bLabel(Daten.get(e.id))
    };
  });
  expect(r.betroffen).toBe(1);
  expect(r.weg).toBe(0);
  /* Der Schnappschuss trägt den Eintrag weiter. */
  expect(r.label).toBe("Klinikpraktikum · OP");
});

test("Sicherung erhält Blöcke samt Zuordnung", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten, Bloecke } = window.SLM;
    const b = Bloecke.hinzufuegen("Auslandsfamulatur");
    const u = Bloecke.hinzufuegen("Ambulanz", b.id);
    const e = Daten.upsert({ massnahmeId: "iv-zugang", datum: "2026-03-10", blockId: u.id });
    const sicherung = JSON.parse(JSON.stringify(Daten.exportObjekt()));
    Daten.alleLoeschen();
    localStorage.removeItem(Bloecke.KEY);
    Bloecke.laden();
    Daten.importObjekt(sicherung);
    return Core.bLabel(Daten.alle()[0]);
  });
  expect(r).toBe("Auslandsfamulatur · Ambulanz");
});

test("Zusammengelegte Maßnahmen: alte IDs zeigen auf den neuen Eintrag", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Daten } = window.SLM;
    /* Ein Eintrag aus einem älteren Stand mit der alten Maßnahmen-ID */
    const e = Daten.upsert({ massnahmeId: "sono-assistiert", datum: "2026-03-10",
      stufe: "assistiert" });
    const n = Daten.upsert({ massnahmeId: "naht-durchgefuehrt", datum: "2026-03-11",
      stufe: "durchgefuehrt" });
    return {
      id: Daten.get(e.id).massnahmeId, label: Core.mLabel(Daten.get(e.id)),
      stufe: Daten.get(e.id).stufe,
      nahtId: Daten.get(n.id).massnahmeId, nahtLabel: Core.mLabel(Daten.get(n.id)),
      /* Die Doppel-Einträge sind aus dem Katalog verschwunden. */
      katalog: Core.katalog.filter(m => /sono|naht/.test(m.id)).map(m => m.id)
    };
  });
  expect(r.id).toBe("sonographie");
  expect(r.label).toBe("Sonographie");
  /* Die Kompetenzstufe bleibt unangetastet – sie trägt jetzt die Aussage. */
  expect(r.stufe).toBe("assistiert");
  expect(r.nahtId).toBe("naht");
  expect(r.nahtLabel).toBe("Naht / Klammerung");
  expect(r.katalog.sort()).toEqual(["naht", "sonographie"]);
});

test("Katalog-Migration führt alte Stände zusammen", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Katalog } = window.SLM;
    /* Katalogstand von früher: beide Sonographie-Einträge getrennt,
       einer davon als Favorit. */
    localStorage.setItem(Katalog.KEY, JSON.stringify([
      { id: "iv-zugang", label: "i.v.-Zugang", kategorie: "zugaenge" },
      { id: "sono-assistiert", label: "Sonographie assistiert",
        kategorie: "diagnostik", favorit: true },
      { id: "sono-durchgefuehrt", label: "Sonographie durchgeführt",
        kategorie: "diagnostik", archiviert: true }
    ]));
    Katalog.laden();
    const s = Core.massnahme("sonographie");
    return { ids: Core.katalog.map(m => m.id), favorit: s.favorit, archiviert: s.archiviert,
      label: s.label };
  });
  expect(r.ids).toEqual(["iv-zugang", "sonographie"]);
  expect(r.label).toBe("Sonographie");
  /* Favorit gewinnt, archiviert nur wenn beide archiviert waren. */
  expect(r.favorit).toBe(true);
  expect(r.archiviert).toBe(false);
});

test("Blöcke: Zeitraum wird gespeichert und lesbar aufbereitet", async ({ page }) => {
  const r = await page.evaluate(() => {
    const { Core, Bloecke } = window.SLM;
    const voll = Bloecke.hinzufuegen("Famulatur Innere", "", "2026-03-01", "2026-03-31");
    const offen = Bloecke.hinzufuegen("Laufende Rotation", "", "2026-04-01", "");
    const ohne = Bloecke.hinzufuegen("Ohne Datum");
    Bloecke.umbenennen(voll.id, "Famulatur Innere", "2026-03-02", "2026-03-30");
    return {
      voll: Core.blockZeitraum(voll.id),
      offen: Core.blockZeitraum(offen.id),
      ohne: Core.blockZeitraum(ohne.id),
      gespeichert: [Core.block(voll.id).von, Core.block(voll.id).bis]
    };
  });
  expect(r.voll).toBe("02.03.2026 – 30.03.2026");
  expect(r.offen).toBe("ab 01.04.2026");
  expect(r.ohne).toBe("");
  expect(r.gespeichert).toEqual(["2026-03-02", "2026-03-30"]);
});

test("Bericht nennt den Trainingsblock samt Zeitraum", async ({ page }) => {
  const meta = await page.evaluate(() => {
    const { Core, Bloecke } = window.SLM;
    Bloecke.umbenennen("rettungswache", "Rettungswachenpraktikum", "2026-02-01", "2026-02-28");
    const b = Core.berichtDaten([], { block: "rettungswache" }, {});
    return Object.fromEntries(b.meta);
  });
  expect(meta["Trainingsblock"]).toBe("Rettungswachenpraktikum (01.02.2026 – 28.02.2026)");
});

test("Monogramm bildet lesbare Initialen", async ({ page }) => {
  const r = await core(page, (Core) => ({
    iv: Core.monogramm("i.v.-Zugang"),
    rea: Core.monogramm("Reanimation"),
    ekg: Core.monogramm("EKG geschrieben"),
    leer: Core.monogramm("")
  }));
  expect(r.iv).toBe("IV");
  expect(r.rea).toBe("RE");
  expect(r.ekg).toBe("EG");
  expect(r.leer).toBe("?");
});
