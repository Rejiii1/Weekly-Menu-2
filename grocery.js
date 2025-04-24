import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCd_HEHyheAvr8wVvZreP_xKiWsG05PcCc",
    authDomain: "weekly-menu-2.firebaseapp.com",
    projectId: "weekly-menu-2",
    storageBucket: "weekly-menu-2.firebasestorage.app",
    messagingSenderId: "600774461017",
    appId: "1:600774461017:web:70238ba949e473171e5348",
    measurementId: "G-5FX6NGDP97"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const groceryListContainer = document.getElementById('groceryList'); // Get the grocery list container
const clearGroceryListButton = document.getElementById('clearGroceryList');


async function fetchMealsFromFirestore(userId, startDate) {
    try {
        const mealsCollection = collection(db, 'meals');
        const q = query(mealsCollection,
            where('userId', '==', userId),
            where('date', '>=', startDate)
        );
        const querySnapshot = await getDocs(q);
        const meals = [];
        querySnapshot.forEach((doc) => {
            const mealData = doc.data();
            meals.push({
                id: doc.id, // Include the document ID (which is the dishId in this context)
                date: mealData.date.toDate(),
                dishName: mealData.dishName,
            });
        });
        return meals;
    } catch (error) {
        console.error('Error fetching meals:', error);
        return [];
    }
}

