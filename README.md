# KP WEB 2 - Mock Test Platform

This project serves a static `public/` folder and provides API endpoints for user management and a mock test system, backed by MongoDB.

## Setup (PowerShell)

1.  Install dependencies

    ```powershell
    cd "D:\KP WEB 2"
    ```

    ```powershell
    npm install express mongoose bcryptjs body-parser dotenv
    ```

2.  Copy `.env.example` to `.env` and update `MONGO_URI` if needed.

3.  Start MongoDB (locally or set `MONGO_URI` to an Atlas connection string).

4.  Run server:

    ```powershell
    node server.js
    ```

    The server will start on `http://localhost:3000`.

## Usage

1.  **User Registration and Login:**
    -   Open `http://localhost:3000/login-register.html` to create an account or log in.

2.  **Admin Panel (Creating Tests):**
    -   Navigate to `http://localhost:3000/hubnilu.html`.
    -   Use the interface to create categories, exams, tests, and questions. All data is saved to the MongoDB database.

3.  **Taking a Test (User Flow):**
    -   After logging in, users can navigate to `http://localhost:3000/index.html` (or the main user dashboard) to see available exams.
    -   The test flow follows this path:
        1.  `instructions.html` - General instructions.
        2.  `exam-description.html` - Details about the selected test.
        3.  `mock-test.html` - The interactive test page.
        4.  `result.html` - The results page after submitting the test.

To debug the test flow, please ensure the following:
- The Node.js server is running without errors.
- The MongoDB connection string in your `.env` file is correct and the database is accessible.
- You have created at least one complete test (with questions) in the admin panel.
- Check the browser's developer console for any API errors when navigating through the test flow (e.g., when `mock-test.html` tries to fetch test data).
