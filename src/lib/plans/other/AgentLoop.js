import { agent } from '../../utils/agent.js';
import { distance, me } from '../../utils/utils.js';

export function parcelsLoop(parcels) {
    console.log('index.agentLoop', parcels);
    /** 
     * TODO: In the options we need to include the option of delivery, 
     * of picking up other parcels, etc
     * Desires: go_pick_up, go_deliver, go_to, communicate, etc
    */

    /**
     * Options
     */
    const options = [];
    for (const [id, parcel] of parcels.entries()) {
        if (!parcel.carriedBy) {
            // Pick up parcels worth picking up
            if (distance(me, parcel) < parcel.reward) {
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
        const distanceToTarget = distance(me, parcel);
        if (distanceToTarget < best_distance) {
            best_option = option;
            best_distance = distanceToTarget;
        }
    }

    /**
     * Revise/queue intention 
     */

    if (best_option)
        agent.push({ desire: best_option.desire, args: best_option.args });
}