// dishes.js

// Import the functions you need from the SDKs you need


import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
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

const dishListContainer = document.getElementById('dishListContainer'); // The container for the 3-column grid
const addDishModal = document.getElementById('addDishModal');
const closeAddModalButton = document.getElementById('closeAddModal');
const newDishNameInput = document.getElementById('newDishName');
const newDishIngredientNameInput = document.getElementById('newDishIngredientName');
const newDishIngredientQuantityInput = document.getElementById('newDishIngredientQuantity');
const addIngredientButton = document.getElementById('addIngredientButton');
const ingredientsList = document.getElementById('ingredientsList');
const tagSelect = document.getElementById('tagSelect'); // Assuming you have a <select> with tags
const addDishButton = document.getElementById('addDishButton');

const editDishModal = document.getElementById('editDishModal');
const closeEditModalButton = document.getElementById('closeEditModal');
const editDishNameInput = document.getElementById('editDishName');
const editIngredientsList = document.getElementById('editIngredientsList');
const editNewIngredientNameInput = document.getElementById('editNewIngredientName');
const editNewIngredientQuantityInput = document.getElementById('editNewIngredientQuantity');
const editAddIngredientButton = document.getElementById('editAddIngredientButton');
const editTagSelect = document.getElementById('editTagSelect');
const saveEditedDishButton = document.getElementById('saveEditedDishButton');
const currentDishIdInput = document.getElementById('currentDishId'); // Hidden input to store the ID being edited

const availableTagsSelect = document.getElementById('availableTags');
const editAvailableTagsSelect = document.getElementById('editAvailableTags');
const availableTagsAddDish = document.getElementById('availableTags');
const availableTagsEditDish = document.getElementById('editAvailableTags');
const filterTagButton = document.getElementById('filterTagButton');

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
const selectedTagsList = document.getElementById('selectedTagsList');

let currentIngredients = []; // To hold ingredients for a new dish
let editingIngredients = {}; // To hold ingredients for the dish being edited
let currentTags = []; // To hold tags for a new dish
let editingTags = []; // To hold tags for the dish being edited
let currentFilterTag = ''; // To keep track of the active filter
let allLoadedDishes = [];






// --- Helper Functions ---

function resetAddDishForm() {
    if (newDishNameInput) {
        newDishNameInput.value = '';
    }
    if (newDishIngredientNameInput) {
        newDishIngredientNameInput.value = '';
    }
    if (newDishIngredientQuantityInput) {
        newDishIngredientQuantityInput.value = '';
    }
    if (ingredientsList) {
        ingredientsList.innerHTML = ''; // Clear the displayed ingredients
    }
    if (availableTagsAddDish) {
        availableTagsAddDish.selectedIndex = 0; // Reset the dropdown to the default "Add a tag"
    }
    if (selectedTagsList) {
        selectedTagsList.innerHTML = ''; // Clear the displayed selected tags
    }
    // You might need to reset other elements in your add dish form as well
}

async function populateTagDropdowns() {
    try {
        const tagsSnapshot = await getDocs(collection(db, 'tags'));
        const tags = [];
        tagsSnapshot.forEach(doc => {
            tags.push(doc.data().name);
        });

        // Populate filter popup tag buttons (your existing code)
        if (tagButtonsContainer) {
            tagButtonsContainer.innerHTML = '';
            tags.forEach(tag => {
                const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
                const button = document.createElement('button');
                button.textContent = capitalizedTag;
                button.classList.add('tag-button');
                button.addEventListener('click', () => filterDishesByTag(tag));
                tagButtonsContainer.appendChild(button);
            });
            // Add "All" button at the beginning
            const allButton = document.createElement('button');
            allButton.textContent = 'All';
            allButton.classList.add('tag-button');
            allButton.addEventListener('click', () => filterDishesByTag(''));
            tagButtonsContainer.prepend(allButton);
        }

        // Populate "Add New Dish" dropdown
        if (availableTagsAddDish) {
            availableTagsAddDish.innerHTML = '<option value="">Add a tag</option>';
            tags.forEach(tag => {
                const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = capitalizedTag;
                availableTagsAddDish.appendChild(option);
            });
        }

        // Populate "Edit Dish" dropdown
        if (availableTagsEditDish) { // Changed variable name to be consistent
            availableTagsEditDish.innerHTML = '<option value="">Add a tag</option>';
            tags.forEach(tag => {
                const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = capitalizedTag;
                availableTagsEditDish.appendChild(option);
            });
        }

    } catch (error) {
        console.error("Error loading tags for dropdowns:", error);
    }
}

