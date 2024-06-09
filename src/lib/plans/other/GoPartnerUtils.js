import client from '../../utils/client.js';
import { me, updateMe, partner, logDebug, getCells, map, distance, isCellReachable, validCells } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import Plan from '../Plan.js';

export function isCellAdjacent(firstCell, otherCell) {
    return (firstCell.x === otherCell.x && Math.abs(firstCell.y - otherCell.y) === 1) || (firstCell.y === otherCell.y && Math.abs(firstCell.x - otherCell.x) === 1);
}

export function getOppositeCell(current, target) {
    return validCells
        .filter(cell => isCellReachable(cell.x, cell.y))
        .filter(cell => isCellAdjacent(cell, current))
        .filter(cell => cell.x !== target.x || cell.y !== target.y)
}

export function getDirection(from, to) {
    if (from.x < to.x)
        return 'right';
    else if (from.x > to.x)
        return 'left';
    else if (from.y < to.y)
        return 'up';
    else if (from.y > to.y)
        return 'down';
}

export async function takeStepBack(planInstance, midPoint) {
    let stepBackPos = map
        .flatMap(row => row)
        .filter(cell => !cell.fakeFloor)
        .filter(cell => cell.x !== me.x || cell.y !== me.y)
        .filter(cell => isCellAdjacent(cell, me))
        .filter(cell => !partner.position || distance(cell, partner.position) > distance(me, partner.position))
        .filter(cell => distance(cell, midPoint) > distance(me, midPoint))
    logDebug(4, 'Cell found: ', stepBackPos)

    if (stepBackPos.length === 0) {
        logDebug(2, 'No cell found to step back!')
        return false;
    }

    // Go back one step
    let direction = 'right'
    if (stepBackPos[0].x < me.x)
        direction = 'left'
    else if (stepBackPos[0].y < me.y)
        direction = 'down'
    else if (stepBackPos[0].y > me.y)
        direction = 'up'
    return await client.move(direction)
}

/**
 * 
 * @param {{x: number, y: number}} midPoint The mid point to go to
 * @param {string} intentionID The intention ID to change the score
 * @param {Plan} planInstance  The plan instance to call the subIntentions
 * @returns 
 */
export async function goToMidPoint(midPoint, intentionID, planInstance) {
    let actions = await planInstance.subIntention('a_star', [midPoint.x, midPoint.y, true]);

    let pathCompleted = await planInstance.subIntention('follow_path', [actions, midPoint]);

    // if (!pathCompleted && !isCellAdjacent(me, partner.position) && !(me.x === partner.position.x && me.y === partner.position.y)) {
    //     // Send a message to the partner to abort
    //     logDebug(2, 'Path not completed!')
    //     await client.say(partner.id, JSON.stringify({
    //         type: 'go_partner_abort',
    //         position: me
    //     }))
    //     agent.changeIntentionScore(intentionID, [], -1, intentionID)
    //     return false;
    // }

    // If I'm still moving, wait!
    if (me.x % 1 != 0 || me.y % 1 != 0)
        await updateMe();

    // If I'm not at the location, failure!
    // if ((me.x !== midPoint.x && me.y !== midPoint.y) && !isCellAdjacent(me, partner.position)) {
    //     logDebug(2, 'Not at mid point!')
    //     // Send a message to the partner to abort
    //     await client.say(partner.id, JSON.stringify({
    //         type: 'go_partner_abort',
    //         position: me
    //     }))
    //     agent.changeIntentionScore(intentionID, [], -1, intentionID)
    //     return false;
    // }
    return true;
}

export async function askResponse(message, planInstance) {
    let response = null;
    let retries = 0;
    const MAX_RETRIES = 3;
    while (!response && retries++ < MAX_RETRIES && !planInstance.stopped) {
        response = await Promise.race([
            client.ask(partner.id, JSON.stringify(message)),
            new Promise(resolve => setTimeout(resolve, 15000))
        ]);
        await new Promise(res => setImmediate(res));

        if (response) {
            try {
                response = JSON.parse(response);
                return response;
            } catch (ignored) { }
        }
    }
    agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
    return false;
}