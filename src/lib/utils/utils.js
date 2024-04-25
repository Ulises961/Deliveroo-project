import Plan from '../plans/Plan.js';
import client from './client.js';
/**
 * Calculates the distance between two points.
 * @param {Object} param0 The first point, with properties x and y.
 * @param {Object} param1 The second point, with properties x and y.
 * @returns {number} The distance between the two points.
 */
const distance = function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}

/**
 * Calculates the Euclidean distance between two points.
 * @param {Object} param0 The first point, with properties x and y.
 * @param {Object} param1 The second point, with properties x and y.
 * @returns {number} The distance between the two points.
 */
const euclideanDistance = function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

const findClosestDelivery = function findClosestDelivery(exception = null, startingPoint) {
    let closestDelivery = { point: null, distance: Infinity };
    deliveryPoints
    .filter(deliveryPoint =>  deliveryPoint.x !== exception?.x && deliveryPoint.y !== exception?.y) // Filter out the exception
        .reduce((acc, point) => { // Find the closest delivery point
            const dist = distance(startingPoint, point);
            if (dist < acc.distance) {
                acc.distance = dist;
                acc.point = point;
            }
            return acc;
        }, closestDelivery);
    return closestDelivery;
}
const validCells = [];
/**
 * @type Map<number, {}>
 */
const parcels = new Map();

const me = {};

/**
 * @type {[{x: number, y: number, delivery: boolean}]}
 */
const map = [[]]

const deliveryPoints = map.filter(cell => cell.delivery);
/**
 * @type array<Plan>
 */
const plans = [];
const MAX_NUM_MOVEMENT_RETRIES = 5;

const updateMe = async function updateMe() {
    return await new Promise(res => {
        client.onYou(({ id, name, x, y, score }) => {
            me.id = id
            me.name = name
            me.x = x
            me.y = y
            me.score = score
            // console.log('utils.updateMe', me)
            res(me);
        });
    })
};

const updateAgentsMap = async function updateAgentsMap() {
    return await new Promise(res => {
        client.onAgentsSensing(agents => {
            agents.forEach(agent => {
                agentsMap.set(agent.id, agent);
            });
            res(agentsMap);
        });
    })
};

const setCarriedParcelsInterval = function setCarriedParcelsInterval() {
    setInterval(() => {
        parcels.forEach((parcel) => {
            let msPassed = Date.now() - parcel.discovery // Milliseconds passed since the parcel was discovered
            let decay = decayIntervals[configs.PARCEL_DECADING_INTERVAL]; // Convert to seconds
            // The new reward is the old reward minus the number of seconds passed divided by the decay interval. This is because if the decay is 2 seconds and 6 seconds have passed, the new reward should be oldReward - (6 / 2) = oldReward - 3
            let decayedReward = Math.floor(parcel.reward - (msPassed / decay))

            parcel.reward = decayedReward
            if (parcel.reward <= 0)
                parcels.delete(parcel.id)
            updateIntentionScore(parcel, computeParcelScore(parcel), parcel.id)
            // console.log(parcels)
        });
    }, decayIntervals[configs.PARCEL_DECADING_INTERVAL])
}

const configs = {
    AGENTS_OBSERVATION_DISTANCE: 5,
    PARCELS_OBSERVATION_DISTANCE: 5,
    PARCEL_DECADING_INTERVAL: '1s', // Possibilities: '1s', '2s', '5s', '10s', 'infinite'
    MOVEMENT_DURATION: 50
}

/**
 * @type {[{id: string, reward: number, pickupTime: number}]}
 */
const carriedParcels = [];

const carryParcel = (parcel) => {
    parcels.delete(parcel.id);
    if (carriedParcels.find(p => p.id === parcel.id)) {
        return;
    }
    carriedParcels.push({ id: parcel.id, reward: parcel.reward, pickupTime: Date.now() });
    parcels.delete(parcel.id);
}

const decayIntervals = { '1s': 1000, '2s': 2000, '5s': 5000, '10s': 10000, 'infinite': 1000};

/**
 * The agents perceived by our agent
 * @type {[{id: string, x: number, y: number, name: string, score: number}]}
 */
const agentsMap = new Map();
const getAgentsMap = () => {
    return Array.from(agentsMap.values());
}
const partner = { id: null, name: null };
const GROUP = ['ulises', 'lorenzo'];



export {
    distance,
    updateMe,
    findClosestDelivery,
    validCells,
    parcels,
    me,
    plans,
    MAX_NUM_MOVEMENT_RETRIES,
    euclideanDistance,
    map,
    deliveryPoints,
    configs,
    carriedParcels,
    carryParcel,
    decayIntervals,
    agentsMap,
    partner,
    GROUP,
    updateAgentsMap,
    getAgentsMap,
    setCarriedParcelsInterval
};