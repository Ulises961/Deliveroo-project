import Agent from './lib/agents/Agent.js';
import GoPickUp from './lib/plans/GoPickUp.js';
import BlindMove from './lib/plans/BlindMove.js';
import {parcels, me, distance, plans} from "./lib/utils/utils.js";
import client from './lib/utils/client.js';
import GoTo from './lib/plans/GoTo.js';

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

function agentLoop(parcels) {
    console.log( 'index.agentLoop',parcels);
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
        if (option.desire !== 'go_pick_up') continue;
        let parcel = option.args[0];
        const distanceToTarget = distance( me, parcel );
        if ( distanceToTarget < best_distance ) {
            best_option = option;
            best_distance = distanceToTarget;
        }
    }
    
    /**
     * Revise/queue intention 
     */

    if ( best_option )
        myAgent.push( {desire: best_option.desire, args: best_option.args} );

}

client.onParcelsSensing( agentLoop )
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )



const myAgent = new Agent();
myAgent.loop();


plans.push( new GoPickUp())
plans.push( new BlindMove())
plans.push( new GoTo())
