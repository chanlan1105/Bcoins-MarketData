import dayjs from "dayjs";
import mongoose from "mongoose";

/**
 * Calculates 24-hour statistics for a given item.
 * @param {mongoose.Model} model The mongoose model to search
 * @param {dayjs.Dayjs} targetDate The start of the 24-hour period for which to compute statistics
 * @returns {Object} statistics The calculated statistics.
 * @returns {number} statistics.avg
 * @returns {number} statistics.stdev
 * @returns {number} statistics.num
 */
export default async function dayRollingStats(model, targetDate) {
    const data = await model.find({
        date: {
            $gte: targetDate.day,
            $lt: targetDate.day.add(24, "h")
        }
    });
    const numItemsSold = data.reduce((total, curr) => total += curr.num, 0);
    const avg = numItemsSold === 0 ? 0 : data.reduce((total, curr) => total += curr.avg * curr.num, 0) / numItemsSold;
    const variance = numItemsSold === 0 ? 0 : data.reduce((total, curr) => 
        total += curr.num * (curr.stdev ** 2 + (curr.avg - avg) ** 2)
    , 0) / numItemsSold;

    return {
        avg,
        num: numItemsSold,
        stdev: Math.sqrt(variance)
    };
}