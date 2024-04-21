
import { parcels, distance, me, configs, carriedParcels, findClosestDelivery, decayIntervals } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import client from '../../utils/client.js';

// TODO: update the reward based on the time passed

let parcelScoreInterval = null;
let carriedParcelsScoreInterval = null;

/**
 * Options generation and filtering function
 */
export function parcelsLoop(new_parcels) {
    /**
     * Update the score of the parcels, if the score reaches 0, delete it from the map.
     * Update the reward for the intention as well.
     */
    if (!parcelScoreInterval) {
        parcelScoreInterval = setInterval(() => {
            parcels.forEach((parcel) => {
                parcel.reward = Math.max(0, parcel.reward - 1)
                if (parcel.reward == 0)
                    parcels.delete(parcel.id)
                updateIntentionScore(parcel, parcel.reward * 2 - distance(parcel, me))
            });
        }, decayIntervals[configs.PARCEL_DECADING_INTERVAL])
    }
    if (!carriedParcelsScoreInterval) {
        /**
         * Update the score of the carried parcels
         */
        carriedParcelsScoreInterval = setInterval(() => {
            updateCarriedParcelsScore()
        }, decayIntervals[configs.PARCEL_DECADING_INTERVAL])
    }

    // updateCarriedParcelsScore()

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

/**
 * Update the intention score for the parcel (if the parcel has a new score, so that the agent can reconsider)
 */
function updateIntentionScore(parcel, newScore) {
    agent.changeIntentionScore('go_pick_up', [parcel], newScore)
}

/**
 * Remove parcels that are in observation range, are in the map but are not in the new_parcels list (so they disappeared)
 */
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

/**
 * Add parcels that are in the observation range, but not in the parcels map.
 */
function addNewParcels(new_parcels) {
    new_parcels = new_parcels.filter(parcel => !parcels.has(parcel.id))
    for (const parcel of new_parcels) {
        parcel.discovery = Date.now()
        parcels.set(parcel.id, parcel)
    }
}

/**
 * Find the best parcel to pick up (based on distance, for now)
 */
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
                score: parcel.reward - distance(parcel, me)
            });
        }
    }

    // let best_parcel = findBestParcel(options)
    for (const parcel of options.values()) {
        agent.push({ desire: parcel.desire, args: parcel.args, score: parcel.score })
    }
    if (options.size == 0) {
        agent.push({ desire: 'go_random', args: [], score: 1 })
    }

    /**
     * Best option is selected
     */
    // console.log('best_option', best_parcel)
    // // if (best_parcel)
    // else
    //     agent.push({ desire: 'go_random', args: [], score: 1 })
}

function updateCarriedParcelsScore() {
    let sumScore = carriedParcels.reduce((previous, current, index) => previous + current.reward, 0)
    let closestDelivery = findClosestDelivery()
    if (sumScore > 0)
        console.log('updateCarriedParcelsScore', sumScore - closestDelivery.distance, sumScore, closestDelivery.distance)
    agent.changeIntentionScore('go_deliver', [], sumScore - Math.floor(closestDelivery.distance / 2))
}