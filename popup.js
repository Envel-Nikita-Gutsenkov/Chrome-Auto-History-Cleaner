document.addEventListener('DOMContentLoaded', () => {
    // Localization
    const localize = () => {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const message = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
            if (message) {
                if (element.tagName === 'INPUT' && element.type === 'button') {
                    element.value = message;
                } else {
                    element.textContent = message;
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
    const logsContainer = document.getElementById('logsContainer');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    // Types
    const types = ['history', 'downloads', 'cache', 'serviceWorkers', 'fileSystems', 'indexedDB'];
    const elements = {};

    types.forEach(type => {
        elements[type] = {
            checkbox: document.getElementById(`chk_${type}`),
            days: document.getElementById(`days_${type}`)
        };
        // Disable days input if checkbox is unchecked
        elements[type].checkbox.addEventListener('change', (e) => {
            elements[type].days.disabled = !e.target.checked;
        });
    });

    // Tab switching logic
    tabSettingsBtn.addEventListener('click', () => {
        tabSettingsBtn.classList.add('active');
        tabLogsBtn.classList.remove('active');
        tabSettings.style.display = 'block';
        tabLogs.style.display = 'none';
        tabSettings.classList.add('active');
        tabLogs.classList.remove('active');
    });

    tabLogsBtn.addEventListener('click', () => {
        tabLogsBtn.classList.add('active');
        tabSettingsBtn.classList.remove('active');
        tabLogs.style.display = 'block';
        tabSettings.style.display = 'none';
        tabLogs.classList.add('active');
        tabSettings.classList.remove('active');
        loadLogs();
    });

    // Retrieve and display saved settings
    chrome.storage.sync.get(['cleanSettings'], (result) => {
        const defaultSettings = {
            history: { enabled: true, days: 30 },
            downloads: { enabled: true, days: 30 },
            cache: { enabled: true, days: 7 },
            serviceWorkers: { enabled: true, days: 30 },
            fileSystems: { enabled: true, days: 30 },
            indexedDB: { enabled: true, days: 30 }
        };

        const settings = result.cleanSettings || defaultSettings;

        types.forEach(type => {
            if (settings[type]) {
                elements[type].checkbox.checked = settings[type].enabled;
                elements[type].days.value = settings[type].days;
                elements[type].days.disabled = !settings[type].enabled;
            } else {
                elements[type].checkbox.checked = defaultSettings[type].enabled;
                elements[type].days.value = defaultSettings[type].days;
                elements[type].days.disabled = !defaultSettings[type].enabled;
            }
        });
    });

    // Event listener for the save button
    saveButton.addEventListener('click', () => {
        let hasError = false;
        const newSettings = {};
        let minDays = Infinity;

        types.forEach(type => {
            const enabled = elements[type].checkbox.checked;
            const days = parseInt(elements[type].days.value);

            if (enabled && (isNaN(days) || days < 0)) {
                hasError = true;
            }

            newSettings[type] = { enabled, days: isNaN(days) ? 30 : days };
            if (enabled && days < minDays) {
                minDays = days;
            }
        });

        if (hasError) {
            alert(chrome.i18n.getMessage('errorPositiveNumber') || "Please enter a positive number.");
            return;
        }

        let cleanupIntervalMinutes = (minDays === 0) ? 60 : (60 * 24);

        chrome.storage.sync.set({ cleanSettings: newSettings }, () => {
            const originalText = saveButton.textContent;
            saveButton.textContent = chrome.i18n.getMessage('saveSuccess') || "✓ Saved!";
            saveButton.classList.add('success');
            saveButton.disabled = true;

            chrome.runtime.sendMessage({ action: "updateSchedule", interval: cleanupIntervalMinutes });

            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.classList.remove('success');
                saveButton.disabled = false;
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
                const noLogs = document.createElement('div');
                noLogs.className = 'no-logs';
                noLogs.textContent = chrome.i18n.getMessage('noLogs') || "No cleanup logs yet.";
                logsContainer.appendChild(noLogs);
                return;
            }

            clearLogsBtn.style.display = 'block';

            // Show newest logs first
            logs.slice().reverse().forEach(log => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';

                const timeDiv = document.createElement('div');
                timeDiv.className = 'log-time';
                timeDiv.textContent = new Date(log.timestamp).toLocaleString();

                const detailsDiv = document.createElement('div');
                detailsDiv.textContent = `Cleaned: ${log.types && log.types.length ? log.types.join(', ') : 'None'}`;

                if (log.details) {
                    const extraDetails = document.createElement('div');
                    extraDetails.style.fontSize = '10px';
                    extraDetails.style.color = '#80868b';
                    extraDetails.textContent = log.details;
                    detailsDiv.appendChild(extraDetails);
                }

                entry.appendChild(timeDiv);
                entry.appendChild(detailsDiv);
                logsContainer.appendChild(entry);
            });
        });
    }

    // Clear logs button logic
    clearLogsBtn.addEventListener('click', () => {
        chrome.storage.local.set({ cleanupLogs: [] }, () => {
            loadLogs();
        });
    });
});