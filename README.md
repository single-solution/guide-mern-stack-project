# surplusList

Welcome to surplusList! This repository contains a Vite-based web application with separate backend, admin and website interfaces.

## Table of Contents

-  [Introduction](#introduction)
-  [Project Structure](#project-structure)
-  [Installation](#installation)
-  [Development](#development)
-  [Ignored Folders](#ignored-folders)
-  [Contributing](#contributing)
-  [License](#license)

## Introduction

This project is built on Vite V~4.4.8, and NodeJS V~18.17.0. Each Part of the project runs on different port and

## Project Structure

The repository is organized into the following directories:

-  `admin`: Contains the admin interface of the application.
-  `website`: Contains the website interface of the application.
-  `backend`: Contains the backend server code.

## Installation

1. **Clone the Repository:** Start by cloning this repository to your local machine:

   ```sh
   git clone https://github.com/single-solution/picFan.git
   ```

2. **Navigate to Project Root:** Move to the root directory of the project:

   ```sh
   cd picFan
   ```

<!-- 3. **Install Dependencies:** Install project dependencies using npm:

   ```sh
   npm install
   ``` -->

## Development

-  **Start Development:**

   ```sh
   npm run allnpmi
   npm run allnpmdev
   ```

   **Build Project:**

   ```sh
   npm run allnpmbuild
   ```

   you will need to install sample database to run the project. Visit link below to run migrations, make sure you already have setup mongodb credentials

   ```sh
   http://localhost:5010/v1/migrations/install-all
   ```

   **Default Logins:**

   ```sh
   Admin ->
   email   : admin@dashboard.com
   password: admin123!

   User ->
   email   : eve@example.com
   password: eve789

   Photographer ->
   email   : alice@example.com
   password: alice456
   ```

## Ignored Folders

The following folders are intentionally excluded from version control using the `.gitignore` file:

-  `/node_modules`: Ignored to prevent tracking of dependencies.
-  `/admin/public/assets/`: Ignored to exclude admin frontend assets.
-  `/website/public/assets/`: Ignored to exclude website frontend assets.
-  `/backend/assets/`: Ignored to exclude backend assets.

These folders should be managed externally or shared with team members as needed.

## Contributing

Contributions to surplusList are greatly appreciated! If you discover a bug or have an enhancement in mind, feel free to open an issue or submit a pull request.

## License

This project operates under the [MIT License](LICENSE).
