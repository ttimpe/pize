# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ibisplusplus` (project name PIZE) is a from-scratch reimplementation of an **IBIS-Zentraleinheit (IZE)** — the onboard computer in buses and trams that drives destination/line displays, stop announcements, ticket validators, and radio (Funk) communication with the control center. It runs on a Raspberry Pi, speaks the serial **IBIS** telegram bus to peripheral hardware, and serves web-based operator/passenger UIs.

The domain is German public transit; **code, comments, and identifiers are predominantly in German** (e.g. `linie`=line, `kurs`=course, `ziel`=destination, `haltestelle`=stop, `entwerter`=validator, `anzeige`=display, `ansage`=announcement, `wegimpuls`=odometer pulse). Match this convention when editing.

## Commands

- **Run (dev):** `npm run dev` — uses `socat` to create a virtual serial PTY pair (`./ttyV0`/`./ttyV1`), then `tsx watch src ./ttyV0`. Requires `socat` installed. The serial port is resolved as: optional `argv[2]` **override** (what the dev script passes) → `device_config.json.serial_port` → **none** (setup mode). The app **no longer requires a port arg**: with no port it boots into a no-serial "setup mode" so the wizard is reachable.
- **Run against real hardware:** set `serial_port` in `device_config.json` (via the setup wizard) and run `node src/index.js` (or `docker-compose up`, which forwards `/dev/ttyUSB0` + `/dev/ttyAMA0` and host PulseAudio). A CLI arg still overrides the config if given.
- **Build:** `npm run build` (`tsc` → `dist/`).
- **Tests:** none. `npm test` is a placeholder that errors. Verify changes via the debug HTTP endpoints (below), not a test runner.
- **MTT UI (separate React app):** in `mtt_ui/` run `npm run dev` (Vite), `npm run build`, `npm run lint`. Its `build` output must land in `mtt_ui/dist/` — the backend serves that directory at `/mtt`.
- **Setup UI (separate Angular + PrimeNG app):** in `setup_ui/` run `npm install` then `npm run build` (Angular CLI) — output lands in `setup_ui/dist/setup_ui`, which `SetupController` serves at `/setup`. Dev: `npm start` (ng serve, proxies `/api` → `localhost:2000`). Mirrors the ifesx frontend stack (Angular 19, PrimeNG 19, Aura theme).

`postinstall` runs `patch-package`, so native/dependency patches under `patches/` are applied automatically on `npm install`.

## Runtime shape

`src/index.ts` `main()` wires everything together and starts:
- **Express HTTP on port 2000 (localhost only)** — hosts the MFD UI (`/mfd`), MTT UI (`/mtt`), diagnostics (`/tfs`, `/diag`, `/debug/*`), and JSON APIs (`/api/mtt/*`, `/api/tripData`).
- **WebSocket server on port 1815** — pushed to displays/UIs by `IBISController`.
- **Sequelize over SQLite** at `./test.sqlite3`. This DB is **produced by a separate `ifesx-backend` project** (the data-supply/Datenversorgung editor) — this app is read-mostly against it. Models are registered explicitly in `sequelize.addModels([...])` in `index.ts`; a new model must be added there to be usable.

Useful debug endpoints while iterating: `GET /diag`, `GET /diag/wi?impulses=N` (simulate odometer pulses → advances location), `POST /diag/sendTelegram`, `GET /debug/set_line/:line`, `GET /debug/set_route/:route`, `GET /debug/test_route`.

## Architecture

