import mongoose from "mongoose";
import "dotenv/config";

const { DB_USR, DB_PWD } = process.env;

export default async function connectDB() {
    return new Promise((resolve, reject) => {
        mongoose.connection.on("connected", () => {
            console.log("Connected to database!");
            resolve();
        });

        // Connect database
        mongoose.connect(`mongodb+srv://${DB_USR}:${DB_PWD}@aws.fmlb8qx.mongodb.net/market`).catch(reject);
    });
}
