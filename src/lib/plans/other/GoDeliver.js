import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { findClosestDelivery, me, carriedParcels, updateMe, deliveryPoints, logDebug, distance, partner, map } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

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

                return cell1.fakeFloor && cell2.fakeFloor;
            } else { // Going up or down
                let checkY = y;
                let checkX1 = x - 1;
                let checkX2 = x + 1;

                let cell1 = this.checkCellInMap(checkX1, checkY);
                let cell2 = this.checkCellInMap(checkX2, checkY);

                return cell1.fakeFloor && cell2.fakeFloor;
            }
        }
        return false;
    }

    async execute(predicate) {
        this.stopped = false;
        let closestDelivery = findClosestDelivery([], me);
        let retries = 0;
        const MAX_RETRIES = deliveryPoints.length * deliveryPoints.length * 2;

        const triedDeliveryPoints = [closestDelivery.point];

        while (!this.stopped && retries < MAX_RETRIES) {
            logDebug(0, 'GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);
            logDebug(4, 'Executing deliver, current try: ', retries, 'on point:', closestDelivery)
            // if (this.stopped)
            //     throw ['stopped']; // if stopped then quit

            if (!closestDelivery.point) {
                retries++;
                continue;
            }

            let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);

            if (!path || path.length === 0) {
                retries++;
                // get latest position and recompute path to second closest delivery
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                logDebug(2, 'No path found, new delivery point: ', closestDelivery.point)
                triedDeliveryPoints.push(closestDelivery.point);
                continue;
            }

            path = path.reverse(); // Start from the current cell
            path.shift(); // Remove the current cell

            let promise = new Promise(res => client.onYou(res)) // Wait for the client to update the agent's position

            // if (this.stopped)
            //     throw ['stopped']; // if stopped then quit

            let path_completed = await this.subIntention('follow_path', [path]);

            if (path_completed) {
                // Wait for the client to update the agent's position
                await new Promise(res => setImmediate(res));
                if (me.x % 1 != 0 || me.y % 1 != 0)
                    await promise
                let result = await client.putdown();
                if (result.length > 0) {
                    carriedParcels.length = 0;
                    agent.changeIntentionScore('go_deliver', [], 0, 'go_deliver');
                }

                return result
            }
            retries++;
            // Recompute path to second closest delivery
            closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
            triedDeliveryPoints.push(closestDelivery.point);
            await new Promise(res => setImmediate(res));
        }

        closestDelivery = findClosestDelivery([], me);

        let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y, true]);

        logDebug(4, '#########################')

        try {
            path = path.reverse(); // Start from the current cell
            path.shift(); // Remove the current cell
            
            logDebug(4, 'GoDeliver.execute: max retries reached, trying to meet partner', closestDelivery)

            logDebug(4, 'Min width: ', this.minWidthInPathIsOne(path), ' partner: ', partner.id, ' distance: ', closestDelivery.distance, distance(partner.position, closestDelivery.point));

            if (this.minWidthInPathIsOne(path) && partner.id && distance(me, closestDelivery.point) > distance(partner.position, closestDelivery.point)) {
                logDebug(4, 'GoDeliver.execute: partner is closer to delivery point, trying to meet')
                try {
                    let midPointMessage = await client.ask(partner.id, JSON.stringify({ type: 'go_partner', position: me }))

                    logDebug(4, 'GoDeliver.execute: partner response', midPointMessage)

                    if (midPointMessage) {
                        let midPoint = JSON.parse(midPointMessage);

                        if (!midPoint.success) {
                            logDebug(3, 'GoDeliver.execute: partner rejected meeting');
                            this.stop();
                            throw ['partner rejected meeting'];
                        }

                        agent.push({ desire: 'go_partner_initiator', args: [midPoint], score: 9999, id: 'go_partner_initiator' }) // Always prioritize the meeting
                        this.stop();
                        return;
                    }
                } catch (e) {
                    logDebug(0, 'GoDeliver.execute: no response from partner');
                    this.stop();
                    return;
                }
            }
        } catch (e) {
            logDebug(4, 'GoDeliver.execute: error while trying to meet partner', e)
        }



        throw ['max retries reached, delivery not completed'];
    }
}
