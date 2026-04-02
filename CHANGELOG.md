# Changelog

All notable changes to the NanobotWeb dashboard will be documented in this file.

## [Latest] - April 2, 2026

### Fixed
- **File Explorer — Edit/create files in root-owned project directories**: The nanobot agent (running as root) creates project directories owned by root, which the dashboard (running as UID 1001) previously could not write into at all — not even to create new files or subdirectories. The workspace and fs API routes now fall back to `docker exec --user root` when the parent directory itself is root-owned: new files are written via a temp file moved into place as root, new subdirectories are created as root, and ownership is corrected to UID 1001 immediately after so subsequent edits work without fallbacks. Any project directory created by the nanobot agent is now fully editable from the File Explorer.

---

## [Previous] - March 25, 2026

### Fixed
- **File Explorer — Save on root-owned files**: Saving a file that was created by the nanobot-gateway container (which runs as root) no longer fails silently. The dashboard now automatically removes the root-owned copy and recreates it under its own user, permanently fixing ownership for future saves too.
- **File Explorer — Delete of root-owned directories**: Deleting folders created by the nanobot agent (e.g. `cron/`, `templates/`) no longer returns a permission error. The dashboard falls back to a root-level delete via `docker exec` on itself, using the already-mounted Docker socket.
- **File Explorer — Error messages**: Failed save/delete operations now display the actual reason from the server in the toast notification instead of a generic "Operation failed" message.
- **Health check endpoint**: `/api/status` is now a public route so Docker health checks no longer require authentication.

### Security
- Added `*.log` and `.claude/` to `.gitignore` to prevent build logs and Claude Code local settings (which may contain sensitive data) from being accidentally committed.

---

## [Unreleased] / [Previous] - March 2026

### Added
- **Live Logs Interface**: Added a dedicated `Logs` tab in the sidebar which hooks directly into the Docker SDK (`docker logs`).
  - Supports live tracking with auto-scroll and quick pause.
  - Included interactive filters for `Info`, `Debug`, `Warn`, and `Error` log levels.
  - Implemented real-time search filtering.
  - Added an `Export` button to download the filtered log stream as a `.txt` file.
  - Added a responsive Stats Bar mapping error and warning counts.
- **File Explorer Advanced Operations**: The workspace explorer is now fully interactive.
  - **Create**: Add new text files and sub-directories via the top bar icons.
  - **Hover Actions**: Quickly `Copy`, `Rename`, or `Delete` workspace files & folders via UI without CLI.
  - **Binary File Support**: The file editor component now gracefully handles binary file extensions like `.zip`, `.pdf`, `.exe`.
  - **Media Viewer**: The dashboard seamlessly natively renders `.jpg`, `.png`, `.gif` imagery and `mp4`/`wav` audio-video directly inside the workspace UI!

### Changed
- Refactored `getWorkspaceDir` pointing to root `~/.nanobot` instead of defaulting to the `workspace/` subdirectory.
- Improved the File Explorer UI top-bar wrapping with truncation to support deeply nested folder navigation without UI breaks.
