// dishes.js

// Import the functions you need from the SDKs you need


import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
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
const auth = getAuth(app);

// --- DOM Elements ---
const dishListContainer = document.getElementById('dishListContainer');
const addDishModal = document.getElementById('addDishModal');
const closeAddModalButton = document.getElementById('closeAddModal');
const newDishNameInput = document.getElementById('newDishName');
const newDishIngredientNameInput = document.getElementById('newDishIngredientName');
const newDishIngredientQuantityInput = document.getElementById('newDishIngredientQuantity');
const addIngredientButton = document.getElementById('addIngredientButton'); // Assuming this is the same as addDishWithIngredientsButton? Check HTML
const ingredientsList = document.getElementById('ingredientsList');
const addDishButton = document.getElementById('addDishButton');

const editDishModal = document.getElementById('editDishModal');
const closeEditModalButton = document.getElementById('closeEditModal');
const editDishNameInput = document.getElementById('editDishName');
const editIngredientsList = document.getElementById('editIngredientsList');
const editNewIngredientNameInput = document.getElementById('editNewIngredientName');
const editNewIngredientQuantityInput = document.getElementById('editNewIngredientQuantity');
const editAddIngredientButton = document.getElementById('editAddIngredientButton');
const saveEditedDishButton = document.getElementById('saveEditedDishButton');
const currentDishIdInput = document.getElementById('currentDishId');

const availableTagsAddDish = document.getElementById('availableTags');
const availableTagsEditDish = document.getElementById('editAvailableTags');
const selectedTagsList = document.getElementById('selectedTagsList');
const editSelectedTagsList = document.getElementById('editSelectedTagsList'); // Make sure this ID exists in your HTML

const openFilterPopupButton = document.getElementById('openFilterPopup');
const filterPopup = document.getElementById('filterPopup');
const tagButtonsContainer = document.getElementById('tagButtonsContainer');
const closeFilterPopupButton = document.getElementById('closeFilterPopup');
const clearFilterButton = document.getElementById('clearFilter');

const openAddTagPopupButton = document.getElementById('openAddTagPopup');
const addTagPopup = document.getElementById('addTagPopup');
const closeAddTagModalButton = document.getElementById('closeAddTagModal');
const newTagNameInput = document.getElementById('newTagName');
const saveNewTagButton = document.getElementById('saveNewTagButton');
const existingTagsList = document.getElementById('existingTagsList');

const openAddDishModalButton = document.getElementById('openAddDishModal');
const addDishWithIngredientsButton = document.getElementById('addDishWithIngredientsButton'); // Added this based on your later event listener


// --- State Variables ---
let currentIngredients = [];
let editingIngredients = {};
let currentTags = [];
let editingTags = [];
let currentFilterTag = '';
let allLoadedDishes = []; // This will hold the master list of dishes
let currentlyEditingIngredientKey = null;

// --- Local Storage Key ---
const DISH_CACHE_KEY = 'cachedDishesData'; // Key for local storage

// --- Utility Functions ---

function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
}

// --- Add Dish Modal Functions ---

function resetAddDishForm() {
    newDishNameInput.value = '';
    newDishIngredientNameInput.value = '';
    newDishIngredientQuantityInput.value = '';
    ingredientsList.innerHTML = '';
    selectedTagsList.innerHTML = '';
    availableTagsAddDish.selectedIndex = 0;
    currentIngredients = [];
    currentTags = [];
}

