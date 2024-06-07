import client from '../../utils/client.js';
import { agentsMap, me, parcels, updateMe, carryParcel, getAgentsMap, partner, logDebug, map, carriedParcels, findClosestDelivery } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import Plan from '../Plan.js';

export function isCellAdjacent(firstCell, otherCell) {
    return (firstCell.x === otherCell.x && Math.abs(firstCell.y - otherCell.y) === 1) || (firstCell.y === otherCell.y && Math.abs(firstCell.x - otherCell.x) === 1);
}

/**
 * 
 * @param {{x: number, y: number}} midPoint The mid point to go to
 * @param {string} intentionID The intention ID to change the score
 * @param {Plan} planInstance  The plan instance to call the subIntentions
 * @returns 
 */
export async function goToMidPoint(midPoint, intentionID, planInstance) {
    let path = await planInstance.subIntention('a_star', [midPoint.x, midPoint.y]);

    // If not path if found, failure!
    if (!path || path.length == 0) {
        // Send a message to the partner to abort
        logDebug(2, 'No path found!')
        await client.say(partner.id, JSON.stringify({
            type: 'go_partner_abort',
            position: me
        }))
        agent.changeIntentionScore(intentionID, [], -1, intentionID)
        return false;
    }

    path = path.reverse(); // From starting point
    path.shift(); // Remove current cell

    let pathCompleted = await planInstance.subIntention('follow_path', [path, true]);

    if (!pathCompleted && !isCellAdjacent(me, partner.position) && !(me.x === partner.position.x && me.y === partner.position.y)) {
        // Send a message to the partner to abort
        logDebug(2, 'Path not completed!')
        await client.say(partner.id, JSON.stringify({
            type: 'go_partner_abort',
            position: me
        }))
        agent.changeIntentionScore(intentionID, [], -1, intentionID)
        return false;
    }

    // If I'm still moving, wait!
    if (me.x % 1 != 0 || me.y % 1 != 0)
        await updateMe();

    // If I'm not at the location, failure!
    if ((me.x !== midPoint.x && me.y !== midPoint.y) && !isCellAdjacent(me, partner.position)) {
        logDebug(2, 'Not at mid point!')
        // Send a message to the partner to abort
        await client.say(partner.id, JSON.stringify({
            type: 'go_partner_abort',
            position: me
        }))
        agent.changeIntentionScore(intentionID, [], -1, intentionID)
        return false;
    }
    return true;
}

export async function askResponse(message, planInstance) {
    let response = null;
    let retries = 0;
    const MAX_RETRIES = 3;
    while (!response && retries++ < MAX_RETRIES && !planInstance.stopped) {
        response = await Promise.race([
            client.ask(partner.id, JSON.stringify(message)),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);
        await new Promise(res => setImmediate(res));

        if (response) {
            try {
                response = JSON.parse(response);
                if (response.type === message.type + '_response') {
                    return response;
                }
            } catch (ignored) { }
        }
    }
    agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
    return false;
}