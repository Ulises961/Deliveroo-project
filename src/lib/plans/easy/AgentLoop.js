import { parcels, distance, me } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

/**
 * Options generation and filtering function
 */
export function parcelsLoop(new_parcels) {
    /**
    * If there are no new parcels, stop reconsidering
    */
    // let new_parcel = false;
    // for (const p of new_parcels) {
    //     if (!parcels.has(p.id)) {
    //         new_parcel = true;
    //     }
    //     parcels.set(p.id, p)
    // }
    // if (!new_parcel)
    //     return;
    parcels.clear()
    for (const p of new_parcels) {
        parcels.set(p.id, p)
    }

    chooseBestOption()
}

function findBestOption(options) {
    /**
     * Options filtering
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        if (option.desire == 'go_pick_up') {
            let current_d = distance(option.args[0], me)
            // console.log(current_d)
            if (current_d < nearest) {
                best_option = option
                nearest = current_d
            }
        }
    }
    return best_option
}

function chooseBestOption() {
    /**
    * Options generation
    */
    const options = []
    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy) {
            options.push({
                desire: 'go_pick_up',
                args: [parcel]
            });
        }
        // options.push(['go_pick_up', parcel.x, parcel.y, parcel.id, agent]);
    }

    let best_option = findBestOption(options)

    /**
     * Best option is selected
     */
    console.log('best_option', best_option)
    if (best_option)
        agent.push({ desire: best_option.desire, args: best_option.args })
    else
        agent.push({ desire: 'go_random', args: [] })
}