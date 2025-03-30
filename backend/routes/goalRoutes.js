const express = require("express");
const { createGoal, getGoals, updateGoalProgress } = require("../controllers/goalController");
const { protect } = require("../middleware/authMiddleware"); // Authentication check

const router = express.Router();

router.post("/create", protect, createGoal); // Mentor sets a goal
router.get("/", protect, getGoals); // Fetch mentee goals
router.put("/:goalId/progress", protect, updateGoalProgress); // Update goal progress

module.exports = router;
