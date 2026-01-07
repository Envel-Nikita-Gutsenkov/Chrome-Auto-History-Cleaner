document.addEventListener('DOMContentLoaded', () => {
    const daysInput = document.getElementById('daysInput');
    const saveButton = document.getElementById('saveButton');

    // Retrieve and display the saved retention setting when the popup opens
    chrome.storage.sync.get(['daysToKeep'], (result) => {
        if (result.daysToKeep !== undefined) {
            daysInput.value = result.daysToKeep;
        }
    });

    // Event listener for the save button click
    saveButton.addEventListener('click', () => {
        const days = parseInt(daysInput.value);


        // Validate user input for retention days
        if (isNaN(days) || days < 0) {
            alert('Please enter a positive number.');
            return;
        }

        let cleanupIntervalMinutes;
        if (days === 0) {
            cleanupIntervalMinutes = 60; // Hourly cleanup for 0-day retention
        } else {
            cleanupIntervalMinutes = 60 * 24; // Daily cleanup for other retention periods
        }

        // Save the new retention setting to Chrome's sync storage
        chrome.storage.sync.set({ daysToKeep: days }, () => {
            const originalText = saveButton.textContent;
            saveButton.textContent = '✓ Saved!';
            saveButton.classList.add('success');
            saveButton.disabled = true;

            // Send a message to the background script to update its cleanup schedule
            chrome.runtime.sendMessage({ action: "updateSchedule", interval: cleanupIntervalMinutes });

            // Temporarily display status message, then clear it
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.classList.remove('success');
                saveButton.disabled = false;
            }, 2000);
        });
    });
});