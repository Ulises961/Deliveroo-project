import { agent } from '../utils/agent.js';
import client from '../utils/client.js';
import { agentsMap, carriedParcels, configs, decayIntervals, distance, findClosestDelivery, getAgentsMap, isCellReachable, logDebug, me, parcels, partner } from '../utils/utils.js';

let parcelScoreInterval = null;

export let carriedParcelsScoreInterval = null;

/**
 * List of parcels that have been "booked" by the other agent, do not consider them in the decision making
 */
export let blacklist = []

let sharedParcels = []

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
            parcels.forEach(async (parcel) => {
                if (configs.PARCEL_DECADING_INTERVAL == 'infinite') {
                    updateIntentionScore(parcel, computeParcelScore(parcel), parcel.id)
                    return;
                }

                let msPassed = Date.now() - parcel.discovery /** Milliseconds passed since the parcel was discovered */
                let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL]; /** Convert to seconds */

                /** The new reward is the old reward minus the number of seconds passed divided by the decay interval. 
                 * This is because if the decay is 2 seconds and 6 seconds have passed, 
                 * the new reward should be oldReward - (6 / 2) = oldReward - 3 */
                let decayedReward = Math.floor(parcel.originalReward - (msPassed / decay))

                parcel.reward = decayedReward
                if (parcel.reward <= 0)
                    parcels.delete(parcel.id)
                updateIntentionScore(parcel, computeParcelScore(parcel), parcel.id)
            });
        }, configs.CLOCK)
    }

    if (!carriedParcelsScoreInterval) {
        /**
         * Update the score of the carried parcels
         */
        carriedParcelsScoreInterval = setInterval(async () => {
            updateCarriedParcelsScore()
        }, configs.CLOCK)
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

    /**
     * Send the parcels to the other agent
     */
    sendMemory()
}

/**
 * Update the intention score for the parcel (if the parcel has a new score, so that the agent can reconsider)
 */
function updateIntentionScore(parcel, newScore, id) {
    agent.changeIntentionScore('go_pick_up', [parcel], newScore, id)
}

/**
 * Remove parcels that are in observation range, are in the map but are not in the new_parcels list 
 * (so they disappeared, or they have been taken)
 */
async function removeOldParcels(new_parcels) {
    let oldParcels = parcels.values()

    for (const parcel of oldParcels) {
        if (carriedParcels.find(p => p.id === parcel.id)) {
            parcels.delete(parcel.id)
            continue; // Skip carried parcels (they are not in the map anymore)
        }
        // If the parcel is in the observation range
        if (distance(parcel, me) < configs.PARCELS_OBSERVATION_DISTANCE) {
            // If the parcel doesn't exists anymore
            if (!new_parcels.some(new_parcel => new_parcel.id == parcel.id)) {
                parcels.delete(parcel.id)
                updateIntentionScore(parcel, -1, parcel.id) // Drop the intention
            } else { // If the parcel exists, update it
                let newParcel = new_parcels.find(new_parcel => new_parcel.id === parcel.id)
                // If the parcel is being carried, remove it from the map
                if (newParcel.carriedBy) {
                    parcels.delete(parcel.id);
                    updateIntentionScore(parcel, -1, parcel.id) // Drop the intention
                    continue;
                }
                newParcel.discovery = Date.now()
                newParcel.originalReward = newParcel.reward
                parcels.set(parcel.id, newParcel)
                updateIntentionScore(parcel, computeParcelScore(newParcel), parcel.id)
            }
        }
    }
}

/**
 * Add parcels that are in the observation range, but not in the parcels map.
 */
function addNewParcels(new_parcels) {
    new_parcels = new_parcels.filter(parcel => !blacklist.includes(parcel.id) && !parcels.has(parcel.id) && !parcel.carriedBy && isCellReachable(parcel.x, parcel.y))

    for (const parcel of new_parcels) {
        parcel.discovery = Date.now()
        parcel.originalReward = parcel.reward
        parcels.set(parcel.id, parcel)
    }
}

