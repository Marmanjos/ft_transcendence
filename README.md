*This project has been created as part of the 42 curriculum by atambo, mvidal, mdiniz, alde-jes and lquimuan.*

# Duel Elementor

## Description

Duel Elementor is a real-time multiplayer web game inspired by competitive arena battles. The project combines a modern React frontend, a Node.js/Express backend, WebSocket communication, and a relational database to deliver an interactive experience with authentication, social features, live gameplay, and match history.

### Key Features
- User authentication and protected routes
- Real-time multiplayer gameplay with live match updates
- Friends, notifications, and social interactions
- Leaderboard and match history
- Organizations/groups and profile management
- 3D-style arena visuals and immersive UI

## Instructions

### Prerequisites
- Docker and Docker Compose
- Make
- OpenSSL
- A modern browser

### Setup
1. Clone the repository and enter the project directory.
2. Generate the environment files and certificates:
   ```bash
   make create
   ```
3. Build and start the full stack:
   ```bash
   make all
   ```
4. Open the application at:
   ```text
   https://localhost
   ```

### Useful Commands
- Stop the stack: `make down`
- Remove containers and volumes: `make clean`
- Rebuild from scratch: `make re`

## Team Information

- Team Member 1 — PO / Tech Lead
  - Overall product direction and technical coordination.
- Team Member 2 — Backend Developer
  - API, authentication, database logic, and real-time services.
- Team Member 3 — Frontend Developer
  - UI, pages, game experience, and client-side integration.

## Project Management

- Work was divided by feature and tracked through GitHub Issues and pull requests.
- Short planning and review meetings were used during development.
- Communication was handled mainly through Discord.

## Technical Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Framer Motion
- Three.js / React Three Fiber
- Wouter for routing

### Backend
- Node.js
- Express
- TypeScript
- WebSockets for real-time gameplay
- JWT-based authentication
- Cookie-based session handling

### Database
- PostgreSQL
- Chosen for reliability, relational structure, and strong support for user, match, friend, and leaderboard data.

### Other Significant Technologies
- Docker and Docker Compose
- Drizzle ORM
- Zod for validation
- Pino for logging

## Database Schema

The application uses a relational schema centered on users, game sessions, social relationships, and organizations.

### Main Tables
- users
  - id, username, email, password_hash, avatar_url, status, created_at
- friends
  - id, sender_id, receiver_id, status, created_at
- matches
  - id, player_one_id, player_two_id, winner_id, score, status, created_at
- notifications
  - id, user_id, type, message, is_read, created_at
- organizations
  - id, name, owner_id, created_at
- organization_members
  - id, organization_id, user_id, role, joined_at

### Relationships
- users to matches: one-to-many
- users to friends: one-to-many
- users to notifications: one-to-many
- organizations to organization_members: one-to-many

## Features List

- Authentication and protected access — TBD
- Real-time multiplayer arena — TBD
- Friends and social connections — TBD
- Leaderboard and match history — TBD
- Notifications and live updates — TBD
- Organizations and group management — TBD

## Modules

### Major Modules
- Authentication and user management (2 points)
  - Implemented through JWT-based auth, protected routes, and user profiles.
- Real-time multiplayer gameplay (2 points)
  - Implemented through WebSocket communication and live match handling.
- Social features: friends and notifications (2 points)
  - Implemented through relational data models and live updates.
- Match history and leaderboard (2 points)
  - Implemented through persistent match records and ranking logic.

### Minor Modules
- 3D arena visuals (1 point)
  - Implemented with Three.js and React Three Fiber.
- Organizations and groups (1 point)
  - Implemented through dedicated routes and database relations.

### Module Summary
- Total points: 10
- Major modules: 8 points
- Minor modules: 2 points

## Individual Contributions

- Member 1: project direction, architecture, and coordination.
- Member 2: backend services, database models, and API logic.
- Member 3: frontend UI, game experience, and integration.

## Resources

### References
- React documentation: https://react.dev/
- Express documentation: https://expressjs.com/
- Vite documentation: https://vite.dev/
- PostgreSQL documentation: https://www.postgresql.org/docs/
- WebSockets documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

### AI Usage
- AI tools were used to accelerate scaffolding, suggest component structure, help with TypeScript typing, debug integration issues, and improve boilerplate for routes and UI logic.
- They were especially useful for backend route design, frontend component organization, and troubleshooting real-time communication issues.

## Notes

This project was built as a full-stack web application and can be extended with additional game modes, tournament support, or more advanced matchmaking features.
