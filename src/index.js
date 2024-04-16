import Agent from './lib/agents/Agent.js';
import GoPickUp from './lib/plans/other/GoPickUp.js';
import BlindMove from './lib/plans/other/BlindMove.js';
import {parcels, me, distance, plans} from "./lib/utils/utils.js";
import {agent} from "./lib/utils/agent.js";
import client from './lib/utils/client.js';
import GoTo from './lib/plans/other/GoTo.js';

/**
 * Belief revision function
 */

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

import { parcelsLoop } from './lib/plans/other/AgentLoop.js'

client.onParcelsSensing( parcelsLoop )

agent.loop();

import './lib/plans/other/Library.js'