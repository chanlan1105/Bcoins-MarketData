# Bconomy Market Data Scraper

Schedules cron-like job to pull market data every 4 hours and compute statistics.

Backend: Node.JS / TypeScript \
Database: NoSQL MongoDB \
Connection: Socket.IO WebSocket

## When cloning this repo
1. Install npm packages (`npm install`)
2. Create a `.env` file at the root of the project with three environment variables:
    * `DB_USR`: The MongoDB username
    * `DB_PWD`: The MongoDB password associated with `DB_USR`
    * `BC_TOKEN`: The Bconomy unique authentication token