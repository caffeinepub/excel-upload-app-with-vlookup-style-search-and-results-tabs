# Crystal Atlas - Release Packaging Guide

This guide explains how to create a downloadable release package of the Crystal Atlas application.

## What's Included in the Package

The release package contains:
- **Full source code** (frontend + backend)
- **Prebuilt frontend assets** (production-ready static files)
- **Configuration files** (dfx.json, package.json, etc.)
- **Documentation** (README, this guide)

This allows the package to be used for:
- Distribution to end users
- Deployment to Internet Computer
- Local development and testing
- Source code inspection

## Prerequisites

Before creating a release package, ensure you have:

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **DFX** (Internet Computer SDK)
   ```bash
   dfx --version
   ```

3. **Dependencies installed**
   ```bash
   cd frontend
   npm install
   ```

## Creating a Release Package

### Single Command

From the project root, run:

