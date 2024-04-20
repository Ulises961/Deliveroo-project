import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { distance, me, deliveryPoints, parcels, carryParcel } from '../../utils/utils.js';

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
        path = path.reverse();
        path.shift();

        await this.subIntention('follow_path', [path]);
        let pickup = await client.pickup();

        if (pickup) {
            let id = predicate.id
            let reward = parcels.has(id) ? parcels.get(id).reward : predicate.reward
            carryParcel({ id, reward });
        }

        if (this.stopped) throw ['stopped']; // if stopped then quit

        // await this.subIntention('go_deliver', []);

        return true;
    }

}
