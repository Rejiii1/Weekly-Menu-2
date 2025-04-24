import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, Timestamp, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global Variables ---
let currentDate = new Date();
let meals = {}; // In-memory store for meals { 'YYYY-MM-DD': 'Dish Name', 'YYYY-MM-DD_docId': 'firestoreDocId' }
let currentUserId = null; // Store the current user's ID

// --- Local Storage Key ---
const MEAL_CACHE_KEY_PREFIX = 'cachedMealsData_'; // Add UserID suffix later

// --- DOM Elements (initialized in DOMContentLoaded) ---
let prevMonthButton;
let nextMonthButton;
let currentMonthDisplay;
let calendarGrid;
let addMealModal;
let closeModalButton;
let modalDateDisplay;
let selectDishDropdown; // jQuery Select2 element
let groceryListButton;
let dishLibraryButton;
let logoutButton; // Assuming you have a logout button with this ID

// --- Utility Functions ---

function getMealCacheKey(userId) {
    return MEAL_CACHE_KEY_PREFIX + userId;
}

function formatDateForDisplay(dateKey) {
    // Handles potential invalid dateKey gracefully
    try {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Month is 0-indexed
        if (isNaN(date.getTime())) throw new Error("Invalid date components"); // Check if date is valid
        return date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", dateKey, error);
        return "Invalid Date";
    }
}

function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}


// --- Local Storage Cache Functions ---

/**
 * Loads meals from local storage for the given user ID.
 * @param {string} userId - The ID of the user.
 * @returns {boolean} - True if meals were loaded from cache, false otherwise.
 */
function loadMealsFromCache(userId) {
    if (!userId) return false;
    const cacheKey = getMealCacheKey(userId);
    try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            console.log(`Loading meals from cache for user ${userId}...`);
            meals = JSON.parse(cachedData);
            // Basic validation (check if it's an object)
            if (typeof meals !== 'object' || meals === null) {
                console.warn("Invalid cache data format, clearing.");
                localStorage.removeItem(cacheKey);
                meals = {};
                return false;
            }
            return true; // Indicate cache was successfully loaded
        }
    } catch (error) {
        console.error("Error reading meals from cache:", error);
        // Clear potentially corrupted cache
        localStorage.removeItem(cacheKey);
        meals = {}; // Reset in-memory meals
    }
    return false; // Indicate cache was not loaded or was invalid
}

/**
 * Saves the meals object to local storage for the given user ID.
 * @param {object} mealsData - The meals object to save.
 * @param {string} userId - The ID of the user.
 */
function saveMealsToCache(mealsData, userId) {
    if (!userId) {
        console.error("Cannot save meals to cache: User ID is missing.");
        return;
    }
    const cacheKey = getMealCacheKey(userId);
    try {
        localStorage.setItem(cacheKey, JSON.stringify(mealsData));
        console.log(`Meals saved to cache for user ${userId}.`);
    } catch (error) {
        console.error("Error saving meals to cache:", error);
        // Handle potential storage limits (e.g., QuotaExceededError)
        alert("Could not save meal data locally. Storage might be full.");
    }
}

// --- Dish Loading (for Modal Dropdown) ---

async function loadDishesAndPopulateDropdown() {
    if (!selectDishDropdown) {
        console.error("Select dish dropdown element not found.");
        return;
    }
    try {
        const dishesCollection = collection(db, 'dishes2');
        const dishSnapshot = await getDocs(dishesCollection);
        let dishes = dishSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unnamed Dish' // Handle missing names
        }));

        // Sort dishes alphabetically by name
        dishes.sort((a, b) => a.name.localeCompare(b.name));

        // Format data for Select2
        const select2Data = dishes.map(dish => ({
            id: dish.name, // Using name as the value/ID for Select2
            text: capitalizeWords(dish.name) // Display capitalized name
        }));

        // Initialize or update Select2
        const $selectDish = $(selectDishDropdown);

        // If Select2 is already initialized, destroy and reinitialize to update data properly
        if ($selectDish.hasClass('select2-hidden-accessible')) {
            $selectDish.select2('destroy');
        }

        // Clear existing options before initializing
        $selectDish.empty();
        // No need for placeholder option, Select2 adds it
        $selectDish.append('<option value="clear-meal">Clear Meal for this Day</option>'); // Option to clear

        $selectDish.select2({
            placeholder: 'Search or select a dish',
            allowClear: true,
            dropdownParent: $('#addMealModal'), // Ensure it renders correctly within the modal
            data: select2Data, // Provide the data directly
            width: '100%' // Ensure it fits the modal width
        });

        // Attach the change event listener *once* after initialization
        // Ensure previous listeners are removed if this function is called multiple times
         $selectDish.off('change', handleMealSelectionChange).on('change', handleMealSelectionChange);


        console.log('Dishes loaded and dropdown populated/updated.');

    } catch (error) {
        console.error("Error loading dishes for dropdown:", error);
        // Maybe disable the dropdown or show an error message
    }
}


