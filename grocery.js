const groceryListItemsElement = document.getElementById('groceryListItems');

function loadMeals() {
    const storedMeals = localStorage.getItem('meals');
    console.log("Loaded Meals:", storedMeals ? JSON.parse(storedMeals) : {}); // Log loaded meals
    return storedMeals ? JSON.parse(storedMeals) : {};
}

function loadDishesWithIngredients() {
    const storedDishes = localStorage.getItem('dishesWithIngredients');
    console.log("Loaded Dishes with Ingredients:", storedDishes ? JSON.parse(storedDishes) : {}); // Log loaded dishes
    return storedDishes ? JSON.parse(storedDishes) : {};
}

function generateGroceryList() {
    const meals = loadMeals();
    const dishes = loadDishesWithIngredients();
    const groceryItems = new Set(); // Use a Set to avoid duplicate ingredients

    console.log("Meals in generateGroceryList:", meals); // Log meals inside the function
    console.log("Dishes in generateGroceryList:", dishes); // Log dishes inside the function

    for (const date in meals) {
        const dishName = meals[date];
        console.log("Processing dish:", dishName, "for date:", date); // Log each dish being processed
        if (dishes.hasOwnProperty(dishName) && Array.isArray(dishes[dishName])) {
            dishes[dishName].forEach(ingredient => {
                groceryItems.add(ingredient.trim());
                console.log("Adding ingredient:", ingredient.trim()); // Log each ingredient added
            });
        } else {
            console.log("Dish not found or ingredients not an array:", dishName); // Log if a dish isn't found
        }
    }

    console.log("Final groceryItems Set:", groceryItems); // Log the final set of grocery items

    groceryListItemsElement.innerHTML = '';
    groceryItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        groceryListItemsElement.appendChild(listItem);
        console.log("Added list item to DOM:", item); // Log when an item is added to the DOM
    });
}

// Generate the grocery list when the page loads
generateGroceryList();