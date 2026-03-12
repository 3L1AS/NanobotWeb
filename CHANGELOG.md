# Changelog

All notable changes to the NanobotWeb dashboard will be documented in this file.

## [Unreleased] / [Latest update] - March 2026

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