// --- Firestore Meal Functions ---

/**
 * Fetches meals from Firestore for the logged-in user and updates the global `meals` object and cache.
 * @param {string} userId - The ID of the currently logged-in user.
 */
async function fetchMealsFromFirestore(userId) {
    if (!userId) {
        console.error("Cannot fetch meals: User ID is missing.");
        return;
    }
    console.log(`Workspaceing latest meals from Firestore for user ${userId}...`);
    let fetchedMeals = {}; // Temporary object to build fresh data

    try {
        const mealsCollection = collection(db, 'meals');
        const q = query(mealsCollection, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Validate timestamp and dishName
            if (data.date && data.date.toDate && data.dishName) {
                 const date = data.date.toDate();
                 const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                 fetchedMeals[dateKey] = data.dishName;
                 fetchedMeals[dateKey + '_docId'] = doc.id; // Store Firestore document ID
            } else {
                console.warn("Skipping invalid meal document:", doc.id, data);
            }

        });

        // Update the global meals object and save to cache
        meals = fetchedMeals;
        saveMealsToCache(meals, userId);

        console.log('Firestore fetch complete. Meals updated:', Object.keys(meals).filter(k => !k.endsWith('_docId')).length);

        // Re-render the calendar with the potentially updated data
        renderCalendar();

    } catch (error) {
        console.error('Error loading meals from Firestore:', error);
        // Don't clear cache here, it might still be useful offline
        // Optionally display an error message to the user
        if (calendarGrid) { // Check if calendar grid exists
            // Avoid overwriting if cache was already rendered
            // calendarGrid.innerHTML = '<p class="error-message">Could not update meals. Displaying potentially cached data.</p>';
        }
    }
}

/**
 * Saves or updates a meal in Firestore and the local cache.
 */
async function saveOrUpdateMealInFirestore(userId, dateKey, dishName) {
    if (!userId) {
        console.error('User ID is missing. Cannot save meal.');
        alert("Error: Not logged in.");
        return;
    }
    if (!dateKey || !dishName) {
        console.error('Date key or dish name missing.');
        return;
    }

    try {
        const mealsCollection = collection(db, 'meals');
        const [year, month, day] = dateKey.split('-').map(Number);
        const mealDate = Timestamp.fromDate(new Date(year, month - 1, day));
        const existingDocId = meals[dateKey + '_docId'];

        if (existingDocId) {
            // Update existing meal
            const mealDocRef = doc(db, 'meals', existingDocId);
            await updateDoc(mealDocRef, { dishName: dishName });
            console.log(`Meal updated in Firestore: ${dateKey} - ${dishName}`);
            // Update local cache immediately
            meals[dateKey] = dishName;
        } else {
            // Add new meal
            const newDocRef = await addDoc(mealsCollection, {
                userId: userId,
                date: mealDate,
                dishName: dishName,
            });
            console.log(`Meal saved to Firestore: ${dateKey} - ${dishName}`);
            // Update local cache immediately with new doc ID
            meals[dateKey] = dishName;
            meals[dateKey + '_docId'] = newDocRef.id;
        }

        // Save updated meals object to local storage
        saveMealsToCache(meals, userId);
        // Re-render calendar to show the change
        renderCalendar();

    } catch (error) {
        console.error('Error saving/updating meal in Firestore:', error);
        alert("An error occurred while saving the meal.");
    }
}

/**
 * Clears a meal from Firestore and the local cache for a specific date.
 */
async function clearMealFromFirestore(userId, dateKey) {
    if (!userId) {
        console.error('User ID is missing. Cannot clear meal.');
        alert("Error: Not logged in.");
        return;
    }
    if (!dateKey) {
        console.error('Date key missing.');
        return;
    }

    const existingDocId = meals[dateKey + '_docId'];

    if (!existingDocId) {
        console.log(`No meal found in cache to clear for date: ${dateKey}`);
        // Meal might already be deleted, or cache is stale. Update UI anyway.
        delete meals[dateKey]; // Ensure local object is clean
        saveMealsToCache(meals, userId);
        renderCalendar();
        return; // Exit early
    }

    try {
        const mealDocRef = doc(db, 'meals', existingDocId);
        await deleteDoc(mealDocRef);
        console.log(`Meal cleared from Firestore for date: ${dateKey}`);

        // Remove from local cache immediately
        delete meals[dateKey];
        delete meals[dateKey + '_docId'];

        // Save updated meals object to local storage
        saveMealsToCache(meals, userId);
        // Re-render calendar
        renderCalendar();

    } catch (error) {
        console.error('Error clearing meal from Firestore:', error);
        alert("An error occurred while clearing the meal.");
        // Don't modify local cache if Firestore operation failed
    }
}


