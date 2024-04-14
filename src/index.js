import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import Agent from './lib/agents/Agent.js';
import GoPickUp from './lib/plans/GoPickUp.js';
import BlindMove from './lib/plans/BlindMove.js';
import {parcels, me, distance} from "./lib/utils/utils.js";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA5ZmQ2NDllNzZlIiwibmFtZSI6Im1hcmNvIiwiaWF0IjoxNjc5OTk3Njg2fQ.6_zmgL_C_9QgoOX923ESvrv2i2_1bgL_cWjMw4M7ah4'
)

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

function agentLoop() {
    
    /** 
     * TODO: In the options we need to include the option of delivery, 
     * of picking up other parcels, etc
     * Desires: go_pick_up, go_deliver, go_to, communicate, etc
    */

    /**
     * Options
     */ 
    const options = [];
    for(const [id,parcel] of parcels.entries()) {
        if ( ! parcel.carriedBy ) {
            // Pick up parcels worth picking up
            if ( distance( me, parcel ) < parcel.reward ) {
                options.push({
                    desire: 'go_pick_up',
                    args: [parcel]
                });
            } 
        }
    }

    /**
     * TODO: Refactor calculation of best option choosing from different
     * types of options and desires 
     */
    /**
     * Select best intention
     */
    let best_option = null;
    let best_distance = Number.MAX_SAFE_INTEGER;
    for (const option of options) {
        if (desire !== 'go_pick_up') continue;
        let parcel = option.args[0];
        const distance = distance( me, parcel );
        if ( distance < best_distance ) {
            best_option = option;
            best_distance = distance;
        }
    }
    
    /**
     * Revise/queue intention 
     */

    if ( best_option )
        myAgent.queue( best_option.desire, ...best_option.args );

}

client.onParcelsSensing( agentLoop )
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )



const myAgent = new Agent();
myAgent.intentionLoop();


plans.push( new GoPickUp() )
plans.push( new BlindMove() )