**Controllers** (`src/controllers/`) are the top-level actors, all hanging off the central `IBISController`:
- `IBISController` (~2000 lines, the core) — owns the `SerialPort`, the outbound telegram queue (`IBIS_QUEUE_SEND_INTERVAL_MS`), terminal A/B, displays (`anzeigen`), validators (`entwerter`), status polling of hardware (HAG/IRIS), and all trip/line/stop state. Implements `IBISControllerInterface`, which is the contract every peripheral controller and the terminal talk through.
- `LocationController` — dead-reckoning position from odometer pulses (`wiInterrupt`, `IMPULSES_PER_KILOMETER`), decides when to trigger the next-stop announcement (`FANGRADIUS`).
- `MFDController` / `MTTController` — Express route + static hosting for the Multifunktionsdisplay and the Mobile Touch Terminal; read trip/route data from the VDV models and expose JSON.
- `AudioController` — plays stop-announcement WAV files from `announcements/` (3-letter codes, e.g. `HBF.wav`).
- `RadioController` — currently a **stub** (logs only); real FFSK/Funk telegram logic is planned. `RadioTelegramGenerator.ts` exists for the telegram encoding.
- `VDV/TagesartController` — resolves the day-type (Tagesart) from the `Firmenkalender`.
- `SetupController` — serves the Angular setup wizard at `/setup` and a JSON API under `/api/setup/*` (`status`, `schema`, `config` GET/POST, `data` zip upload via multer/adm-zip, `restart`). It writes `device_config.json` + `test.sqlite3` + `announcements/` to disk and restarts to apply (config is `require`-cached and the DB connection is startup-bound, so there is no hot-reload). Startup is resilient: if `device_config.json` is missing, `index.ts` writes `defaultDeviceConfig` (setup mode) so the wizard is always reachable; if the configured `serial_port` is inaccessible, `IBISController` records `serialError`/`serialOpen=false` instead of crashing, and the wizard surfaces a reconfigure prompt.

**IBIS telegram protocol** (`src/IBISTelegramGenerator.ts`): telegrams are plain ASCII strings named after their DIN spec datasets (`DS001` = line number `l003`, `DS003` = destination `z...`, etc.). `IBISTelegram` (`src/extensions/IBISTelegram.ts`) is just a `String` type alias. `IBISController` builds telegrams via `TelegramGenerator.DSxxx(...)`, frames/checksums them, and queues them to the serial bus.

**Prototype extensions** (`src/extensions/String.ts`, `Number.ts`) add methods like `String.prototype.toIBISUppercase()` (German-ß-aware) and `hexLength()`. These are **side-effecting imports** — they must be imported (as `IBISTelegramGenerator.ts` does at the top) for the methods to exist at runtime.

**VDV 452 data models** (`src/models/database/VDV/`) are `sequelize-typescript` models mapping the standard `REC_*` tables (`RecLid`=line variant, `RecFrt`=trip, `LidVerlauf`=stop sequence of a line, `RecOrt`=location, `RecHp`/`RecAnr`/`RecZnr`=stop/announcement/destination text, `SelFztFeld`=running times, etc.). Key gotchas:
- Composite primary keys **include `BASIS_VERSION`** (the data-supply version). Queries that resolve schedule data must filter by the currently active `BASIS_VERSION`.
- The active `BASIS_VERSION` is resolved **by date** via `BasisVerGueltigkeit` (`BASIS_VER_GUELTIGKEIT`) against the system time, which `IBISController` can shift for testing/time-travel (`setDateOffset`, `setTimeOffset`, `getCurrentSystemTime`). Do not hardcode `BASIS_VERSION = 1`.
- Some models keep legacy-name getters (e.g. `RecLid.get STR_LID()`) for backward compat during the ongoing rename refactor. Prefer the new VDV column names.

**Device configuration** — `device_config.json` at the repo root (gitignored) is loaded via `require('../../device_config.json')` throughout. It defines terminal key mappings, which displays/validators are attached, GPIO pinout (Raspberry Pi, via `onoff`/`raspi`: Wegimpuls, Türkriterium, Überfalltaster, radio channel bits, etc.), and radio config. See `README.md` for the full parameter table. Device model classes live in `src/models/devices/`.

## Notes for changes

- Open work and VDV-conformance gaps are tracked in `TODO.md` (e.g. `SEL_FZT_FELD` lookup ignoring `BEREICH_NR`, missing `REC_LID` columns, the 60-second fallback fabricating schedule data). Read it before touching trip-time/route resolution.
- The XSD authority for the data schema is `ifesx-backend/VDV452_v1.5.xsd` (sibling project) — models here should conform to it.
- Root-level `debug_*.js`, `*.ts` scripts (`inspect_calendar.ts`, `list_tables.ts`, `check_vdv_data.ts`, `reproduce_issue.js`, etc.) are one-off diagnostic/repro scripts run directly with `tsx`/`node`; they are not part of the app build.
