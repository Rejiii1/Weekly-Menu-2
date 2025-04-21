// dishes.js

// Import the functions you need from the SDKs you need


import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, setDoc, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"; // Import necessary auth functions

// Firebase configuration (make sure this matches what's in your HTML)
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
const db = getFirestore(app);
const auth = getAuth(app); // Initialize auth

const dishListManagement = document.getElementById('dishListManagement');
const newDishNameInput = document.getElementById('newDishName');
const newDishIngredientsInput = document.getElementById('newDishIngredients');
const addDishWithIngredientsButton = document.getElementById('addDishWithIngredientsButton');

const editDishModal = document.getElementById('editDishModal');
const closeEditModalButton = document.getElementById('closeEditModal');
const editDishNameInput = document.getElementById('editDishName');
const editDishIngredientsInput = document.getElementById('editDishIngredients');
const saveEditedDishButton = document.getElementById('saveEditedDishButton');
const currentDishNameInput = document.getElementById('currentDishName');

let dishesWithIngredients = {}; // We'll populate this from Firestore

// Function to handle logout

window.logout = async () => {
    try {
        await signOut(auth);
        console.log('Logout successful');
        window.location.href = 'login.html'; // Redirect to login page after logout
    } catch (error) {
        console.error('Logout failed:', error);
    }
};

async function loadDishesFromFirestore() {
    const dishListElement = document.getElementById('dishListManagement'); // Target the correct element in dishes.html
    if (dishListElement) {
        try {
            const querySnapshot = await getDocs(collection(db, 'dishes'));
            dishListElement.innerHTML = ''; // Clear existing list

            querySnapshot.forEach((doc) => {
                const dishData = doc.data();
                const dishId = doc.id; // Get the unique document ID

                const listItem = document.createElement('li');
                const dishNameSpan = document.createElement('span');
                dishNameSpan.classList.add('dish-name');
                dishNameSpan.textContent = dishData.name;

                const ingredientsSpan = document.createElement('span');
                ingredientsSpan.classList.add('ingredients');
                ingredientsSpan.textContent = dishData.ingredients ? dishData.ingredients.join(', ') : '';

                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.classList.add('edit-button');
                editButton.addEventListener('click', () => openEditModal(dishId, dishData.name, dishData.ingredients || [])); // Pass the ID

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'X';
                deleteButton.classList.add('delete-button');
                deleteButton.addEventListener('click', () => deleteDish(dishId)); // Pass the ID

                const buttonContainer = document.createElement('div');
                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(deleteButton);

                listItem.appendChild(dishNameSpan);
                listItem.appendChild(ingredientsSpan);
                listItem.appendChild(buttonContainer);
                dishListElement.appendChild(listItem);
            });
        } catch (error) {
            console.error("Error loading dishes:", error);
            alert("Failed to load dishes.");
        }
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadDishesFromFirestore();
    } else {
        console.log("User is not authenticated on dishes.html");
        // Optionally redirect to login page if needed
    }
});

addDishWithIngredientsButton.addEventListener('click', async () => {
    const newDishName = newDishNameInput.value.trim();
    const newIngredients = newDishIngredientsInput.value.split(',').map(item => item.trim()).filter(item => item !== '');

    if (newDishName) {
        try {
            await addDoc(collection(db, 'dishes'), { name: newDishName, ingredients: newIngredients });
            await loadDishesFromFirestore(); // Reload data after adding
            newDishNameInput.value = '';
            newDishIngredientsInput.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Failed to add dish.");
        }
    } else {
        alert('Please enter a dish name.');
    }
});

async function deleteDish(dishName) {
    if (confirm(`Are you sure you want to delete "${dishName}"?`)) {
        try {
            const dishesCollection = collection(db, 'dishes');
            const dishSnapshot = await getDocs(dishesCollection, where('name', '==', dishName));
            dishSnapshot.forEach(async (docToDelete) => {
                await deleteDoc(doc(db, 'dishes', docToDelete.id));
            });
            await loadDishesFromFirestore(); // Reload data after deleting
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Failed to delete dish.");
        }
    }
}

let currentEditingDishName = null;

let currentEditingDishId = null; // To track the ID of the dish being edited

function openEditModal(dishId, dishName, ingredients) {
    currentEditingDishId = dishId; // Store the dish ID
    editDishNameInput.value = dishName;
    editDishIngredientsInput.value = ingredients.join(', ');
    editDishModal.style.display = 'flex';
}

closeEditModalButton.addEventListener('click', () => {
    editDishModal.style.display = 'none';
    currentEditingDishName = null;
});

saveEditedDishButton.addEventListener('click', async () => {
    const newDishName = editDishNameInput.value.trim();
    const newIngredients = editDishIngredientsInput.value.split(',').map(item => item.trim()).filter(item => item !== '');

    if (newDishName && currentEditingDishId) { // Ensure we have an ID
        try {
            const dishDocRef = doc(db, 'dishes', currentEditingDishId); // Use the stored ID
            await setDoc(dishDocRef, { name: newDishName, ingredients: newIngredients });
            await loadDishesFromFirestore(); // Reload data after editing
            editDishModal.style.display = 'none';
            currentEditingDishId = null; // Clear the editing ID
        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Failed to update dish.");
        }
    } else {
        alert('Please enter a dish name.');
    }
});

        // Function to handle login (you might not need this on dishes.html if you're always redirecting)
        window.loginWithEmailPassword = async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorElement = document.getElementById('authError');

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log('Login successful on dishes page:', user);
                document.getElementById('auth-container').style.display = 'none';
            } catch (error) {
                console.error('Login failed on dishes page:', error.code, error.message);
                errorElement.textContent = error.message;
            }
        };

        

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                console.log('User is logged in on dishes:', user);
                document.getElementById('auth-container').style.display = 'none';
            }
        });