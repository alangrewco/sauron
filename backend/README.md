This directory contains the backend services for the Sauron project. It's a Python-based application using Flask to serve a REST API, and it interfaces with a PostgreSQL database with the PostGIS extension for storing and querying spatio-temporal data.

## Features

-   **REST API**: Provides endpoints for retrieving device information, trajectories, and movement simulation data.
-   **Database Management**: Includes scripts and queries for setting up and interacting with the PostgreSQL/PostGIS database.
-   **AI Chatbot Service**: Integrates with Cohere to provide a natural language interface for querying the data.
-   **Data Simulation**: A script to simulate device movement and populate the database with realistic trajectory data.
-   **Apple Location Services**: A service to query Apple's undocumented location services to geolocate BSSIDs.

## Tech Stack

-   **Framework**: Flask
-   **Database**: PostgreSQL with PostGIS
-   **ORM/DB Driver**: psycopg2-binary
-   **AI**: Cohere
-   **Other Libraries**: requests, python-dotenv, protobuf

## Getting Started

### Prerequisites

-   Python 3.8+
-   A PostgreSQL database with the PostGIS extension enabled. You can get one from [Supabase](https://supabase.com/).
-   A Cohere API key.

### Installation

1.  **Clone the repository** (if you haven't already).

2.  **Navigate to the `backend` directory**:
    ```bash
    cd backend
    ```

3.  **Create a virtual environment**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

4.  **Install the dependencies**:
    ```bash
    pip install -r app/requirements.txt
    ```

5.  **Set up your environment variables**:
    Create a `.env` file in the `backend` directory and add the following:
    ```
    DATABASE_URL="your_postgresql_connection_string"
    COHERE_API_KEY="your_cohere_api_key"
    ```

### Running the Application

1.  **Run the Flask application**:
    ```bash
    python run.py
    ```
    The application will be available at `http://127.0.0.1:5001`.

## Key Files and Directories

-   `run.py`: The entry point for the Flask application.
-   `config.py`: Configuration for the application, including database URL and API keys.
-   `app/`: The main application directory.
    -   `__init__.py`: The application factory.
    -   `api/`: Contains the API routes.
    -   `db/`: Database management scripts and queries.
    -   `services/`: Business logic, including the chatbot and Apple location services.
    -   `models/`: Data models, including the Protocol Buffers definition.
-   `simulate_movement.py`: A script to generate simulated movement data.
-   `generate_map.py`: A script to generate a Folium map from the movement data.

## API Endpoints

-   `GET /api/devices`: List all discovered devices with pagination.
-   `GET /api/trajectories/<bssid>`: Get the full trajectory for a specific device.
-   `GET /api/trajectories`: Filter trajectories by area and time.
-   `POST /api/chat`: The endpoint for the AI chatbot.
-   `GET /api/movement/trajectories`: Get trajectories from the movement simulation.
-   `GET /api/movement/time-range`: Get the time range of the simulation data.