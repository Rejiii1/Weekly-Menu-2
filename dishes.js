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

function loadDishesWithIngredients() {
    const storedDishes = localStorage.getItem('dishesWithIngredients');
    return storedDishes ? JSON.parse(storedDishes) : {};
}

function saveDishesWithIngredients() {
    localStorage.setItem('dishesWithIngredients', JSON.stringify(dishesWithIngredients));
}

let dishesWithIngredients = loadDishesWithIngredients();
renderDishList();

function renderDishList() {
    dishListManagement.innerHTML = '';
    for (const dishName in dishesWithIngredients) {
        const listItem = document.createElement('li');
        const dishNameSpan = document.createElement('span');
        dishNameSpan.classList.add('dish-name');
        dishNameSpan.textContent = dishName;

        const ingredientsSpan = document.createElement('span');
        ingredientsSpan.classList.add('ingredients');
        ingredientsSpan.textContent = dishesWithIngredients[dishName].join(', '); // Removed parentheses

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-button');
        editButton.addEventListener('click', () => openEditModal(dishName));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => deleteDish(dishName));

        const buttonContainer = document.createElement('div');
        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(deleteButton);

        listItem.appendChild(dishNameSpan);
        listItem.appendChild(ingredientsSpan);
        listItem.appendChild(buttonContainer);
        dishListManagement.appendChild(listItem);
    }
}

addDishWithIngredientsButton.addEventListener('click', () => {
    const newDishName = newDishNameInput.value.trim();
    const newIngredients = newDishIngredientsInput.value.split(',').map(item => item.trim()).filter(item => item !== '');

    if (newDishName && !dishesWithIngredients.hasOwnProperty(newDishName)) {
        dishesWithIngredients[newDishName] = newIngredients;
        saveDishesWithIngredients();
        renderDishList();
        newDishNameInput.value = '';
        newDishIngredientsInput.value = '';
    } else if (newDishName && dishesWithIngredients.hasOwnProperty(newDishName)) {
        alert('Dish already exists!');
    } else if (!newDishName) {
        alert('Please enter a dish name.');
    }
});

function deleteDish(dishName) {
    if (confirm(`Are you sure you want to delete "${dishName}"?`)) {
        delete dishesWithIngredients[dishName];
        saveDishesWithIngredients();
        renderDishList();
        if (window.opener && !window.opener.closed) {
            window.opener.updateDishList();
        }
    }
}

function openEditModal(dishName) {
    const dishData = dishesWithIngredients[dishName];
    if (dishData) {
        editDishNameInput.value = dishName;
        editDishIngredientsInput.value = dishData.join(', ');
        currentDishNameInput.value = dishName; // Store the original name
        editDishModal.style.display = 'flex';
    }
}

closeEditModalButton.addEventListener('click', () => {
    editDishModal.style.display = 'none';
});

saveEditedDishButton.addEventListener('click', () => {
    const originalDishName = currentDishNameInput.value;
    const newDishName = editDishNameInput.value.trim();
    const newIngredients = editDishIngredientsInput.value.split(',').map(item => item.trim()).filter(item => item !== '');

    if (newDishName) {
        if (newDishName !== originalDishName && dishesWithIngredients.hasOwnProperty(newDishName)) {
            alert('Dish name already exists!');
            return;
        }

        delete dishesWithIngredients[originalDishName]; // Remove the old entry
        dishesWithIngredients[newDishName] = newIngredients; // Add the updated entry
        saveDishesWithIngredients();
        renderDishList();
        editDishModal.style.display = 'none';
        if (window.opener && !window.opener.closed) {
            window.opener.updateDishList();
        }
    } else {
        alert('Please enter a dish name.');
    }
});