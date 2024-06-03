import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { findClosestDelivery, me, carriedParcels, updateMe, deliveryPoints, getAgentsMap, map, logDebug } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

export default class GoDeliver extends Plan {

    constructor() {
        super('go_deliver');
    }

    isApplicableTo(desire) {
        return desire === this.name
    }

    async execute(predicate) {
        this.stopped = false;
        let closestDelivery = findClosestDelivery([], me);
        let retries = 0;
        const MAX_RETRIES = 3;

        const triedDeliveryPoints = [closestDelivery.point];

        while (!this.stopped && retries < MAX_RETRIES) {
            logDebug(0, 'GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);
            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            if (!closestDelivery || !closestDelivery.point) {
                retries++;
                continue;
            }

            let path = await this.subIntention('find_path', [closestDelivery.point.x, closestDelivery.point.y]);

            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            if (!path || path.length === 0) {
                retries++;
                // get latest position and recompute path to second closest delivery
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                triedDeliveryPoints.push(closestDelivery.point);
                continue;
            }

            let promise = new Promise(res => client.onYou(res)) // Wait for the client to update the agent's position

            if (this.stopped)
                throw ['stopped']; // if stopped then quit
            let path_completed = await this.subIntention('execute_path', [path, closestDelivery.point]);

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
            // path.shift(); // Remove the current cell

            logDebug(4, 'GoDeliver.execute: max retries reached, trying to meet partner', closestDelivery)

            logDebug(4, 'Min width: ', this.minWidthInPathIsOne(path), ' partner: ', partner.id);

            if (this.minWidthInPathIsOne(path)) {
                logDebug(4, 'GoDeliver.execute: partner is closer to delivery point, trying to meet')
                let midPointMessage = await askResponse({ type: 'go_partner', position: me }, this)

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
