// SetupController — web-based setup wizard + ifesx data (zip) upload.
//
// Serves the Angular/PrimeNG wizard at /setup and a small JSON API under /api/setup:
//   GET  /api/setup/status   health + configured/serial/db state (polled by the wizard)
//   GET  /api/setup/schema   enum option lists for the form dropdowns
//   GET  /api/setup/config   current device_config.json
//   POST /api/setup/config   validate + normalize + write device_config.json
//   POST /api/setup/data     upload an ifesx bundle.zip (schedule DB + announcements)
//   POST /api/setup/restart  graceful shutdown (supervisor restarts on Pi; manual locally)
//
// Config/DB changes take effect on the next restart (config is require-cached and the
// Sequelize connection is bound at startup), so the wizard writes files then restarts.

import { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { IBISController } from "./IBISController";
import { Util } from "../util";
import { DeviceConfig } from "../models/devices/DeviceConfig";
import { defaultDeviceConfig } from "../models/devices/defaultDeviceConfig";
import { IBISTerminalKeyAction } from "../models/devices/Terminal/IBISTerminalKeyAction";
import { RecLid } from "../models/database/VDV/RecLid";
import { RecFrt } from "../models/database/VDV/RecFrt";
import { LidVerlauf } from "../models/database/VDV/LidVerlauf";

// Required as plain modules so the build does not depend on @types being present.
const multer = require("multer");
const AdmZip = require("adm-zip");

// Tables that must exist for a file to count as a valid VDV schedule DB.
const REQUIRED_TABLES = ["REC_LID", "LID_VERLAUF", "BASIS_VER_GUELTIGKEIT"];
// Physical IBIS addresses (0x0..0xE) valid for signs/validators/LVA/DS021.
const IBIS_ADDRESSES = Array.from({ length: 15 }, (_, i) => i);

export class SetupController {
    private ibisController: IBISController;
    private restart: () => void;

    private configPath = path.join(process.cwd(), "device_config.json");
    private dbPath = path.join(process.cwd(), "test.sqlite3");
    private announcementsDir = path.join(process.cwd(), "announcements");
    private setupDist = SetupController.resolveSetupDist();

    // The Angular application builder may emit files directly under dist/setup_ui or under
    // a browser/ subfolder depending on version/config — serve whichever has index.html.
    private static resolveSetupDist(): string {
        const base = path.join(process.cwd(), "setup_ui", "dist", "setup_ui");
        const withBrowser = path.join(base, "browser");
        if (fs.existsSync(path.join(withBrowser, "index.html"))) return withBrowser;
        return base;
    }

    constructor(ibisController: IBISController, app: Express, restart: () => void) {
        this.ibisController = ibisController;
        this.restart = restart;

        const upload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 512 * 1024 * 1024 } // 512 MB
        });

        // --- Static wizard UI (built Angular app) ---
        app.use("/setup", (req, res, next) => {
            if (!fs.existsSync(this.setupDist)) {
                res.status(503).send(
                    "Setup UI not built. Run `cd setup_ui && npm install && npm run build`."
                );
                return;
            }
            next();
        });
        app.use("/setup", require("express").static(this.setupDist));
        // SPA fallback (Angular router)
        app.get("/setup/*", (_req: Request, res: Response) => {
            const index = path.join(this.setupDist, "index.html");
            if (fs.existsSync(index)) res.sendFile(index);
            else res.status(503).send("Setup UI not built.");
        });

        // --- API ---
        app.get("/api/setup/status", (req, res) => this.getStatus(req, res));
        app.get("/api/setup/schema", (_req, res) => this.getSchema(_req, res));
        app.get("/api/setup/config", (req, res) => this.getConfig(req, res));
        app.post("/api/setup/config", (req, res) => this.postConfig(req, res));
        app.post("/api/setup/data", upload.single("file"), (req, res) => this.postData(req, res));
        app.post("/api/setup/restart", (req, res) => this.postRestart(req, res));
    }

    // ---- helpers ----

    private readConfig(): any {
        try {
            return JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
        } catch {
            return null;
        }
    }

    private appVersion(): string {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
            return pkg.version || "unknown";
        } catch {
            return "unknown";
        }
    }

    private countAnnouncements(): number {
        try {
            return fs.readdirSync(this.announcementsDir).filter(f => !f.startsWith(".")).length;
        } catch {
            return 0;
        }
    }

    // Count rows in an arbitrary sqlite file via a throwaway read-only connection.
    private inspectDb(file: string): Promise<{ tables: string[]; rowCounts: Record<string, number> }> {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) => {
                if (err) return reject(err);
            });
            db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, rows: any[]) => {
                if (err) { db.close(); return reject(err); }
                const tables = rows.map(r => r.name);
                const rowCounts: Record<string, number> = {};
                const wanted = ["REC_LID", "REC_FRT", "LID_VERLAUF", "REC_ANR"].filter(t => tables.includes(t));
                let pending = wanted.length;
                if (pending === 0) { db.close(); return resolve({ tables, rowCounts }); }
                for (const t of wanted) {
                    db.get(`SELECT COUNT(*) AS c FROM "${t}"`, (e, row: any) => {
                        rowCounts[t] = e ? -1 : (row?.c ?? -1);
                        if (--pending === 0) { db.close(); resolve({ tables, rowCounts }); }
                    });
                }
            });
        });
    }

    // ---- route handlers ----

    private async getStatus(_req: Request, res: Response) {
        const config = this.readConfig();
        const serialConfigured = !!(config && config.serial_port);
        const dbPresent = fs.existsSync(this.dbPath);

        const dbRowCounts: Record<string, number> = {};
        try {
            dbRowCounts["REC_LID"] = await RecLid.count();
            dbRowCounts["REC_FRT"] = await RecFrt.count();
            dbRowCounts["LID_VERLAUF"] = await LidVerlauf.count();
        } catch {
            // Table may not exist yet on a fresh DB.
        }

        res.json({
            configured: serialConfigured && dbPresent,
            dbPresent,
            dbRowCounts,
            announcementCount: this.countAnnouncements(),
            serialConfigured,
            serialPort: config?.serial_port,
            serialOpen: this.ibisController.serialOpen,
            serialError: this.ibisController.serialError,
            version: this.appVersion()
        });
    }

    private getSchema(_req: Request, res: Response) {
        res.json({
            keyActions: Object.values(IBISTerminalKeyAction),
            // IBISTerminalKey is a string-union type (no runtime enum); expose the usable keys.
            keys: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "+", ",", "-", ".", "*"],
            addresses: IBIS_ADDRESSES,
            gpioPins: ["WI", "OBI", "TK", "FLE", "PLE", "UEB", "KKA", "KKB", "K1", "K2", "K4", "K8", "DS", "STAST", "TFS"]
        });
    }

    private getConfig(_req: Request, res: Response) {
        const config = this.readConfig();
        if (!config) {
            res.status(500).json({ error: "device_config.json not readable" });
            return;
        }
        res.json(config);
    }

    private postConfig(req: Request, res: Response) {
        const incoming = req.body;
        if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
            res.status(400).json({ error: "Body must be a config object" });
            return;
        }
        // Merge onto the default so every key exists, then normalize known inconsistencies.
        const normalized: any = { ...defaultDeviceConfig, ...incoming };
        // Old file used the wrong casing; the code reads line_number_in_ds009.
        if ("line_number_in_DS009" in normalized) {
            if (normalized.line_number_in_ds009 === undefined) {
                normalized.line_number_in_ds009 = normalized.line_number_in_DS009;
            }
            delete normalized.line_number_in_DS009;
        }
        // UESTRA_LVA must be an address array (older files stored a boolean).
        if (!Array.isArray(normalized.UESTRA_LVA)) {
            normalized.UESTRA_LVA = [];
        }
        // Empty string serial_port means "unset" (setup mode).
        if (normalized.serial_port === "") {
            delete normalized.serial_port;
        }
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(normalized, null, 2));
            res.json({ ok: true, config: normalized });
        } catch (e: any) {
            res.status(500).json({ error: "Failed to write config: " + (e?.message || String(e)) });
        }
    }

    private async postData(req: Request, res: Response) {
        const file = (req as any).file;
        if (!file || !file.buffer) {
            res.status(400).json({ error: "No file uploaded (field 'file')" });
            return;
        }

        let zip: any;
        try {
            zip = new AdmZip(file.buffer);
        } catch (e: any) {
            res.status(400).json({ error: "Not a valid zip: " + (e?.message || String(e)) });
            return;
        }

        const entries: any[] = zip.getEntries();
        const dbEntry = entries.find((en: any) => !en.isDirectory && en.entryName.toLowerCase().endsWith(".sqlite3"));
        if (!dbEntry) {
            res.status(400).json({ error: "Zip contains no .sqlite3 schedule database" });
            return;
        }

        const dbData: Buffer = dbEntry.getData();
        // SQLite files start with "SQLite format 3 ".
        if (dbData.length < 16 || dbData.slice(0, 16).toString("latin1") !== "SQLite format 3 ") {
            res.status(400).json({ error: "The .sqlite3 entry is not a valid SQLite database" });
            return;
        }

        // Back up the existing DB before overwriting.
        let backup: string | undefined;
        if (fs.existsSync(this.dbPath)) {
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            backup = this.dbPath + ".bak-" + stamp;
            try {
                fs.copyFileSync(this.dbPath, backup);
            } catch (e: any) {
                res.status(500).json({ error: "Failed to back up existing DB: " + (e?.message || String(e)) });
                return;
            }
        }

        // Write the new DB.
        try {
            fs.writeFileSync(this.dbPath, dbData);
        } catch (e: any) {
            res.status(500).json({ error: "Failed to write new DB: " + (e?.message || String(e)) });
            return;
        }

        // Validate structure; restore backup on failure.
        let info: { tables: string[]; rowCounts: Record<string, number> };
        try {
            info = await this.inspectDb(this.dbPath);
        } catch (e: any) {
            this.restoreBackup(backup);
            res.status(400).json({ error: "Uploaded DB could not be opened: " + (e?.message || String(e)) });
            return;
        }
        const missing = REQUIRED_TABLES.filter(t => !info.tables.includes(t));
        if (missing.length > 0) {
            this.restoreBackup(backup);
            res.status(400).json({ error: "Uploaded DB is missing required VDV tables: " + missing.join(", ") });
            return;
        }

        // Extract announcements verbatim (filenames must match REC_ANR.ANR_DATEI).
        let announcementCount = 0;
        try {
            if (!fs.existsSync(this.announcementsDir)) fs.mkdirSync(this.announcementsDir, { recursive: true });
            for (const en of entries) {
                if (en.isDirectory) continue;
                const norm = en.entryName.replace(/\\/g, "/");
                if (!norm.toLowerCase().startsWith("announcements/")) continue;
                const base = path.basename(norm);
                if (!base) continue;
                fs.writeFileSync(path.join(this.announcementsDir, base), en.getData());
                announcementCount++;
            }
        } catch (e: any) {
            Util.log("Setup: announcement extraction failed: " + (e?.message || String(e)));
        }

        Util.log(`Setup: applied bundle (db tables=${info.tables.length}, announcements=${announcementCount}). Restart required.`);
        res.json({
            ok: true,
            db: { tables: info.tables.length, rowCounts: info.rowCounts },
            announcements: announcementCount,
            backup: backup ? path.basename(backup) : null,
            note: "Files written. Restart to apply."
        });
    }

    private restoreBackup(backup?: string) {
        try {
            if (backup && fs.existsSync(backup)) {
                fs.copyFileSync(backup, this.dbPath);
            }
        } catch (e: any) {
            Util.log("Setup: failed to restore DB backup: " + (e?.message || String(e)));
        }
    }

    private postRestart(_req: Request, res: Response) {
        res.json({ ok: true, message: "Restarting" });
        Util.log("Setup: restart requested via wizard");
        // Let the response flush before shutting down.
        setTimeout(() => this.restart(), 500);
    }
}