function renderIngredientsList() {
    if (!ingredientsList) return;
    ingredientsList.innerHTML = '';
    currentIngredients.forEach((ingredient, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div><i class="fas fa-carrot"></i> ${capitalizeWords(ingredient.name)} (${ingredient.quantity})</div>
            <div>
                <button class="remove-ingredient-button" data-index="${index}">&times;</button>
            </div>
        `;
        ingredientsList.appendChild(listItem);
    });
    // Add event listeners after rendering
    ingredientsList.querySelectorAll('.remove-ingredient-button').forEach(button => {
        button.addEventListener('click', (e) => removeIngredient(parseInt(e.target.dataset.index)));
    });
}

function addIngredientToList() {
    const ingredientName = newDishIngredientNameInput.value.trim().toLowerCase();
    const ingredientQuantity = newDishIngredientQuantityInput.value.trim();
    if (ingredientName && ingredientQuantity) {
        currentIngredients.push({ name: ingredientName, quantity: ingredientQuantity });
        renderIngredientsList();
        newDishIngredientNameInput.value = '';
        newDishIngredientQuantityInput.value = '';
        newDishIngredientNameInput.focus(); // Focus back for quicker adding
    } else {
        alert('Please enter both ingredient name and quantity.');
    }
}

function removeIngredient(index) {
    currentIngredients.splice(index, 1);
    renderIngredientsList();
}

function renderSelectedTags() {
    selectedTagsList.innerHTML = '';
    currentTags.forEach((tag, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span><i class="fas fa-tag"></i> ${capitalizeWords(tag)}</span>
            <button class="remove-tag-button" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        selectedTagsList.appendChild(listItem);
    });
    // Add event listeners after rendering
    selectedTagsList.querySelectorAll('.remove-tag-button').forEach(button => {
        button.addEventListener('click', (e) => removeTag(parseInt(e.currentTarget.dataset.index))); // Use currentTarget
    });
}

function addTagToList() {
    const selectedTag = availableTagsAddDish.value;
    if (selectedTag && !currentTags.includes(selectedTag)) {
        currentTags.push(selectedTag);
        renderSelectedTags();
    }
    availableTagsAddDish.value = ''; // Reset dropdown
}

function removeTag(index) {
    currentTags.splice(index, 1);
    renderSelectedTags();
}

function openAddDishModalHandler() {
    resetAddDishForm();
    populateTagDropdowns(); // Ensure tags are fresh when opening
    addDishModal.style.display = 'block';
}

function closeAddDishModalHandler() {
    addDishModal.style.display = 'none';
    // No need to clear form here, resetAddDishForm does it on open
}

// --- Edit Dish Modal Functions ---

function clearEditDishForm() {
    editDishNameInput.value = '';
    editIngredientsList.innerHTML = '';
    editSelectedTagsList.innerHTML = ''; // Clear selected tags in edit modal
    editNewIngredientNameInput.value = '';
    editNewIngredientQuantityInput.value = '';
    availableTagsEditDish.selectedIndex = 0;
    currentDishIdInput.value = '';
    editingIngredients = {};
    editingTags = [];
    currentlyEditingIngredientKey = null;
}

function renderEditIngredientsList() {
    editIngredientsList.innerHTML = '';
    Object.entries(editingIngredients).forEach(([ingredientId, ingredient]) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div><i class="fas fa-caret-right"></i> ${capitalizeWords(ingredient.name)} (${ingredient.quantity})</div>
            <div>
                <button class="edit-ingredient-button" data-id="${ingredientId}"><i class="fas fa-pencil-alt"></i></button>
                <button class="remove-ingredient-button" data-id="${ingredientId}">&times;</button>
            </div>
        `;
        editIngredientsList.appendChild(listItem);
    });

    // Add event listeners after rendering
    editIngredientsList.querySelectorAll('.edit-ingredient-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            handleEditIngredient(id, editingIngredients[id].name, editingIngredients[id].quantity);
        });
    });
    editIngredientsList.querySelectorAll('.remove-ingredient-button').forEach(button => {
        button.addEventListener('click', (e) => removeEditIngredient(e.currentTarget.dataset.id));
    });
}

function handleEditIngredient(ingredientId, name, quantity) {
    editNewIngredientNameInput.value = name;
    editNewIngredientQuantityInput.value = quantity;
    currentlyEditingIngredientKey = ingredientId;
    editNewIngredientNameInput.focus();
}

function addOrUpdateEditIngredient() {
    const ingredientName = editNewIngredientNameInput.value.trim().toLowerCase();
    const ingredientQuantity = editNewIngredientQuantityInput.value.trim();

    if (ingredientName && ingredientQuantity) {
        if (currentlyEditingIngredientKey) {
            // Update existing
            editingIngredients[currentlyEditingIngredientKey].name = ingredientName;
            editingIngredients[currentlyEditingIngredientKey].quantity = ingredientQuantity;
        } else {
            // Add new (create a temporary ID)
            const newId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            editingIngredients[newId] = { name: ingredientName, quantity: ingredientQuantity, haveIt: false }; // Assume new ingredients don't have 'haveIt' yet
        }
        renderEditIngredientsList();
        editNewIngredientNameInput.value = '';
        editNewIngredientQuantityInput.value = '';
        currentlyEditingIngredientKey = null; // Reset editing key
        editNewIngredientNameInput.focus();
    }
}

