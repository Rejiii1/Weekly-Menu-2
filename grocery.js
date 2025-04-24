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

const clearGroceryListButton = document.getElementById('clearGroceryList');

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

            checkbox.addEventListener('change', (event) => {
                const ingredientName = event.target.dataset.ingredientName;
                const dishIds = JSON.parse(event.target.dataset.dishIds);
                const isChecked = event.target.checked;

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

async function generateGroceryList() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error('User is not logged in.');
        groceryListContainer.innerHTML = '<li>Please log in to view your grocery list.</li>';
        return;
    }

    const today = new Date();
    const startDate = new Timestamp(today.getTime() / 1000, 0);

    const meals = await fetchMealsFromFirestore(userId, startDate);
    if (meals.length === 0) {
        groceryListContainer.innerHTML = '<li>No meals planned for today or later.</li>';
        return;
    }

    const ingredientQuantities = {}; // { ingredientName: { name: string, totalQuantity: number, unit: string, haveIt: boolean, dishIds: string[] } }

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
                const haveIt = ingredient.haveIt || false; // Get haveIt status

                if (ingredientQuantities[cleanIngredientName]) {
                    ingredientQuantities[cleanIngredientName].totalQuantity += quantity;
                    if (unit && ingredientQuantities[cleanIngredientName].unit === '') {
                        ingredientQuantities[cleanIngredientName].unit = unit;
                    } else if (unit && ingredientQuantities[cleanIngredientName].unit !== unit) {
                        console.warn(`Inconsistent units found for ${cleanIngredientName}: ${ingredientQuantities[cleanIngredientName].unit} and ${unit}`);
                    }
                    ingredientQuantities[cleanIngredientName].haveIt = ingredientQuantities[cleanIngredientName].haveIt || haveIt; // Keep true if already true
                    if (!ingredientQuantities[cleanIngredientName].dishIds.includes(dishId)) {
                        ingredientQuantities[cleanIngredientName].dishIds.push(dishId);
                    }
                } else {
                    ingredientQuantities[cleanIngredientName] = { name: cleanIngredientName, totalQuantity: quantity, unit: unit, haveIt: haveIt, dishIds: [dishId] };
                }
            });
        }
    }

    const groceryList = Object.values(ingredientQuantities).sort((a, b) => a.name.localeCompare(b.name));
    displayGroceryList(groceryList);
}

async function clearAllGroceryList() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error('User is not logged in.');
        return;
    }

    const meals = await fetchMealsFromFirestore(userId, new Timestamp(Date.now() / 1000, 0)); // Fetch current meals

    const uniqueDishIds = new Set();
    for (const meal of meals) {
        const dishId = await getDishIdByName(meal.dishName);
        if (dishId) {
            uniqueDishIds.add(dishId);
        }
    }

    for (const dishId of uniqueDishIds) {
        const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');
        const ingredientsSnapshot = await getDocs(ingredientsCollectionRef);
        ingredientsSnapshot.forEach(async (doc) => {
            await updateDoc(doc.ref, { haveIt: false });
        });
    }

    // Refresh the grocery list
    generateGroceryList();
}

// Event listener for the clear all button
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

// Check for user authentication when the page loads
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in, generate the grocery list
    generateGroceryList();
  } else {
    // User is not logged in, redirect to login page
    window.location.href = 'login.html';
  }
});

