# SkillLog Med – Digitales Logbuch für klinische Maßnahmen

SkillLog Med ist ein **persönliches Ausbildungs- und Kompetenzlogbuch** für
medizinische Maßnahmen: dokumentieren, wie oft ein Skill durchgeführt wurde –
mit Kompetenzstufe, Setting, Ort, Tags und Notiz – und daraus druckbare
Berichte für Praktika, Ausbildung und Portfolio erzeugen. Gedacht für
Medizinstudierende, PJler, Ärztinnen und Ärzte in Weiterbildung, Notfall- und
Rettungssanitäter und verwandte Gesundheitsberufe.

> Alle Daten bleiben **lokal auf dem Gerät** – kein Konto, kein Server,
> keine Cloud, kein Tracking. SkillLog Med ist **keine Patientenakte**: Die
> App fragt an keiner Stelle nach Patientendaten. Die aktuelle Version (V1)
> enthält weder Werbung noch Käufe.

## Funktionen (V1)

- **Schneller Eintrag:** Maßnahme, Kompetenzstufe (beobachtet / assistiert /
  durchgeführt), Setting (Simulator / Präparat / Mensch), Datum/Uhrzeit
  (vorbelegt mit „jetzt“), Ort, Trainingsblock und Tags – ein Eintrag steht in
  10–20 Sekunden. Favoriten und zuletzt genutzte Maßnahmen ganz oben,
  „Speichern + Neu“ für Serien, „Nochmal erfasst“ zum Duplizieren
- **Mehrfach an einem Tag:** dieselbe Maßnahme mit einer Anzahl auf einmal
  erfassen. Ohne Häkchen entstehen die Einträge bewusst ohne Uhrzeit; wer sie
  braucht, schaltet „Uhrzeiten einzeln erfassen“ ein und trägt je Eintrag eine
  Zeit ein
- **Trainingsblöcke:** Praktika und Rotationen, zweistufig – „Klinikpraktikum“
  mit Unterblöcken wie „OP“ oder „Intensivstation“, jeweils mit optionalem
  Zeitraum. Im Logbuch direkt als Chips aufrufbar, in der Statistik zählt der
  Oberblock seine Unterblöcke mit und ist antippbar; im Bericht setzt die
  Blockwahl den Zeitraum
- **Maßnahmenkatalog:** 18 mitgelieferte Standardmaßnahmen (i.v.-Zugang,
  Intubation, Reanimation, EKG, Sonographie, Naht …) mit eigenen
  Piktogrammen, frei erweiterbar, umbenennbar, archivierbar, mit Favoriten
- **Maßnahmen-Kategorien:** acht mitgelieferte Gruppen (Zugänge, Atemweg,
  Notfall, Diagnostik …) plus eigene – gruppieren Formular, Verwaltung,
  Filter und Statistik; „Sonstiges“ ist der feste Auffangwert
- **Orte & Tags:** vordefinierte Einsatzbereiche (RTW, Notaufnahme, OP,
  Station …) plus eigene. Tags sind bewusst ein leichtes Nebenwerkzeug: freie
  Schlagworte wie „Klinik“, mehrfach pro Eintrag, bekannte stehen zum
  Antippen bereit
- **Dashboard:** Gesamtzahl, Heute / 7 Tage / Monat, letzte Einträge,
  häufigste Maßnahmen. Beim allerersten Start steht dort ein Beispiel-Eintrag
  („EKG geschrieben“) statt einer leeren Fläche – mit einem Tipp entfernt
- **Logbuch:** chronologisch nach Tagen gruppiert, Volltextsuche,
  Schnellfilter (Heute, 7 Tage, 30 Tage) und Detailfilter nach Zeitraum,
  Maßnahme, Stufe, Setting, Ort und Tag
- **Statistik:** Stufenverteilung, Maßnahmen-, Setting- und Orts-Häufigkeit
  je Zeitraum
- **Export:** PDF-Bericht mit Zusammenfassung, Detailliste und
  **Unterschriftsblock** für die Praxisanleitung (ohne Abhängigkeiten direkt
  in der App erzeugt), CSV-Export für Excel/Numbers, Druckansicht im Browser
- **Sicherung:** JSON-Backup und -Wiederherstellung inklusive aller Stammdaten
- **Profil:** Name, **mehrere Rollen** (z. B. PA-Student:in *und*
  Notfallsanitäter:in, eigene Bezeichnungen möglich), Institution und
  Standard-Ort – erscheint im Bericht
- Helles Design mit Dark Mode, responsiv, Ersteinrichtungs-Dialog

## Technik

- Eine einzige, in sich geschlossene `index.html` (inline CSS/JS, keine
  externen Abhängigkeiten) – als Web-App und per Capacitor als Android-App
- Klar getrennte Ebenen im Code: Logik-Kern (Datum/Filter/Statistik/CSV/
  Berichtsdaten, DOM-frei und testbar) → PDF-Erzeugung (eigener kleiner
  PDF-Schreiber, Helvetica/WinAnsi) → Datenschicht (versioniertes Schema im
  localStorage unter `slm_`-Schlüsseln) → Oberfläche → native Module
- Einträge speichern Maßnahme und Ort zusätzlich als **Schnappschuss**
  (`massnahmeLabel`/`ortLabel`): Alte Einträge bleiben lesbar, auch wenn
  Katalogbegriffe später geändert oder gelöscht werden. Jeder Datensatz läuft
  beim Laden, Speichern und Importieren durch `Core.normalisieren()` – die
  eine Stelle für spätere Schema-Migrationen
- `npm run sync` kopiert die Web-Dateien nach `www/` (Quelle für die Capacitor-App)
- Service Worker (`sw.js`) wird nur auf `github.io` registriert, nicht in der App
- Native Brücke mit Feature-Detection (`window.Capacitor`): Exporte laufen im
  Browser über `a.download`, in der Android-App über Filesystem + Share
- Plugins werden ausschließlich über `window.Capacitor.Plugins.<Name>` angesprochen
  (kein Bundler, daher kein `Capacitor.registerPlugin`)
- AdMob-/Billing-Module liegen als ruhende Infrastruktur für spätere Versionen bei,
  sind in V1 aber vollständig deaktiviert und nirgends sichtbar

## Entwicklung

```
npm install          # Abhängigkeiten (einmalig)
npm run sync         # Web-Dateien nach www/ kopieren
npm run cap:sync     # www/ + Android-Projekt aktualisieren
```

Android Studio: nach `npm install` und `npm run cap:sync` den Ordner
`android/` öffnen (nicht die Repo-Wurzel).

## Tests

Playwright-Tests (vorinstalliertes Chromium, kein `playwright install`):

```
npx playwright test
```

## Web-Version

Die App läuft als Web-Version unter: <https://marqewi.github.io/SkillLog-Med/>
(GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root)