// --- Calendar Rendering ---

function renderCalendar() {
    if (!calendarGrid || !currentMonthDisplay) {
        console.error("Calendar elements not ready for rendering.");
        return;
    }

    console.log("Rendering calendar for:", currentDate.toLocaleDateString());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    // --- Calculate Month Details ---
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday...

    // --- Update Header ---
    currentMonthDisplay.textContent = firstDayOfMonth.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long'
    });

    // --- Clear and Rebuild Grid ---
    calendarGrid.innerHTML = '';

    // Add weekday headers (optional, but good for clarity)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const headerCell = document.createElement('div');
        headerCell.classList.add('weekday-header');
        headerCell.textContent = day;
        calendarGrid.appendChild(headerCell);
    });


    // Add empty cells for padding days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyCell);
    }

    // Add day cells for the current month
    const today = new Date(); // Get today's date once for comparison
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day'); // Base class for styling
        dayCell.setAttribute('role', 'button'); // Accessibility
        dayCell.setAttribute('tabindex', '0'); // Make focusable

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Add day number
        const dayNumber = document.createElement('span');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);


        // Check if it's today
        const isToday = (year === todayYear && month === todayMonth && day === todayDate);
        if (isToday) {
            dayCell.classList.add('today');
        }

        // Check if a meal exists for this date from the 'meals' object
        if (meals[dateKey]) {
            dayCell.classList.add('has-meal');
            const mealDisplay = document.createElement('div');
            mealDisplay.classList.add('meal-name'); // CSS class for meal name styling
            mealDisplay.textContent = capitalizeWords(meals[dateKey]); // Display capitalized meal name
            dayCell.appendChild(mealDisplay);
        }

        // Add click listener to open the modal
        const openModalHandler = () => openAddMealModal(dateKey);
        dayCell.addEventListener('click', openModalHandler);
        dayCell.addEventListener('keydown', (e) => {
             if (e.key === 'Enter' || e.key === ' ') {
                 openModalHandler();
             }
        });


        calendarGrid.appendChild(dayCell);
    }
    // console.log("Calendar rendered.");
}


// --- Modal Interaction ---

/**
 * Opens the Add Meal modal, populates the date, and sets the Select2 value.
 */
function openAddMealModal(dateKey) {
    if (!addMealModal || !modalDateDisplay || !selectDishDropdown) {
        console.error("Modal elements not found.");
        return;
    }

    modalDateDisplay.textContent = formatDateForDisplay(dateKey);
    addMealModal.dataset.selectedDate = dateKey; // Store dateKey on the modal

    const $selectDish = $(selectDishDropdown);

    // Ensure Select2 is initialized (it should be by loadDishesAndPopulateDropdown)
    if (!$selectDish.hasClass('select2-hidden-accessible')) {
        console.warn("Select2 not initialized when opening modal. Attempting init.");
        loadDishesAndPopulateDropdown(); // Try to load/init again
    }

    // Set value based on existing meal for this date, or null if none
    const existingMeal = meals[dateKey] || null;
    $selectDish.val(existingMeal).trigger('change.select2'); // Update Select2 display

    addMealModal.style.display = 'flex'; // Show the modal

    // Focus and open the Select2 dropdown after modal is visible
    // Use setTimeout to ensure modal transition is complete (if any)
     setTimeout(() => {
         $selectDish.select2('open');
     }, 100); // Small delay

    console.log("Modal opened for date:", dateKey, "Existing meal:", existingMeal || "None");
}

/**
 * Handles the change event from the Select2 dropdown.
 */
async function handleMealSelectionChange() {
    if (!currentUserId) {
        console.error("User not logged in. Cannot process meal change.");
        alert("You must be logged in to manage meals.");
        closeModalHandler(); // Close modal if user somehow got logged out
        return;
    }

    // `this` refers to the select element
    const selectedDish = $(this).val(); // Get the selected value (dish name or 'clear-meal')
    const selectedDate = addMealModal.dataset.selectedDate;

    if (!selectedDate) {
        console.error("Selected date is missing from modal data.");
        closeModalHandler(); // Close modal on error
        return;
    }

    console.log(`Meal selection changed for ${selectedDate}: ${selectedDish}`);

    // --- Perform Action based on Selection ---
    if (selectedDish === 'clear-meal') {
        await clearMealFromFirestore(currentUserId, selectedDate);
    } else if (selectedDish && typeof selectedDish === 'string') { // Check if a valid dish name is selected
        await saveOrUpdateMealInFirestore(currentUserId, selectedDate, selectedDish);
    } else {
        // This case handles when the selection is cleared (value becomes null or empty)
        // Or if the initial state has no selection.
        // We might not need to do anything if just Browse, only act on 'clear-meal' or actual dish selection.
        console.log("Dish selection is null/empty - no action taken.");
        // Do *not* clear the meal here unless 'clear-meal' was explicitly chosen.
        // Closing the modal without action is okay.
    }

    // Close modal *after* action is complete (or attempted)
    closeModalHandler();
}

