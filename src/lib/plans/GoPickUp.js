import Plan from './Plan.js';
import client from '../utils/client.js';
import { calculatePath, me } from '../utils/utils.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo ( desire ) {
        return desire === 'go_pick_up'
    }

    async execute ( predicate ) {
        console.log('GoPickUp.execute: predicate ', predicate, ' me ', me);
        const path = calculatePath({x:me.x, y:me.y}, {x:predicate.x, y:predicate.y});
        console.log('GoPickUp.execute: path', path);
        await this.subIntention('go_to', [path]);
        return await client.pickup();
    }

}
