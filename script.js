import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";


        // TODO: Add SDKs for Firebase products that you want to use
        // https://firebase.google.com/docs/web/setup#available-libraries

        // Your web app's Firebase configuration
        // For Firebase JS SDK v7.20.0 and later, measurementId is optional
        const firebaseConfig = {
            apiKey: "AIzaSyCd_HEHyheAvr8wVvZreP_xKiWsG05PcCc",
            authDomain: "weekly-menu-2.firebaseapp.com",
            projectId: "weekly-menu-2",
            storageBucket: "weekly-menu-2.firebasestorage.app",
            messagingSenderId: "600774461017",
            appId: "1:600774461017:web:70238ba949e473171e5348",
            measurementId: "G-5FX6NGDP97"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        document.addEventListener('DOMContentLoaded', () => {
            const dishLibraryLink = document.getElementById('dishLibraryLink');
            if (dishLibraryLink) {
                dishLibraryLink.addEventListener('click', () => {
                    window.location.href = 'dishes.html';
                });
            }
        });

        window.logout = async () => {
            try {
                await signOut(auth);
                console.log('Logout successful');
                window.location.href = 'login.html'; // Redirect to login page after logout
            } catch (error) {
                console.error('Logout failed:', error);
            }
        };

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                // User is not logged in, redirect to login page
                window.location.href = 'login.html';
            } else {
                // User is logged in, proceed with loading the app
                console.log('User is logged in on index:', user);
                // Your existing index.html logic to load meal plans, etc.
            }
        });

const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');
const currentMonthDisplay = document.getElementById('currentMonth');
const calendarGrid = document.getElementById('calendarGrid');
const dishListElement = document.getElementById('dishList');
const addMealModal = document.getElementById('addMealModal');
const closeModalButton = document.getElementById('closeModal');
const modalDateDisplay = document.getElementById('modalDate');
const selectDishDropdown = document.getElementById('selectDish');
const addMealButtonModal = document.getElementById('addMealButtonModal');
const groceryListButton = document.getElementById('groceryListButton');

let currentDate = new Date();
let meals = loadMeals();


function loadMeals() {
    const storedMeals = localStorage.getItem('meals');
    return storedMeals ? JSON.parse(storedMeals) : {};
}

function saveMeals() {
    localStorage.setItem('meals', JSON.stringify(meals));
}

async function loadDishesFromFirestoreForMainPage() {
    dishListElement.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, 'dishes'));
        querySnapshot.forEach((doc) => {
            const dishData = doc.data();
            const listItem = document.createElement('li');
            listItem.textContent = dishData.name;
            dishListElement.appendChild(listItem);
        });
        // Populate the dropdown in the modal as well
        const selectDish = $('#selectDish');
        selectDish.empty().append('<option value="" disabled selected>Search or select a dish</option>');
        selectDish.append('<option value="clear-meal">Clear</option>');
        querySnapshot.forEach((doc) => {
            const dishData = doc.data();
            const option = $('<option></option>').attr('value', dishData.name).text(dishData.name);
            selectDish.append(option);
        });
        selectDish.trigger('change');
    } catch (error) {
        console.error("Error loading dishes for main page:", error);
    }
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

    currentMonthDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    calendarGrid.innerHTML = '';

    // Add empty cells for the days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        calendarGrid.appendChild(emptyCell);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayCell = document.createElement('div');
        dayCell.classList.add('day');
        dayCell.textContent = day;
        const dateKey = `${year}-${month + 1}-${day}`;
        if (meals[dateKey]) {
            dayCell.classList.add('has-meal');
            const mealDisplay = document.createElement('div');
            mealDisplay.classList.add('day-content');
            mealDisplay.textContent = meals[dateKey];
            dayCell.appendChild(mealDisplay);
        }
        dayCell.addEventListener('click', () => openAddMealModal(dateKey));
        calendarGrid.appendChild(dayCell);
    }
}

function updateDishList() {
    dishListElement.innerHTML = ''; // Clear the existing list
    console.log("Dishes loaded for updateDishList:", dishes); // <--- ADD THIS LINE
    for (const dishName in dishes) {
        const listItem = document.createElement('li');
        listItem.textContent = dishName;
        dishListElement.appendChild(listItem);
    }
    // Update the dropdown in the modal as well
    const selectDish = $('#selectDish'); // Get the Select2 element using jQuery
    selectDish.empty().append('<option value="" disabled selected>Search or select a dish</option>');
    selectDish.append('<option value="clear-meal">Clear</option>');
    for (const dishName in dishes) {
        const option = $('<option></option>').attr('value', dishName).text(dishName);
        selectDish.append(option);
    }
    // Programmatically trigger Select2 to update its display
    selectDish.trigger('change');
}

prevMonthButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

function openAddMealModal(dateKey) {
    modalDateDisplay.textContent = formatDateForDisplay(dateKey);
    addMealModal.dataset.selectedDate = dateKey; // Store the date in the modal
    addMealModal.style.display = 'flex';

    const selectDish = $('#selectDish');

    // Reset the Select2 value when the modal opens for a new date
    selectDish.val(null).trigger('change'); // Programmatically deselect any selected option

    // Initialize Select2 on the dropdown and then open it (if not already initialized)
    if (!selectDish.hasClass('select2-hidden-accessible')) {
        selectDish.select2({
            placeholder: 'Search or select a dish', // Optional placeholder text
            allowClear: true // Option to clear the selection
        });
    }

    // Open the dropdown immediately after ensuring Select2 is initialized
    selectDish.select2('open');

    selectDish.on('change', function() {
        const selectedDish = $(this).val(); // Get the selected value using jQuery
        const selectedDate = addMealModal.dataset.selectedDate;
        if (selectedDate) {
            if (selectedDish === 'clear-meal') {
                delete meals[selectedDate];
                saveMeals();
                renderCalendar();
                addMealModal.style.display = 'none';
            } else if (selectedDish) {
                meals[selectedDate] = selectedDish;
                saveMeals();
                renderCalendar();
                addMealModal.style.display = 'none';
            }
        }
    });
}

closeModalButton.addEventListener('click', () => {
    addMealModal.style.display = 'none';
});

selectDishDropdown.addEventListener('change', () => {
    const selectedDish = selectDishDropdown.value;
    const selectedDate = addMealModal.dataset.selectedDate;
    if (selectedDate) {
        if (selectedDish === 'clear-meal') {
            delete meals[selectedDate];
            saveMeals();
            renderCalendar();
            addMealModal.style.display = 'none';
        } else if (selectedDish) {
            meals[selectedDate] = selectedDish;
            saveMeals();
            renderCalendar();
            addMealModal.style.display = 'none';
        }
    }
});

function formatDateForDisplay(dateKey) {
    const parts = dateKey.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

groceryListButton.addEventListener('click', () => {
    window.location.href = 'grocery.html';
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is logged in on index:', user);
        loadDishesFromFirestoreForMainPage(); // Call this to load dishes from Firestore
        renderCalendar();
    } else {
        window.location.href = 'login.html';
    }
});

// Initial rendering
renderCalendar();
