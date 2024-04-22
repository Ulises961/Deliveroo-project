import Plan from './Plan.js';
import client from '../utils/client.js';
import {me} from '../utils/utils.js';
import logger from '../../utils/logger.js';

export default class PickUpNearest extends Plan {

    constructor() {
        super('pick_up_nearest');
    }

    isApplicableTo(desire) {
        return desire == 'pick_up_nearest';
    }

    async execute(predicate) {
        logger.debug('PickUpNearest.execute: predicate ', predicate, ' me ', me);
        let completed = false
        while (!completed) {
            if (this.stopped) 
                throw ['stopped']; // if stopped then quit
            let path = await this.subIntention('a_star', [predicate.x, predicate.y]);
            path = path.reverse();
            path.shift();
            if (this.stopped) throw ['stopped']; // if stopped then quit
            completed = await this.subIntention('follow_path', [path]);
            await client.pickup()
            if (this.stopped) throw ['stopped']; // if stopped then quit
        }
        return true;
    }
}