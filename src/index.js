import Agent from './lib/agents/Agent.js';
import GoPickUp from './lib/plans/other/GoPickUp.js';
import BlindMove from './lib/plans/other/BlindMove.js';
import {parcels, me, distance, plans, map} from "./lib/utils/utils.js";
import {agent} from "./lib/utils/agent.js";
import client from './lib/utils/client.js';
import GoTo from './lib/plans/other/GoTo.js';

/**
 * Belief revision function
 */

client.onMap((w, h, newMap) => {
    console.log('MAP RECEIVED', newMap)
    for (let i = 0; i < w; i++) {
        map[i] = []
        for (let j = 0; j < h; j++) {
            map[i][j] = {x: i, y: j, fakeFloor: true, delivery: false}
        }
    }

    newMap.forEach(tile => {
        map[tile.x][tile.y] = tile
        map[tile.x][tile.y].fakeFloor = false
    })

    console.log(map)
})

await new Promise (res => {
    client.onYou( ( {id, name, x, y, score} ) => {
        me.id = id
        me.name = name
        me.x = x
        me.y = y
        me.score = score
        res()
    } )
}) 

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )


/**
 * BDI loop
 */

import { parcelsLoop } from './lib/plans/easy/AgentLoop.js'

client.onParcelsSensing( parcelsLoop )

agent.loop();

import './lib/plans/easy/Library.js'