import {
    map, deliveryPoints, validCells, updateMe, configs, 
    GROUP, partner, me,
    updateAgentsMap, logDebug
} from "./lib/utils/utils.js";
import { agent } from "./lib/utils/agent.js";
import client, { askPartnerId, passOwnId } from './lib/utils/client.js';
import { parcelsLoop } from './lib/plans/other/AgentLoop.js'
import './lib/plans/other/Library.js'

/**
 * Belief revision function
 */

/**
 * Update the map with the new information
 * Additionally, update the delivery points and the valid cells
 */
client.onMap((w, h, newMap) => {
    for (let i = 0; i < w; i++) {
        map[i] = []
        for (let j = 0; j < h; j++) {
            map[i][j] = { x: i, y: j, fakeFloor: true, delivery: false }
        }
    }

    newMap.forEach(tile => {
        map[tile.x][tile.y] = tile
        map[tile.x][tile.y].fakeFloor = false

        validCells.push(tile)

        if (tile.delivery) {
            deliveryPoints.push({ x: tile.x, y: tile.y })
        }
    })
})

/**
 * Load configuration values
 * AGENTS_OBSERVATION_DISTANCE: the distance in which the agent can perceive other agents
 * PARCELS_OBSERVATION_DISTANCE: the distance in which the agent can perceive parcels
 * PARCEL_DECADING_INTERVAL: the interval in which the parcels reward decays
 * 
 * Additionally, the  parcels reward decays every interval, and if it reaches 0, the parcel is removed from the carriedParcels array
 */
client.onConfig(config => {
    configs.AGENTS_OBSERVATION_DISTANCE = config.AGENTS_OBSERVATION_DISTANCE;
    configs.PARCELS_OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE;
    configs.PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL;
    configs.MOVEMENT_DURATION = config.MOVEMENT_DURATION;
    configs.CLOCK = config.CLOCK;
})

/**
 * Perceive the agents near us, and update the agents array with the new information
 * The old data is erased
 */

updateAgentsMap();

// Update the agent's information necessary to communicate with the partner
await updateMe();

const partnerName = GROUP[0] === client.name ? GROUP[1] : GROUP[0];

// Both partners shout their names to each other only one hears the other. Then they communicate privately their ids
askPartnerId(partnerName);

// Handshake with the partner
client.onMsg((id, name, msg) => {
    if (name === partnerName && partner.id === null) {
        partner.id = id;
        partner.name = name;
        passOwnId(id);
        logDebug(2, `Received message from ${name} with id ${id}: ${msg}, partner id: ${partner.id}, partner name: ${partner.name}`);
    }
});


/**
 * BDI loop
 */

client.onParcelsSensing(parcelsLoop)

agent.loop();

