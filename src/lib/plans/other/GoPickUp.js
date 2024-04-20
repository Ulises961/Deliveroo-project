import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { distance, me, deliveryPoints, parcels } from '../../utils/utils.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo ( desire ) {
        return desire === 'go_pick_up'
    }

    async execute ( predicate ) {
        console.log('GoPickUp.execute: predicate ', predicate, ' me ', me);
        
        let path = await this.subIntention('a_star', [predicate.x, predicate.y]);
        path = path.reverse();
        path.shift();
       
        await this.subIntention('follow_path', [path]);
        await client.pickup();
        
        if (this.stopped) throw ['stopped']; // if stopped then quit
        
        await this.subIntention('go_deliver', []);


        return true;
    }

}