function removeEditIngredient(ingredientId) {
    delete editingIngredients[ingredientId];
    renderEditIngredientsList();
    // If the removed ingredient was the one being edited, clear the inputs
    if (currentlyEditingIngredientKey === ingredientId) {
        editNewIngredientNameInput.value = '';
        editNewIngredientQuantityInput.value = '';
        currentlyEditingIngredientKey = null;
    }
}

function renderEditSelectedTags() {
    editSelectedTagsList.innerHTML = '';
    editingTags.forEach((tag, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span><i class="fas fa-tag"></i> ${capitalizeWords(tag)}</span>
            <button class="remove-tag-button" data-index="${index}"><i class="fas fa-times"></i></button>
        `;
        editSelectedTagsList.appendChild(listItem);
    });

    // Add event listeners after rendering
    editSelectedTagsList.querySelectorAll('.remove-tag-button').forEach(button => {
        button.addEventListener('click', (e) => removeEditTag(parseInt(e.currentTarget.dataset.index)));
    });
}

function addEditTagToList() {
    const selectedTag = availableTagsEditDish.value;
    if (selectedTag && !editingTags.includes(selectedTag)) {
        editingTags.push(selectedTag);
        renderEditSelectedTags();
    }
    availableTagsEditDish.value = ''; // Reset dropdown
}

function removeEditTag(index) {
    editingTags.splice(index, 1);
    renderEditSelectedTags();
}

function openEditModalHandler(dishId, dishName, ingredients, tags) {
    clearEditDishForm(); // Clear previous state
    populateTagDropdowns(); // Ensure tags are fresh

    editDishNameInput.value = dishName;
    currentDishIdInput.value = dishId;

    // Deep copy ingredients to avoid modifying the original object in allLoadedDishes
    editingIngredients = JSON.parse(JSON.stringify(ingredients || {}));
    // Make sure tags is an array
    editingTags = Array.isArray(tags) ? [...tags] : [];

    renderEditIngredientsList();
    renderEditSelectedTags();

    editDishModal.style.display = 'block';
}

function closeEditModalHandler() {
    editDishModal.style.display = 'none';
    // No need to clear form here, clearEditDishForm does it on open
}

// --- Tag Management Functions ---

async function loadTagsFromFirestore() {
    try {
        const tagsSnapshot = await getDocs(collection(db, 'tags'));
        const tags = [];
        tagsSnapshot.forEach(doc => {
            // Store tags lowercase for consistency but maybe keep original casing if needed?
            // Storing lowercase simplifies comparisons.
            tags.push({ id: doc.id, name: doc.data().name.toLowerCase() });
        });
        // Sort tags alphabetically for dropdowns and lists
        tags.sort((a, b) => a.name.localeCompare(b.name));
        return tags;
    } catch (error) {
        console.error("Error loading tags:", error);
        // alert("Failed to load tags."); // Avoid alert spamming
        return [];
    }
}

async function populateTagDropdowns() {
    const tags = await loadTagsFromFirestore();
    const optionsHtml = tags.map(tag =>
        `<option value="${tag.name}">${capitalizeWords(tag.name)}</option>`
    ).join('');

    if (availableTagsAddDish) {
        availableTagsAddDish.innerHTML = '<option value="" disabled selected>Add a tag...</option>' + optionsHtml;
    }
    if (availableTagsEditDish) {
        availableTagsEditDish.innerHTML = '<option value="" disabled selected>Add a tag...</option>' + optionsHtml;
    }
}

async function populateFilterTagButtons() {
    const tags = await loadTagsFromFirestore();
    if (tagButtonsContainer) {
        tagButtonsContainer.innerHTML = ''; // Clear existing

        // "All" Button
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.classList.add('tag-button');
        allButton.addEventListener('click', () => applyFilterTag('')); // Empty string signifies 'All'
        tagButtonsContainer.appendChild(allButton);

        // Individual Tag Buttons
        tags.forEach(tag => {
            const button = document.createElement('button');
            button.textContent = capitalizeWords(tag.name);
            button.classList.add('tag-button');
            button.dataset.tag = tag.name; // Store lowercase tag name
            button.addEventListener('click', () => applyFilterTag(tag.name));
            tagButtonsContainer.appendChild(button);
        });
    }
}

async function loadAndDisplayTagsForManagement() {
    try {
        const tags = await loadTagsFromFirestore(); // Use the existing function
        renderExistingTags(tags);
    } catch (error) {
        console.error("Error loading tags for management:", error);
        // alert("Failed to load tags.");
    }
}

function renderExistingTags(tags) {
    existingTagsList.innerHTML = '';
    tags.forEach(tag => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span><i class="fas fa-tag"></i> ${capitalizeWords(tag.name)}</span>
            <button class="delete-tag-button" data-id="${tag.id}"><i class="fas fa-times"></i></button>
        `;
        existingTagsList.appendChild(listItem);
    });

    // Add event listeners
    existingTagsList.querySelectorAll('.delete-tag-button').forEach(button => {
        button.addEventListener('click', (e) => deleteTagFromFirestore(e.currentTarget.dataset.id));
    });
}

