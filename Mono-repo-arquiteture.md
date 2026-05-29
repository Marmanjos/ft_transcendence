# Monorepo Architecture & Git Subtree Workflow

## Overview

The project is organized as a **monorepo** using **Git Subtree**.

The main repository is:

```txt
ft_transcendence
```

Inside it, the frontend and backend are integrated as physical directories while still maintaining synchronization capabilities with their original repositories.

---

# Current Architecture

```txt
ft_transcendence/
│
├── Makefile
├── secrets/
│
└── srcs/
    ├── docker-compose.yml
    │
    ├── backend/
    │   └── Backend subtree
    │
    ├── frontend/
    │   └── Frontend subtree
    │
    └── database/

```

---

# Why Git Subtree?

Git subtree allows us to:

* Keep frontend and backend physically inside the main repository
* Deliver a fully self-contained repository
* Continue syncing with the original frontend/backend repositories
* Centralize infrastructure and deployment configuration
* Simplify Docker integration and CI/CD workflows

Unlike Git Submodules:

* no recursive clone is needed
* directories are not empty placeholders
* the project remains fully functional independently

---

# Repository Roles

## Main Repository (`ft_transcendence`)

Responsible for:

* infrastructure
* Docker orchestration
* deployment
* integration
* final delivery
* CI/CD

---

## Backend Repository

Responsible for:

* API
* authentication
* websocket server
* game engine
* database logic

Integrated into:

```txt
srcs/backend/
```

---

## Frontend Repository

Responsible for:

* UI
* game rendering
* pages
* components
* client-side logic

Integrated into:

```txt
srcs/frontend/
```

---

# Git Remotes

Current subtree remotes:

```bash
backend-origin
frontend-origin
```

Check them with:

```bash
git remote -v
```

---

# Important Notes

## ALWAYS execute subtree commands from the root of the monorepo

Example:

```bash
cd ft_transcendence
```

Never execute subtree commands inside:

* `srcs/backend`
* `srcs/frontend`

---

# Initial Subtree Setup

## Backend

```bash
git subtree add \
    --prefix=srcs/backend \
    backend-origin main \
    --squash
```

---

## Frontend

```bash
git subtree add \
    --prefix=srcs/frontend \
    frontend-origin main \
    --squash
```

---

# Why `--squash`?

Without `--squash`, the entire history of the external repository is imported into the monorepo.

Using:

```bash
--squash
```

imports the content as a single commit, keeping the history clean and manageable.

---

# Pulling Updates From External Repositories

## Update backend subtree

```bash
git subtree pull \
    --prefix=srcs/backend \
    backend-origin main \
    --squash
```

---

## Update frontend subtree

```bash
git subtree pull \
    --prefix=srcs/frontend \
    frontend-origin main \
    --squash
```

---

# Pushing Changes Back To External Repositories

## Push backend changes

```bash
git subtree push \
    --prefix=srcs/backend \
    backend-origin main
```

---

## Push frontend changes

```bash
git subtree push \
    --prefix=srcs/frontend \
    frontend-origin main
```

---

# Recommended Workflow

## Preferred Development Flow

### Backend Team

Works primarily inside the backend repository.

### Frontend Team

Works primarily inside the frontend repository.

### Monorepo

Used for:

* integration
* testing
* Docker
* deployment
* final delivery

---

# Synchronization Strategy

Recommended approach:

1. Work in dedicated repositories
2. Push changes normally
3. Pull updates into monorepo using subtree pull

This minimizes:

* merge conflicts
* subtree complexity
* synchronization issues

---

# Useful Commands

## Check subtree commits

```bash
git log --oneline --graph --decorate
```

---

## Check tracked files

```bash
git ls-files
```

---

## Check remotes

```bash
git remote -v
```

---

## Check repository status

```bash
git status
```

---

# Important Warnings

## Do NOT create nested repositories manually

Avoid:

```bash
git clone <repo> srcs/backend
```

This creates nested `.git` directories and breaks the monorepo workflow.

---

## Do NOT remove subtree metadata commits

Commits containing:

```txt
git-subtree-dir:
git-subtree-split:
```

are required for proper subtree synchronization.

---

# Current Subtree State

Backend subtree:

```txt
srcs/backend
```

Frontend subtree:

```txt
srcs/frontend
```

Both are:

* physically integrated
* tracked by the monorepo
* synchronized through git subtree

---

# Architectural Benefits

This structure provides:

* professional monorepo organization
* centralized deployment
* simpler Docker orchestration
* independent frontend/backend development
* safer final delivery
* easier onboarding
* scalable infrastructure layout

---

# Future Improvements

Possible future additions:

* CI/CD pipelines
* shared packages
* shared types
* shared configs
* automated subtree synchronization
* workspace tooling
* Nx/Turborepo-style workflows

---
