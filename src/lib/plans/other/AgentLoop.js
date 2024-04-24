
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
        // !WARNING: is the value being updated already during the parcelSensing? If so, the value is being decreased twice.
        parcelScoreInterval = setInterval(() => {
            parcels.forEach((parcel) => {
                let secondsPassed = (Date.now() - parcel.discovery) / 1000 // Seconds passed since the parcel was discovered
                let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL] / 1000; // Convert to seconds
                // The new reward is the old reward minus the number of seconds passed divided by the decay interval. This is because if the decay is 2 seconds and 6 seconds have passed, the new reward should be oldReward - (6 / 2) = oldReward - 3
                let decayedReward = Math.floor(parcel.reward - (secondsPassed / decay))

                parcel.reward = decayedReward
                if (parcel.reward <= 0)
                    parcels.delete(parcel.id)
                updateIntentionScore(parcel, computeParcelScore(parcel), parcel.id)
                // console.log(parcels)
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
        if (distance(parcel, me) < configs.PARCELS_OBSERVATION_DISTANCE) {
            // If the parcel doesn't exists anymore
            if (!new_parcels.includes(parcel.id)) {
                parcels.delete(parcel.id)
                updateIntentionScore(parcel, -1, parcel.id) // Drop the intention
            } else { // If the parcel exists, update it
                parcels.set(parcel.id, new_parcels.get(parcel.id))
                updateIntentionScore(parcel, computeParcelScore(parcel), parcel.id)
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
                score: computeParcelScore(parcel),
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
    let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL] / 1000; // Convert to seconds

    let sumScore = carriedParcels
        .reduce((previous, current, index) =>
            previous + Math.max(current.reward - ((Date.now() - current.pickupTime) / 1000 * decay), 0)
            , 0)
    if (sumScore > 0) {
        let score = Math.max(computeDeliveryScore(sumScore, carriedParcels), 0)
        console.log('updateCarriedParcelsScore', carriedParcels, score)
        agent.changeIntentionScore('go_deliver', carriedParcels, score, 'go_deliver')
    }
}

/**
 * futureDeliveryReward = [Sum of carried] - ([distance from delivery] * [decay] * [number of parcels])
 * pickupAndDeliver = ( [sum of carried] + [best parcel]) - ([distance from best] * [number of parcels] * [decay] + [distance from best to delivery] * [num of carried + 1] * [decay])
 */
function computeDeliveryScore(sumScore, carriedParcels) {
    let distanceToDelivery = findClosestDelivery(null, me).distance;
    let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL]; // Convert to seconds
    let decayRate = configs.MOVEMENT_DURATION / decay;
    return sumScore - (distanceToDelivery * decayRate * carriedParcels.length);
}

/**
 * futureDeliveryReward = [Sum of carried] - ([distance from delivery] * [decay] * [number of parcels])
 * pickupAndDeliver = ( [sum of carried] + [best parcel]) - ([distance from best] * [number of parcels] * [decay] + [distance from best to delivery] * [num of carried + 1] * [decay])
 */
function computeParcelScore(parcel) {
    let distanceToParcel = distance(me, parcel);
    let distanceParcelToDelivery = findClosestDelivery(null, parcel).distance;
    let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL]; // Convert to seconds
    let decayRate = configs.MOVEMENT_DURATION / decay;

    let sumOfCarried = carriedParcels.reduce((previous, current, index) => previous + current.reward, 0);


    // Reward from the carried parcels + the reward from the parcel - the distance to the parcel, considering the decay of the parcels carried and the distance from the parcel to the delivery.
    // Basically, it finds the theoretical reward that is achieved by picking up the parcel and delivering it, considering the decay of the parcels carried and the distance to the delivery.
    let futureDeliveredReward = (sumOfCarried + parcel.reward) - (distanceToParcel * decayRate * carriedParcels.length + distanceParcelToDelivery * (carriedParcels.length + 1) * decayRate);

    return futureDeliveredReward;
}
