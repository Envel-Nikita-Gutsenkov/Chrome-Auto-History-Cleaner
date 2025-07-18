document.addEventListener('DOMContentLoaded', () => {
    const daysInput = document.getElementById('daysInput');
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText'); // Reference to the span for text content
    const statusIcon = document.getElementById('statusIcon'); // Reference to the span for icon content

    // Retrieve and display the saved retention setting when the popup opens
    chrome.storage.sync.get(['daysToKeep'], (result) => {
        if (result.daysToKeep !== undefined) {
            daysInput.value = result.daysToKeep;
        }
    });

    // Event listener for the save button click
    saveButton.addEventListener('click', () => {
        const days = parseInt(daysInput.value);

        // Reset status message state before showing new message
        statusMessage.classList.remove('show', 'success', 'error');
        statusText.textContent = '';
        statusIcon.textContent = '';

        // Validate user input for retention days
        if (isNaN(days) || days < 0) {
            statusText.textContent = 'Please enter a positive number.';
            statusIcon.textContent = '❌';
            statusMessage.classList.add('show', 'error');
            return;
        }

        // Determine cleanup frequency based on user's retention setting
        let cleanupIntervalMinutes;
        if (days === 0) {
            cleanupIntervalMinutes = 60; // Hourly cleanup for 0-day retention
        } else {
            cleanupIntervalMinutes = 60 * 24; // Daily cleanup for other retention periods
        }

        // Save the new retention setting to Chrome's sync storage
        chrome.storage.sync.set({ daysToKeep: days }, () => {
            statusText.textContent = 'Settings saved!';
            statusIcon.textContent = '✅';
            statusMessage.classList.add('show', 'success'); // Adds the 'show' and 'success' classes to make the message visible

            // Send a message to the background script to update its cleanup schedule
            chrome.runtime.sendMessage({ action: "updateSchedule", interval: cleanupIntervalMinutes }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError);
                } else {
                    console.log("Response from background:", response);
                }
            });

            // Temporarily display status message, then clear it
            setTimeout(() => {
                statusMessage.classList.remove('show', 'success', 'error'); // Removes the 'show' class to hide the message
                statusText.textContent = '';
                statusIcon.textContent = '';
            }, 3000);
        });
    });
});