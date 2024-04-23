import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import dotenv from 'dotenv';
import { me } from "./utils.js";

dotenv.config();

const client = new DeliverooApi(
    process.env.URL || `http://localhost:8080`,
    process.env.TOKEN,
);
export const askPartnerId = (partnerName) => client.shout(partnerName); 
export const passOwnId = (partnerId) => client.say(partnerId, me.id);
export default client;