const ALARM_NAME = 'cleanHistoryAlarm';

const DEFAULT_SETTINGS = {
  history: { enabled: true, days: 30 },
  downloads: { enabled: true, days: 30 },
  cache: { enabled: true, days: 7 },
  serviceWorkers: { enabled: true, days: 30 },
  fileSystems: { enabled: true, days: 30 },
  indexedDB: { enabled: true, days: 30 }
};

// Calculates the timestamp for the history cutoff date
function getCutoffDate(daysToKeep) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  return cutoff.getTime();
}

// Write to logs
function addLogEntry(cleanedTypesArray, detailsStr) {
  chrome.storage.local.get(['cleanupLogs'], (result) => {
    let logs = result.cleanupLogs || [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Filter out logs older than 30 days
    logs = logs.filter(log => log.timestamp >= thirtyDaysAgo);

    logs.push({
      timestamp: now,
      types: cleanedTypesArray,
      details: detailsStr
    });

    if (logs.length > 100) {
      logs = logs.slice(logs.length - 100);
    }

    chrome.storage.local.set({ cleanupLogs: logs });
  });
}

// Map settings keys to browsingData objects
const DATA_TYPE_MAPPINGS = {
  history: { history: true },
  downloads: { downloads: true },
  cache: { cache: true, cacheStorage: true, appcache: true },
  serviceWorkers: { serviceWorkers: true },
  fileSystems: { fileSystems: true },
  indexedDB: { indexedDB: true, webSQL: true }
};

const DATA_TYPE_NAMES = {
  history: 'History',
  downloads: 'Downloads',
  cache: 'Cache',
  serviceWorkers: 'Service Workers',
  fileSystems: 'File Systems',
  indexedDB: 'IndexedDB/WebSQL'
};

// Main function to perform cleanup using the browsingData API
async function cleanProfile() {
  chrome.storage.sync.get(['cleanSettings', 'cleanHistory'], async (result) => {

    // Migration logic from old settings (before per-type days feature)
    let settings = result.cleanSettings;
    if (!settings && result.cleanHistory !== undefined) {
      // Old version was active. Migrate to new version structure.
      const globalDays = result.daysToKeep !== undefined ? result.daysToKeep : 30;
      settings = {
        history: { enabled: result.cleanHistory !== false, days: globalDays },
        downloads: { enabled: result.cleanDownloads !== false, days: globalDays },
        cache: { enabled: result.cleanCache !== false, days: globalDays },
        serviceWorkers: { enabled: result.cleanServiceWorkers !== false, days: globalDays },
        fileSystems: { enabled: result.cleanFileSystems !== false, days: globalDays },
        indexedDB: { enabled: result.cleanIndexedDB !== false, days: globalDays }
      };
      chrome.storage.sync.set({ cleanSettings: settings });
    } else if (!settings) {
      settings = DEFAULT_SETTINGS;
    }

    let typesCleaned = [];
    let logDetails = [];
    let promises = [];

    for (const [key, config] of Object.entries(settings)) {
      if (config.enabled) {
        const cutoffTimestamp = getCutoffDate(config.days);
        const dataToRemove = { ...DATA_TYPE_MAPPINGS[key] };

        // STRICTLY exclude cookies, passwords, and localStorage!
        dataToRemove.cookies = false;
        dataToRemove.passwords = false;
        dataToRemove.localStorage = false;
        dataToRemove.formData = false;
        dataToRemove.serverBoundCertificates = false;
        dataToRemove.pluginData = false;

        const p = new Promise((resolve) => {
          chrome.browsingData.remove({ since: cutoffTimestamp }, dataToRemove, () => {
            if (chrome.runtime.lastError) {
              console.error(`Error cleaning ${key}:`, chrome.runtime.lastError);
            } else {
              if (DATA_TYPE_NAMES[key]) {
                typesCleaned.push(DATA_TYPE_NAMES[key]);
                logDetails.push(`${DATA_TYPE_NAMES[key]} (> ${config.days}d)`);
              }
            }
            resolve();
          });
        });
        promises.push(p);
      }
    }

    if (promises.length === 0) {
      console.log('No data types selected for cleaning.');
      return;
    }

    await Promise.all(promises);

    console.log(`Successfully cleaned: ${typesCleaned.join(', ')}`);
    addLogEntry(typesCleaned, logDetails.join(', '));
  });
}

// Sets up or updates the recurring alarm for cleanup
function scheduleCleanUp(intervalInMinutes) {
  chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: intervalInMinutes
  });
  console.log(`Alarm set for every ${intervalInMinutes} minutes.`);
}

// Listener for when the scheduled alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanProfile();
  }
});

// Handles initial setup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated.');
  chrome.storage.sync.get(['cleanSettings'], (result) => {
    let minDays = 30;
    if (result.cleanSettings) {
      Object.values(result.cleanSettings).forEach(s => {
        if (s.enabled && s.days < minDays) minDays = s.days;
      });
    }
    const initialInterval = (minDays === 0) ? 60 : (60 * 24);
    scheduleCleanUp(initialInterval);
    cleanProfile();
  });
});

// Listens for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSchedule") {
    const interval = request.interval;
    scheduleCleanUp(interval);
    cleanProfile(); // Execute immediately to reflect new settings
    sendResponse({ status: "Schedule updated, cleanup triggered." });
  }
});

// Service Worker startup check
chrome.runtime.onStartup.addListener(() => {
  console.log("Service Worker started.");
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.storage.sync.get(['cleanSettings'], (result) => {
        let minDays = 30;
        if (result.cleanSettings) {
          Object.values(result.cleanSettings).forEach(s => {
            if (s.enabled && s.days < minDays) minDays = s.days;
          });
        }
        const initialInterval = (minDays === 0) ? 60 : (60 * 24);
        scheduleCleanUp(initialInterval);
      });
    }
  });
});