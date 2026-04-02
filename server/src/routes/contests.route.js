import express from 'express';
import * as contestsController from '../controllers/contests.controller.js';

const router = express.Router();

router.get('/', contestsController.getContests);
router.post('/', contestsController.createContest);

// Step-2 contest creation helpers (problem snapshot + AI transform)
router.get('/problems/:problemId', contestsController.getContestProblemPreview);
router.post('/problems/:problemId/transform-description', contestsController.transformContestProblemDescription);

router.get('/:contestId', contestsController.getContestById);
router.get('/:contestId/problems', contestsController.getContestProblems);
router.get('/:contestId/submissions', contestsController.getContestSubmissions);
router.post('/:contestId/submissions', contestsController.createContestSubmission);
router.get('/:contestId/registrants', contestsController.getContestRegistrants);

export default router;
