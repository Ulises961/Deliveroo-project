import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { findClosestDelivery, me, carriedParcels, updateMe, deliveryPoints, logDebug } from '../../utils/utils.js';
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
            logDebug('GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);
            if (this.stopped)
                throw ['stopped']; // if stopped then quit
            
            if(!closestDelivery.point) {
                logDebug('GoDeliver.execute: no delivery points found');
                throw ['No delivery point'];
            }

            let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);
            
            if (path.length === 0) {
                retries++;
                // get latest position and recompute path to second closest delivery
                updateMe();
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                triedDeliveryPoints.push(closestDelivery.point);
                continue;
            }

            path = path.reverse(); // Start from the current cell
            path.shift(); // Remove the current cell

            let promise = new Promise(res => client.onYou(res)) // Wait for the client to update the agent's position

            if (this.stopped)
                throw ['stopped']; // if stopped then quit
          
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
            await new Promise(res => setImmediate(res));
        }
        throw ['max retries reached, delivery not completed'];
    }
}