async function saveTagToFirestore() {
    const newTagName = newTagNameInput.value.trim().toLowerCase(); // Save lowercase
    if (newTagName) {
        try {
             // Check if tag already exists (optional but good practice)
            const existingTags = await loadTagsFromFirestore();
            if (existingTags.some(tag => tag.name === newTagName)) {
                alert(`Tag "${capitalizeWords(newTagName)}" already exists.`);
                newTagNameInput.value = '';
                return;
            }

            await addDoc(collection(db, 'tags'), { name: newTagName });
            console.log("Tag added:", newTagName);
            newTagNameInput.value = '';
            await loadAndDisplayTagsForManagement(); // Refresh management list
            await populateFilterTagButtons(); // Refresh filter buttons
            await populateTagDropdowns(); // Refresh dropdowns
            // Maybe provide user feedback (e.g., temporary success message)
        } catch (error) {
            console.error("Error adding tag:", error);
            alert("Failed to add tag.");
        }
    } else {
        alert("Tag name cannot be empty.");
    }
}

async function deleteTagFromFirestore(tagId) {
    // Optional: Ask for confirmation
    if (!confirm('Are you sure you want to delete this tag? This cannot be undone.')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'tags', tagId));
        console.log("Tag deleted:", tagId);
        await loadAndDisplayTagsForManagement(); // Refresh management list
        await populateFilterTagButtons(); // Refresh filter buttons
        await populateTagDropdowns(); // Refresh dropdowns

        // IMPORTANT: Consider how to handle dishes that used this tag.
        // You might want to remove the tag from all dishes that have it.
        // This requires querying dishes and updating them, which can be complex.
        // For now, we'll just delete the tag itself.

    } catch (error) {
        console.error("Error deleting tag:", error);
        alert("Failed to delete tag.");
    }
}

function openAddTagModalHandler() {
    addTagPopup.style.display = 'block';
    loadAndDisplayTagsForManagement();
    newTagNameInput.focus();
}

function closeAddTagModalHandler() {
    addTagPopup.style.display = 'none';
    newTagNameInput.value = '';
    existingTagsList.innerHTML = '';
}

// --- Dish Data Loading and Rendering ---

function renderDishes(dishesToRender) {
    if (!dishListContainer) return;
    dishListContainer.innerHTML = ''; // Clear the container

    if (dishesToRender.length === 0) {
        dishListContainer.innerHTML = '<p>No dishes found.</p>'; // Handle empty state
        return;
    }

    // Sort dishes alphabetically by name before rendering
    dishesToRender.sort((a, b) => a.name.localeCompare(b.name));

    dishesToRender.forEach(dish => {
        const dishDiv = document.createElement('div');
        dishDiv.classList.add('dish-item');
        dishDiv.setAttribute('role', 'button'); // Make it accessible
        dishDiv.setAttribute('tabindex', '0'); // Make it focusable

        let displayTags = [];
        if (Array.isArray(dish.tags)) {
            // Ensure tags exist and capitalize them
             displayTags = dish.tags
                .filter(tag => tag) // Filter out any null/empty tags just in case
                .map(tag => capitalizeWords(tag));
        }

        const tagsHtml = displayTags.length > 0
            ? `<p class="tags"><i class="fas fa-tags"></i> ${displayTags.join(', ')}</p>`
            : ''; // Add an icon

        dishDiv.innerHTML = `
            <h3>${capitalizeWords(dish.name)}</h3>
            ${tagsHtml}
        `;

        // Add event listener for opening the edit modal
        const clickHandler = () => openEditModalHandler(dish.id, dish.name, dish.ingredients, dish.tags);
        dishDiv.addEventListener('click', clickHandler);
        dishDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                clickHandler();
            }
        });


        dishListContainer.appendChild(dishDiv);
    });
}

