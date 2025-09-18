# MoneyWise

![MoneyWise Dashboard Screenshot](docs/moneywise-dashboard.png) <!-- Add your screenshot path here, or remove this line if not available -->

**MoneyWise** is a modern web and mobile application designed to automate personal finance management. Unlike traditional budgeting tools, MoneyWise intelligently parses your emails and notifications to track purchases, subscriptions, and income, providing real-time insights into your finances.

![Status: Private Development](https://img.shields.io/badge/status-private--development-orange)

## 🚀 Features
- **Automatic Email Parsing:** Detect purchases and subscriptions from your inbox.
- **Real-Time Tracking:** Monitor income and expenses as they happen.
- **Smart Categorization:** Transactions are automatically grouped for easy review.
- **Interactive Dashboard:** Visualize your financial health with dynamic charts.
- **Notifications & Insights:** Get proactive alerts to improve financial awareness.
- **Cross-Platform:** Available on Web, Android, and iOS.

## 🛠 Tech Stack
- **Frontend:** React (TypeScript)
- **Mobile:** React Native
- **Backend:** Node.js / Express *(planned)*
- **Database:** MongoDB / Firebase *(planned)*
- **Email Parsing:** Gmail API, Microsoft Graph API
- **Visualization:** Recharts, Chart.js

## 📦 Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- (Optional) [Yarn](https://yarnpkg.com/)
- (Optional for mobile) [Expo](https://expo.dev/) for React Native

### Steps

```bash
# Clone the repository
git clone https://github.com/kdantuono/money-wise.git
cd money-wise

# Install dependencies
npm install

# Start development server
npm run dev
```

> **Note:** For email parsing, you will need API credentials for Gmail and/or Microsoft Graph. See [`docs/email-setup.md`](docs/email-setup.md) for details. *(Create this doc if you don't have it yet.)*

### Mobile App
See [`docs/mobile-setup.md`](docs/mobile-setup.md) for running the React Native app.

## 📈 Usage

After starting the development server, open [http://localhost:3000](http://localhost:3000) in your browser.  
You can sign in using your Google/Microsoft account to enable email parsing.

## 🤝 Contributing

MoneyWise is currently in **private development**. Contributions and feedback are welcome **once the project is public**.

- For bug reports and feature requests, please use the [Issues](https://github.com/kdantuono/money-wise/issues) page.
- See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines once the project opens up.

## 📄 License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.

## 📬 Contact

For questions or support, email [kdantuono@gmail.com](mailto:cosmo.dantuono@gmail.com) or open an issue.

---

> **MoneyWise is currently in private development.**  
> Watch the repository to be notified when it goes public!