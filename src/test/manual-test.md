# Manual Testing Guide for sessionStorage Persistence

This guide outlines the steps to manually verify that the sessionStorage persistence functionality is working correctly in the Dashboard component.

## Test 1: Basic Person Selection and Persistence

### Steps:
1. **Start the application**
   ```bash
   npm run tauri:dev
   ```

2. **Navigate to Dashboard**
   - The dashboard should load with a person search field
   - You should see "📅 Dashboard de Entrenamientos" and a search placeholder

3. **Search and Select a Person**
   - Type in the search field to find a person
   - Click on a person from the dropdown to select them
   - Verify the person's name and phone number appear in the header
   - Verify workout data loads for the selected person

4. **Navigate Away and Back**
   - Click on "Personas" in the navigation menu
   - Wait for the persons page to load
   - Click on "Dashboard" to return
   - **Expected Result**: The selected person should still be displayed
   - **Expected Result**: Workout data should automatically reload

### ✅ Pass Criteria:
- [ ] Person remains selected after navigation
- [ ] Person's name is displayed in the header
- [ ] Workout data is automatically loaded
- [ ] No need to search again

## Test 2: Person Selection Clearing

### Steps:
1. **With a person selected** (from Test 1)
2. **Clear the selection**
   - Click the "Cambiar" button next to the person's name
   - **Expected Result**: Should return to person search view

3. **Navigate away and back**
   - Navigate to "Personas" page
   - Return to "Dashboard"
   - **Expected Result**: Should show person search (no person selected)

### ✅ Pass Criteria:
- [ ] "Cambiar" button clears the selection
- [ ] Returns to search view after clearing
- [ ] No person is restored after navigation when cleared

## Test 3: Browser Refresh Persistence

### Steps:
1. **Select a person** (follow Test 1 steps 1-3)
2. **Refresh the browser**
   - Press F5 or Ctrl+R (Cmd+R on Mac)
   - Wait for the application to reload
   - **Expected Result**: Selected person should be restored
   - **Expected Result**: Workout data should load automatically

### ✅ Pass Criteria:
- [ ] Person persists after browser refresh
- [ ] Workout data loads automatically after refresh

## Test 4: Multiple Person Switching

### Steps:
1. **Select Person A**
   - Search and select a person
   - Note their workout data

2. **Switch to Person B**
   - Click "Cambiar" to clear selection
   - Search and select a different person
   - Note their different workout data

3. **Navigate away and back**
   - Go to "Personas" page and return
   - **Expected Result**: Person B should still be selected
   - **Expected Result**: Person B's workout data should be displayed

### ✅ Pass Criteria:
- [ ] Can switch between different persons
- [ ] Latest selected person persists after navigation
- [ ] Correct workout data is displayed for each person

## Test 5: sessionStorage Inspection (Developer Tools)

### Steps:
1. **Open Developer Tools**
   - Press F12 or right-click → "Inspect"
   - Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
   - Navigate to "Session Storage" → your domain

2. **Select a person**
   - Follow Test 1 steps to select a person
   - **Expected Result**: Should see `dashboard-selectedPerson` key in sessionStorage
   - **Expected Result**: Value should be JSON with person data

3. **Clear selection**
   - Click "Cambiar" to clear selection
   - **Expected Result**: `dashboard-selectedPerson` key should be removed from sessionStorage

### ✅ Pass Criteria:
- [ ] sessionStorage key appears when person is selected
- [ ] sessionStorage key contains correct person data
- [ ] sessionStorage key is removed when selection is cleared

## Test 6: Error Handling

### Steps:
1. **Simulate sessionStorage error** (Advanced)
   - Open Developer Tools → Console
   - Run: `sessionStorage.clear(); Object.defineProperty(window, 'sessionStorage', { value: null });`
   - Refresh the page
   - **Expected Result**: Application should still load (may show error in console)

2. **Corrupt sessionStorage data**
   - In Developer Tools → Application → Session Storage
   - Manually edit `dashboard-selectedPerson` to invalid JSON (e.g., `{invalid}`)
   - Refresh the page
   - **Expected Result**: Should fallback to no person selected

### ✅ Pass Criteria:
- [ ] Application doesn't crash with sessionStorage errors
- [ ] Gracefully handles corrupted data

## Test 7: App Close Cleanup (Automatic with sessionStorage)

### Steps:
1. **Select a person and verify sessionStorage**
   - Follow Test 1 to select a person
   - Open Developer Tools → Application → Session Storage
   - Verify `dashboard-selectedPerson` key exists with person data

2. **Close the application**
   - Close the browser tab/window completely
   - **Expected Result**: sessionStorage is automatically cleaned by the browser

3. **Restart the application**
   - Open the application again in a new tab/window
   - Navigate to Dashboard
   - **Expected Result**: Should show person search (no person selected)
   - **Expected Result**: sessionStorage should not contain `dashboard-selectedPerson` key

4. **Verify with Developer Tools**
   - Open Developer Tools → Application → Session Storage
   - **Expected Result**: No `dashboard-selectedPerson` key should be present

### ✅ Pass Criteria:
- [ ] sessionStorage is automatically cleaned when app is closed
- [ ] App starts fresh with no selected person
- [ ] No `dashboard-selectedPerson` key in sessionStorage after restart
- [ ] User must search and select a person again

### Alternative Test (Tauri Desktop App):
If testing the Tauri desktop application:
1. Select a person in the Dashboard
2. Close the Tauri application window completely
3. Restart the Tauri application
4. **Expected Result**: Should start with no person selected (sessionStorage is cleared automatically)

## Automated Test Results

Run the automated tests to verify the underlying logic:

```bash
# Run sessionStorage-specific tests
npm run test:run src/test/sessionStorage.test.js

# Run all tests
npm test
```

### Expected Output:
```
✓ Dashboard sessionStorage Persistence > Initialization > initializes with null when no saved person exists
✓ Dashboard sessionStorage Persistence > Initialization > initializes with saved person when exists in sessionStorage
✓ Dashboard sessionStorage Persistence > Person Selection > saves person to sessionStorage when selected
✓ Dashboard sessionStorage Persistence > Person Selection > removes person from sessionStorage when cleared
✓ Dashboard sessionStorage Persistence > Navigation Simulation > persists person across navigation
... (all tests should pass)
```

## Summary

If all tests pass, the sessionStorage persistence functionality is working correctly and users will no longer lose their selected person when navigating between pages, but will start fresh each time they open the application.

### Key Features Verified:
- ✅ Person selection persists across navigation within the same session
- ✅ Workout data automatically loads for restored person
- ✅ Selection can be cleared and persists as cleared
- ✅ Works across browser refreshes within the same session
- ✅ Handles errors gracefully
- ✅ sessionStorage is properly managed (set/remove)
- ✅ **NEW**: sessionStorage is automatically cleaned when app is closed
- ✅ **NEW**: App starts fresh with no selected person after restart 