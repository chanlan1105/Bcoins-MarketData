import mongoose from "mongoose";
const { Schema } = mongoose;

export default new Schema({
    date: Date,
    avg: Number,
    stdev: Number,
    num: Number,
    med: Number,
    min: Number,
    max: Number
});