function filterAndRenderDishes() {
    let filteredDishes = [];
    if (!currentFilterTag) {
        // No filter or 'All' selected
        filteredDishes = allLoadedDishes;
    } else {
        const lowerCaseFilter = currentFilterTag.toLowerCase();
        filteredDishes = allLoadedDishes.filter(dish =>
            Array.isArray(dish.tags) && dish.tags.some(tag => tag.toLowerCase() === lowerCaseFilter)
        );
    }
    renderDishes(filteredDishes);
}

function applyFilterTag(tag) {
    currentFilterTag = tag; // Store the selected tag (lowercase or empty)

    // Update button styles
    if (tagButtonsContainer) {
        tagButtonsContainer.querySelectorAll('.tag-button').forEach(btn => {
             // Check if the button's tag matches the current filter tag
            // Handle the 'All' button separately (it has no dataset.tag)
            const buttonTag = btn.dataset.tag || ''; // Empty string for 'All' button
            if (buttonTag === currentFilterTag) {
                btn.classList.add('active');
            } else {
                 btn.classList.remove('active');
            }
        });
    }

    filterAndRenderDishes(); // Apply filter and re-render
    filterPopup.style.display = 'none'; // Close popup
}

// --- Firebase Interactions (Dishes) ---

async function fetchDishesFromFirestore() {
    console.log("Fetching latest dishes from Firestore...");
    if (!dishListContainer) return;

    let fetchedDishes = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'dishes2'));

        // Use Promise.all to fetch ingredients concurrently
        const dishPromises = querySnapshot.docs.map(async (docSnapshot) => {
            const dishData = docSnapshot.data();
            const dishId = docSnapshot.id;
            const ingredients = {};
            try {
                const ingredientsQuery = await getDocs(collection(db, 'dishes2', dishId, 'ingredients'));
                ingredientsQuery.forEach(ingDoc => {
                    // Ensure ingredient names are stored/retrieved consistently (e.g., lowercase)
                    const ingData = ingDoc.data();
                    ingredients[ingDoc.id] = {
                        ...ingData,
                        name: ingData.name ? ingData.name.toLowerCase() : '' // Ensure name exists and is lowercase
                    };
                });
            } catch (ingError) {
                console.error(`Error fetching ingredients for dish ${dishId}:`, ingError);
                // Decide how to handle: skip dish, show error, etc. Here we continue without ingredients.
            }
            // Ensure tags is an array and lowercase
            const tags = Array.isArray(dishData.tags)
                         ? dishData.tags.map(tag => tag ? tag.toLowerCase() : '').filter(Boolean)
                         : [];

            return {
                id: dishId,
                name: dishData.name || 'Unnamed Dish', // Provide default name
                tags: tags,
                ingredients: ingredients
            };
        });

        fetchedDishes = await Promise.all(dishPromises);

        // Update the main state and local storage
        allLoadedDishes = fetchedDishes;
        saveDishesToCache(allLoadedDishes);

        console.log("Firestore fetch complete. Dishes loaded:", allLoadedDishes.length);

        // Re-render with fresh data and update filters/tags
        filterAndRenderDishes();
        await populateFilterTagButtons(); // Update tag buttons based on potentially new tags

    } catch (error) {
        console.error("Error loading dishes from Firestore:", error);
        // Optionally display a user-friendly error message in the UI
        if (dishListContainer) {
            dishListContainer.innerHTML = '<p class="error-message">Could not load dishes. Please try again later.</p>';
        }
        // Do not clear cache here, it might still be useful offline
    }
}

