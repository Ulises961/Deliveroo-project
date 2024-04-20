
import { parcels, distance, me } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

/**
 * Options generation and filtering function
 */
export function parcelsLoop(new_parcels) {
    /**
    * If there are no new parcels, stop reconsidering
    */
    let new_parcel = false;
    for (const p of new_parcels) {
        if (!parcels.has(p.id)) {
            new_parcel = true;
        }
        parcels.set(p.id, p)
    }
    if (!new_parcel)
        return;
    // parcels.clear()
    // for (const p of new_parcels) {
    //     parcels.set(p.id, p)
    // }

    chooseBestOption()
}

function findBestOption(options) {
    /**
     * Options filtering
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options.values()) {
        if (option.desire == 'go_pick_up') {
            let current_d = distance(option.args[0], me)
            console.log(current_d)
            if (current_d < nearest && current_d < option.args[0].reward) {
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
    const options = new Map();
    for (const [id, parcel] of parcels.entries()) {
        if (!parcel.carriedBy) {
            options.set(id, {
                desire: 'go_pick_up',
                args: [parcel],
                score: 10
            });
        }
    }

    let best_option = findBestOption(options)
    if (!options.size !== 0 && best_option?.args)
        options.delete(best_option.args[0].id);
    /**
     * Best option is selected
     */
    console.log('best_option', best_option)
    if (best_option)
        agent.push({ desire: best_option.desire, args: best_option.args, score: best_option.score })
    else
        agent.push({ desire: 'go_random', args: [], score: 1 })
}