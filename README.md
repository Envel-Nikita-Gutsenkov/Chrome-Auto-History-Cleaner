# Auto Profile Cleaner 🧹

A powerful Chrome extension built with Manifest V3 that automatically performs deep cleaning of your browser profile. It allows you to configure specific retention periods (in days) for various types of browsing data (History, Downloads, Cache, Service Workers, File Systems, IndexedDB) while **strictly preserving your cookies and active authorizations**.

---

## ✨ Features

* **Granular Control:** Independently set different retention periods (0-N days) for 6 distinct data types.
* **Deep Cleaning:** Uses the `chrome.browsingData` API to clear out heavy background data like CacheStorage, Service Workers, File Systems, and IndexedDB to free up disk space.
* **Safe for Authorizations:** Purpose-built to *never* delete Cookies, Passwords, or LocalStorage. You remain logged into your accounts while the invisible web junk is safely purged.
* **Transparent Logging:** Includes a built-in logs viewer in the popup so you always know exactly what was cleaned and when.
* **Manifest V3:** Built using the latest, most secure Chrome extension platform standards.
* **Lightweight & Efficient:** Utilizes Chrome's `alarms` API and Service Workers for optimized performance with minimal memory footprint.

---

## 🚀 Installation

1.  **Download/Clone:** Download or clone this repository to your local machine.
2.  **Open Chrome Extensions:**
    * Open your Chrome browser.
    * Navigate to `chrome://extensions`.
3.  **Enable Developer Mode:**
    * In the top right corner, toggle on **"Developer mode"**.
4.  **Load Unpacked Extension:**
    * Click the **"Load unpacked"** button that appears.
    * Select the directory where you downloaded/cloned the extension.
5.  **Pin (Optional):**
    * Click the puzzle piece icon next to your profile avatar in Chrome's toolbar.
    * Find "Auto Profile Cleaner" and click the pin icon next to it to make it easily accessible.

---

## 🛠️ Usage

1.  **Click the Extension Icon:** Click the "Auto Profile Cleaner" icon in your Chrome toolbar.
2.  **Configure Clean Settings:**
    * Under the settings tab, use the checkboxes to select which items you want to include in automatic background cleanups.
    * For each enabled item, set the retention period (e.g., `30` removes anything older than 30 days, `0` deletes that data every hour).
3.  **Save Settings:** Click the **"Save Settings"** button. The extension will perform an immediate cleanup run for old data and schedule future alarms.
4.  **Check Logs:** Switch to the **Logs** tab at any point to view the last 100 automated cleanup actions performed by the extension.

---

## 📁 Project Structure

```
chrome-auto-history-cleaner/
├── manifest.json       # Extension manifest (defines permissions, required APIs)
├── background.js       # Service Worker: Handles the alarm scheduling and actual browsingData cleaning logic
├── popup.html          # HTML structure for the popup interface (Tabs, Checkboxes, Inputs)
├── popup.js            # JavaScript to handle the graphical interface functionality, settings mapping, and log retrieval
├── _locales/           # i18n Translations (English, Russian, etc.)
└── icons/              # Extension icons directory
```

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for improvements, bug fixes, or new features, feel free to:

1.  Fork the repository.
2.  Create a new branch.
3.  Make your changes.
4.  Commit your changes.
5.  Push to the branch.
6.  Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
