/**
 * Loads every API route module to catch missing exports / undefined handlers
 * before deploy or after refactors. Run: npm run smoke
 */
await Promise.all([
    import('../routes/auth.js'),
    import('../routes/users.js'),
    import('../routes/pantry.js'),
    import('../routes/recipes.js'),
    import('../routes/mealPlans.js'),
    import('../routes/shoppingList.js'),
]);

console.log('smoke-load: ok');
