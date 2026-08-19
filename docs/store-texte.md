# Play-Store-Texte – SkillLog Med

Fünfte App im MERCwerk-Konto und die zweite außerhalb des Fitness-Themas.
Die Texte sind komplett neu geschrieben: anderer Einstieg, andere Gliederung,
andere Bildsprache als bei BFT, PFT, SGT und Never2Late. „Wiederholter
Inhalt“ ist bei mehreren Apps desselben Kontos das größte Ablehnungsrisiko.
**Nichts aus den anderen Store-Einträgen übernehmen.**

## App-Name (max. 30 Zeichen)

```
SkillLog Med – Skill-Logbuch
```

(28 Zeichen. Der Launcher-Name unter dem Icon bleibt kurz „SkillLog Med“.)

Alternative, falls der Name schon belegt ist:

```
SkillLog Med Kompetenzlogbuch
```

(29 Zeichen)

## Kurzbeschreibung (max. 80 Zeichen)

```
Logbuch für Medizin-Skills: erfassen, auswerten, Bericht zur Unterschrift.
```

(74 Zeichen)

## Vollständige Beschreibung (max. 4000 Zeichen)

```
Wie viele i.v.-Zugänge waren es in der Famulatur wirklich? Wie oft hast du intubiert – am Simulator und am Menschen? Wer am Ende eines Praktikums Zahlen braucht, hat sie selten. SkillLog Med ist das Logbuch, das diese Zahlen liefert: für Medizinstudierende, PJler, Ärztinnen und Ärzte in Weiterbildung, Notfallsanitäter und Rettungssanitäter.

EIN EINTRAG IN 20 SEKUNDEN
Maßnahme antippen, Kompetenzstufe wählen (beobachtet, assistiert, durchgeführt), Setting dazu (Simulator, Präparat, Mensch), Ort bestätigen – gespeichert. Datum und Uhrzeit stehen schon drin, der letzte Ort ist vorausgewählt, Favoriten und zuletzt genutzte Maßnahmen ganz oben. Für Serien gibt es „Speichern + Neu“, für Wiederholungen „Nochmal erfasst“.

DER KATALOG GEHÖRT DIR
27 Standardmaßnahmen sind dabei – vom intravenösen Zugang über Guedel- und Wendl-Tubus, Absaugung, endotracheale Intubation, Defibrillation und Reanimation bis Blutzuckermessung, EKG, Sonographie und Naht. Alles lässt sich umbenennen, archivieren und um eigene Maßnahmen ergänzen. Genauso bei den Orten: Rettungswache, RTW-Einsatz, NEF-Einsatz, Notaufnahme, Schockraum, OP und mehr sind vordefiniert, eigene kommen in Sekunden dazu.

TRAININGSBLÖCKE UND TAGS
Ordne Einträge einem Trainingsblock zu – „Klinikpraktikum“ mit Unterblöcken wie „OP“ oder „Intensivstation“, mit Zeitraum. Dazu freie Tags wie „Klinik“ oder „Nachtdienst“. Damit holst du dir später mit einem Tipp genau die Einträge eines Ausbildungsblocks zurück – im Logbuch, in der Statistik und im Bericht.

ZAHLEN, DIE DU VORZEIGEN KANNST
Die Statistik zeigt je Zeitraum, wie oft du welche Maßnahme dokumentiert hast und wie sich beobachtet, assistiert und durchgeführt verteilen. Das Dashboard hält die aktuelle Woche und den Monat im Blick.

BERICHT MIT UNTERSCHRIFTSFELD
Der PDF-Bericht bündelt einen frei wählbaren Zeitraum: Zusammenfassung je Maßnahme, Aufschlüsselung nach Kompetenzstufe, Detailliste aller Einträge – und ein klassisches Unterschriftsfeld für Praxisanleitung oder Ausbildungsverantwortliche. Dazu CSV-Export für Excel und eine JSON-Sicherung samt Wiederherstellung.

KEINE PATIENTENAKTE
SkillLog Med dokumentiert deine Ausbildung, nicht deine Patienten. Die App fragt nirgends nach Patientendaten und erinnert im Notizfeld daran, keine zu erfassen.

SECHS SPRACHEN
Deutsch, Englisch, Spanisch, Französisch, Italienisch und Portugiesisch – in den Einstellungen umschaltbar, inklusive Bericht und Standardkatalog.

ALLES BLEIBT AUF DEINEM GERÄT
Kein Konto, keine Anmeldung, kein Server, keine Cloud, keine Werbung, keine Käufe. Alle Daten liegen ausschließlich lokal; Sicherung und Export erzeugst du selbst als Datei. Funktioniert komplett offline, hell und dunkel.

Ob ein Bericht als offizieller Nachweis anerkannt wird, entscheidet deine Ausbildungsstätte – SkillLog Med liefert die sauber dokumentierte Grundlage.
```

## Grafiken

| Was | Datei |
|---|---|
| App-Icon 512 × 512 | `icons/icon-512.png` |
| Feature-Grafik 1024 × 500 | `docs/store-grafiken/feature-grafik-1024x500.png` |
| Screenshots 1080 × 1920 (7 Stück) | `docs/store-grafiken/screenshot-1…7-1080x1920.png` |

Neu erzeugen lassen sie sich mit:

```
python3 -m http.server 8931 &
node scripts/screenshots.mjs
node scripts/store-grafiken.mjs
```

## Data Safety – die Antworten in Kurzform

SkillLog Med erhebt **keine** Daten. Das macht das Formular kurz:

| Frage | Antwort |
|---|---|
| Werden Nutzerdaten erhoben oder geteilt? | **Nein** |
| Werden Daten verschlüsselt übertragen? | entfällt (es werden keine Daten übertragen) |
| Können Nutzer die Löschung beantragen? | entfällt – gelöscht wird in der App bzw. durch Deinstallation |
| Enthält die App Werbung? | **Nein** |
| Enthält die App In-App-Käufe? | **Nein** |
| Zielgruppe | Nicht speziell für Kinder |

## Kategorie: bewusst NICHT „Medizin“

Kategorie: **Bildung**. SkillLog Med ist ein Ausbildungs-Logbuch – es
diagnostiziert nichts, behandelt nichts und verwaltet keine Patientendaten.
Die Play-Kategorien **„Medizin“** und **„Gesundheit & Fitness“** lösen
zusätzliche Prüfungen und Nachweispflichten aus (Gesundheits-Apps-Erklärung)
und sollten deshalb **nicht** gewählt werden, obwohl das Wort „Med“ im Namen
steckt. Tags sparsam wählen und aufs Dokumentieren/Lernen ausrichten, nicht
auf Diagnose oder Therapie.

## Was in V1 bewusst fehlt

Keine Werbung, keine Premium-Version, kein In-App-Produkt, keine Limits.
Die Module dafür liegen im Code vorbereitet, sind aber abgeschaltet – siehe
`docs/veroeffentlichung.md`, Abschnitt „Später: Monetarisierung“.
