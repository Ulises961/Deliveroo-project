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

    /**
     * Execute the plan to deliver a parcel to the closest delivery point.
     * In case of failure insists on other delivery points
     */
    async execute() {
        this.stopped = false;

        let closestDelivery = findClosestDelivery([], me);
        let retries = 0;
        const MAX_RETRIES = deliveryPoints.length * deliveryPoints.length * 2;

        const triedDeliveryPoints = [closestDelivery.point];

        while (!this.stopped && retries < MAX_RETRIES) {
            logDebug(0, 'GoDeliver.execute: me ', me, ' closestDelivery ', closestDelivery);
            logDebug(2, 'Executing deliver, current try: ', retries, 'on point:', closestDelivery)
            
            if (this.stopped)
                throw ['stopped']; 

            if (!closestDelivery.point) {
                logDebug(0, 'GoDeliver.execute: no delivery points found');
                throw ['No delivery point'];
            }

            let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);
          
            if (path.length === 0) {
                retries++;

                // Get latest position and recompute path to second closest delivery
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                triedDeliveryPoints.push(closestDelivery.point);
                logDebug(2, 'No path found, new delivery point: ', closestDelivery.point)
                
                // Let the event loop run before retrying
                await new Promise(res => setImmediate(res));
                continue;
            }

            path = path.reverse(); // Start from the current cell
            path.shift(); // Remove the current cell

            let promise = new Promise(res => client.onYou(res)) // Wait for the client to update the agent's position

            if (this.stopped)
                throw ['stopped']; 

            let path_completed = await this.subIntention('follow_path', [path]);

            if (path_completed) {
                if (me.x % 1 != 0 || me.y % 1 != 0)
                    await updateMe();
                
                let result = await client.putdown();

                // If the delivery is successful, reset the carried parcels
                if (result.length > 0) {
                    carriedParcels.length = 0;
                    agent.changeIntentionScore('go_deliver', [], 0, 'go_deliver');
                }

                return result
            } else {
                retries++;
                // Recompute path to second closest delivery
                closestDelivery = findClosestDelivery(triedDeliveryPoints, me);
                triedDeliveryPoints.push(closestDelivery.point);

                // Let the event loop run before retrying
                await new Promise(res => setImmediate(res));
                
                continue;
            }
        }
        throw ['max retries reached, delivery not completed'];
    }
}
