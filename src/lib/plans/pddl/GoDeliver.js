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
        const MAX_RETRIES = deliveryPoints.length * deliveryPoints.length * 2;

        const triedDeliveryPoints = [closestDelivery.point];

        while (!this.stopped && retries < MAX_RETRIES) {
            logDebug(0, 'GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);
            if (this.stopped)
                throw ['stopped'];

            if (!closestDelivery.point) {
                logDebug(0, 'GoDeliver.execute: no delivery points found');
                throw ['No delivery point'];
            }

            let path = await this.subIntention('find_path', [closestDelivery.point.x, closestDelivery.point.y]);

            if (path.length === 0) {
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
        throw ['max retries reached, delivery not completed'];
    }
}