async function saveDishToFirestore() {
    const dishName = newDishNameInput.value.trim();

    if (!dishName) {
        alert('Dish name cannot be empty.');
        return;
    }
    // Add loading state to button?
    addDishButton.disabled = true;
    addDishButton.textContent = 'Saving...';


    try {
        const dishData = {
            name: dishName, // Store original case name? Or consistent case? Let's use original for display.
            // Ensure tags are saved lowercase for consistent filtering
            tags: currentTags.map(tag => tag.toLowerCase()),
        };

        // Add the main dish document
        const dishRef = await addDoc(collection(db, 'dishes2'), dishData);
        console.log("Dish document added with ID:", dishRef.id);

        // Add ingredients as a sub-collection
        const ingredientsCollectionRef = collection(db, 'dishes2', dishRef.id, 'ingredients');
        const ingredientPromises = currentIngredients.map(ingredient => {
             return addDoc(ingredientsCollectionRef, {
                 name: ingredient.name.toLowerCase().trim(), // Ensure lowercase and trim
                 quantity: ingredient.quantity,
                 haveIt: false // Default value
             });
        });
        await Promise.all(ingredientPromises);
        console.log("Ingredients added for dish:", dishRef.id);


        closeAddDishModalHandler();
        // Refresh data from Firestore to update cache and UI
        await fetchDishesFromFirestore();

    } catch (error) {
        console.error("Error adding dish:", error);
        alert('Failed to add dish. Please check your connection and try again.');
    } finally {
        // Reset button state
         addDishButton.disabled = false;
         addDishButton.textContent = 'Save Dish';
    }
}

async function saveEditedDish() {
    const dishId = currentDishIdInput.value;
    const updatedDishName = editDishNameInput.value.trim();

    if (!dishId || !updatedDishName) {
        alert('Dish ID is missing or dish name cannot be empty.');
        return;
    }

     // Add loading state to button?
    saveEditedDishButton.disabled = true;
    saveEditedDishButton.textContent = 'Saving...';

    try {
        const dishDocRef = doc(db, 'dishes2', dishId);

        // 1. Update the main dish document (name and tags)
        await updateDoc(dishDocRef, {
            name: updatedDishName,
             // Ensure tags are saved lowercase
            tags: editingTags.map(tag => tag.toLowerCase())
        });
        console.log("Dish document updated:", dishId);

        // 2. Update ingredients sub-collection (Overwrite strategy)
        const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');

        //  a. Get existing ingredient IDs to delete them
        const existingIngredientsSnapshot = await getDocs(ingredientsCollectionRef);
        const deletePromises = existingIngredientsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log("Old ingredients deleted for dish:", dishId);


        //  b. Add the current `editingIngredients`
        const addPromises = Object.values(editingIngredients).map(ingredient => {
            // Ensure haveIt exists, default to false if not
            const haveItStatus = ingredient.haveIt !== undefined ? ingredient.haveIt : false;
            return addDoc(ingredientsCollectionRef, {
                name: ingredient.name.toLowerCase().trim(), // Ensure lowercase and trim
                quantity: ingredient.quantity,
                haveIt: haveItStatus
            });
        });
        await Promise.all(addPromises);
        console.log("New ingredients added for dish:", dishId);

        closeEditModalHandler();
        // Refresh data from Firestore
        await fetchDishesFromFirestore();

    } catch (error) {
        console.error("Error updating dish:", error);
        alert('Failed to update dish. Please check your connection and try again.');
    } finally {
        saveEditedDishButton.disabled = false;
        saveEditedDishButton.textContent = 'Save Changes';
    }
}

// --- Delete Dish Function ---
async function deleteDish(dishId) {
    if (!dishId) {
        console.error("deleteDish called with invalid dishId");
        alert("Error: Dish ID is missing."); // Provide user feedback
        return;
    }

    try {
        // 1. Delete the main dish document from the 'dishes2' collection
        const dishDocRef = doc(db, 'dishes2', dishId);
        await deleteDoc(dishDocRef);
        console.log(`Dish deleted from Firestore: ${dishId}`);

        // 2. Delete any associated ingredients (assuming they are in a subcollection)
        //    This is crucial to maintain data consistency
        const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');
        const ingredientsSnapshot = await getDocs(ingredientsCollectionRef);

        // Use a standard for-of loop for asynchronous operations inside the loop
        for (const ingredientDoc of ingredientsSnapshot.docs) {
            await deleteDoc(ingredientDoc.ref); // Delete each ingredient document
            console.log(`Ingredient deleted: ${ingredientDoc.id} for dish ${dishId}`);
        }

        // 3. Delete meal plan entries that use this dish
        await deleteMealsUsingDish(dishId);

        // 4. Optionally remove the dish from the UI
        removeDishFromUI(dishId);
        await fetchDishesFromFirestore();
        // 6. Close the modal (optional, if you want it to close automatically)
        const editDishModal = document.getElementById('editDishModal');
        if (editDishModal) {
            if (typeof editDishModal.hide === 'function') {
                editDishModal.hide(); // custom method? cool, use it
            } else {
                editDishModal.style.display = 'none'; // fallback method
            }
        }
        


    } catch (error) {
        console.error("Error deleting dish and related data:", error);
        alert("An error occurred while deleting the dish. Please try again."); // Inform the user
    }
}

