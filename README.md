# Auto History Cleaner 🧹

A minimalist Chrome extension built with Manifest V3 that automatically cleans your browser history. You can set a retention period in days, and if set to zero, it offers a more aggressive hourly cleanup.

---

## ✨ Features

* **Automatic Cleanup:** Periodically deletes Browse history older than a specified number of days.
* **Configurable Retention:** Easily set the number of days to keep your history via a simple popup.
* **Aggressive Cleanup Option:** When set to `0` days, history is cleared every hour for enhanced privacy.
* **Manifest V3:** Built using the latest Chrome extension platform for improved security and performance.
* **Lightweight & Efficient:** Utilizes Chrome's `alarms` API and Service Workers for optimized background processing.

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
    * Select the directory where you downloaded/cloned the extension (`auto-history-cleaner`).

5.  **Pin (Optional):**
    * Click the puzzle piece icon next to your profile avatar in Chrome's toolbar.
    * Find "Auto History Cleaner" and click the pin icon next to it to make it easily accessible.

---

## 🛠️ Usage

1.  **Click the Extension Icon:** Click the "Auto History Cleaner" icon in your Chrome toolbar.
2.  **Set Retention:** In the popup, enter the number of days you want to keep your Browse history.
    * Enter `30` to keep history for the last 30 days.
    * Enter `0` to delete all history older than 0 days (i.e., clear everything) every hour.
3.  **Save Settings:** Click the **"Save"** button.

The extension will perform an immediate cleanup based on your settings and then continue to clean periodically (hourly if set to 0 days, or every 24 hours otherwise).

---

## 📁 Project Structure

````

auto-history-cleaner/
├── manifest.json       \# Extension manifest (defines permissions, background script, etc.)
├── background.js       \# Service Worker: Handles history cleaning logic and alarm scheduling
├── popup.html          \# HTML for the extension's popup interface
├── popup.js            \# JavaScript for handling user interaction in the popup
└── icons/              \# Directory for extension icons
├── icon16.png
├── icon48.png
└── icon128.png
````

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
