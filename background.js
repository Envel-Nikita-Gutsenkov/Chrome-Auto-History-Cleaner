const ALARM_NAME = 'cleanHistoryAlarm';

const DEFAULT_SETTINGS = {
  history: { enabled: true, days: 30 },
  downloads: { enabled: true, days: 30 },
  cache: { enabled: true, days: 7 },
  serviceWorkers: { enabled: true, days: 30 },
  fileSystems: { enabled: true, days: 30 },
  indexedDB: { enabled: true, days: 30 },
  smartCleanup: { enabled: true, months: 3 }
};

// Calculates the timestamp for a date N days/months ago
function getCutoffDate(daysToKeep) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  return cutoff.getTime();
}

function getMonthsCutoff(monthsToKeep) {
  const cutoff = new Date();
  const now = new Date();
  now.setMonth(now.getMonth() - monthsToKeep);
  return now.getTime();
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
  indexedDB: 'IndexedDB/WebSQL',
  smartCleanup: 'Smart Site Cleanup'
};


// Function to prune data for sites not visited in a long time (months)
// Also handles the user's request for "Nuclear Clean" (days)
async function pruneSiteDataByAge(daysToKeep, types = null) {
  const cutoff = getCutoff(daysToKeep);
  
  // 1. Get all history items to determine "Last Access Time"
  const historyItems = await chrome.history.search({ text: '', startTime: 0, maxResults: 100000 });
  
  const originLastVisit = new Map();
  historyItems.forEach(item => {
    try {
      const url = new URL(item.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const origin = url.origin;
        const lastVisit = item.lastVisitTime || 0;
        if (!originLastVisit.has(origin) || lastVisit > originLastVisit.get(origin)) {
          originLastVisit.set(origin, lastVisit);
        }
      }
    } catch (e) {}
  });

  const toPrune = [];
  for (const [origin, lastVisit] of originLastVisit.entries()) {
    if (lastVisit < cutoff) {
      toPrune.push(origin);
    }
  }

  if (toPrune.length > 0) {
    const dataToRemove = types || {
      cache: true,
      cookies: true,
      fileSystems: true,
      indexedDB: true,
      localStorage: true,
      pluginData: true,
      serviceWorkers: true,
      webSQL: true
    };

    // Remove data for these Origins
    await chrome.browsingData.remove({
      origins: toPrune
    }, dataToRemove);
    return toPrune.length;
  }
  return 0;
}

function getCutoff(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.getTime();
}

function getMonthsCutoff(months) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff.getTime();
}

// Main function to perform background cleanup
async function cleanProfile() {
  chrome.storage.sync.get(['cleanSettings'], async (result) => {
    let settings = result.cleanSettings || DEFAULT_SETTINGS;

    let typesCleaned = [];
    let logDetails = [];
    let promises = [];

    for (const [key, config] of Object.entries(settings)) {
      if (!config.enabled) continue;

      if (key === 'smartCleanup') {
        const months = config.months || 3;
        const p = pruneSiteDataByAge(months * 30).then(count => {
          if (count > 0) {
            typesCleaned.push(DATA_TYPE_NAMES[key]);
            logDetails.push(`${DATA_TYPE_NAMES[key]} (${count} sites > ${months}m)`);
          }
        });
        promises.push(p);
        continue;
      }

      const cutoffTimestamp = getCutoff(config.days);

      if (key === 'history') {
        const p = new Promise(resolve => {
          // Fix: Delete OLD items (from 0 to cutoff)
          chrome.history.deleteRange({ startTime: 0, endTime: cutoffTimestamp }, () => {
            typesCleaned.push(DATA_TYPE_NAMES[key]);
            logDetails.push(`${DATA_TYPE_NAMES[key]} (> ${config.days}d)`);
            resolve();
          });
        });
        promises.push(p);
      } else if (key === 'downloads') {
        const p = new Promise(resolve => {
          chrome.downloads.search({ endedBefore: new Date(cutoffTimestamp).toISOString() }, (items) => {
            items.forEach(item => chrome.downloads.erase({ id: item.id }));
            typesCleaned.push(DATA_TYPE_NAMES[key]);
            logDetails.push(`${DATA_TYPE_NAMES[key]} (> ${config.days}d)`);
            resolve();
          });
        });
        promises.push(p);
      } else {
        const dataToRemove = { ...DATA_TYPE_MAPPINGS[key] };
        dataToRemove.cookies = false;
        dataToRemove.passwords = false;
        dataToRemove.localStorage = false;
        dataToRemove.formData = false;

        const p = new Promise((resolve) => {
          // This fallback still uses 'since', but it effectively clears what it can
          chrome.browsingData.remove({ since: cutoffTimestamp }, dataToRemove, () => {
            if (!chrome.runtime.lastError) {
              typesCleaned.push(DATA_TYPE_NAMES[key]);
              logDetails.push(`${DATA_TYPE_NAMES[key]} (Recent ${config.days}d)`);
            }
            resolve();
          });
        });
        promises.push(p);
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      if (typesCleaned.length > 0) {
        addLogEntry(typesCleaned, logDetails.join(', '));
      }
    }
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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanProfile();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated.');
  chrome.storage.sync.get(['cleanSettings'], (result) => {
    let settings = result.cleanSettings || DEFAULT_SETTINGS;
    let minDays = 30;
    Object.values(settings).forEach(s => {
       if (s.enabled && s.days !== undefined && s.days < minDays) minDays = s.days;
    });
    const interval = (minDays === 0) ? 60 : (60 * 24);
    scheduleCleanUp(interval);
    cleanProfile();
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSchedule") {
    scheduleCleanUp(request.interval);
    cleanProfile();
    sendResponse({ status: "Schedule updated." });
  } else if (request.action === "deepClean") {
    // Deep Cleanup of cache older than request.days
    pruneSiteDataByAge(request.days, { cache: true, cacheStorage: true, appcache: true })
      .then(count => {
        addLogEntry(["Deep Cleanup"], `Cache wiped for ${count} sites older than ${request.days} days.`);
        sendResponse({ status: "Deep Clean complete", count });
      });
    return true; // async
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) scheduleCleanUp(24 * 60);
  });
});