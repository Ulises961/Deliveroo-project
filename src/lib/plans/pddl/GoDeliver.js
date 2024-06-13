import { agent } from '../../utils/agent.js';
import client from '../../utils/client.js';
import { carriedParcels, findClosestDelivery, getCells, logDebug, map, me, partner } from '../../utils/utils.js';
import Plan from '../Plan.js';

export default class GoDeliver extends Plan {

    constructor() {
        super('go_deliver');
    }

    isApplicableTo(desire) {
        return desire === this.name
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {{x: number, y: number, delivery: boolean, fakeFloor: boolean }}
     */
    checkCellInMap(x, y) {
        if (x < 0 || y < 0 || x >= map[0].length || y >= map[0].length) {
            return { x: x, y: y, delivery: false, fakeFloor: true };
        }
        return map[x][y];
    }

    /**
     * Check the path to see if there is a corridor with a width of 1 in the path
     */
    minWidthInPathIsOne(path) {
        let isWidthOne = false;
        if (path.length <= 1) {
            return true;
        }
        for (let i = 0; i < path.length - 1; i++) {
            // Current cell and next cell in the path
            let x = path[i].x;
            let y = path[i].y;
            let nextX = path[i + 1].x;

            if (nextX !== x) { // Going left or right
                let checkY1 = y - 1;
                let checkY2 = y + 1;
                let checkX = x;

                let cell1 = this.checkCellInMap(checkX, checkY1);
                let cell2 = this.checkCellInMap(checkX, checkY2);

                isWidthOne = isWidthOne || (cell1.fakeFloor && cell2.fakeFloor);
            } else { // Going up or down
                let checkY = y;
                let checkX1 = x - 1;
                let checkX2 = x + 1;

                let cell1 = this.checkCellInMap(checkX1, checkY);
                let cell2 = this.checkCellInMap(checkX2, checkY);

                isWidthOne = isWidthOne || (cell1.fakeFloor && cell2.fakeFloor);
            }
        }
        return isWidthOne;
    }

    async execute(isGoPartner) {
        this.stopped = false;
        let closestDelivery = findClosestDelivery([], me);
        let retries = 0;
        if (isGoPartner === true)
            retries = -2;
        const MAX_RETRIES = 2;

        const triedDeliveryPoints = [closestDelivery.point];

        while (!this.stopped && retries < MAX_RETRIES) {
            logDebug(0, 'GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);
   
            if (!closestDelivery || !closestDelivery.point) {
                retries++;
                continue;
            }

            let path = await this.subIntention('find_path', [closestDelivery.point.x, closestDelivery.point.y]);

            if (!path || path.length === 0) {
                retries++;
                // get latest position and recompute path to second closest delivery
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                triedDeliveryPoints.push(closestDelivery.point);
                continue;
            }

            let promise = new Promise(res => client.onYou(res)) // Wait for the client to update the agent's position

            let path_completed = await this.subIntention('execute_path', [path, closestDelivery.point]);

            if (path_completed) {

                // Wait for the client to update the agent's position
                if (me.x % 1 != 0 || me.y % 1 != 0)
                    await updateMe();
                let result = await client.putdown();
                if (result.length > 0) {
                    carriedParcels.length = 0;
                    agent.changeIntentionScore('go_deliver', [], 0, 'go_deliver');
                }
                return result
            } else {
                // Path not completed, retry with another delivery point
                retries++;

                // Recompute path to second closest delivery
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                triedDeliveryPoints.push(closestDelivery.point);

                // Leave the event loop run before retrying
                await new Promise(res => setImmediate(res));
                
                continue;
            }
        }

        if (isGoPartner === true)
            return false;

        closestDelivery = findClosestDelivery([], me);

        let actions = await this.subIntention('find_path', [closestDelivery.point.x, closestDelivery.point.y, false]);

        let path = getCells(actions);
        path.push({ x: me.x, y: me.y })
        logDebug(4, '#########################')

        try {
            path = path.reverse(); // Start from the current cell
            // path.shift(); // Remove the current cell

            logDebug(4, 'GoDeliver.execute: max retries reached, trying to meet partner', closestDelivery)

            logDebug(4, 'Min width: ', this.minWidthInPathIsOne(path), ' partner: ', partner.id);

            if (this.minWidthInPathIsOne(path) && partner && partner.id) {
                logDebug(4, 'GoDeliver.execute: partner is closer to delivery point, trying to meet')
                let midPointMessage = await Promise.race([
                    client.ask(partner.id, JSON.stringify({ type: 'go_partner', position: me })),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
                ])

                midPointMessage = JSON.parse(midPointMessage)

                logDebug(4, 'GoDeliver.execute: partner response', midPointMessage)

                if (midPointMessage) {
                    if (!midPointMessage.success) {
                        logDebug(4, 'GoDeliver.execute: partner rejected meeting');
                        this.stop();
                        throw ['partner rejected meeting'];
                    }

                    agent.push({ desire: 'go_partner_initiator', args: [midPointMessage], score: 9999, id: 'go_partner_initiator' }) // Always prioritize the meeting
                    // this.stop();
                    return;
                }
            }
        } catch (e) {
            logDebug(4, 'GoDeliver.execute: error while trying to meet partner', e)
        }
        throw ['max retries reached, delivery not completed'];
    }
}
