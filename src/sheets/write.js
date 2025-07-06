import { google } from "googleapis";
import authorize from "./authorize.js";

import mongoose from "mongoose";
import Item from "../mongoose/schema/Item.js";
import items from "../../data/items.json" with { type: "json" };

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

import { setTimeout as Delay } from "timers/promises";

import "dotenv/config";
import dayRollingStats from "./stats/dayRolling.js";

const { SHEET_ID } = process.env;

/**
 * Pulls market data from MongoDB and writes to Google Sheet.
 * @param {[number, string]} timePeriod The time period for which to write to sheet
 * @param {number} [offset=1] The number of `timePeriod` in the past to fetch logs
 */
export default async function writeToSheet([period, granularity], offset=1) {
    const auth = await authorize();

    // Attach to Google Sheets API
    const sheets = google.sheets({ version: "v4", auth });

    const targetDate = {
        live: dayjs.utc()
            .subtract(dayjs.utc().get(granularity) % period, granularity) // Roll back to the start of the current period
            .subtract(offset * period, granularity) // Subtract offset * period
            .startOf(granularity),
        day: dayjs.utc()
            .subtract(dayjs.utc().get(granularity) % period, granularity) // Roll back to the start of the current period
            .subtract(24, "h") // Subtract 24 hours
            .startOf(granularity)
    };

    const values = {
        live: [],
        day: []
    }
    
    for (let itemId = 0; itemId < items.length; itemId ++) {
        const model = mongoose.model(`item${itemId}`, Item, `item${itemId}`);

        // Get live market data
        const data = await model.findOne({ date: targetDate.live.toDate() });
        values.live.push([
            `item${itemId}`,
            items[itemId],
            data?.avg,
            data?.stdev,
            data?.med,
            data?.num
        ]);

        // Get 24-hour rolling statistics
        const dayStats = await dayRollingStats(model, targetDate);
        values.day.push([
            `item${itemId}`,
            items[itemId],
            dayStats.avg,
            dayStats.stdev,
            dayStats.num
        ]);

        await Delay(500);
    }

    // Prepare data payload
    const data = [
        {
            range: `'Live Market'!A2:F${items.length+1}`,
            values: values.live
        },
        {
            range: `'Live Market'!I6`,
            values: [[targetDate.live.toString()]]
        },
        {
            range: `'Live Market'!I7`,
            values: [[targetDate.live.add(period, granularity).toString()]]
        },
        {
            range: `'24-hour Rolling'!A2:E${items.length+1}`,
            values: values.day
        },
        {
            range: `'24-hour Rolling'!I6`,
            values: [[targetDate.day.toString()]]
        },
        {
            range: `'24-hour Rolling'!I7`,
            values: [[targetDate.day.add(1, "d").toString()]]
        }
    ];

    const resource = {
        data,
        valueInputOption: "USER_ENTERED"
    }

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource
    });
}