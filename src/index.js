import { map, deliveryPoints, validCells, updateMe, configs, carriedParcels, decayIntervals } from "./lib/utils/utils.js";
import { agent } from "./lib/utils/agent.js";
import client from './lib/utils/client.js';
import { parcelsLoop } from './lib/plans/other/AgentLoop.js'
import './lib/plans/other/Library.js'

/**
 * Belief revision function
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
    })

    newMap.forEach(tile => {
        if (tile.delivery) {
            deliveryPoints.push({ x: tile.x, y: tile.y })
        }
    });

    newMap.forEach(tile => {
        if (!tile.fakeFloor) {
            validCells.push(tile)
        }
    });
})

client.onConfig(config => {
    configs.AGENTS_OBSERVATION_DISTANCE = config.AGENTS_OBSERVATION_DISTANCE;
    configs.PARCELS_OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE;
    configs.PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL;

    if (configs.PARCEL_DECADING_INTERVAL === 'infinite')
        return;
    setInterval(() => {
        carriedParcels.forEach(p => p.reward -= 1);
    }, decayIntervals[configs.PARCEL_DECADING_INTERVAL]);
})

await updateMe();



/**
 * BDI loop
 */


client.onParcelsSensing(parcelsLoop)

agent.loop();