/** Closes the Add Meal modal */
function closeModalHandler() {
     if (addMealModal) addMealModal.style.display = 'none';
      // Optionally reset Select2 state if needed, though setting value on open handles most cases
     // $(selectDishDropdown).val(null).trigger('change.select2');
}

// --- Logout Function ---

async function handleLogout() {
    try {
        await signOut(auth);
        console.log('Logout successful');
        // Clear local state immediately
        currentUserId = null;
        meals = {};
        // Clear cache for the logged-out user (optional, good practice)
        // Note: We don't have the userId anymore, might need to store it temporarily before signout
        // Or just rely on the fact that the next user won't have access to this key.
        // Let's skip clearing cache for now to avoid complexity.
        window.location.href = 'login.html'; // Redirect to login page
    } catch (error) {
        console.error('Logout failed:', error);
        alert("Logout failed. Please try again.");
    }
}


// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing...");

    // Get DOM Elements
    prevMonthButton = document.getElementById('prevMonth');
    nextMonthButton = document.getElementById('nextMonth');
    currentMonthDisplay = document.getElementById('currentMonth');
    calendarGrid = document.getElementById('calendarGrid');
    addMealModal = document.getElementById('addMealModal');
    closeModalButton = document.getElementById('closeModal');
    modalDateDisplay = document.getElementById('modalDate');
    selectDishDropdown = document.getElementById('selectDish'); // The <select> element
    groceryListButton = document.getElementById('groceryListButton'); // Assumed ID
    dishLibraryButton = document.getElementById('dishLibraryButton'); // Assumed ID
    logoutButton = document.getElementById('logoutButton'); // Assumed ID

    // --- Basic Event Listeners ---
    if (prevMonthButton) {
        prevMonthButton.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(); // Re-render calendar for the new month
        });
    }

    if (nextMonthButton) {
        nextMonthButton.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(); // Re-render calendar for the new month
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModalHandler);
    }

    // Close modal if clicked outside the content area
    if (addMealModal) {
        addMealModal.addEventListener('click', (event) => {
            // Check if the click is directly on the modal backdrop, not its children
            if (event.target === addMealModal) {
                closeModalHandler();
            }
        });
    }

     // Navigation Buttons
     if (groceryListButton) {
         groceryListButton.addEventListener('click', () => {
             window.location.href = 'grocery-list.html'; // Adjust path if needed
         });
     }
     if (dishLibraryButton) {
         dishLibraryButton.addEventListener('click', () => {
             window.location.href = 'dishes.html'; // Adjust path if needed
         });
     }
     if (logoutButton) {
         logoutButton.addEventListener('click', handleLogout);
     }


    // --- Authentication State Change Listener ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            console.log('Auth State Change: User logged in:', user.uid);
            currentUserId = user.uid; // Store the user ID

            // Initial setup for logged-in user
            // 1. Load dishes for the dropdown (do this early)
             loadDishesAndPopulateDropdown().catch(error => {
                console.error("Failed to load dishes for dropdown initially:", error);
                // Handle error, maybe disable adding meals?
             });


            // 2. Try loading meals from cache for instant display
            const cacheLoaded = loadMealsFromCache(currentUserId);
            if (cacheLoaded) {
                renderCalendar(); // Render immediately from cache
            }

            // 3. Fetch latest meals from Firestore in the background
            // This will update the cache and re-render if necessary
             fetchMealsFromFirestore(currentUserId).catch(error => {
                console.error("Background fetch failed:", error);
                // If cache didn't load and fetch failed, show an error message
                if (!cacheLoaded && calendarGrid) {
                     calendarGrid.innerHTML = '<p class="error-message">Could not load meal plan. Please check connection and refresh.</p>';
                }
             });


        } else {
            // User is signed out
            console.log('Auth State Change: User logged out.');
            currentUserId = null;
            meals = {}; // Clear meals cache in memory

            // Redirect to login page if not already there or on register page
            if (!['/login.html', '/register.html'].includes(window.location.pathname.toLowerCase())) {
                console.log("Redirecting to login page.");
                window.location.href = 'login.html';
            } else {
                // Clear the calendar if we are on a page that might show it while logged out
                if (calendarGrid) renderCalendar(); // Render empty calendar
            }
        }
    });

}); // End DOMContentLoaded