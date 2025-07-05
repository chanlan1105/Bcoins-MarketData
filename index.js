import mongoose from "mongoose";
import "dotenv/config";
import fetchMarketData from "./src/scraper/fetch.js";

const { DB_USR, DB_PWD } = process.env;

mongoose.connection.on("connected", () => {
    console.log("Database connected!");
});

// Connect database
await mongoose.connect(`mongodb+srv://${DB_USR}:${DB_PWD}@aws.fmlb8qx.mongodb.net/market`);

await fetchMarketData([4, "h"], 1);

process.exit(1);