async function fetchIngredientsForDish(dishId) {
    try {
        const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');
        const ingredientsSnapshot = await getDocs(ingredientsCollectionRef);
        const ingredients = [];
        ingredientsSnapshot.forEach(doc => {
            ingredients.push(doc.data()); // Push the ingredient data (name, quantity, haveIt)
        });
        return ingredients;
    } catch (error) {
        console.error(`Error fetching ingredients for dish ID "${dishId}":`, error);
        return [];
    }
}
async function getDishIdByName(dishName) {
    const dishesCollection = collection(db, 'dishes2');
    const q = query(dishesCollection, where('name', '==', dishName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    return null;
}

// Function to generate the grocery list
function pluralizeUnit(unit, quantity) {
    if (quantity > 1 && unit) {
        if (unit.toLowerCase() === 'box') {
            return 'Boxes';
        } else if (unit.toLowerCase().endsWith('s')) {
            return unit;
        } else {
            return unit + 's';
        }
    }
    return unit;
}

async function updateIngredientHaveIt(dishId, ingredientName, haveIt) {
    try {
        const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');
        const q = query(ingredientsCollectionRef, where('name', '==', ingredientName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            querySnapshot.forEach(async (doc) => {
                await updateDoc(doc.ref, { haveIt: haveIt });
            });
        } else {
            console.warn(`Ingredient "${ingredientName}" not found for dish ID "${dishId}".`);
        }
    } catch (error) {
        console.error(`Error updating 'haveIt' for ${ingredientName} in ${dishId}:`, error);
    }
}

let groceryListCache = []; // Store the generated grocery list

function displayGroceryList(groceryList) {
    groceryListContainer.innerHTML = '';

    if (groceryList.length === 0) {
        const noMealsMessage = document.createElement('li');
        noMealsMessage.textContent = 'No ingredients needed.';
        groceryListContainer.appendChild(noMealsMessage);
    } else {
        groceryList.forEach(item => {
            const listItem = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('grocery-item-checkbox');
            checkbox.dataset.ingredientName = item.name;
            checkbox.dataset.dishIds = JSON.stringify(item.dishIds);
            checkbox.checked = item.haveIt || false;

            checkbox.addEventListener('change', (event) => { // Remove async here for direct DOM manipulation
                const ingredientName = event.target.dataset.ingredientName;
                const dishIds = JSON.parse(event.target.dataset.dishIds);
                const isChecked = event.target.checked;

                // Update the local groceryListCache immediately
                const updatedList = groceryListCache.map(cachedItem => {
                    if (cachedItem.name === ingredientName) {
                        return { ...cachedItem, haveIt: isChecked };
                    }
                    return cachedItem;
                });
                groceryListCache = updatedList;
                displayGroceryList(groceryListCache); // Re-render with updated cache

                // Update Firebase in the background (without awaiting)
                dishIds.forEach(dishId => {
                     updateIngredientHaveIt(dishId, ingredientName, isChecked);
                });
            });

            const capitalizedIngredientName = item.name.split(' ').map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' ');

            let displayText = capitalizedIngredientName;
            let quantityAndUnit = '';
            if (item.totalQuantity > 0) {
                quantityAndUnit += ` (x ${item.totalQuantity}`;
                if (item.unit) {
                    const pluralUnit = pluralizeUnit(item.unit, item.totalQuantity);
                    quantityAndUnit += ` ${pluralUnit})`;
                } else {
                    quantityAndUnit += `)`;
                }
            }

            const textSpan = document.createElement('span');
            textSpan.textContent = displayText + quantityAndUnit;

            //  Append in the REVERSE order: textSpan first, then checkbox
            listItem.appendChild(textSpan);
            listItem.appendChild(checkbox);
            groceryListContainer.appendChild(listItem);
        });
    }
}

let isInitialLoad = true; // Track initial load

async function generateGroceryList() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error('User is not logged in.');
        groceryListContainer.innerHTML = '<li>Please log in to view your grocery list.</li>';
        return;
    }

    const today = new Date();
    // Create a new Date object representing the beginning of today (midnight in local time)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Convert the start of today to a Firestore Timestamp
    const startDate = Timestamp.fromDate(startOfToday);

    // 1. Try to get data from localStorage first
    let storedGroceryList = localStorage.getItem('groceryList');
    let groceryList;

    if (storedGroceryList && !isInitialLoad) { // Only use stored data if not initial load
        try {
            groceryList = JSON.parse(storedGroceryList);
            groceryListCache = groceryList; // Also update the cache here
            displayGroceryList(groceryList); // Display cached data
        } catch (e) {
            console.error("Error parsing stored grocery list", e);
            localStorage.removeItem('groceryList'); // Remove invalid data
        }
    }

    // 2. Fetch data from Firebase
    try {
        const meals = await fetchMealsFromFirestore(userId, startDate);
        if (meals.length === 0) {
            groceryListContainer.innerHTML = '<li>No meals planned for today or later.</li>';
            return;
        }

        const ingredientQuantities = {};

        for (const meal of meals) {
            const dishName = meal.dishName;
            const dishId = await getDishIdByName(dishName);
            if (dishId) {
                const ingredients = await fetchIngredientsForDish(dishId);
                ingredients.forEach(ingredient => {
                    const cleanIngredientName = ingredient.name.toLowerCase().trim();
                    const quantityWithUnit = ingredient.quantity || '';
                    const unitMatch = quantityWithUnit.match(/[a-zA-Z]+/);
                    const quantityMatch = quantityWithUnit.match(/[\d.]+/);
                    const quantity = quantityMatch ? parseFloat(quantityMatch[0]) : 1;
                    const unit = unitMatch ? unitMatch[0].trim() : '';
                    const haveIt = ingredient.haveIt || false;

                    if (ingredientQuantities[cleanIngredientName]) {
                        ingredientQuantities[cleanIngredientName].totalQuantity += quantity;
                        if (unit && ingredientQuantities[cleanIngredientName].unit === '') {
                            ingredientQuantities[cleanIngredientName].unit = unit;
                        } else if (unit && ingredientQuantities[cleanIngredientName].unit !== unit) {
                            console.warn(`Inconsistent units found for ${cleanIngredientName}: ${ingredientQuantities[cleanIngredientName].unit} and ${unit}`);
                        }
                        ingredientQuantities[cleanIngredientName].haveIt = ingredientQuantities[cleanIngredientName].haveIt || haveIt;
                        if (!ingredientQuantities[cleanIngredientName].dishIds.includes(dishId)) {
                            ingredientQuantities[cleanIngredientName].dishIds.push(dishId);
                        }
                    } else {
                        ingredientQuantities[cleanIngredientName] = {
                            name: cleanIngredientName,
                            totalQuantity: quantity,
                            unit: unit,
                            haveIt: haveIt,
                            dishIds: [dishId]
                        };
                    }
                });
            }
        }

        groceryList = Object.values(ingredientQuantities).sort((a, b) => a.name.localeCompare(b.name));
        groceryListCache = groceryList; // Store in cache
        localStorage.setItem('groceryList', JSON.stringify(groceryList));
        displayGroceryList(groceryList); // Display Firebase data

    } catch (error) {
        console.error("Error fetching or processing grocery list:", error);
        // Display error to user
        if (isInitialLoad && storedGroceryList) {
            //If initial load, and there is stored data, use that.
            try{
                groceryList = JSON.parse(storedGroceryList);
                groceryListCache = groceryList;
                displayGroceryList(groceryList);
            } catch(e){
                console.error("Error parsing local storage",e)
            }
        } else {
            groceryListContainer.innerHTML = '<li>Error: Could not retrieve grocery list.</li>'; // keep the message
        }

    } finally {
        isInitialLoad = false; // Set to false after the first load attempt
    }
}



