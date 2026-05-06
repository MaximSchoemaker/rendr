## Rendr

Solid + Vite sketch playground with Tauri v2 desktop integration.

## Prerequisites

- Node.js 18+
- Yarn 1.x
- Rust toolchain (rustup, rustc, cargo)
- Xcode Command Line Tools (macOS)

## Install

```bash
yarn install
```

## Web Development

```bash
yarn dev
```

## Web Build

```bash
yarn build
```

## Tauri Desktop Development

```bash
yarn tauri:dev
```

This starts the Vite dev server and launches the desktop shell.

## Tauri Desktop Build (macOS)

```bash
yarn tauri:build
```

## Sample Frontend-to-Rust Command

The app includes a "Test Tauri command" button in the HUD. In desktop mode, it invokes a Rust command (`greet`) and displays the response.
