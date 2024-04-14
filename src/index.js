import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import Agent from './lib/Agent.js';
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

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )
client.onParcelsSensing( async ( perceived_parcels ) => {
    for (const p of perceived_parcels) {
        parcels.set( p.id, p)
    }
} );

/**
 * BDI loop
 */

function agentLoop() {
    
    /**
     * Options
     */
    const options = [];
    for(const parcel of parcels.values()) {
        if ( ! parcel.carriedBy ) {
            // Pick up parcels worth picking up
            if ( distance( me, parcel ) < parcel.reward ) {
                options.push(parcel);
            } 
        }
    }

    /**
     * Select best intention
     */
    const best_intention = myAgent.intention_queue.reduce( (best, current) => {
        if ( current.score > best.score )
            return current;
        return best;
    }, null);

    
    /**
     * Revise/queue intention 
     */

    if ( best_intention )
        myAgent.queue( best_intention.desire, best_intention.args );

}

client.onParcelsSensing( agentLoop )
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )



const myAgent = new Agent();
myAgent.intentionLoop();

// client.onYou( () => myAgent.queue( 'go_to', {x:11, y:6} ) )

// client.onParcelsSensing( parcels => {
//     for (const {x, y, carriedBy} of parcels) {
//         if ( ! carriedBy )
//             myAgent.queue( 'go_pick_up', {x, y} );
//     }
// } )





/**
 * Plan library
 */
const plans = [];

plans.push( new GoPickUp() )
plans.push( new BlindMove() )
