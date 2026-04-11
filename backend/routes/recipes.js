import express from 'express';
const router = express.Router();
import * as recipeController from '../controllers/recipeController.js';
import authMiddleware from '../middleware/auth.js';

// Protected routes
router.use(authMiddleware);

// Ai generation
router.post('/generate', recipeController.generateRecipe);
router.get('/suggestions', recipeController.getRecipeSuggestions);

// Crud operations
router.get('/', recipeController.getRecipes);
router.get('/recent', recipeController.getRecentRecipes);
router.get('/stats', recipeController.getRecipeStats);
router.get('/:id', recipeController.getRecipeById);
router.post('/', recipeController.saveRecipe);
router.put('/:id', recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

export default router;