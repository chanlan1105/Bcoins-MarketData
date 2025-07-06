import { socket } from "../connection/socket.js";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

import Item from "../mongoose/Item.js";
import items from "../../data/items.json" with { type: "json" };
import { setTimeout as Delay } from "timers/promises";

/** If extended logging should be used */
const verbose = process.argv.slice(2).includes("--verbose");

/**
 * Fetches market data for each item, processes transaction logs, calculates statistics,
 * and saves the results to the database. Iterates through all items, paginates through
 * transaction logs, aggregates sales data by price, and computes average price and standard deviation.
 * 
 * @async
 * @param {[number, string]} timePeriod The time period for which to fetch logs
 * @param {number} [offset=1] The number of `timePeriod` in the past to fetch logs
 * @param {string | number} [item="all"] The item to fetch logs for (default `all`). Pass a valid Bcoins item ID or keyword `all`.
 * @returns {Promise<void>} Resolves when all market data has been fetched and saved.
 */
export default async function fetchMarketData([period, granularity], offset=1, item="all") {
    if (!socket.connected) {
        return console.log("Socket not connected");
    }

    /** Start item ID */
    const start = item == "all" ? 0 : item;
    /** End item ID */
    const end = item == "all" ? items.length : item + 1;

    /** Start date for fetching logs */
    const startDate = dayjs.utc()
        .subtract(dayjs.utc().get(granularity) % period, granularity) // Roll back to the start of the current period
        .subtract(offset * period, granularity) // Subtract offset * period
        .startOf(granularity);
    /** End date for fetching logs */
    const endDate = startDate.add(period, granularity);

    for (let itemId = start; itemId < end; itemId++) {
        const data = {};
        let page = 1;

        /** Whether or not to continue searching */
        let search = true;

        do {
            // Get logs for this page
            const logs = (await socket.emitWithAck("dataFetch",
                {
                    "type": "richLogsByIdType",
                    "idType": "itemId",
                    "id": itemId,
                    "page": page
                }
            )).filter(({ gameLog: { type } }) => type == "marketItemTransaction");

            // Increment page
            page ++;

            // Wait 500ms between each page to avoid spamming the server
            await Delay(500);

            // Check if all these listings are too recent or if this page contains no market item transactions.
            if (logs.length === 0 || dayjs.utc(logs.slice(-1)[0].gameLog.date).isSameOrAfter(endDate)) continue;

            // Loop through this page logs and save to object
            for (const { gameLog: { data: { amount, listingPrice }, date }} of logs) {
                // Break out of loop if we have reached listings that are too old.
                if (dayjs.utc(date).isBefore(startDate)) {
                    search = false;
                    break;   
                }

                // Skip if this listing is too recent.
                if (dayjs.utc(date).isSameOrAfter(endDate)) {
                    continue;
                }
                
                data[listingPrice] ??= 0;
                data[listingPrice] += amount;
            }
        } 
        while (search && page <= 20);

        // Compute data sorted by listing price
        const sortedData = Object.entries(data)
            .map(([listingPrice, amount]) => [Number(listingPrice), amount])
            .sort(([price_a], [price_b]) => price_a - price_b);

        // Calculate statistics
        const sum = Object.entries(data).reduce((total, [price, count]) => total + price * count, 0);
        const numItemsSold = Object.values(data).reduce((total, current) => total + current, 0);
        const avg = numItemsSold === 0 ? 0 : sum / numItemsSold;
        const sumSqDiff = Object.entries(data).reduce((total, [price, count]) => total + count * (price - avg) ** 2, 0);
        const variance = numItemsSold === 0 ? 0 : sumSqDiff / numItemsSold;

        // Calculate min and max
        const prices = Object.keys(data).map(p => Number(p));
        const min = numItemsSold == 0 ? 0 : Math.min(...prices);
        const max = numItemsSold == 0 ? 0 : Math.max(...prices);

        // Calculate median
        const midpoint = (numItemsSold + 1) / 2;
        const med = numItemsSold == 0 ? 0 : sortedData.reduce((total, [price, amount], index) => {
            total += amount;

            if (total >= midpoint) {
                // Passed the midpoint, we've found our median.
                sortedData.splice(1);
                return price;
            }
            else if (total == Math.floor(midpoint)) {
                // Even number of listing sold and we've landed exactly on the lower bound of the midpoint.
                // The median is the average between this price and the next.
                const _med = (price + sortedData[index+1][0]) / 2;
                sortedData.splice(1);
                return _med;
            }

            // Otherwise, accumulate total
            return total;
        }, 0);

        // Save to database
        const model = mongoose.model(`item${itemId}`, Item, `item${itemId}`);
        await model.findOneAndUpdate({
            // Query
            date: {
                $gte: startDate.toDate(),
                $lt: endDate.toDate()
            }
        }, {
            // Data payload
            date: startDate.toDate(),
            avg,
            stdev: Math.sqrt(variance),
            num: numItemsSold,
            med,
            min,
            max
        }, {
            // Upsert = replace if existing, otherwise create new document
            upsert: true
        });

        // Logging
        if (verbose && (itemId - start + 1) % 5 == 0) {
            console.log(`Logged ${itemId - start + 1} of ${end - start} items`);
        }

        // Wait 2 seconds between each item to avoid spamming server
        await Delay(2000);
    }

    console.log("Saved to database!");
}