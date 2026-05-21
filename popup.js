document.addEventListener('DOMContentLoaded', () => {
    // Localization
    const localize = () => {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
            if (message) {
                if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
                    element.value = message;
                } else {
                    element.innerHTML = message;
                }
            }
        });
    };
    localize();

    // Elements
    const tabSettingsBtn = document.getElementById('tabSettingsBtn');
    const tabLogsBtn = document.getElementById('tabLogsBtn');
    const tabSettings = document.getElementById('tabSettings');
    const tabLogs = document.getElementById('tabLogs');

    const saveButton = document.getElementById('saveButton');
    const deepButton = document.getElementById('deepButton');
    const logsContainer = document.getElementById('logsContainer');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    // Types definition
    const types = ['history', 'downloads', 'cache', 'indexedDB'];
    const elements = {};

    types.forEach(type => {
        elements[type] = {
            checkbox: document.getElementById(`chk_${type}`),
            days: document.getElementById(`days_${type}`)
        };
        elements[type].checkbox.addEventListener('change', (e) => {
            elements[type].days.disabled = !e.target.checked;
        });
    });

    // Smart Cleanup elements
    const smartChk = document.getElementById('chk_smartCleanup');
    const smartMonths = document.getElementById('months_smartCleanup');
    smartChk.addEventListener('change', (e) => {
        smartMonths.disabled = !e.target.checked;
    });

    const deepDaysInput = document.getElementById('deep_days');

    // Tab switching logic
    tabSettingsBtn.addEventListener('click', () => {
        tabSettingsBtn.classList.add('active');
        tabLogsBtn.classList.remove('active');
        tabSettings.style.display = 'block';
        tabLogs.style.display = 'none';
    });

    tabLogsBtn.addEventListener('click', () => {
        tabLogsBtn.classList.add('active');
        tabSettingsBtn.classList.remove('active');
        tabLogs.style.display = 'block';
        tabSettings.style.display = 'none';
        loadLogs();
    });

    // Retrieve and display saved settings
    chrome.storage.sync.get(['cleanSettings'], (result) => {
        const settings = result.cleanSettings || {
            history: { enabled: true, days: 30 },
            downloads: { enabled: true, days: 30 },
            cache: { enabled: true, days: 7 },
            indexedDB: { enabled: true, days: 30 },
            smartCleanup: { enabled: true, months: 3 }
        };

        types.forEach(type => {
            if (settings[type]) {
                elements[type].checkbox.checked = settings[type].enabled;
                elements[type].days.value = settings[type].days;
                elements[type].days.disabled = !settings[type].enabled;
            }
        });

        if (settings.smartCleanup) {
            smartChk.checked = settings.smartCleanup.enabled;
            smartMonths.value = settings.smartCleanup.months || 3;
            smartMonths.disabled = !settings.smartCleanup.enabled;
        }
    });

    // Save button logic
    saveButton.addEventListener('click', () => {
        const newSettings = {};
        let minDays = Infinity;

        types.forEach(type => {
            const enabled = elements[type].checkbox.checked;
            const days = parseInt(elements[type].days.value) || 30;
            newSettings[type] = { enabled, days };
            if (enabled && days < minDays) minDays = days;
        });

        newSettings.smartCleanup = {
            enabled: smartChk.checked,
            months: parseInt(smartMonths.value) || 3
        };

        chrome.storage.sync.set({ cleanSettings: newSettings }, () => {
            const originalText = saveButton.textContent;
            saveButton.textContent = chrome.i18n.getMessage('saveSuccess') || "✓ Saved!";
            saveButton.classList.add('success');
            
            const cleanupIntervalMinutes = (minDays === Infinity || minDays === 0) ? 60 : (60 * 24);
            chrome.runtime.sendMessage({ action: "updateSchedule", interval: cleanupIntervalMinutes });

            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.classList.remove('success');
            }, 2000);
        });
    });

    // Deep Clean button logic
    deepButton.addEventListener('click', () => {
        const days = parseInt(deepDaysInput.value) || 7;
        const originalText = deepButton.textContent;
        
        deepButton.disabled = true;
        deepButton.textContent = "...";
        
        chrome.runtime.sendMessage({ action: "deepClean", days: days }, (response) => {
            deepButton.textContent = chrome.i18n.getMessage('saveSuccess') || "Done!";
            setTimeout(() => {
                deepButton.disabled = false;
                deepButton.textContent = originalText;
            }, 2000);
        });
    });

    // Load logs logic
    function loadLogs() {
        chrome.storage.local.get(['cleanupLogs'], (result) => {
            const logs = result.cleanupLogs || [];
            logsContainer.innerHTML = '';

            if (logs.length === 0) {
                clearLogsBtn.style.display = 'none';
                logsContainer.innerHTML = `<div class="no-logs">${chrome.i18n.getMessage('noLogs') || "No logs yet."}</div>`;
                return;
            }

            clearLogsBtn.style.display = 'block';
            logs.slice().reverse().forEach(log => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.innerHTML = `
                    <div class="log-time">${new Date(log.timestamp).toLocaleString()}</div>
                    <div class="log-details">${log.details || log.types.join(', ')}</div>
                `;
                logsContainer.appendChild(entry);
            });
        });
    }

    clearLogsBtn.addEventListener('click', () => {
        chrome.storage.local.set({ cleanupLogs: [] }, loadLogs);
    });
});