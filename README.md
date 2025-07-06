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
    * `SHEET_ID`: The ID of the Google Sheet to write to
3. Connect to Google Sheets API:
    * https://developers.google.com/workspace/sheets/api/quickstart/nodejs
    * Save OAuth credientials file as `credentials.json` at the root of the project

## Scheduling
You can use `pm2` to schedule this script to run every 4 hours. Use the built-in `npm` scripts.
```
npm run start
```
```
npm run stop
```