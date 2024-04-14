import Plan from './Plan.js';
import { calculatePath } from '../utils/utils.js';

export default class GoPickUp extends Plan {


    isApplicableTo ( desire ) {
        return desire === 'go_pick_up'
    }

    async execute ( {x, y} ) {

        await this.subIntention('go_to', {x, y});
        return await client.pickup();
    }

}