function clearNewDishForm() {
    newDishNameInput.value = '';
    currentIngredients = [];
    renderIngredientsList();
    if (availableTagsSelect) { // Add a check to ensure the element exists
        availableTagsSelect.value = ''; // Reset the tag dropdown
    }
    currentTags = []; // Also clear the selected tags array
    renderSelectedTags(); // Re-render the empty selected tags list
}

function renderIngredientsList() {
    ingredientsList.innerHTML = '';
    currentIngredients.forEach((ingredient, index) => {
        const listItem = document.createElement('li');

        // Create a div for the ingredient text
        const textDiv = document.createElement('div');
        textDiv.innerHTML = `<i class="fas fa-caret-right"></i> ${ingredient.name} (${ingredient.quantity})`;

        // Create a div for the remove button
        const buttonDiv = document.createElement('div');
        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.addEventListener('click', () => removeIngredient(index));
        buttonDiv.appendChild(removeButton);

        // Append both divs to the list item
        listItem.appendChild(textDiv);
        listItem.appendChild(buttonDiv);

        ingredientsList.appendChild(listItem);
    });
}

function removeIngredient(index) {
    currentIngredients.splice(index, 1);
    renderIngredientsList();
}

function clearEditDishForm() {
    editDishNameInput.value = '';
    editingIngredients = {};
    renderEditIngredientsList();
    editingTags = []; // Clear the editingTags array
    renderEditSelectedTags(); // Re-render the empty list
    currentDishIdInput.value = '';
}

function renderEditIngredientsList() {
    editIngredientsList.innerHTML = '';
    for (const ingredientId in editingIngredients) {
        const ingredient = editingIngredients[ingredientId];
        const listItem = document.createElement('li');

        // Create a div for the ingredient text
        const textDiv = document.createElement('div');
        textDiv.innerHTML = `<i class="fas fa-caret-right"></i> ${ingredient.name} (${ingredient.quantity})`;

        // Create a div for the remove button
        const buttonDiv = document.createElement('div');
        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.addEventListener('click', () => removeEditIngredient(ingredientId));
        buttonDiv.appendChild(removeButton);

        // Append both divs to the list item
        listItem.appendChild(textDiv);
        listItem.appendChild(buttonDiv);

        editIngredientsList.appendChild(listItem);
    }
}

function renderSelectedTags() {
    const selectedTagsList = document.getElementById('selectedTagsList');
    selectedTagsList.innerHTML = '';
    currentTags.forEach((tag, index) => {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize first letter
        const listItem = document.createElement('li');

        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<i class="fas fa-tag"></i> ${capitalizedTag}`; // Use tag icon

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '<i class="fas fa-times"></i>'; // Use times icon for remove
        removeButton.classList.add('remove-tag-button'); // Add a class for styling
        removeButton.addEventListener('click', () => removeTag(index));

        listItem.appendChild(textSpan);
        listItem.appendChild(removeButton);
        selectedTagsList.appendChild(listItem);
    });
}

function removeTag(index) {
    currentTags.splice(index, 1);
    renderSelectedTags();
}

async function removeEditIngredient(ingredientId) {
    delete editingIngredients[ingredientId];
    renderEditIngredientsList();
}

function renderEditSelectedTags() {
    const editSelectedTagsList = document.getElementById('editSelectedTagsList');
    editSelectedTagsList.innerHTML = '';
    editingTags.forEach((tag, index) => {
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize first letter
        const listItem = document.createElement('li');

        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<i class="fas fa-tag"></i> ${capitalizedTag}`; // Use tag icon

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '<i class="fas fa-times"></i>'; // Use times icon for remove
        removeButton.classList.add('remove-tag-button'); // Add a class for styling
        removeButton.addEventListener('click', () => removeEditTag(index));

        listItem.appendChild(textSpan);
        listItem.appendChild(removeButton);
        editSelectedTagsList.appendChild(listItem);
    });
}

