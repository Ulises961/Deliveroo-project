import Plan  from '../plans/Plan.js';

/**
 * Calculates the distance between two points.
 * @param {Object} param0 The first point, with properties x and y.
 * @param {Object} param1 The second point, with properties x and y.
 * @returns {number} The distance between the two points.
 */
const distance = function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}

/**
 * Calculates the path from the start point to the end point.
 *
 * @param {Object} start - The start point coordinates.
 * @param {Object} end - The end point coordinates.
 * @returns {string[]} - The path as an array of directions.
 */
const calculatePath = function calculatePath(start, end) {
    if (!start || !end) return [];
    console.log('Calculating path from', start.x, start.y, 'to', end.x, end.y);
    const path = [];
    let current = start;
    while (current.x !== end.x) {
        console.log('Current', current.x, current.y, 'End', end.x, end.y);
        if (current.x < end.x) {
            path.push('right');
            current = { x: current.x + 1, y: current.y };
        } else {
            path.push('left');
            current = { x: current.x - 1, y: current.y };
        }
    }

    while (current.y !== end.y) {
        console.log('Current', current.x, current.y, 'End', end.x, end.y);
        if (current.y < end.y) {
            
            path.push('up');
            current = { x: current.x, y: current.y + 1 };
        } else {
            path.push('down');
            current = { x: current.x, y: current.y - 1 };
        }
    }
    return path;
};

/**
 * @type Map<number, {}>
 */
const parcels = new Map();

const me = {};

/**
 * @type array<Plan>
 */
const plans = [];

export { distance, calculatePath , parcels, me, plans };