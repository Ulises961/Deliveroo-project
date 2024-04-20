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

const findClosestDelivery = function findClosestDelivery() {
    let closestDelivery = { point: null, distance: Infinity };
    deliveryPoints.reduce((acc, point) => {
        const dist = distance(me, point);
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
            console.log('utils.updateMe', me)
            res(me);
        });
    })
};

export {
    distance,
    updateMe,
    findClosestDelivery, validCells, parcels, me, plans, MAX_NUM_MOVEMENT_RETRIES, euclideanDistance, map, deliveryPoints
};