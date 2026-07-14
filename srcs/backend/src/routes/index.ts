import { Router } from "express";

import authRouter from "./auth.js";
import usersRouter from "./users.js";
import matchesRouter from "./matches.js";
import friendsRouter from "./friends.js";
import healthRouter from "./health.js";
import leaderboardRouter from "./leaderboard.js";
import organizationsRouter from "./organizations.js";

const router = Router();

router.use(authRouter);
router.use(usersRouter);
router.use(matchesRouter);
router.use(friendsRouter);
router.use(healthRouter);
router.use(leaderboardRouter);
router.use(organizationsRouter);

export default router;
