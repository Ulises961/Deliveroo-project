import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const client = new DeliverooApi(
    process.env.URL || `http://localhost:8080`,
    process.env.TOKEN,
);
export default client;