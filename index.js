import "dotenv/config";
import fetchMarketData from "./src/scraper/fetch.js";
import connectDB from "./src/mongoose/connect.js";

await connectDB();

await fetchMarketData([4, "h"], 1);

process.exit(1);