async function clearAllGroceryList() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error('User is not logged in.');
        return;
    }

    // 1.  Clear the 'haveIt' status for *all* ingredients in *all* dishes.
    //     This is the key change to incorporate the original functionality.
    try {
        const allDishesSnapshot = await getDocs(collection(db, 'dishes2'));
        for (const dishDoc of allDishesSnapshot.docs) {
            const ingredientsCollectionRef = collection(db, 'dishes2', dishDoc.id, 'ingredients');
            const ingredientsSnapshot = await getDocs(ingredientsCollectionRef);
            for (const ingredientDoc of ingredientsSnapshot.docs) {
                await updateDoc(ingredientDoc.ref, { haveIt: false });
                console.log(`Reset haveIt to false for ingredient ${ingredientDoc.id} in dish ${dishDoc.id}`);
            }
        }
        console.log("Cleared 'haveIt' status for all ingredients in all dishes.");
    } catch (error) {
        console.error("Error clearing 'haveIt' status for all dishes:", error);
        //  IMPORTANT:  Consider whether to continue clearing the grocery list if this fails.
        //  For now, we log the error and continue, but you might want to stop the process.
    }


    // 2.  Fetch data from Firebase to refresh the grocery list.
    const today = new Date();
    const startDate = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const meals = await fetchMealsFromFirestore(userId, startDate);


    // 3. Process meals and ingredients to generate grocery list data.
    const ingredientQuantities = {};
      if (meals && meals.length > 0) { //Fixes issue where if no meals are planned, an error is thrown
        for (const meal of meals) {
            const dishName = meal.dishName;
            const dishId = await getDishIdByName(dishName); // You still need this function
            if (dishId) {
                const ingredients = await fetchIngredientsForDish(dishId);  // You still need this function
                ingredients.forEach(ingredient => {
                    const cleanIngredientName = ingredient.name.toLowerCase().trim();
                    const quantityWithUnit = ingredient.quantity || '';
                    const unitMatch = quantityWithUnit.match(/[a-zA-Z]+/);
                    const quantityMatch = quantityWithUnit.match(/[\d.]+/);
                    const quantity = quantityMatch ? parseFloat(quantityMatch[0]) : 1;
                    const unit = unitMatch ? unitMatch[0].trim() : '';
                    const haveIt = ingredient.haveIt || false;  //This will now always be false, but is kept for consistency

                    if (ingredientQuantities[cleanIngredientName]) {
                        ingredientQuantities[cleanIngredientName].totalQuantity += quantity;
                        if (unit && ingredientQuantities[cleanIngredientName].unit === '') {
                            ingredientQuantities[cleanIngredientName].unit = unit;
                        } else if (unit && ingredientQuantities[cleanIngredientName].unit !== unit) {
                            console.warn(`Inconsistent units found for ${cleanIngredientName}: ${ingredientQuantities[cleanIngredientName].unit} and ${unit}`);
                        }
                        ingredientQuantities[cleanIngredientName].haveIt = haveIt; //  Always false, but kept.
                        if (!ingredientQuantities[cleanIngredientName].dishIds.includes(dishId)) {
                            ingredientQuantities[cleanIngredientName].dishIds.push(dishId);
                        }
                    } else {
                        ingredientQuantities[cleanIngredientName] = {
                            name: cleanIngredientName,
                            totalQuantity: quantity,
                            unit: unit,
                            haveIt: haveIt, // Always false, but kept.
                            dishIds: [dishId]
                        };
                    }
                });
            }
        }
      }


    // 4. Update local storage and the UI.
    const groceryList = Object.values(ingredientQuantities).sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('groceryList', JSON.stringify(groceryList));
    groceryListCache = groceryList;  // Update the cache
    displayGroceryList(groceryList);    // Refresh the display

}

// (Keep your existing event listener)
if (clearGroceryListButton) {
    clearGroceryListButton.addEventListener('click', clearAllGroceryList);
}


// Initial generation of the grocery list (still in the onAuthStateChanged)
onAuthStateChanged(auth, (user) => {
    if (user) {
        generateGroceryList();
    } else {
        window.location.href = 'login.html';
    }
});
