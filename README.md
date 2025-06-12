## 📁 Table of Contents

- [Introduction](#introduction)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development](#development)
- [Naming Conventions](#naming-conventions)
- [Folder & File Organization](#folder--file-organization)
- [Code Quality Tips](#code-quality-tips)
- [Ignored Folders](#ignored-folders)
- [License](#license)

---

## 🧭 Introduction

This project leverages the MERN stack (MongoDB, Express.js, React.js, Node.js) and follows modular best practices. It is divided into multiple workspaces for scalability and better organization.

---

## 🗂️ Project Structure

```
/admin     → Admin dashboard (React + Vite)
/website   → Public-facing website (React + Vite)
/server    → Backend API (Node.js + Express)
/shared    → Common utilities and types shared across the app
````

---

## 🛠️ Installation

Follow these steps to set up the project locally:

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install Dependencies

Navigate into each workspace and install dependencies:

```bash
# Admin Panel
cd admin
npm install

# Website
cd ../website
npm install

# Server
cd ../server
npm install
```

### 3. Set Up Environment Variables

Copy the `.env.example` files and configure as needed:

```bash
cp admin/.env.example admin/.env
cp website/.env.example website/.env
cp server/.env.example server/.env
```

> 🔒 Don't forget to add your keys and environment-specific values in each `.env` file.

### 4. Run the Application

In separate terminal windows or tabs:

```bash
# Admin
cd admin
npm run dev

# Website
cd ../website
npm run dev

# Server
cd ../server
npm run dev
```

---

## 🚧 Development

To run the development servers:

```bash
# Admin
cd admin && npm run dev

# Website
cd website && npm run dev

# Server
cd server && npm run dev
```

---

## 📌 Naming Conventions

### Variables & Functions

* Use **camelCase** or **snake\_case**
* Use meaningful names; avoid single letters
* Functions should be named with **verb + noun**, e.g., `handleFormSubmit`

```js
// Good
let userName = "JohnDoe";
function calculateTotal(price, qty) {
  return price * qty;
}
```

### Constants

* Use **SCREAMING\_SNAKE\_CASE**

```js
const MAX_RETRY_COUNT = 5;
```

---

## 🗃️ Folder & File Organization

### Folder Structure

* Group by **feature** or **functionality**
* Example directories: `components/`, `pages/`, `utils/`, `middlewares/`, `store/`, etc.
* For multi-part components, use a **camelCase folder** matching the main file name:

  ```
  📁 blogs
    └─ 📄 Blogs.jsx
    └─ 📁 blogs/
        └─ 📄 BlogCard.jsx
  ```

### File Naming

* Use **plural** for list views (e.g., `Users.jsx`)
* Use **singular** for individual records (e.g., `User.jsx`)
* Be descriptive and consistent

---

## 🚫 Ignored Folders

These folders are excluded via `.gitignore`:

* `/node_modules`
* `/admin/public/assets/`
* `/website/public/assets/`
* `/server/assets/`

---

## 📂 Example Directory Snapshot

Here’s a condensed view of the directory layout:

```
📁 admin
 └─ 📁 public/assets
 └─ 📁 src
     ├─ 📁 actions
     ├─ 📁 assets
     ├─ 📁 middlewares
     ├─ 📁 store (context/hooks/redux)
     ├─ 📁 styles
     ├─ 📁 utils
     ├─ 📁 views (components/partials)
     └─ 📄 App.jsx, main.jsx

📁 server
 └─ 📁 assets (media/encryptionKeys)
 └─ 📁 controllers
 └─ 📁 middlewares (auth/storage/cache)
 └─ 📁 models
 └─ 📁 routes
 └─ 📁 utils (crons/emailTemplates/helpers)
 └─ 📄 index.js

📁 website (same structure as admin)

📁 shared
 └─ Common types/utilities
```

---

## ✨ Code Quality Tips

### Modularization

* Keep files small and focused
* Reuse components and utilities

### Abstraction

* Avoid unnecessary file splitting unless reusable
* Don't over-engineer simple components

### Code Reuse

* Extract repetitive code into functions or shared modules

### Documentation

* Use comments for complex logic
* Keep them relevant and up to date

### Refactoring

* Clean and refactor code regularly
* Focus on readability and simplicity

---

# Commit Message Format

*This specification is inspired by and supersedes the [AngularJS commit message format][commit-message-format].*

#### <a name="commit-header"></a>Commit Message Header

```
<type>: <short summary> 
  │       │
  │       └─⫸ Commit Summary: use of non-continuous verbs, with clear sentences.  
  │                            build: changes that affect the build system (example: npm updates)
  │                            ci: Changes to our configuration files and scripts 
  │                            docs: Documentation only changes
  │                            feat: A new feature
  │                            fix: A bug fix
  │                            perf: A code change that improves performance
  │                            refactor: A code change that neither fixes a bug nor adds a feature
  │                            test: Adding missing tests or correcting existing tests
  │                          
  └─⫸ Commit Type: build|ci|docs|feat|fix|perf|refactor|test
```

Just as in the summary, use the imperative, present tense: "fix", not "fixed" nor "fixes".


# Required VSCode Plugins

### Required VSCode Plugins
Ensure a smoother development workflow with these essential VSCode plugins:

1. **[Auto Rename Tag](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-rename-tag)**: Automatically rename paired HTML/XML tags.
2. **[Better Align](https://marketplace.visualstudio.com/items?itemName=wwm.better-align)**: Align code with ease using configurable alignment rules.
3. **[Bootstrap Intellisense](https://marketplace.visualstudio.com/items?itemName=thekalinga.bootstrap4-vscode)**: Bootstrap 3 and 4 autocomplete, snippets, and intellisense in VSCode.
4. **[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)**: Spell checker for source code.
5. **[ES7+ React/Redux snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)**: JavaScript and React/Redux snippets in ES7+ syntax.
6. **[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)**: Provides linting for JavaScript and TypeScript code.
7. **[HTML Tag Wrapper](https://marketplace.visualstudio.com/items?itemName=hwencc.html-tag-wrapper)**: Wrap selections with HTML tags.
8. **[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)**: Code formatter that supports various languages.
9. **[Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)**: Intelligent Tailwind CSS tooling for VSCode.

### Extra VSCode Plugins
Enhance your coding experience with these additional VSCode plugins:
1. **[Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)**: Improve your code commenting with customizable comment tags.
2. **[Download Color Highlight](https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight)**: Highlight colors in your code.
3. **[Download Indent Rainbow](https://marketplace.visualstudio.com/items?itemName=oderwat.indent-rainbow)**: Colorizes indentation in front of your text alternating four different colors on each step.
