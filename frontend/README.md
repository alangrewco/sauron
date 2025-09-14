This directory contains the frontend for the Sauron project, a Next.js application that provides an interactive map for visualizing device trajectories and a chat interface for AI-powered investigation.

## Features

-   **Interactive Map**: A Mapbox-powered map to visualize device locations and trajectories.
-   **Resizable Layout**: A responsive and resizable layout for a flexible user experience.
-   **AI Chatbot**: A chat interface to interact with the Cohere-powered AI analyst.
-   **Search and Filter**: Tools to search for locations and filter the displayed data.
-   **Real-time Updates**: The map updates in real-time as you interact with the filters and timeline.

## Tech Stack

-   **Framework**: Next.js 15 (with Turbopack)
-   **Language**: TypeScript
-   **UI Library**: React 19
-   **Mapping**: Mapbox GL JS
-   **Styling**: Tailwind CSS, shadcn/ui
-   **Other Libraries**: lucide-react, class-variance-authority, clsx, tailwind-merge

## Getting Started

### Prerequisites

-   Node.js (version 20 or higher recommended)
-   npm, yarn, or pnpm
-   A Mapbox access token.

### Installation

1.  **Clone the repository** (if you haven't already).

2.  **Navigate to the `frontend` directory**:
    ```bash
    cd frontend
    ```

3.  **Install the dependencies**:
    ```bash
    npm install
    ```

4.  **Set up your environment variables**:
    Create a `.env.local` file in the `frontend` directory and add the following:
    ```
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your_mapbox_access_token"
    NEXT_PUBLIC_API_URL="http://127.0.0.1:5001"
    ```

### Running the Application

1.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Key Files and Directories

-   `app/`: The main application directory, using the Next.js App Router.
    -   `page.tsx`: The main page of the application.
    -   `layout.tsx`: The root layout for the application.
    -   `globals.css`: Global styles for the application.
-   `components/`: Reusable React components.
    -   `mapbox.tsx`: The Mapbox map component.
    -   `resizable-layout.tsx`: The main resizable layout component.
    -   `settings-panel.tsx`: The panel with filters, search, and the chatbot.
    -   `chatbot.tsx`: The chat interface component.
-   `lib/`: Utility functions and API clients.
    -   `api.ts`: Functions for making requests to the backend API.
-   `hooks/`: Custom React hooks for data fetching and other logic.
-   `public/`: Static assets, such as images and fonts.

## Building for Production

To create a production build of the application, run:
```bash
npm run build
```

Then, to start the production server:
```bash
npm run start
```