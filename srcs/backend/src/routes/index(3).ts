import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import matchesRouter from "./matches.js";
import leaderboardRouter from "./leaderboard.js";
import friendsRouter from "./friends.js";
import organizationsRouter from "./organizations.js";
import achievementsRouter from "./achievements.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(matchesRouter);
router.use(leaderboardRouter);
router.use(friendsRouter);
router.use(organizationsRouter);
router.use(achievementsRouter);

export default router;
