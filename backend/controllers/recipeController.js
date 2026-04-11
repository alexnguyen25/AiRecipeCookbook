import Recipe from '../models/Recipe.js';
import PantryItem from '../models/PantryItem.js';
import { generateRecipe as generateRecipeAI, getRecipeSuggestions as getRecipeSuggestionsAI } from '../utils/gemini.js';

/**
 * Generate a new recipe
 */
export const generateRecipe = async (req, res, next) => {
    try {
        const {
            ingredients,
            usePantryIngredients = false,
            dietaryRestrictions = [],
            cuisineType = 'Any',
            servings = 4,
            cookingTime = 'medium',
        } = req.body;

        let finalIngredients = [...ingredients];

        // Add pantry ingredients if requested
        if (usePantryIngredients) {
            const pantryItems = await PantryItem.findByUserId(user.id);
            const pantryIngredientNames = pantryItems.map(item => item.name);

            finalIngredients = [...new Set([...finalIngredients, ...pantryIngredientNames])];
        }

        if (finalIngredients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No ingredients provided',
            });
        }

        //Generate recipe using AI
        const recipe = await generateRecipeAI({
            ingredients: finalIngredients,
            dietaryRestrictions,
            cuisineType,
            servings,
            cookingTime,
        });

        res.json({
            success: true,
            message: 'Recipe generated successfully',
            data: {recipe}
        });
    }
    catch (error) {
        next(error);
    }


        
        
        
    }

/**
 * Get recipe suggestions
 */
export const getRecipeSuggestions = async (req, res, next) => {
    try {
        const pantryItems = await PantryItem.findByUserId(req.user.id);
        const expiringItems = await PantryItem.getExpiringSoon(req.user.id);
        const expiringNames = expiringItems.map(item => item.name);
        const suggestions = await getRecipeSuggestionsAI(pantryItems, expiringNames);
        res.json({
            success: true,
            data: {suggestions}
        });
    }
    catch (error) {
        next(error);
    }
};

/**
 * Save a recipe
 */
export const saveRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipe.create(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: 'Recipe saved successfully',
            data: {recipe}
        });
    }
    catch (error) {
        next(error);
    }
};

/**
 * Get all recipes
 */
export const getRecipes = async (req, res, next) => {
    try {
        const {search, cuisineType, difficulty, maxCookTime, sortBy, sortOrder, page, limit} = req.query;
        const recipes = await Recipe.findByUserId(req.user.id, {
            search,
            cuisineType,
            difficulty,
            maxCookTime: maxCookTime ? parseInt(maxCookTime) : undefined,
            sortBy,
            sortOrder,
            page,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });
        res.json({
            success: true,
            data: {recipes}
        });
    }
    catch (error) {
        next(error);
    }
};

/**
 * Get recent recipes
 */
export const getRecentRecipes = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const recipes = await Recipe.getRecent(req.user.id, limit);
        res.json({
            success: true,
            data: {recipes}
        });
    }
    catch (error) {
            next(error);
        }
    };

/**
 * Get recipe by ID
 */
export const getRecipeById = async (req, res, next) => {
    try {
        const {id} = req.params;
        const recipe = await Recipe.findById(id, req.user.id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }

        res.json({
            success: true,
            data: {recipe}
        });
    }
        catch (error) {
            next(error);
        }
    };

/**
 * Update a recipe
 */
export const updateRecipe = async (req, res, next) => {
    try {
        const {id} = req.params;
        const recipe = await Recipe.update(id, req.user.id, req.body);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }

        res.json({
            success: true,
            message: 'Recipe updated successfully',
            data: {recipe}
        });
    }
    catch (error) {
        next(error);
    }
};

/**
 * Delete a recipe
 */
export const deleteRecipe = async (req, res, next) => {
    try {
        const {id} = req.params;
        const recipe = await Recipe.delete(id, req.user.id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        res.json({
            success: true,
            message: 'Recipe deleted successfully',
            data: {recipe}
        });
    }
    catch (error) {
        next(error);
    }
};

/**
 * Get recipe stats
 */
export const getRecipeStats = async (req, res, next) => {
    try {
        const stats = await Recipe.getStats(req.user.id);
        res.json({
            success: true,
            data: {stats}
        });
    }
    catch (error) {
        next(error);
    }
};
