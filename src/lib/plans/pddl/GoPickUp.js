import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { me, parcels, carryParcel, logDebug } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { updateCarriedParcelsScore } from '../AgentLoop.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo(desire) {
        return desire === 'go_pick_up'
    }

    async execute(predicate) {
        logDebug('GoPickUp.execute: predicate ', predicate, ' me ', me);

        let path = await this.subIntention('find_path', [predicate.x, predicate.y]);
        logDebug('GoPickUp.execute: path ', path);
        if (path.length === 0) {
            agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);

            throw ['No path found'];
        }
        let target = {x: predicate.x, y: predicate.y};
        await this.subIntention('execute_path', [path, target]);
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
