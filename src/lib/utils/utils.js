import Plan from '../plans/Plan.js';
import client from './client.js';
import dotenv from 'dotenv';

dotenv.config();

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

const findClosestDelivery = function findClosestDelivery(exceptions = [], startingPoint) {
    let closestDelivery = { point: null, distance: Infinity };
    deliveryPoints
        .filter(deliveryPoint => {
            return !exceptions.some(exception => deliveryPoint.x === exception?.x && deliveryPoint.y === exception?.y);
        }) // Filter out the exceptions
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
 * @type {[{x: number, y: number, delivery: boolean, fakeFloor: boolean}]}
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
            /**
             * First time the agent receives the position
             */
            if (reachableCells.length === 0) {
                if (map.length === 0)
                    return;
                for (let i = 0; i < map.length; i++) {
                    reachableCells[i] = []
                    for (let j = 0; j < map[i].length; j++) {
                        reachableCells[i][j] = false;
                    }
                }

                const queue = [{ x: Math.ceil(x), y: Math.ceil(y) }];

                while (queue.length > 0) {
                    const current = queue.shift();
                    if (reachableCells[current.x] === undefined)
                        continue;
                    if (reachableCells[current.x][current.y] === true)
                        continue;
                    reachableCells[current.x][current.y] = true;
                    if (map[current.x][current.y].fakeFloor) {
                        continue;
                    }
                    if (current.x + 1 < map.length && !map[current.x + 1][current.y].fakeFloor) {
                        queue.push({ x: current.x + 1, y: current.y });
                    }
                    if (current.x - 1 >= 0 && !map[current.x - 1][current.y].fakeFloor) {
                        queue.push({ x: current.x - 1, y: current.y });
                    }
                    if (current.y + 1 < map[current.x].length && !map[current.x][current.y + 1].fakeFloor) {
                        queue.push({ x: current.x, y: current.y + 1 });
                    }
                    if (current.y - 1 >= 0 && !map[current.x][current.y - 1].fakeFloor) {
                        queue.push({ x: current.x, y: current.y - 1 });
                    }
                }
                let newValidCells = validCells.filter(cell => isCellReachable(cell.x, cell.y));
                validCells.length = 0;
                validCells.push(...newValidCells)
            }

            me.id = id
            me.name = name
            me.x = x
            me.y = y
            me.score = score
            res(me);
        });
    })
};

const configs = {
    AGENTS_OBSERVATION_DISTANCE: 5,
    PARCELS_OBSERVATION_DISTANCE: 5,
    PARCEL_DECADING_INTERVAL: '1s', // Possibilities: '1s', '2s', '5s', '10s', 'infinite'
    MOVEMENT_DURATION: 50,
    CLOCK: 50
}

/**
 * @type {[{id: string, reward: number, pickupTime: number}]}
 */
const carriedParcels = [];

const carryParcel = (parcel) => {
    if (!parcel)
        return;
    parcels.delete(parcel.id);
    if (carriedParcels.find(p => p.id === parcel.id)) {
        return;
    }
    carriedParcels.push({ id: parcel.id, reward: parcel.reward, pickupTime: Date.now() });
    parcels.delete(parcel.id);
}

const decayIntervals = { '1s': 1000, '2s': 2000, '5s': 5000, '10s': 10000 };

const reachableCells = []

/**
 * Returns whether a cell is reachable by the agent
 * @param {number} x The x coordinate of the cell
 * @param {number} y The y coordinate of the cell
 */
const isCellReachable = function (x, y) {
    if (x % 1 == 0)
        x = Math.ceil(x)
    if (y % 1 == 0)
        y = Math.ceil(y)
    if (reachableCells[x] === undefined)
        return false;
    return reachableCells[x][y];
}

/**
 * The agents perceived by our agent
 * @type {[{id: string, x: number, y: number, name: string, score: number}]}
 */
const agentsMap = new Map();

const getAgentsMap = () => {
    // Decrease the score of the agents that have not been seen for a while
    // Only take agents that have been seen recently
    const MAX_TIME = 5000; // 5sec
    return Array.from(agentsMap.values())
        .filter(agent => agent.name !== 'god')
        .filter(agent => Date.now() - agent.discoveryTime < MAX_TIME);
}

const updateAgentsMap = async function updateAgentsMap() {
    return await new Promise(res => {
        client.onAgentsSensing(agents => {
            agents.forEach(agent => {
                agent.discoveryTime = Date.now();
                agentsMap.set(agent.id, agent);
            });
            res(agentsMap);
        });
    })
};

const partner = { id: null, name: null, position: null };
const GROUP = ['Fuss_1', 'Fuss_2'];

const DEBUG = process.env.DEBUG === 'true' || false;
const DEBUG_LEVEL = process.env.DEBUG_LEVEL || 0;

const logDebug = function logDebug(level, ...args) {
    if (DEBUG && DEBUG_LEVEL <= level) {
        console.log(...args);
    }
}

const getCells = function getCells(path) {
    return path.map(p => {
        if(p.args) {
            let planArgs = p.args;
            planArgs = planArgs[2].split('_');
            let x = parseInt(planArgs[0].substring(1));
            let y = parseInt(planArgs[1]); 
            return { x: x, y: y};
        } else {
            return p;
        }

    });
}

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
    isCellReachable,
    logDebug,
    getCells
};