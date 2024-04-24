
import { parcels, distance, me, configs, carriedParcels, findClosestDelivery, decayIntervals } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

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
                updateIntentionScore(parcel, parcel.reward * 2 - distance(parcel, me), parcel.id)
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
function updateIntentionScore(parcel, newScore, id) {
    agent.changeIntentionScore('go_pick_up', [parcel], newScore, id)
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
                updateIntentionScore(parcel, -1, parcel.id) // Drop the intention
            } else { // If the parcel exists, update it
                parcels.set(parcel.id, new_parcels.get(parcel.id))
                updateIntentionScore(parcel, parcel.reward * 2 - distance(parcel, me), parcel.id)
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
                score: parcel.reward - distance(parcel, me),
                id: id
            });
        }
    }

    for (const parcel of options.values()) {
        if (parcel.score > 0) {
            agent.push({ desire: parcel.desire, args: parcel.args, score: parcel.score, id: parcel.id })
        }
    }
    if (options.size == 0) {
        agent.push({ desire: 'go_random', args: [], score: 1, id: 'go_random' })
    }

}

export function updateCarriedParcelsScore() {
    let sumScore = carriedParcels.reduce((previous, current, index) => previous + current.reward, 0)
    if (sumScore > 0) {
        decidePickupOrDeliver(sumScore, carriedParcels);
    }
}

function decidePickupOrDeliver(sumScore, carriedParcels) {
    const lowestValuedParcel = carriedParcels.reduce((previous, current) => previous.reward < current.reward ? previous : current, carriedParcels[0]);

    const nextParcel = Array.from(parcels.values()).reduce((previous, current) => previous.reward > current.reward ? previous : current, parcels.values().next().value);

    if (!nextParcel) {
        agent.push({ desire: 'go_deliver', args: [], score: sumScore, id: 'go_deliver' })
        return;
    }

    const distanceToParcel = distance(me, nextParcel);
    const distanceParcelToDelivery = findClosestDelivery(null, nextParcel).distance;

    const totalDistance = distanceParcelToDelivery + distanceToParcel;
    const decayIterval = parseInt((configs.PARCEL_DECADING_INTERVAL).split('s')[0])

    const futureDeliveredReward = lowestValuedParcel.reward - (totalDistance * decayIterval);

    const futurePickUpReward = lowestValuedParcel.reward - (distanceToParcel * decayIterval);


    if (totalDistance > futureDeliveredReward) {
        agent.push({ desire: 'go_deliver', args: [], score: sumScore, id: 'go_deliver' })
    } else {
        agent.push({ desire: 'go_pick_up', args: [lowestValuedParcel], score: sumScore + futurePickUpReward, id: 'go_pick_up' })

    }
}

// get distance to next parcel and distance to closest delivery
