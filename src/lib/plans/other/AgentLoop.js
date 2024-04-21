
import { parcels, distance, me, configs, carriedParcels, findClosestDelivery } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import client from '../../utils/client.js';

// TODO: update the reward based on the time passed

/**
 * Options generation and filtering function
 */
export function parcelsLoop(new_parcels) {
    /**
     * Update the score of the carried parcels
     */
    updateCarriedParcelsScore()

    /**
    * If there are no new parcels, stop reconsidering
    */
    removeOldParcels(new_parcels)

    /**
     * If there are new parcels, add them to the list
     */
    addNewParcels(new_parcels)

    /**
     * Choose the best option, which can be a parcel, the delivery, or a random walk
     */
    chooseBestOption()
}

function updateIntentionScore(parcel, newScore) {
    agent.changeIntentionScore('go_pick_up', [parcel], newScore)
}

function removeOldParcels(new_parcels) {
    let oldParcels = parcels.values()

    for (const parcel of oldParcels) {
        // If the parcel is in the observation range
        if (distance(parcel, me) <= configs.PARCELS_OBSERVATION_DISTANCE) {
            // If the parcel doesn't exists anymore
            if (!new_parcels.includes(parcel.id)) {
                parcels.delete(parcel.id)
                updateIntentionScore(parcel, -1) // Drop the intention
            } else { // If the parcel exists, update it
                parcels.set(parcel.id, new_parcels.get(parcel.id))
                updateIntentionScore(parcel, parcel.reward * 2 - distance(parcel, me))
            }
        }
    }
}

function addNewParcels(new_parcels) {
    new_parcels = new_parcels.filter(parcel => !parcels.has(parcel.id))
    for (const parcel of new_parcels) {
        parcel.discovery = Date.now()
        parcels.set(parcel.id, parcel)
    }
}

function findBestParcel(options) {
    /**
     * Options filtering
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options.values()) {
        if (option.desire == 'go_pick_up') {
            let current_d = distance(option.args[0], me)
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
                score: parcel.reward * 2 - distance(parcel, me)
            });
        }
    }

    let best_parcel = findBestParcel(options)


    // if (!options.size !== 0 && best_option?.args)
    //     options.delete(best_option.args[0].id);
    /**
     * Best option is selected
     */
    console.log('best_option', best_parcel)
    if (best_parcel)
        agent.push({ desire: best_parcel.desire, args: best_parcel.args, score: best_parcel.score })
    else
        agent.push({ desire: 'go_random', args: [], score: 1 })
}

function updateCarriedParcelsScore() {
    let sumScore = carriedParcels.reduce((previous, current, index) => previous + current.reward, 0)
    let closestDelivery = findClosestDelivery()
    if (sumScore > 0)
        console.log('updateCarriedParcelsScore', sumScore - closestDelivery.distance, sumScore, closestDelivery.distance)
    agent.changeIntentionScore('go_deliver', [], sumScore - closestDelivery.distance)
}