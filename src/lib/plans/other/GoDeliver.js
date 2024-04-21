import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { findClosestDelivery, me, carriedParcels } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

export default class GoDeliver extends Plan {

    constructor() {
        super('go_deliver');
    }

    isApplicableTo ( desire ) {
        return desire === this.name
    }

    async execute ( predicate ) {

        const closestDelivery = findClosestDelivery();
        // console.log('GoDeliver.execute: predicate ', me, ' closestDelivery ', closestDelivery);

        if (this.stopped) throw ['stopped']; // if stopped then quit

        let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);
        path = path.reverse();
        path.shift();

        let promise = new Promise(res => client.onYou(res)) // Wait for the client to update the agent's position

        // console.log('GoDeliver.execute: path ', path);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        
        if(path.length === 0) {
            // console.log('GoDeliver.execute: path is empty');
            throw ['no path'];
        }
        let path_completed = await this.subIntention('follow_path', [path]);
        
        if(path_completed) {
            // Wait for the client to update the agent's position
            if (me.x % 1 != 0 || me.y % 1 != 0)
                await promise
            let result = await client.putdown();
            carriedParcels.length = 0;
            agent.changeIntentionScore('go_deliver', [], -1);
            return result
        }

        throw ['delivery not completed'];
    }
}
