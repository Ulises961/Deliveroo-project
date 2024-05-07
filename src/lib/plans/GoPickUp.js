import Plan from './Plan.js';
import client from '../utils/client.js';
import { distance, me, deliveryPoints, parcels, carryParcel } from '../utils/utils.js';
import { agent } from '../utils/agent.js';
import { updateCarriedParcelsScore } from './other/AgentLoop.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo(desire) {
        return desire === 'go_pick_up'
    }

    async execute(predicate) {
        // console.log('GoPickUp.execute: predicate ', predicate, ' me ', me);

        let path = await this.subIntention('a_star', [predicate.x, predicate.y]);
     
        if (path.length === 0) {
            agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);

            throw ['No path found'];
        }
     
        path = path.reverse();
        path.shift();
        await this.subIntention('follow_path', [path]);
        let pickup = await client.pickup();

        if (pickup.length > 0) {
            pickup.forEach(parcelId => {
                let parcel = parcels.get(parcelId);
                carryParcel(parcel);
                parcels.delete(parcelId);
                agent.changeIntentionScore('go_pick_up', [parcel], -1, parcel.id);
            
            })
        }

        if (this.stopped) throw ['stopped']; // if stopped then quit

        updateCarriedParcelsScore();

        return true;
    }

}