function removeEditTag(index) {
    editingTags.splice(index, 1);
    renderEditSelectedTags();
}

function closeAddTagModal() {
    addTagPopup.style.display = 'none';
    newTagNameInput.value = ''; // Clear input when closing
}

// --- Firebase Interactions ---

async function saveDishToFirestore() {
    const dishName = newDishNameInput.value.trim();

    if (dishName) {
        try {
            const dishData = {
                name: dishName,
                tags: currentTags, // Use the currentTags array
            };

            const dishRef = await addDoc(collection(db, 'dishes2'), dishData);

            // Save ingredients as a sub-collection
            const ingredientsCollectionRef = collection(db, 'dishes2', dishRef.id, 'ingredients');
            for (const ingredient of currentIngredients) {
                await addDoc(ingredientsCollectionRef, {
                    name: ingredient.name,
                    quantity: ingredient.quantity,
                    haveIt: false // Default value
                });
            }

            clearNewDishForm();
            closeAddDishModal();
            loadDishesFromFirestore(); // Reload the displayed dishes
        } catch (error) {
            console.error("Error adding dish:", error);
            alert('Failed to add dish.');
        }
    } else {
        alert('Dish name cannot be empty.');
    }
}


async function deleteDish(dishId) {
    if (confirm('Are you sure you want to delete this dish?')) {
        try {
            // Delete the dish document
            await deleteDoc(doc(db, 'dishes2', dishId));

            // Optionally, delete the ingredients sub-collection (more complex, consider data structure)
            const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');
            const ingredientsSnapshot = await getDocs(ingredientsCollectionRef);
            ingredientsSnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });

            loadDishesFromFirestore(); // Reload the displayed dishes
            alert('Dish deleted successfully!');
        } catch (error) {
            console.error("Error deleting dish:", error);
            alert('Failed to delete dish.');
        }
    }
}

const openEditModalButton = document.getElementById('openEditModal');

async function populateTagButtons() {
    const tags = await loadTagsFromFirestore();
    tagButtonsContainer.innerHTML = ''; // Clear previous buttons

    tags.forEach(tag => {
        const button = document.createElement('button');
        button.textContent = tag.name;
        button.dataset.tag = tag.name.toLowerCase(); // Store tag for filtering
        button.addEventListener('click', () => {
            currentFilterTag = button.dataset.tag;
            filterDishesByTag(currentFilterTag);
            // Update button style to indicate active filter (optional)
            const allButtons = tagButtonsContainer.querySelectorAll('button');
            allButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterPopup.style.display = 'none'; // Close popup after filtering
        });
        tagButtonsContainer.appendChild(button);
    });
}

if (openEditModalButton) {
    openEditModalButton.addEventListener('click', (dishId) => {
        loadDishDetails(dishId); // Load dish details first
        editDishModal.style.display = 'block';
        // Call populateTagDropdowns AFTER the modal is visible
        populateTagDropdowns();
    });
}