// --- Helper Functions ---

/**
 * Removes a dish from the UI.  This function assumes you have a way to
 * identify and remove the dish element (e.g., by a data-dish-id attribute).
 */
function removeDishFromUI(dishId) {
    const dishElement = document.querySelector(`[data-dish-id="${dishId}"]`);
    if (dishElement) {
        dishElement.remove(); // Remove the dish element from the DOM
        console.log(`Dish removed from UI: ${dishId}`);
    } else {
        console.log(`Dish ${dishId} removed from Firestore; UI element not found (maybe already removed).`);
;
    }
}

/**
 * Deletes meal plan entries that use the specified dish.
 */
async function deleteMealsUsingDish(dishId) {
    try {
        const mealsCollection = collection(db, 'meals');
        const q = query(mealsCollection, where('dishName', '==', dishId));
        const mealsSnapshot = await getDocs(q);

        for (const mealDoc of mealsSnapshot.docs) {
            await deleteDoc(mealDoc.ref);
            console.log(`Meal plan entry deleted: ${mealDoc.id} (dishId: ${dishId})`);
        }
    } catch (error) {
        console.error(`Error deleting meal plan entries for dish ${dishId}:`, error);
        // Consider if you want to alert the user or take other action.
        // For now, we log and continue, but you might want to handle this more strictly.
    }
}

// --- Event Listener for the Delete Button ---
document.addEventListener('DOMContentLoaded', () => {
    const deleteEditedDishButton = document.getElementById('deleteEditedDishButton');

    if (deleteEditedDishButton) {
        deleteEditedDishButton.addEventListener('click', async () => {
            const editDishModal = document.getElementById('editDishModal');
            const dishId = document.getElementById('currentDishId')?.value;
            if (dishId) {
                await deleteDish(dishId);
            } else {
                console.error("Dish ID not found in modal.");
                alert("Error: Dish ID not found. Cannot delete.");
            }
        });
    } else {
        console.warn("deleteEditedDishButton not found. Ensure the button has the correct ID.");
    }
});
// --- Local Storage Cache ---

function loadDishesFromCache() {
    try {
        const cachedData = localStorage.getItem(DISH_CACHE_KEY);
        if (cachedData) {
            console.log("Loading dishes from cache...");
            allLoadedDishes = JSON.parse(cachedData);
            // Immediately render from cache
            filterAndRenderDishes();
            return true; // Indicate cache was loaded
        }
    } catch (error) {
        console.error("Error reading from cache:", error);
        // Clear potentially corrupted cache
        localStorage.removeItem(DISH_CACHE_KEY);
    }
    return false; // Indicate cache was not loaded or was invalid
}

function saveDishesToCache(dishes) {
    try {
        localStorage.setItem(DISH_CACHE_KEY, JSON.stringify(dishes));
        console.log("Dishes saved to cache.");
    } catch (error) {
        console.error("Error saving to cache:", error);
        // Handle potential storage limits (e.g., QuotaExceededError)
        // Maybe notify the user or implement cache eviction strategy if needed
        alert("Could not save dish data locally. Storage might be full.");
    }
}

// --- Initialization and Event Listeners ---

