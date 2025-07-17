// Constants for default settings and alarm identification
const DEFAULT_DAYS_TO_KEEP = 30; // Default history retention in days
const ALARM_NAME = 'cleanHistoryAlarm'; // Unique identifier for the cleanup alarm

// Calculates the timestamp for the history cutoff date
function getCutoffDate(daysToKeep) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  return cutoff.getTime(); // Returns timestamp for comparison
}

// Main function to perform history cleanup
async function cleanHistory() {
  // Retrieve the current retention setting from storage before starting cleanup
  chrome.storage.sync.get(['daysToKeep'], async (result) => {
    const daysToKeep = result.daysToKeep !== undefined ? result.daysToKeep : DEFAULT_DAYS_TO_KEEP;
    const cutoffTimestamp = getCutoffDate(daysToKeep);

    console.log(`Cleaning history older than ${daysToKeep} days (before ${new Date(cutoffTimestamp).toLocaleString()}).`);

    // Search for history entries older than the cutoff
    const historyItems = await chrome.history.search({
      text: '', // Search all history entries
      startTime: 0, // From the beginning of history
      endTime: cutoffTimestamp // Up to the calculated cutoff
    });

    if (historyItems.length > 0) {
      // Iterate and delete each old history item
      for (const item of historyItems) {
        if (item.id) {
          try {
            await chrome.history.deleteUrl({ url: item.url });
          } catch (error) {
            console.error(`Error deleting URL ${item.url}:`, error);
          }
        }
      }
      console.log(`Deleted ${historyItems.length} history entries.`);
    } else {
      console.log('No history entries to delete.');
    }
  });
}

// Sets up or updates the recurring alarm for cleanup
function scheduleCleanUp(intervalInMinutes) {
  chrome.alarms.clear(ALARM_NAME); // Clear any existing alarm to avoid duplicates
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1, // Short initial delay for immediate effect
    periodInMinutes: intervalInMinutes // Set recurring period
  });
  console.log(`Alarm set for every ${intervalInMinutes} minutes.`);
}

// Listener for when the scheduled alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanHistory(); // Execute cleanup when the alarm triggers
  }
});

// Handles initial setup when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated.');
  // Determine initial alarm frequency based on stored settings or default
  chrome.storage.sync.get(['daysToKeep'], (result) => {
    const daysToKeep = result.daysToKeep !== undefined ? result.daysToKeep : DEFAULT_DAYS_TO_KEEP;
    const initialInterval = (daysToKeep === 0) ? 60 : (60 * 24); // 1 hour for 0 days, 24 hours otherwise
    scheduleCleanUp(initialInterval);
    cleanHistory(); // Run cleanup immediately after install/update
  });
});

// Listens for messages from the popup script to update the schedule
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSchedule") {
    const interval = request.interval; // Use interval provided by popup
    scheduleCleanUp(interval);
    cleanHistory(); // Run cleanup immediately after settings update
    sendResponse({ status: "Schedule updated" });
  }
});

// Ensures the alarm is active when the Service Worker starts or becomes active (Manifest V3 behavior)
chrome.runtime.onStartup.addListener(() => {
  console.log("Service Worker started, checking alarm status.");
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      console.log("Alarm not found, setting it up.");
      // Determine and set initial alarm frequency if no alarm exists
      chrome.storage.sync.get(['daysToKeep'], (result) => {
        const daysToKeep = result.daysToKeep !== undefined ? result.daysToKeep : DEFAULT_DAYS_TO_KEEP;
        const initialInterval = (daysToKeep === 0) ? 60 : (60 * 24);
        scheduleCleanUp(initialInterval);
      });
    } else {
      console.log(`Alarm "${alarm.name}" already exists, scheduled for every ${alarm.periodInMinutes} minutes.`);
    }
  });
});

// This listener is present to ensure the service worker remains active if needed,
// but the core cleanup logic is managed by the onAlarm listener.
chrome.alarms.onAlarm.addListener(() => {
  // No additional logic here; cleanup is already handled by the main onAlarm listener.
});