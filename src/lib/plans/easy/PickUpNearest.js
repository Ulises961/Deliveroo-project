import Plan from '../Plan.js';
import client from '../../utils/client.js';
import {me} from '../../utils/utils.js';

export default class PickUpNearest extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo(desire) {
        console.log('PickUpNearest');
        return desire == 'go_pick_up';
    }

    async execute(predicate) {
        console.log('PickUpNearest.execute: predicate ', predicate, ' me ', me);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention('go_to', [predicate.x, predicate.y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await client.pickup()
        if (this.stopped) throw ['stopped']; // if stopped then quit
        return true;
    }
}