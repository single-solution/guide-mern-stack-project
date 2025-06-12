# MERN Project Guide

Welcome to the project! This repository contains a Vite-based web application with separate server, admin and website interfaces.

## Table of Contents

-  [Introduction](#introduction)
-  [Project Structure](#project-structure)
-  [Installation](#installation)
-  [Development](#development)
-  [Ignored Folders](#ignored-folders)
-  [Contributing](#contributing)
-  [License](#license)

## Introduction

This project is built on the latest Vite and Node.js versions. Each Part of the project runs on a different port.

## Project Structure

The repository is organised into the following directories:

-  `admin`: Contains the admin interface of the application.
-  `website`: Contains the website interface of the application.
-  `server`: Contains the server code.
-  `shared`: Contains the shared resources between the admin, website, and server.

## Installation



## Development



   You will need to install a sample database to run the project. Visit the link below to run migrations, make sure you have already set up MongoDB credentials

   ```sh
   http://localhost:5010/v1/migrations/install-all
   ```

## Ignored Folders

The following folders are intentionally excluded from version control using the `.gitignore` file:

-  `/node_modules`: Ignored to prevent tracking of dependencies.
-  `/admin/public/assets/`: Ignored to exclude admin frontend assets.
-  `/website/public/assets/`: Ignored to exclude website frontend assets.
-  `/backend/assets/`: Ignored to exclude backend assets.

These folders should be managed externally or shared with team members as needed.

# Development Guide 🚀

## Naming Conventions

### Variables and Functions
- Use **meaningful** and **descriptive** names.	  
- Follow **camelCase** or **snake_case** for naming variables and functions.
- Avoid single-letter names unless used as loop counters.

	```javascript  
	// Bad example
	let x = "JohnDoe";
	function calc(price, q) {
		return price * q;
		...
		
	// Good example
	let userName = "JohnDoe";
	function calculateTotalPrice(itemPrice, quantity) {
		return itemPrice * quantity;
		...
	```

### Classes and Objects
- Use **PascalCase** for class names and function only if they render any view.
- Use **camelCase** for class names and function if they do not render any view.
- Class names should be **nouns** representing the entity they model.

	```javascript
	// Example of function following the guideline
	function calculateTotalPrice(itemPrice, quantity) {
		return itemPrice * quantity;
	}

	// Example of function following the guideline
	function displayUserProfile(userName) {
		// Logic to display user profile
	}
	```

	```javascript
	// Example of class with PascalCase
	class Car {
		constructor(make, model) {
			this.make = make;
			this.model = model;
		}

		drive() {
			console.log(`Driving ${this.make} ${this.model}`);
		}
	}
	```
	
	```javascript
	// Example of class with camelCase
	class animalShelter {
		constructor() {
			this.animals = [];
		}

		addAnimal(animal) {
			this.animals.push(animal);
		}

		getAnimals() {
			return this.animals;
		}
	}
	```
	
- Function names should start with a **non-continuous verbs** then their will be **nouns** representing the entity they model.

	```javascript  
	// Bad example
	const handleEditModal = () => {
		setShowAddEditModal(true);
	};
	
	const clickEditModal = () => {
		setShowAddEditModal(true);
	};
	
	const clickEditbutton = () => {
		setShowAddEditModal(true);
	};
	...
		
	// Good example
	const handleEditButtonClick = () => {
		setShowAddEditModal(true);
	};
	...
	```
	

### Constants
- Use **SCREAMING_SNAKE_CASE** for constants.
- Constants should be all uppercase with words separated by underscores.

	```javascript
	const MAX_SPEED = 120;
	const API_KEY = "YOUR_API_KEY";
	const PI = 3.14;
	```

Enhance your coding experience further with these additional tips:

### Grammar Mistakes and Code Spell Checker

Ensure your code is free of spelling errors and follows proper grammar rules by utilizing a code spell checker plugin. This plugin will highlight spelling mistakes and suggest corrections. Additionally, consider converting words highlighted by the spell checker to camelCase to maintain consistent naming conventions.

For example, if a word is underlined in blue by the code spell checker indicating a spelling mistake, you can convert it to camelCase by modifying it accordingly:

	```javascript
	// Incorrect spelling highlighted by code spell checker
	let userwage = 200;

	// Corrected to camelCase
	let userWage = 200;
	```

## Folder Structure And File Organization

### Folder Structure
- Organize files logically based on functionality.
- Use folders to group related files.
- Consider using a modular structure with directories like `components/`, `pages/`, `utils/`, etc.
- Always try to make the main file like a **Blogs.jsx** file in root folder and if  this blogs file has components then create the folder with same name using **camelCase** in the and place blogs partial files there

### File Naming
- When a page displays multiple records, the filename should be plural. For pages displaying a single entity or detail, use a singular filename.
- Use descriptive filenames that reflect the content or purpose of the file.
- Follow a consistent naming convention across the project.

## Simplification Techniques

### Modularization
- Break down complex tasks into smaller, reusable modules or functions.
- Encapsulate related functionality within modules or classes.
- Do not to break a single file into chunks if not that long and modules are not reusable

### Abstraction
- Abstract away unnecessary details to simplify code.
- Use higher-level abstractions when dealing with complex operations.
- Create a minimum number of files, do not create cluster chunks

### Code Reuse
- Identify common patterns and extract them into reusable functions or components.
- Avoid duplicating code; refactor repetitive code into shared functions.

### Documentation
- Write **clear** and **concise** comments to explain complex logic or algorithms.
- Document the purpose and usage of functions, classes, and modules.

### Refactoring
- Regularly review and refactor code to improve readability and maintainability.
- Simplify complex code by breaking it down into smaller, more manageable parts.


*By following consistent naming conventions, organizing files effectively, and employing simplification techniques, you can create codebases that are easier to understand, maintain, and extend.*


## Example Folder Structure For A Full Stack App

- **admin**: Contains the front-end code using React.js.
  - **public**: Stores static assets and libraries to use the local CDN.
  - **src**: Contains React components, pages, and other front-end code.
- **website**: Contains the front-end code using React.js.
  - **public**: Stores static assets and libraries to use the local CDN.
  - **src**: Contains React components, pages, and other front-end code.
- **server**: Contains the back-end code using Node.js and Express.js.
  - **assets**: Holds assets and other encryption files.
  - **controllers**: Contains controller functions.
  - **models**: Defines data models.
  - **routes**: Defines API routes.
- **.gitignore**: Specifies files and directories to be ignored by Git.
- **README.md**: Detailed explanation about project setup, configs, and use.

This README outlines the structure of a typical MERN (MongoDB, Express.js, React.js, Node.js) stack application.
```
- 📁 .vscode
	- 📄 settings.json
	...
- 📁 admin
  - 📁 public
	- 📁 assets
	...
  - 📁 src
	  - 📁 actions
		- 📄 apiErrorHandler.js
		...
	  - 📁 assets
		...
	  - 📁 middlewares
		- 📄 apis.js
		- 📄 auth.js
		- 📄 axiosHandler.js
		...
	  - 📁 store
		- 📁 contextProviders
			...
		- 📁 hooks
			...
		- 📁 redux
			...
		...
	  - 📁 styles
		- 📁 cards
			...
		- 📁 modals
			...
		- 📁 icons
			...
		...
	  - 📁 utils
		- 📁 validations
			-  📄 regexValidations.js
			...
		- 📄 constants.js
		- 📄 helpers.js
		...
	  - 📁 views
		- 📁 components
			- 📁 home
				-  📄 FeaturedProducts.jsx
		- 📁 partials
			-  📄 Header.jsx
			-  📄 Breadcrumb.jsx
			-  📄 Footer.jsx
			...
		- 📄 Home.jsx
		- 📄 Auth.jsx
		...
    - 📄 App.jsx
    - 📄 main.jsx
    ...
  - 📄 .env
  - 📄 .env.example
  - 📄 .env.production
  - 📄 eslintrc.cjs
  - 📄 index.html
  - 📄 package.json
  - 📄 vite.config.js
  ...
- 📁 server
  - 📁 assets
	- 📁 encrytionKeys
		...
	- 📁 media
		...
    ...
  - 📁 controllers
    - 📄 guests.js
    - 📄 users.js
    ...
  - 📁 middlewares
	- 📁 authentications
		- 📄 jwtAuthentication.js
		- 📄 userAuthorization.js
		- 📄 userAccessStatus.js
		...
	- 📁 cache
		- 📄 redis.js
	- 📁 storage
		- 📄 multer.js
		...
	- 📄 socket.js
    ...
  - 📁 models
    - 📄 users.js
    ...
  - 📁 routes
    - 📄 users.js
    - 📄 authRoutes.js
    ...
  - 📁 utils
	- 📁 crons
		- 📁 scripts
			- 📄 checkForExpiredSubscriptions.sh
			...
		- 📄 checkForExpiredSubscriptions.js
		...
	- 📁 emailTemplates
		- 📄 welcomeEmail.html
		...
	- 📁 sampleDBMigrations
		- 📄 users.json
		...
	- 📄 constants.js
	- 📄 helpers.js
    ...
  - 📄 .env
  - 📄 .env.example
  - 📄 .eslintrc.js
  - 📄 .eslintrc.prettier.js
  - 📄 .ecosystem.config.js
  - 📄 index.js
  - 📄 package.json
  ...
- 📁 admin
  - 📁 public
	- 📁 assets
	...
  - 📁 src
	  - 📁 actions
		- 📄 apiErrorHandler.js
		...
	  - 📁 assets
		...
	  - 📁 middlewares
		- 📄 apis.js
		- 📄 auth.js
		- 📄 axiosHandler.js
		...
	  - 📁 store
		- 📁 contextProviders
			...
		- 📁 hooks
			...
		- 📁 redux
			...
		...
	  - 📁 styles
		- 📁 cards
			...
		- 📁 modals
			...
		- 📁 icons
			...
		...
	  - 📁 utils
		- 📁 validations
			-  📄 regexValidations.js
			...
		- 📄 constants.js
		- 📄 helpers.js
		...
	  - 📁 views
		- 📁 components
			- 📁 home
				-  📄 FeaturedProducts.jsx
		- 📁 partials
			-  📄 Header.jsx
			-  📄 Breadcrumb.jsx
			-  📄 Footer.jsx
			...
		- 📄 Home.jsx
		- 📄 Auth.jsx
		...
    - 📄 App.jsx
    - 📄 main.jsx
    ...
  - 📄 .env
  - 📄 .env.example
  - 📄 .env.production
  - 📄 eslintrc.cjs
  - 📄 index.html
  - 📄 package.json
  - 📄 vite.config.js
  ...
- 📄 .gitignore
- 📄 .LICENSE
- 📄 README.md
```

This structure is a common setup for MERN stack applications, but it can be customised based on the specific requirements of your project. Can be modified as needed!

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