async function openEditModal(dishId, dishName, ingredients, tags) {
    editDishModal.style.display = 'block';
    editDishNameInput.value = dishName;
    currentDishIdInput.value = dishId;
    editingIngredients = { ...ingredients }; // Copy existing ingredients
    renderEditIngredientsList();

    editingTags = [...tags]; // Initialize editingTags with existing tags
    renderEditSelectedTags();

    // Ensure tags are populated in the dropdown when the edit modal opens
    populateTagDropdowns();
}

async function saveEditedDish() {
    const dishId = currentDishIdInput.value;
    const updatedDishName = editDishNameInput.value.trim();

    if (dishId && updatedDishName) {
        try {
            // Update the dish document
            await updateDoc(doc(db, 'dishes2', dishId), {
                name: updatedDishName,
                tags: editingTags // Use the editingTags array
            });

            // Update the ingredients sub-collection (same as before)
            const ingredientsCollectionRef = collection(db, 'dishes2', dishId, 'ingredients');
            const existingIngredientsSnapshot = await getDocs(ingredientsCollectionRef);
            existingIngredientsSnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            for (const ingredientId in editingIngredients) {
                const ingredient = editingIngredients[ingredientId];
                await addDoc(ingredientsCollectionRef, {
                    name: ingredient.name,
                    quantity: ingredient.quantity,
                    haveIt: ingredient.haveIt !== undefined ? ingredient.haveIt : false
                });
            }

            closeEditModal();
            loadDishesFromFirestore();
        } catch (error) {
            console.error("Error updating dish:", error);
            alert('Failed to update dish.');
        }
    } else {
        alert('Dish name cannot be empty.');
    }
}

// --- Event Listeners ---




async function loadTagsFromFirestore() {
    try {
        const tagsSnapshot = await getDocs(collection(db, 'tags'));
        const tags = [];
        tagsSnapshot.forEach(doc => {
            tags.push({ id: doc.id, name: doc.data().name }); // Include ID if needed later
        });
        return tags;
    } catch (error) {
        console.error("Error loading tags:", error);
        alert("Failed to load tags.");
        return [];
    }
}



async function loadAndDisplayTags() {
    try {
        const tagsSnapshot = await getDocs(collection(db, 'tags'));
        const tags = [];
        tagsSnapshot.forEach(doc => {
            tags.push({ id: doc.id, name: doc.data().name });
        });
        renderExistingTags(tags);
    } catch (error) {
        console.error("Error loading tags:", error);
        alert("Failed to load tags.");
    }
}