function chooseBestOption() {
    const options = new Map();
    for (const [id, parcel] of parcels.entries()) {
        if (!parcel.carriedBy && !blacklist.includes(id)) {
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

function sumCarriedParcels() {
    return carriedParcels
        .reduce((previous, current, index) => {
            if (configs.PARCEL_DECADING_INTERVAL == 'infinite')
                return previous + current.reward
            let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL];
            let msPassed = Date.now() - current.pickupTime

            let newReward = current.reward - (msPassed / decay)

            return previous + Math.max(newReward, 0)
        }, 0);
}

export function updateCarriedParcelsScore() {
    // let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL] / 1000; // Convert to seconds
    carriedParcels.forEach(parcel => parcels.delete(parcel.id))

    let sumScore = sumCarriedParcels()
    if (sumScore > 0) {
        let score = Math.max(computeDeliveryScore(sumScore, carriedParcels), 0)
        agent.changeIntentionScore('go_deliver', carriedParcels, score, 'go_deliver')
    }
}

export function getDeliveryScore() {
    let sumScore = sumCarriedParcels()
    if (sumScore > 0) {
        return Math.max(computeDeliveryScore(sumScore, carriedParcels), 0)
    }
    return 0;
}


/**
 * Assign a score to the delivery point, based on the distance to the delivery and the decay of the carried parcels
 */
function computeDeliveryScore(sumScore, carriedParcels) {
    if (configs.PARCEL_DECADING_INTERVAL == 'infinite')
        return sumScore
    let distanceToDelivery = findClosestDelivery([], me).distance;
    let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL];
    let decayRate = configs.MOVEMENT_DURATION / decay;
    return sumScore - (distanceToDelivery * decayRate * carriedParcels.length);
}

/**
 * Compute the score of the parcel, based on the distance to the parcel, 
 * the decay of the parcels carried, and the distance to the delivery
 */
export function computeParcelScore(parcel) {
    /** In case the decay interval is infinite, prioritize the closest parcels.
     * 1 / distance: The closer the parcel, the higher the score
     * 1 - (1 / distance): The closer the parcel, the lower the score subtracted from the reward
    */
    if (configs.PARCEL_DECADING_INTERVAL == 'infinite')
        return parcel.reward + sumCarriedParcels() - (1 - (1 / Math.max(distance(me, parcel), 1)));

    let distanceToParcel = distance(me, parcel);
    let distanceParcelToDelivery = findClosestDelivery([], parcel).distance;
    let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL]; // Convert to seconds
    const DECAY_IMPORTANCE = 2; // The importance of the decay in the score
    let decayRate = (configs.MOVEMENT_DURATION * 2 * DECAY_IMPORTANCE) / decay;

    let sumOfCarried = sumCarriedParcels();

    /** Basically, it finds the theoretical reward that is achieved
     *  by picking up the parcel and delivering it, considering the 
     * decay of the parcels carried and the distance to the delivery. 
     */
    let futureSumOnParcelSpot = sumOfCarried - distanceToParcel * decayRate * carriedParcels.length
    let futureRewardOnDeliery = futureSumOnParcelSpot + parcel.reward - distanceParcelToDelivery * (carriedParcels.length + 1) * decayRate;

    return futureRewardOnDeliery;
}

/**
 * Send the parcels information to the other agent,
 * so that they can be coordinated
 */
function sendMemory() {
    // The partner doesn't exist
    if (!partner.id)
        return;

    let parcelsToShare = [...parcels.values()].filter(parcel => !parcel.shared)

    parcelsToShare = parcelsToShare.filter(parcel => !sharedParcels.includes(parcel.id))

    let agentsToShare = getAgentsMap()

    if (parcelsToShare.length == 0)
        return;

    sharedParcels.push(...parcelsToShare.map(parcel => parcel.id))

    let message = {
        type: 'parcels',
        parcels: parcelsToShare,
        agents: agentsToShare,
        position: me
    }
    client.say(partner.id, JSON.stringify(message))
}

/**
 * Receive info from the other agent, so that they can be coordinated
 */
client.onMsg((id, name, msg, reply) => {
    if (partner.id === null) {
        return;
    }
    if (id !== partner.id)
        return;
    let message = null;
    try {
        message = JSON.parse(msg)
    } catch (e) {
        return;
    }

    if (!message)
        return;

    partner.position = message.position;

    //Add the new parcels to the map 
    if (message.type === 'parcels') {
        let new_parcels = message.parcels
        new_parcels.forEach(parcel => {
            parcel.shared = true;
        })
        addNewParcels(new_parcels)

        if (new_parcels.agents) {
            new_parcels.agents.forEach(agent => {
                agent.shared = true;
                agentsMap.set(agent.id, agent);
            })
        }
                
        // Remove the parcel from the map if the other agent is picking it up
    } else if (message.type === 'pick_up') {

        let otherAgentDistance = distance(message.position, message.parcel);
        let thisAgentDistance = distance(me, message.parcel);

        logDebug(3, 'Received pick up message; this agent distance', thisAgentDistance, 'other agent distance', otherAgentDistance, 'theorical score', computeParcelScore(message.parcel), 'current intention score:', agent.intention_queue[0].score, 'isCurrentIntention:', agent.intention_queue[0].id === message.parcel.id, 'pick up:', thisAgentDistance > otherAgentDistance);

        /** 
         * If the other agent is closer, or the score of the parcel 
         * is lower than the score of the current intention, or the 
         * cell is not reachable, let the other have it 
         * */
        if (thisAgentDistance > otherAgentDistance ||
            !isCellReachable(message.parcel.x, message.parcel.y)) {

            let parcelId = message.parcel.id
            blacklist.push(parcelId)
            updateIntentionScore(null, -1, parcelId)
            if (parcels.has(parcelId)) {
                parcels.delete(parcelId)
            }
            reply('yes')
            return;
        }
        reply('no')
        updateIntentionScore(message.parcel, computeParcelScore(message.parcel), message.parcel.id)
    }
});
