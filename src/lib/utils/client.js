import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import dotenv from 'dotenv';
import { me } from "./utils.js";

dotenv.config();

let token = process.env.TOKEN;

/**
 * Pass the name of the token variable as argument
 */
if (process.argv.length > 2) {
    token = process.env[process.argv[2]];
}

const client = new DeliverooApi(
    process.env.URL || `http://localhost:8080`,
    token,
);
export const askPartnerId = (partnerName) => client.shout(partnerName).then(console.log);
export const passOwnId = (partnerId) => client.say(partnerId, me.id);
export default client;