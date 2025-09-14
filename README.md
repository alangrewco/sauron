## Inspiration

The clearance rate for violent crime is only about 50% in the US and Canada. Non-violent crime? Forget about it. Time and time again, ordinary citizens are told law enforcement doesn't have the resources to help them and their families. Could you imagine going through a tragedy without any closure?

We set out on a mission to solve this problem, by making police investigative work 10x more efficient.

## What it does

Sauron is a surveillance and investigation platform that functions like a temporal-spatial time machine. It continuously crawls for Wi-Fi BSSID (MAC addresses) and queries their locations using Apple's location services, building a vast database of device movements over time.

Its core features include:

- Trajectory Visualization: An interactive Mapbox interface displays the historical paths of thousands of devices, allowing an investigator to see where any device has been over any period of time.
- Crime Track: Intelligent path estimation using location data - crime committed at a specific location? See who was there, and where they went!
- AI-Powered Investigation: A natural language chatbot, powered by Cohere, allows users to ask complex questions like, "Who was near the bank at 43.47°N, -80.54°W between 2:00 PM and 2:15 PM? Where did they go?"

## How we built it

Sauron is a full-stack application built with a modern, robust technology stack. More importantly however, how does it actually work?

### How does it actually work

1. Data Ingestion: The Initial Crawl
The process began with a massive data collection effort focused on the area around the University of Waterloo. We first used a Python script (wifi_scanner.py) to scan for an initial set of "seed" BSSIDs (the unique MAC addresses of Wi-Fi access points).

2. Geolocation & Expansion: Mapping the Area
This is where the magic happens. We leveraged Apple's powerful, undocumented Wi-Fi Positioning System (WPS). A BSSID is not inherently geographic, but devices like iPhones constantly map BSSIDs to their GPS coordinates and send this data to Apple. By mimicking the request that an iPhone makes, we can query Apple's servers for a BSSID's location.
Our Python service (apple_locator.py) constructs a binary request payload using Protocol Buffers (AppleWLoc.proto), the same format Apple uses internally.
Crucially, when we query for one BSSID, Apple's API generously returns the locations of up to 400 other nearby BSSIDs. This "neighbor data" feature allowed us to rapidly expand our map, turning a few seeds into a comprehensive database of approximately 8,000 unique BSSIDs in the target area.

3. Live Tracking: Capturing Movement
A static map of devices is useful, but for investigation, you need to see movement. To achieve this, we developed a tracker script. This script took a large fraction of the 8,000 known BSSIDs and began a high-frequency polling cycle. For one hour, it re-queried the location of each of these sampled devices every single minute. This intensive process transformed our static dataset into a rich, high-fidelity collection of real-world trajectories, forming the backbone of the "Crime Track" feature.

4. Storage, Querying, and Investigation
All of this spatio-temporal data was stored in a PostgreSQL database hosted on Supabase, using the PostGIS extension for efficient geographic queries. The final layer is the user interface and AI analyst.
The frontend is a modern Next.js application (page.tsx) featuring an interactive map built with Mapbox GL JS (mapbox.tsx).
The AI chatbot, powered by Cohere's Tool Use feature, allows an investigator to make natural language queries. The AI intelligently calls a custom Python function (_investigate_incident_tool) which in turn queries the PostGIS database for the precise devices that were in a specific place at a specific time, and presents the results to the user.

### The tech stack

- **Backend**: Python, Flask, PostgreSQL with PostGIS, Psycopg2
- **Frontend**: Next.js 15 (with Turbopack), React 19, TypeScript, Mapbox GL JS, Tailwind CSS, shadcn/ui
- **AI & Data**: Cohere for the AI chatbot
- **Infrastructure & DevOps**: Supabase for the managed PostgreSQL database

## Challenges we ran into

- Reverse-Engineering Apple's API: The biggest hurdle was interacting with Apple's undocumented WPS. It required deep inspection of network traffic to replicate the Protocol Buffer format and request headers. Furthermore, the API was unreliable, forcing us to build a robust exponential backoff system (apple_locator.py) to handle random failures and prevent data loss during our high-frequency tracking.

- Achieving High-Frequency Tracking: Repeatedly polling the locations for thousands of devices every minute is a significant engineering challenge. We had to optimize our scripts and manage the requests carefully to avoid being rate-limited while ensuring we captured a smooth, continuous picture of movement.

- Making AI Actionable: Simply having a chatbot isn't enough. We needed it to interact with our specific dataset. The challenge was implementing Cohere's Tool Use feature effectively. This involved writing a precise tool definition, creating a Python function that could be called by the model, and ensuring the data passed between the LLM and our database was correctly formatted.

- Frontend Complexity: Building a highly interactive, map-centric application is non-trivial. We had to manage complex state between the map viewport, the search components, and the data filtering panels, ensuring a smooth and responsive user experience in a resizable layout (resizable-layout.tsx).

## Accomplishments that we're proud of

- Building a Massive Geolocation Pipeline: We successfully built a resilient data ingestion pipeline that can query an undocumented API at scale. The ability to turn one BSSID into 400 nearby ones is a massive force multiplier, and we're proud of the engineering that went into making this process reliable.

- Executing Real-World Device Tracking: Our proudest accomplishment is the successful execution of the live tracking phase. We built a system that could actively monitor and record the real-world movements of hundreds of devices simultaneously, generating a unique and powerful dataset for investigation.

- Creating a True AI Analyst: We successfully integrated a Cohere-powered LLM that goes beyond simple chat. By using Tool Use, our chatbot acts as an intelligent data analyst, allowing non-technical users to perform complex spatio-temporal queries using plain English.

## What we learned

This project was a deep dive into the practical challenges of large-scale data engineering. Generating hundreds of thousands of location pings was just the first step; managing, querying, and visualizing that data proved to be a significant undertaking. We learned that with a massive spatio-temporal dataset, naive queries are unacceptably slow, making database performance paramount. This underscored the importance of proper database indexing, specifically with PostGIS's GIST indexes, and writing efficient SQL to query by both location and time simultaneously. We also encountered significant bottlenecks in transferring and rendering the data on the frontend. Sending hundreds of thousands of points to a web browser is not feasible, which taught us to design our backend API to be intelligent, performing the heavy lifting of filtering and aggregation on the server side. This ensures that the frontend only has to render data relevant to the user's view, preventing the map from freezing. Finally, we learned about the complexity of maintaining data integrity at scale. Ingesting data at high frequency requires atomic database transactions to prevent partial writes and robust error handling to deal with API failures without corrupting the dataset. Managing this volume of data taught us to think defensively about every step of the data pipeline.

## What's next for Sauron

Moving forward, our primary focus is on enhancing the platform's accuracy and reliability. To increase the richness of our data, our next step is to integrate additional data sources, exploring implementations similar to Geospy to fuse location data from multiple providers and create a more comprehensive picture of device movements. We also plan to engage directly with potential customers in law enforcement and private investigative sectors to ensure our development aligns with their real-world needs and workflows. To make the platform more bulletproof against future changes to the undocumented APIs we rely on, we will build a dedicated iOS emulator. This controlled environment will allow us to safely analyze the API's behavior in-depth, ensuring our data ingestion process remains stable and reliable for the long term.