function initializeAppAndListeners() {
    console.log("Initializing App...");

    // --- Authentication Check ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User is logged in:', user.uid);
            // --- Initial Data Load ---
            // 1. Try loading from cache first for immediate display
            const cacheLoaded = loadDishesFromCache();

            // 2. Always fetch from Firestore in the background to get latest data
            // If cache didn't load, this fetch will be the primary data source.
            // If cache did load, this fetch will update it.
             fetchDishesFromFirestore().then(() => {
                 // Populate dropdowns after initial fetch is likely complete
                populateTagDropdowns();
            }).catch(err => {
                console.error("Initial Firestore fetch failed:", err);
                // If cache didn't load and fetch failed, show error
                if (!cacheLoaded && dishListContainer) {
                     dishListContainer.innerHTML = '<p class="error-message">Could not load dishes. Please check connection and refresh.</p>';
                }
            });


        } else {
            console.log('User is not logged in. Redirecting to login.');
            // Make sure login.html exists or adjust the path
             window.location.href = 'login.html';
        }
    });

    // --- Add/Edit Dish Modal Triggers ---
    if (openAddDishModalButton) {
        openAddDishModalButton.addEventListener('click', openAddDishModalHandler);
    }
    if (closeAddModalButton) {
        closeAddModalButton.addEventListener('click', closeAddDishModalHandler);
    }
    if (closeEditModalButton) {
        closeEditModalButton.addEventListener('click', closeEditModalHandler);
    }

    // --- Add Dish Form ---
    if (addDishButton) {
        addDishButton.addEventListener('click', saveDishToFirestore);
    }
    if (addDishWithIngredientsButton) { // Check if this is the correct ID for the button next to ingredient inputs
        addDishWithIngredientsButton.addEventListener('click', addIngredientToList);
    }
    if(newDishIngredientQuantityInput) { // Allow adding ingredient by pressing Enter in quantity field
        newDishIngredientQuantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission if inside a form
                addIngredientToList();
            }
        });
    }
    if (availableTagsAddDish) {
        availableTagsAddDish.addEventListener('change', addTagToList);
    }

    // --- Edit Dish Form ---
    if (saveEditedDishButton) {
        saveEditedDishButton.addEventListener('click', saveEditedDish);
    }
    if (editAddIngredientButton) {
        editAddIngredientButton.addEventListener('click', addOrUpdateEditIngredient);
    }
     if(editNewIngredientQuantityInput) { // Allow adding/updating ingredient by pressing Enter in quantity field
        editNewIngredientQuantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addOrUpdateEditIngredient();
            }
        });
    }
    if (availableTagsEditDish) {
        availableTagsEditDish.addEventListener('change', addEditTagToList);
    }

    // --- Filter Popup ---
    if (openFilterPopupButton) {
        openFilterPopupButton.addEventListener('click', (event) => {
            event.stopPropagation();
            filterPopup.style.display = filterPopup.style.display === 'flex' ? 'none' : 'flex'; // Toggle display
             if(filterPopup.style.display === 'flex') {
                 populateFilterTagButtons(); // Refresh buttons when opening
             }
        });
    }
     if (closeFilterPopupButton) { // Assuming you have a close button inside the popup
        closeFilterPopupButton.addEventListener('click', () => {
            filterPopup.style.display = 'none';
        });
    }
    if (clearFilterButton) {
        clearFilterButton.addEventListener('click', () => applyFilterTag('')); // Apply 'All' filter
    }


    // --- Add Tag Popup ---
    if (openAddTagPopupButton) {
        openAddTagPopupButton.addEventListener('click', openAddTagModalHandler);
    }
    if (closeAddTagModalButton) {
        closeAddTagModalButton.addEventListener('click', closeAddTagModalHandler);
    }
    if (saveNewTagButton) {
        saveNewTagButton.addEventListener('click', saveTagToFirestore);
    }
    if (newTagNameInput) { // Allow adding tag by pressing Enter
        newTagNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                 e.preventDefault();
                 saveTagToFirestore();
             }
         });
    }


    // --- Global Click Listener (for closing modals/popups) ---
    window.addEventListener('click', (event) => {
        if (event.target === addDishModal) {
            closeAddDishModalHandler();
        }
        if (event.target === editDishModal) {
            closeEditModalHandler();
        }
        if (event.target === addTagPopup) {
            closeAddTagModalHandler();
        }
         // Close filter popup if clicking outside of it
        if (filterPopup.style.display === 'flex' && !filterPopup.contains(event.target) && event.target !== openFilterPopupButton) {
           filterPopup.style.display = 'none';
        }
    });

    // --- Initial Tag Populate (for filters/dropdowns) ---
    // These are called after data load now
    // populateTagDropdowns(); // Called on modal open / after fetch
    // populateFilterTagButtons(); // Called after fetch / on popup open
}

// --- Start the application ---
initializeAppAndListeners();