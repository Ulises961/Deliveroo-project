import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { findClosestDelivery, me } from '../../utils/utils.js';

export default class GoDeliver extends Plan {

    constructor() {
        super('go_deliver');
    }

    isApplicableTo ( desire ) {
        return desire === this.name
    }

    async execute ( predicate ) {

        const closestDelivery = findClosestDelivery();
        console.log('GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);

        if (this.stopped) throw ['stopped']; // if stopped then quit

        let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);
        path = path.reverse();
        path.shift();

        console.log('GoDeliver.execute: path ', path);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        
        if(path.length === 0) {
            console.log('GoDeliver.execute: path is empty');
            throw ['no path'];
        }
        let path_completed = await this.subIntention('follow_path', [path]);
        
        if(path_completed) {
            console.log('GoDeliver.execute: path completed', path);
            return await client.putdown();

        }

        throw ['delivery not completed'];
    }
}
