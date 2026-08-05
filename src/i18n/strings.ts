/**
 * German translations, keyed by the English source string. `t(en)` returns
 * `de[en]` when the language is German, otherwise the English source, so any
 * missing entry degrades gracefully to English. `{name}` placeholders in the
 * source are interpolated by the translator (see app/prefs.tsx).
 */
export const de: Record<string, string> = {
  // Brand / nav
  "film log → digital scans": "Filmprotokoll → digitale Scans",
  Overview: "Übersicht",
  Search: "Suche",
  "Film rolls": "Filme",
  Cameras: "Kameras",
  Lenses: "Objektive",
  "Film stocks": "Filmsorten",
  Insights: "Statistik",
  "Pair devices": "Geräte koppeln",
  "Print booklet": "Heft drucken",
  Settings: "Einstellungen",

  // Common actions
  Save: "Speichern",
  Cancel: "Abbrechen",
  Delete: "Löschen",
  Add: "Hinzufügen",
  Notes: "Notizen",
  Close: "Schließen",
  "Start over": "Neu beginnen",
  "← Rolls": "← Filme",

  // Dashboard
  "Turn your handwritten film log into clean digital metadata: record cameras, lenses and film stocks, log every frame of a roll, assign your scans, then export XMP/EXIF for Lightroom, Capture One, Explorer or Finder.":
    "Verwandle dein handschriftliches Filmprotokoll in saubere digitale Metadaten: Kameras, Objektive und Filmsorten erfassen, jedes Bild eines Films protokollieren, Scans zuordnen und dann XMP/EXIF für Lightroom, Capture One, Explorer oder Finder exportieren.",
  "Open film rolls": "Filme öffnen",
  Rolls: "Filme",
  "Frames logged": "Bilder erfasst",
  "Scans linked": "Scans verknüpft",
  "🎬 Log a roll": "🎬 Film protokollieren",
  "Create a roll and fill in each frame from your notes.": "Lege einen Film an und trage jedes Bild aus deinen Notizen ein.",
  "🖨️ Print a booklet": "🖨️ Heft drucken",
  "Make blank DIN A6 log sheets to shoot with.": "Erstelle leere DIN-A6-Protokollblätter zum Fotografieren.",
  "📷 Set up gear": "📷 Ausrüstung einrichten",
  "Add your cameras, lenses and film stocks.": "Füge deine Kameras, Objektive und Filmsorten hinzu.",
  "Recent rolls": "Letzte Filme",
  frames: "Bilder",
  "create your first roll": "lege deinen ersten Film an",
  "Added {name}": "{name} hinzugefügt",
  "Software tag (written into metadata)": "Software-Kennung (in Metadaten geschrieben)",

  // Cameras
  "Your camera bodies. Make and model become the EXIF/XMP camera fields on every frame you shoot with them.":
    "Deine Kameragehäuse. Hersteller und Modell werden zu den EXIF/XMP-Kamerafeldern jedes damit fotografierten Bildes.",
  "＋ Add camera": "＋ Kamera hinzufügen",
  "No cameras yet": "Noch keine Kameras",
  "Add your first analog body to start logging rolls.": "Füge dein erstes analoges Gehäuse hinzu, um Filme zu protokollieren.",
  "Add camera": "Kamera hinzufügen",
  "Edit camera": "Kamera bearbeiten",
  Make: "Hersteller",
  Model: "Modell",
  Format: "Format",
  "Serial number (optional)": "Seriennummer (optional)",
  "Camera added": "Kamera hinzugefügt",
  "Camera updated": "Kamera aktualisiert",
  "Camera deleted": "Kamera gelöscht",

  // Lenses
  "Lenses you assign per frame. Focal length and lens model flow into the scan metadata.":
    "Objektive, die du pro Bild zuordnest. Brennweite und Modell fließen in die Scan-Metadaten ein.",
  "＋ Add lens": "＋ Objektiv hinzufügen",
  "No lenses yet": "Noch keine Objektive",
  "Add the lenses you shoot with to assign them per frame.": "Füge die Objektive hinzu, mit denen du fotografierst, um sie pro Bild zuzuordnen.",
  "Add lens": "Objektiv hinzufügen",
  "Edit lens": "Objektiv bearbeiten",
  "Focal length (mm)": "Brennweite (mm)",
  "Max aperture": "Größte Blende",
  "Lens added": "Objektiv hinzugefügt",
  "Lens updated": "Objektiv aktualisiert",
  "Lens deleted": "Objektiv gelöscht",

  // Films
  "The films you shoot. ISO and stock name are recorded per roll and written to every frame's metadata and keywords.":
    "Die Filme, die du fotografierst. ISO und Sortenname werden pro Film erfasst und in die Metadaten und Schlagwörter jedes Bildes geschrieben.",
  "＋ Add film": "＋ Film hinzufügen",
  "No film stocks yet": "Noch keine Filmsorten",
  "Add one manually, or pick from the popular presets below.": "Füge eine manuell hinzu oder wähle unten aus den beliebten Vorlagen.",
  "Quick add presets": "Vorlagen schnell hinzufügen",
  "Add film": "Film hinzufügen",
  "Edit film": "Film bearbeiten",
  Brand: "Marke",
  Name: "Name",
  Type: "Typ",
  Process: "Prozess",
  "Film added": "Film hinzugefügt",
  "Film updated": "Film aktualisiert",
  "Film deleted": "Film gelöscht",

  // Rolls
  "Each roll pairs a camera with a film stock and holds one frame per exposure. Open a roll to log frames and assign your scans.":
    "Jeder Film verbindet eine Kamera mit einer Filmsorte und enthält ein Bild pro Aufnahme. Öffne einen Film, um Bilder zu protokollieren und Scans zuzuordnen.",
  "＋ New roll": "＋ Neuer Film",
  "No rolls yet": "Noch keine Filme",
  "Create your first roll to start logging frames.": "Lege deinen ersten Film an, um Bilder zu protokollieren.",
  "New roll": "Neuer Film",
  "Label / roll code": "Bezeichnung / Filmcode",
  Camera: "Kamera",
  "Film stock": "Filmsorte",
  "— none —": "— keine —",
  Frames: "Bilder",
  "Push/pull to EI": "Push/Pull auf EI",
  "box speed": "Nennempfindlichkeit",
  "Date loaded": "Eingelegt am",
  "Create & log frames": "Anlegen & Bilder protokollieren",
  "Roll created": "Film angelegt",
  complete: "vollständig",
  "{n} linked": "{n} verknüpft",
  "Pushed to EI {n}": "Gepusht auf EI {n}",
  "No camera/film set": "Keine Kamera/kein Film gesetzt",
  "Tip: add cameras and film stocks first so you can attach them — you can still create the roll without them.":
    "Tipp: Lege zuerst Kameras und Filmsorten an, um sie zuzuordnen — du kannst den Film aber auch ohne sie anlegen.",

  // Roll workspace
  "＋ Import scans": "＋ Scans importieren",
  "⇄ Auto-assign in order": "⇄ Der Reihe nach zuordnen",
  "📷 Capture log page": "📷 Protokollseite aufnehmen",
  "⤵ Apply to empty frames": "⤵ Auf leere Bilder anwenden",
  "＋ Frame": "＋ Bild",
  "Roll settings": "Film-Einstellungen",
  "⤓ Export metadata": "⤓ Metadaten exportieren",
  "🖨️ Print log sheets": "🖨️ Protokollblätter drucken",
  "📷 Scan booklet": "📷 Heft scannen",
  "Point at the booklet QR code": "Auf den QR-Code des Hefts richten",
  "That's not a booklet code": "Das ist kein Heft-Code",
  "That roll isn't on this device": "Dieser Film ist nicht auf diesem Gerät",
  "{n} frames linked to scans": "{n} Bilder mit Scans verknüpft",
  "Log page reference": "Protokollseite (Referenz)",
  "🔎 Recognise handwriting": "🔎 Handschrift erkennen",
  "Reading… {pct}%": "Lese… {pct}%",
  "OCR (beta): reads the sheet into frame suggestions you review before applying. Works best on a straight, well-lit photo with neat block capitals.":
    "OCR (Beta): liest das Blatt in Bildvorschläge, die du vor dem Anwenden prüfst. Funktioniert am besten bei einem geraden, gut beleuchteten Foto mit sauberen Druckbuchstaben.",
  "No text recognised — try a sharper, straighter photo": "Kein Text erkannt — versuche ein schärferes, gerades Foto",
  "Text recognition failed on this device": "Texterkennung auf diesem Gerät fehlgeschlagen",
  "Review recognised text": "Erkannten Text prüfen",
  "Check each row — OCR of handwriting isn't perfect. Set a frame number for a row to apply it; leave it blank to skip.":
    "Prüfe jede Zeile — Handschrift-OCR ist nicht perfekt. Setze eine Bildnummer, um eine Zeile anzuwenden; leer lassen zum Überspringen.",
  "Apply to frames": "Auf Bilder anwenden",
  "Applied OCR to {n} frames": "OCR auf {n} Bilder angewendet",
  "Nothing to apply": "Nichts anzuwenden",
  Remove: "Entfernen",
  "Roll not found": "Film nicht gefunden",
  "Back to rolls": "Zurück zu den Filmen",
  "Imported scans": "Importierte Scans",
  "Link at least one scan first": "Verknüpfe zuerst mindestens einen Scan",
  "Log page attached": "Protokollseite angehängt",

  // Frame editor
  "⧉ Copy previous": "⧉ Vorheriges übernehmen",
  "no scan linked": "kein Scan verknüpft",
  "Linked scan": "Verknüpfter Scan",
  "— not linked —": "— nicht verknüpft —",
  "Subject / title": "Motiv / Titel",
  Description: "Beschreibung",
  Lens: "Objektiv",
  "Focal length override (mm)": "Brennweite überschreiben (mm)",
  "from lens": "vom Objektiv",
  "Aperture (f-stop)": "Blende (f-Wert)",
  "Shutter speed": "Verschlusszeit",
  Weather: "Wetter",
  "Date & time taken": "Aufnahmedatum & -zeit",
  "Location (place)": "Ort",
  "🔎 Find coordinates": "🔎 Koordinaten finden",
  "🔎 Finding…": "🔎 Suche…",
  "🌤 Weather for this place & time": "🌤 Wetter für Ort & Zeit",
  "🌤 Fetching…": "🌤 Rufe ab…",
  "The frame's location and time are yours to enter — the analog photo has none. Given a place and a date & time, the weather can be filled in retroactively from historical records.":
    "Ort und Zeit des Bildes gibst du selbst ein — das analoge Foto hat keine. Aus Ort und Datum/Uhrzeit lässt sich das Wetter nachträglich aus historischen Daten ergänzen.",
  "Keywords (comma separated)": "Schlagwörter (durch Komma getrennt)",
  "GPS latitude": "GPS-Breite",
  "GPS longitude": "GPS-Länge",
  "Type a location first": "Gib zuerst einen Ort ein",
  "Set the date & time first": "Setze zuerst Datum & Uhrzeit",
  "Add a location (or its GPS) first": "Füge zuerst einen Ort (oder dessen GPS) hinzu",
  "Values pulled from the roll: film {film}, camera {camera}. These are merged into every frame's metadata automatically on export.":
    "Vom Film übernommen: Film {film}, Kamera {camera}. Diese werden beim Export automatisch in die Metadaten jedes Bildes eingefügt.",
  Frame: "Bild",

  // Insights
  "Your shooting habits across every roll you've logged.": "Deine Fotogewohnheiten über alle protokollierten Filme.",
  "No data yet": "Noch keine Daten",
  "Log a roll and your stats will appear here.": "Protokolliere einen Film und deine Statistik erscheint hier.",
  "Frames logged ": "Bilder erfasst ",
  "Most-shot films": "Meistgenutzte Filme",
  "Most-used cameras": "Meistgenutzte Kameras",
  "Favourite apertures": "Lieblingsblenden",
  "Most-used lenses": "Meistgenutzte Objektive",
  "No film assigned to rolls yet.": "Noch kein Film den Filmen zugeordnet.",
  "No camera assigned to rolls yet.": "Noch keine Kamera den Filmen zugeordnet.",
  "No apertures logged yet.": "Noch keine Blenden erfasst.",
  "No lenses assigned to frames yet.": "Noch keine Objektive den Bildern zugeordnet.",

  // Search
  "Find any roll, frame, camera, lens or film by subject, keyword, location, film stock and more.":
    "Finde jeden Film, jedes Bild, jede Kamera, jedes Objektiv oder jede Filmsorte nach Motiv, Schlagwort, Ort, Filmsorte und mehr.",
  "Start typing to search": "Zum Suchen tippen",
  "Results appear as you type.": "Ergebnisse erscheinen beim Tippen.",
  "Search everything…  e.g. “Portra”, “Hamburg”, “50mm”, “portrait”": "Alles durchsuchen…  z. B. „Portra“, „Hamburg“, „50mm“, „Porträt“",
  "No matches for “{q}”": "Keine Treffer für „{q}“",
  "{n} results": "{n} Treffer",

  // Print booklet
  "Generate blank DIN A6 log sheets to carry with your camera. Pre-fill the header with a camera and film, choose how many sheets, then print or save the PDF.":
    "Erzeuge leere DIN-A6-Protokollblätter für die Kameratasche. Fülle den Kopf mit Kamera und Film vor, wähle die Anzahl der Blätter und drucke oder speichere das PDF.",
  "Sheet title": "Blatt-Titel",
  Layout: "Layout",
  "Frames per sheet": "Bilder pro Blatt",
  Sheets: "Blätter",
  "Pre-fill camera (optional)": "Kamera vorausfüllen (optional)",
  "Pre-fill film (optional)": "Film vorausfüllen (optional)",
  "— blank —": "— leer —",
  Preview: "Vorschau",
  "⤓ Download PDF": "⤓ PDF herunterladen",
  "🖨️ Print": "🖨️ Drucken",
  "Booklet PDF downloaded": "Heft-PDF heruntergeladen",
  "Link to roll (adds a scannable back-link QR)": "Mit Film verknüpfen (fügt scannbaren QR-Rücklink hinzu)",
  "— none (blank sheets) —": "— keiner (leere Blätter) —",
  "One sheet per page": "Ein Blatt pro Seite",
  "A4 with 2×A6 (fold to booklet)": "A4 mit 2×A6 (zum Heft falten)",
  "Paper size": "Papiergröße",
  "Film": "Film",
  "Generate blank log sheets to carry with your camera. Choose a paper size, type or pick the camera, film and lens, then print or save the PDF.":
    "Erzeuge leere Protokollblätter für die Kameratasche. Wähle eine Papiergröße, tippe oder wähle Kamera, Film und Objektiv und drucke oder speichere das PDF.",
  "Type or pick your gear — new entries can be saved to your library.": "Ausrüstung tippen oder wählen — neue Einträge lassen sich in deiner Bibliothek speichern.",
  "in your library": "in deiner Bibliothek",
  "Add to library": "Zur Bibliothek hinzufügen",
  "Added {name} to your library": "{name} zur Bibliothek hinzugefügt",
  "When printing, choose “Actual size” in the print dialog so the sheet keeps its real dimensions.":
    "Wähle beim Drucken „Tatsächliche Größe“ im Druckdialog, damit das Blatt seine echten Maße behält.",
  "Each sheet gets a QR for “{roll}”. Photograph it back in via Film rolls ▸ Scan booklet to jump straight to this roll.":
    "Jedes Blatt erhält einen QR für „{roll}“. Fotografiere ihn über Filme ▸ Heft scannen zurück, um direkt zu diesem Film zu springen.",
  "Printing A6 pages at home? In the print dialog choose “Actual size”. To fit four A6 sheets on one A4, pick “4 pages per sheet”.":
    "A6-Seiten zu Hause drucken? Wähle im Druckdialog „Tatsächliche Größe“. Für vier A6-Blätter auf einem A4 wähle „4 Seiten pro Blatt“.",
  "Press Preview to see your log sheets here.": "Drücke Vorschau, um deine Protokollblätter hier zu sehen.",

  // Pair devices
  "Send a photo of your log page straight from your phone to this device over your local network — no cable, no cloud. Both devices open this page; one receives, the other sends.":
    "Sende ein Foto deiner Protokollseite direkt vom Handy an dieses Gerät über dein lokales Netzwerk — ohne Kabel, ohne Cloud. Beide Geräte öffnen diese Seite; eines empfängt, das andere sendet.",
  "🖥️ Receive here": "🖥️ Hier empfangen",
  "📱 Send from here": "📱 Von hier senden",
  "This device shows a pairing code and receives the photo. Usually your desktop.": "Dieses Gerät zeigt einen Kopplungscode und empfängt das Foto. Meist dein Desktop.",
  "Scan the other device's code, then pick or snap the log page. Usually your phone.": "Scanne den Code des anderen Geräts, dann wähle oder fotografiere die Protokollseite. Meist dein Handy.",

  // Settings
  "Defaults applied to every export. Roll-level values always win over these.":
    "Vorgaben für jeden Export. Werte auf Filmebene haben immer Vorrang.",
  "Default artist / creator": "Standard-Urheber",
  "Default copyright": "Standard-Copyright",
  "Save settings": "Einstellungen speichern",
  "Settings saved": "Einstellungen gespeichert",
  "Appearance & language": "Darstellung & Sprache",
  Theme: "Design",
  Language: "Sprache",
  System: "System",
  Light: "Hell",
  Dark: "Dunkel",
  English: "Englisch",
  German: "Deutsch",
  "Backup & restore": "Sicherung & Wiederherstellung",
  "⤓ Export backup (.json)": "⤓ Sicherung exportieren (.json)",
  "⤒ Import backup": "⤒ Sicherung importieren",
  "Backup downloaded": "Sicherung heruntergeladen",
  "Cloud sync": "Cloud-Sync",
  "⟳ Sync now": "⟳ Jetzt synchronisieren",
  Disconnect: "Trennen",
  "＋ Create sync file": "＋ Sync-Datei erstellen",
  "📂 Use existing file": "📂 Vorhandene Datei nutzen",
  "About the export": "Über den Export",

  // Toasts / misc
  Loading: "Lädt",
};
