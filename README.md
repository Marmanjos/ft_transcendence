*This project has been created as part of the 42 curriculum by atambo, mvidal, mdiniz, alde-jes and lquimuan.*

# Duel Elementor

## Description

Duel Elementar is a real-time multiplayer online game inspired by competitive arena battles. The project combines a cyberpunk frontend in React, a backend in Node.js/Express, WebSocket communication, and a relational database to offer an interactive experience with authentication, social features, live matches, and a history of confrontations.

### Key Features
- User authentication and protected routes
- Real-time multiplayer gameplay with live match updates
- Friends, notifications, and social interactions
- Leaderboard and match history
- Organizations/groups and profile management
- 2D/3D-style arena visuals and immersive UI

## Instructions

### Prerequisites
- Docker and Docker Compose
- Make
- OpenSSL
- A modern browser

### Setup
1. Clone the repository and enter the project directory.
   ```bash
   git@vogsphere.42luanda.com:vogsphere/intra-uuid-4ff6b5d3-78b7-4898-9477-cdc157cda7fe-7461036-atambo
   ```
   or
   ```bash
   git@github.com:Marmanjos/ft_transcendence.git
   ```
2. Generate the environment files and certificates:
   ```bash
   make create
   ```
3. Build and start the full stack:
   ```bash
   make all
   ```
4. Open the application with:
   ```bash
   make open
   ```
   or, past the link in your browser
   ```text
   https://localhost
   ```

### Useful Commands
- Stop the stack: `make down`
- Remove containers and volumes: `make clean`
- Rebuild from scratch: `make re`

## Team Information

- Product Owner (PO): Defines the product vision, prioritizes features, and ensures the project meets user needs.
- user: mvidal
    - Maintains the product backlog.
    - Makes decisions on features and priorities.
    - Validates completed work.
    - Communicates with stakeholders (evaluators, peers).

- Project Manager (PM) / Scrum Master: Facilitates team coordination and removes obstacles.
- user: atambo 
    - Organizes team meetings and planning sessions.
    - Tracks progress and deadlines.
    - Ensures team communication.
    - Manages risks and blockers.

- Technical Lead / Architect: Oversees technical decisions and architecture.
- user: alde-jes
    - Defines technical architecture.
    - Makes technology stack decisions.
    - Ensures code quality and best practices.
    - Reviews critical code changes.

- Developers (all team members): Implement features and modules.
- user: lquimuan, mdiniz, mvidal, atambo, alde-jes
    - Write code for assigned features.
    - Participate in code reviews.
    - Test their implementations.
    - Document their work.
## Project Management

- The work was divided by functionalities or modules and monitored primarily through Trello.
- Short planning and review meetings were used during development.
- Communication was mainly done via WhatsApp and comments on Trello cards.

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
- Introduce an AI Opponent for games.
    - The AI must be challenging and able to win occasionally.
    - The AI should simulate human-like behavior (not perfect play).
    - If you implement game customization options, the AI must be able to use them.
    - You must be able to explain your AI implementation during evaluation
- Implement real-time features using WebSockets or similar technology.
    - Real-time updates across clients.
    - Handle connection/disconnection gracefully.
    - Efficient message broadcasting.
- Remote players — Enable two players on separate computers to play the same game in real-time.
    - Handle network latency and disconnections gracefully.
    - Provide a smooth user experience for remote gameplay.
    - Implement reconnection logic.
- Multiplayer game (more than two players).
    - Support for three or more players simultaneously.
    - Fair gameplay mechanics for all participants.
    - Proper synchronization across all clients.
- Standard user management and authentication.
    - Users can update their profile information.
    - Users can upload an avatar (with a default avatar if none provided).
    - Users can add other users as friends and see their online status.
    - Users have a profile page displaying their information.
- Allow users to interact with other users. The minimum requirements are:
    - A basic chat system (send/receive messages between users).
    - A profile system (view user information).
    - A friends system (add/remove friends, see friends list).
- An organization system:
    - Create, edit, and delete organizations.
    - Add users to organizations.
    - Remove users from organizations.
    - View organizations and allow users to perform specific actions within an organization (minimum: create, read, update).
### Minor Modules
- Health check and status page system with automated backups and disaster recovery procedures.
- Use a frontend framework (React, Vue, Angular, Svelte, etc.).
- Use a backend framework (Express, Fastify, NestJS, Django, etc.).
- Use an ORM for the database.
- A complete notification system for all creation, update, and deletion ac-tions.
- Game statistics and match history (requires a game module).
    - Track user game statistics (wins, losses, ranking, level, etc.).
    - Display match history (1v1 games, dates, results, opponents).
    - Show achievements and progression.
    - Leaderboard integration.
- A gamification system to reward users for their actions.
    - Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
    - System must be persistent (stored in database)
    - Visual feedback for users (notifications, progress bars, etc.)
    - Clear rules and progression mechanic

### Module Summary
- Total points: 20
- Major modules: 14 points
- Minor modules: 7 points

## Individual Contributions

- Alfredo (alde-jes)
  - Responsible for starting the project and taking it to a basic level.
  - Because he was the most skilled and experienced among us, he ensured that we had a solid foundation that allowed us to evolve closer to what we intended.
  - This helped prevent us from getting lost during the process.
  - He also served as a constant support throughout all stages of the project and helped us whenever we had difficulties delivering our tasks.

- lquimuan
  - Contributed to the project documentation and public-facing pages, helping improve the overall presentation and user-facing experience.

- atambo
  - Focused on multiplayer game flow, 3v3 support, matchmaking-related behavior, WebSocket integration, and HTTPS setup.

- Marcio Vidal (also known as mvidal / vidal-m)
  - Played a central role in the stability and evolution of the game logic.
  - Contributed to match flow, abandonment/disconnection handling, profile and history features, and image upload limits.
  - Also took responsibility for DevOps and Docker integration, helping connect the project infrastructure and deployment workflow.

- mdiniz
  - Contributed to backend validation, error handling, and profile-related improvements, helping make the application more robust and consistent.

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