function renderExistingTags(tags) {
    existingTagsList.innerHTML = '';
    tags.forEach(tag => {
        const capitalizedTagName = tag.name.charAt(0).toUpperCase() + tag.name.slice(1);
        const listItem = document.createElement('li');

        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<i class="fas fa-tag"></i> ${capitalizedTagName}`;

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.classList.add('delete-tag-button');
        deleteButton.addEventListener('click', () => deleteTagFromFirestore(tag.id));

        listItem.appendChild(textSpan);
        listItem.appendChild(deleteButton);
        existingTagsList.appendChild(listItem);
    });
}

async function deleteTagFromFirestore(tagId) {
    try {
        await deleteDoc(doc(db, 'tags', tagId));
        console.log("Tag deleted from Firestore:", tagId);
        loadAndDisplayTags(); // Reload the list of tags
        populateTagButtons(); // Update the filter popup buttons
        // Optionally, show a success message
    } catch (error) {
        console.error("Error deleting tag:", error);
        alert("Failed to delete tag.");
    }
}

async function saveTagToFirestore() {
    const newTagName = newTagNameInput.value.trim();
    if (newTagName) {
        try {
            await addDoc(collection(db, 'tags'), { name: newTagName });
            console.log("Tag added to Firestore:", newTagName);
            newTagNameInput.value = ''; // Clear the input field
            loadAndDisplayTags(); // Reload the list of tags
            populateTagButtons(); // Update the filter popup buttons
            // Optionally, show a success message
        } catch (error) {
            console.error("Error adding tag:", error);
            alert("Failed to add tag.");
        }
    } else {
        alert("Tag name cannot be empty.");
    }
}

async function loadDishesFromFirestore() {
    if (!dishListContainer) return;
    dishListContainer.innerHTML = ''; // Clear existing content
    console.log("loadDishesFromFirestore called");

    try {
        const querySnapshot = await getDocs(collection(db, 'dishes2'));
        allLoadedDishes = [];
        for (const docSnapshot of querySnapshot.docs) {
            const dishData = docSnapshot.data();
            const dishId = docSnapshot.id;
            const ingredientsQuery = await getDocs(collection(db, 'dishes2', dishId, 'ingredients'));
            const ingredients = {};
            ingredientsQuery.forEach(ingDoc => {
                ingredients[ingDoc.id] = ingDoc.data();
            });
            allLoadedDishes.push({ id: dishId, ...dishData, ingredients });
        }
        console.log("All Dishes:", allLoadedDishes);
        filterDishesByTag(currentFilterTag); // Render based on the current filter
        populateTagButtons();
    } catch (error) {
        console.error("Error loading dishes:", error);
        alert("Failed to load dishes.");
    }
}

function renderDishes(dishesToRender) {
    dishListContainer.innerHTML = ''; // Clear the container before rendering
    dishesToRender.forEach(dish => {
        const dishDiv = document.createElement('div');
        dishDiv.classList.add('dish-item');
        let capitalizedTags = [];
        if (dish.tags && dish.tags.length > 0) {
            capitalizedTags = dish.tags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));
        }
        const tagsHtml = capitalizedTags.length > 0 ? `<p class="tags">${capitalizedTags.join(', ')}</p>` : '';
        dishDiv.innerHTML = `
            <h3>${dish.name}</h3>
            ${tagsHtml}
        `;
        dishDiv.addEventListener('click', () => openEditModal(dish.id, dish.name, dish.ingredients, dish.tags));
        dishListContainer.appendChild(dishDiv);
    });
}


function filterDishesByTag(tagToFilter) {
    let filteredDishes = [];
    if (!tagToFilter) {
        filteredDishes = allLoadedDishes; // Show all dishes if no filter
    } else {
        filteredDishes = allLoadedDishes.filter(dish => dish.tags && dish.tags.includes(tagToFilter));
    }
    renderDishes(filteredDishes); // Render the filtered (or all) dishes
}

// Event listener for the filter dropdown

if (openFilterPopupButton) {
    openFilterPopupButton.addEventListener('click', () => {
        filterPopup.style.display = 'flex';
    });
}

if (clearFilterButton) { // Event listener for clearFilterButton
    clearFilterButton.addEventListener('click', () => {
        currentFilterTag = ''; // Clear the filter
        filterDishesByTag(currentFilterTag); // Show all dishes
        const allButtons = tagButtonsContainer.querySelectorAll('button');
        allButtons.forEach(btn => btn.classList.remove('active')); // Remove active state from buttons
        filterPopup.style.display = 'none'; // Close the popup
    });
}

if (openAddTagPopupButton) {
    openAddTagPopupButton.addEventListener('click', () => {
        addTagPopup.style.display = 'block';
        loadAndDisplayTags(); // Load and display tags when the popup opens
    });
}

if (closeAddTagModalButton) {
    closeAddTagModalButton.addEventListener('click', () => {
        addTagPopup.style.display = 'none';
        newTagNameInput.value = ''; // Clear input when closing
        existingTagsList.innerHTML = ''; // Clear the list when closing
    });
}


if (saveNewTagButton) {
    saveNewTagButton.addEventListener('click', saveTagToFirestore);
}

// Call populateTagButtons on page load
populateTagButtons();
populateTagDropdowns();
loadDishesFromFirestore();

if (filterTagButton) {
    filterTagButton.addEventListener('change', () => {
        const selectedTag = filterTagButton.value;
        filterDishesByTag(selectedTag);
    });
}

// Event listeners for adding tags (Add New Dish)
if (availableTagsSelect) {
    availableTagsSelect.addEventListener('change', () => {
        const selectedTag = availableTagsSelect.value;
        if (selectedTag && !currentTags.includes(selectedTag)) {
            currentTags.push(selectedTag);
            renderSelectedTags();
            availableTagsSelect.value = '';
        }
    });
}

// Event listeners for adding tags (Edit Dish)
if (editAvailableTagsSelect) {
    editAvailableTagsSelect.addEventListener('change', () => {
        const selectedTag = editAvailableTagsSelect.value;
        if (selectedTag && !editingTags.includes(selectedTag)) {
            editingTags.push(selectedTag);
            renderEditSelectedTags();
            editAvailableTagsSelect.value = '';
        }
    });
}

if (addDishWithIngredientsButton) {
    addDishWithIngredientsButton.addEventListener('click', () => {
        const ingredientName = newDishIngredientNameInput.value.trim();
        const ingredientQuantity = newDishIngredientQuantityInput.value.trim();
        if (ingredientName && ingredientQuantity) {
            currentIngredients.push({ name: ingredientName, quantity: ingredientQuantity });
            renderIngredientsList();
            newDishIngredientNameInput.value = '';
            newDishIngredientQuantityInput.value = '';
        } else {
            alert('Please enter both ingredient name and quantity.');
        }
    });
}
const openAddDishModalButton = document.getElementById('openAddDishModal');
if (openAddDishModalButton) {
    openAddDishModalButton.addEventListener('click', () => {
        addDishModal.style.display = 'block';
        populateTagDropdowns(); // Load tags when Add Dish modal opens
        resetAddDishForm();
    });
}

if (addDishButton) {
    addDishButton.addEventListener('click', saveDishToFirestore);
}

if (closeAddModalButton) {
    closeAddModalButton.addEventListener('click', closeAddDishModal);
}

function openAddDishModal() {
    addDishModal.style.display = 'block';
}

function closeAddDishModal() {
    addDishModal.style.display = 'none';
    clearNewDishForm();
}

if (closeEditModalButton) {
    closeEditModalButton.addEventListener('click', closeEditModal);
}

function closeEditModal() {
    editDishModal.style.display = 'none';
    clearEditDishForm();
}

if (saveEditedDishButton) {
    saveEditedDishButton.addEventListener('click', saveEditedDish);
}

if (editAddIngredientButton) {
    editAddIngredientButton.addEventListener('click', () => {
        const ingredientName = editNewIngredientNameInput.value.trim();
        const ingredientQuantity = editNewIngredientQuantityInput.value.trim();
        if (ingredientName && ingredientQuantity && currentDishIdInput.value) {
            const newIngredientId = `temp-${Date.now()}`; // Temporary ID for new ingredients
            editingIngredients[newIngredientId] = { name: ingredientName, quantity: ingredientQuantity, haveIt: false };
            renderEditIngredientsList();
            editNewIngredientNameInput.value = '';
            editNewIngredientQuantityInput.value = '';
        } else {
            alert('Please enter both ingredient name and quantity.');
        }
    });
}


// Modal close on outside click



window.addEventListener('click', (event) => {
    if (event.target === addDishModal) {
        closeAddDishModal();
    }
    if (event.target === editDishModal) {
        closeEditModal();
    }
    if (event.target === addTagPopup) {
        closeAddTagModal();
    }
    if (filterPopup.style.display === 'flex' && event.target === filterPopup) {
        filterPopup.style.display = 'none';
        currentFilterTag = '';
        filterDishesByTag(currentFilterTag);
        const allButtons = tagButtonsContainer.querySelectorAll('button');
        allButtons.forEach(btn => btn.classList.remove('active'));
    }
});



        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                console.log('User is logged in on dishes:', user);
            }
        });