import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQzNDQ5Y2JhNzU0IiwibmFtZSI6InVsaSIsImlhdCI6MTcxMjYxMTY3OH0.Vbw7DAuxwfgeA7ZxsZlb76TkGviGakBLjZwqTv7-Nio'
);
export default client;