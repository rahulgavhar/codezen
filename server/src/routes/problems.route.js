import express from 'express';
import * as problemsController from '../controllers/problems.controller.js';

const router = express.Router();

/**
 * @route   GET /api/problems
 * @desc    Get published problems with pagination and filtering
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10, max: 100)
 * @query   {string} topics - Comma-separated tags (e.g., "graphs,sorting")
 * @query   {string} difficulties - Comma-separated difficulties (e.g., "easy,medium")
 * @query   {string} search - Search text for title/description
 * @access  Public
 * @example /api/problems?page=1&limit=10&topics=graphs&difficulties=easy,medium
 */
router.get('/', problemsController.getProblems);

/**
 * @route   GET /api/problems/tags
 * @desc    Get all available problem tags
 * @access  Public
 */
router.get('/tags', problemsController.getAvailableTags);

/**
 * @route   GET /api/problems/:id
 * @desc    Get a single problem by ID with full details
 * @access  Public
 */
router.get('/:id', problemsController.getProblemDetail);

/**
 * @route   GET /api/problems/:id/samples
 * @desc    Get test case samples for a problem
 * @access  Public
 */
router.get('/:id/samples', problemsController.getProblemSamples);

export default router;
