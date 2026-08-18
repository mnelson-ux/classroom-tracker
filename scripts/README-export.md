# Audit & data export (for FERPA / COPPA retention)

Pulls a **complete, timestamped snapshot** of the audit trail and checkout
history out of Supabase to local CSV files, so you have offline copies in case
of an audit. Files are written to `../exports/` (git-ignored — they contain
student PII, so never commit them).

## What gets exported
- `audit-log_<date>.csv` — the access/change trail: who logged in, who viewed or
  exported student data, every student/teacher/settings change, every reset.
- `checkout-history_<date>.csv` — the hall-pass records (student, teacher,
  location, times), with names filled in.

> These are **your own database tables**, so they are retained for as long as
> you keep them — Supabase's 1-day/7-day *platform log* limit does not apply.

## Run it manually
```bash
cd /Users/mikenelson/Desktop/websites/classroom-tracker
node scripts/export-audit.mjs
```
Each run makes a new dated pair of files; keep them somewhere safe (external
drive / district file share). Recommended cadence: **monthly** (retention
requirement is 30 days, so a monthly complete snapshot always covers it).

## Optional: run it automatically every month (macOS)
1. Create `~/Library/LaunchAgents/com.smarthallpass.export.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0"><dict>
     <key>Label</key><string>com.smarthallpass.export</string>
     <key>ProgramArguments</key>
     <array>
       <string>/usr/local/bin/node</string>
       <string>/Users/mikenelson/Desktop/websites/classroom-tracker/scripts/export-audit.mjs</string>
     </array>
     <key>WorkingDirectory</key>
     <string>/Users/mikenelson/Desktop/websites/classroom-tracker</string>
     <key>StartCalendarInterval</key>
     <dict><key>Day</key><integer>1</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
     <key>StandardOutPath</key><string>/tmp/smarthallpass-export.log</string>
     <key>StandardErrorPath</key><string>/tmp/smarthallpass-export.err</string>
   </dict></plist>
   ```
2. Load it:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.smarthallpass.export.plist
   ```
It will run on the 1st of every month at 7:00 AM (only when the Mac is awake).
To stop it: `launchctl unload ~/Library/LaunchAgents/com.smarthallpass.export.plist`.

## Note
The script reads `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. Keep that file
secure and never commit it (it's already git-ignored).
