import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/** Avoid printing raw API keys in logs */
function redactSecrets(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]');
}

/**
 * Turn @google/genai ApiError into a short, user-facing message (no secrets).
 */
function userFacingGeminiError(error) {
    const status = error?.status ?? error?.statusCode;
    let raw = typeof error?.message === 'string' ? error.message : String(error);

    try {
        const parsed = JSON.parse(raw);
        const inner = parsed?.error?.message ?? parsed?.message;
        if (inner) raw = inner;
    } catch {
        /* message is not JSON */
    }

    if (status === 403 && /suspended|CONSUMER_SUSPENDED|Permission denied/i.test(raw)) {
        return 'Your Google AI API key or Cloud project is suspended or blocked. Create a new API key in Google AI Studio, enable the Generative Language API, and update GEMINI_API_KEY in .env.';
    }
    if (status === 401 || status === 403) {
        return 'Gemini API access was denied. Verify GEMINI_API_KEY, billing, and API restrictions in Google Cloud / AI Studio.';
    }
    if (status === 429) {
        return 'Gemini API rate limit reached. Try again in a moment.';
    }
    const short = redactSecrets(raw);
    return short.length > 220 ? `${short.slice(0, 220)}…` : short;
}

export const generateRecipe = async (
    ingredients,
    dietaryRestrictions = [],
    cuisineType = 'Any',
    servings = 4,
    cookingTime = 'medium'
) => {
    const dietaryInfo =
        dietaryRestrictions.length > 0
            ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}`
            : 'No dietary restrictions';

    const timeGuide = {
        quick: 'Quick (<30 min)',
        medium: 'Medium (30-60 min)',
        long: 'Long (>60 min)'
    };

    const prompt = `Generate a detailed recipe with the following requirements:

Ingredients available: ${ingredients.join(', ')}
${dietaryInfo}
Cuisine type: ${cuisineType}
Serving size: ${servings}
Cooking time: ${timeGuide[cookingTime] || timeGuide.medium}

Please provide a complete recipe in the following JSON format (return only valid JSON, no markdown):
{
    "name": "Recipe Name",
    "description": "Brief description of the dish",
    "cuisineType": "${cuisineType}",
    "difficulty": "easy|medium|hard",
    "prepTime": "Preparation time in minutes",
    "cookTime": "Cooking time in minutes",
    "servings": ${servings},
    "ingredients": [
        {
            "name": "Ingredient Name",
            "quantity": "number",
            "unit": "Unit (e.g. cups, tablespoons, pieces)"
        }
    ],
    "instructions": [
        "Step 1 description",
        "Step 2 description"
    ],
    "dietaryTags": ["Dietary Tag 1", "Dietary Tag 2"],
    "nutrition": {
        "calories": "number",
        "protein": "number (grams)",
        "carbs": "number (grams)",
        "fats": "number (grams)",
        "fiber": "number (grams)"
    },
    "cookingTips": ["Cooking tip 1", "Cooking tip 2"]
}

Make sure the recipe is creative, delicious, and uses the provided ingredients effectively.`;

    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured on the server.');
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const generatedText = response.text?.trim();
        if (!generatedText) {
            throw new Error('No text returned from the model. Try again.');
        }

        let jsonText = generatedText;
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Error generating recipe:', redactSecrets(error?.message || error));
        throw new Error(userFacingGeminiError(error));
    }
};

export const generatePantrySuggestions = async (pantryItems, expiringNames) => {
    const ingredients = pantryItems.map((item) => item.name).join(', ');
    const expiringText =
        expiringNames.length > 0
            ? `Expiring ingredients: ${expiringNames.join(', ')}`
            : '';

    const prompt = `Generate recipe suggestions based on the following pantry items: ${ingredients} and expiring ingredients: ${expiringText}

Suggest 3 unique and creative recipes that use the pantry items and expiring ingredients effectively. Return only a JSON array of strings, no markdown.
Each suggestion should be a brief appetizing description (1–2 sentences max).`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        let generatedText = response.text?.trim();
        if (!generatedText) {
            throw new Error('No text returned from the model.');
        }

        if (generatedText.startsWith('```json')) {
            generatedText = generatedText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
        } else if (generatedText.startsWith('```')) {
            generatedText = generatedText.replace(/```\n?/g, '');
        }

        return JSON.parse(generatedText);
    } catch (error) {
        console.error('Error generating pantry suggestions:', redactSecrets(error?.message || error));
        throw new Error(userFacingGeminiError(error));
    }
};

export const generateCookingTips = async (recipe) => {
    const prompt = `For this recipe: "${recipe.name}", generate 3-5 cooking tips that are specific
to the recipe and helpful for the cook. Return only a JSON array of strings, no markdown.
[
    "Cooking tip 1",
    "Cooking tip 2",
    "Cooking tip 3"
]`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        let generatedText = response.text?.trim();
        if (!generatedText) {
            throw new Error('No text returned from the model.');
        }

        if (generatedText.startsWith('```json')) {
            generatedText = generatedText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
        } else if (generatedText.startsWith('```')) {
            generatedText = generatedText.replace(/```\n?/g, '');
        }

        return JSON.parse(generatedText);
    } catch (error) {
        console.error('Error generating cooking tips:', redactSecrets(error?.message || error));
        throw new Error(userFacingGeminiError(error));
    }
};

export default {
    generateRecipe,
    generatePantrySuggestions,
    generateCookingTips
};
