import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
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
        date: mealData.date.toDate(), // Convert Timestamp to Date object
        dishName: mealData.dishName,
      });
    });
    return meals;
  } catch (error) {
    console.error('Error fetching meals:', error);
    return [];
  }
}

async function fetchIngredientsForDish(dishName) {
    try {
        const dishesCollection = collection(db, 'dishes');
        const q = query(dishesCollection, where('name', '==', dishName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const dishData = querySnapshot.docs[0].data(); // Get data from the first document
            return dishData.ingredients || []; // Return ingredients or empty array
        } else {
            console.warn(`Dish "${dishName}" not found in Firestore.`);
            return []; // Return empty array if dish not found
        }
    } catch (error) {
        console.error(`Error fetching ingredients for dish "${dishName}":`, error);
        return [];
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
  const startDate = new Timestamp(today.getTime() / 1000, 0); // Convert JS Date to Firestore Timestamp

  const meals = await fetchMealsFromFirestore(userId, startDate);
  if (meals.length === 0) {
        groceryListContainer.innerHTML = '<li>No meals planned for today or later.</li>';
        return;
  }

  const ingredientsMap = {}; // { dishName: [ingredient1, ingredient2, ...] }
  for (const meal of meals) {
    const dishName = meal.dishName;
    if (!ingredientsMap[dishName]) {
      ingredientsMap[dishName] = await fetchIngredientsForDish(dishName);
    }
  }

  const ingredientQuantities = {}; // { ingredient: { name: string, quantity: number } }
  for (const meal of meals) { // Iterate over meals, not the ingredientsMap
    const dishName = meal.dishName;
    const ingredients = ingredientsMap[dishName] || []; // Get ingredients for the dish
    ingredients.forEach(ingredient => {
      const cleanIngredient = ingredient.toLowerCase().trim();
      if (ingredientQuantities[cleanIngredient]) {
        ingredientQuantities[cleanIngredient].quantity += 1;
      } else {
        ingredientQuantities[cleanIngredient] = { name: cleanIngredient, quantity: 1 };
      }
    });
  }

  const groceryList = Object.values(ingredientQuantities).sort((a, b) => a.name.localeCompare(b.name));
  displayGroceryList(groceryList);
}

function displayGroceryList(groceryList) {
    groceryListContainer.innerHTML = ''; // Clear previous content

    if (groceryList.length === 0) {
        const noMealsMessage = document.createElement('li');
        noMealsMessage.textContent = 'No ingredients needed.';
        groceryListContainer.appendChild(noMealsMessage);
    } else {
        groceryList.forEach(item => {
            const listItem = document.createElement('li');
            // Capitalize the first letter of each word in the ingredient name
            const capitalizedIngredientName = item.name.split(' ').map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(' ');

            if (item.quantity > 1) {
                listItem.textContent = `${capitalizedIngredientName} (x${item.quantity})`;
            } else {
                listItem.textContent = capitalizedIngredientName;
            }
            groceryListContainer.appendChild(listItem);
        });
    }
}

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

