import Plan from './Plan.js';
import { calculatePath } from '../utils/utils.js';

export default class GoPickUp extends Plan {


    isApplicableTo ( desire ) {
        if(desire === 'go_pick_up') {
            return true;
        }
    }

    async execute ( {x, y} ) {
        const path = calculatePath(x, y);

        while(path.length > 0 && retries < 5) {
            console.log('Moving', direction);
            const moved = await client.move(direction);
            if(!moved) {
                retries++;
            }
        }
        
        if(retries === 5) {
            return false;
        }

        return await client.pickup();
    }

}
