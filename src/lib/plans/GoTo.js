import Plan from './Plan.js';
import client from '../utils/client.js';
import { MAX_NUM_MOVEMENT_RETRIES } from '../utils/utils.js';

export default class GoTo extends Plan {

    constructor() {
        super('go_to');
    }
    
    isApplicableTo ( desire ) {
        return desire === 'go_to'

    }

    async execute ( path ) {
        let retries = 0;
        console.log('GoTo.execute: path', path, 'retries', retries);
        while(path.length > 0 && retries < MAX_NUM_MOVEMENT_RETRIES) {
            
            if ( this.stopped ) throw ['stopped']; // if stopped then quit
            
            const direction = path.shift();
            console.log('Moving', direction);
            
            const moved = await client.move(direction);
            
            await new Promise(res => client.onYou(m => m.x % 1 !== 0 || m.y % 1 !== 0) ? client.onYou(res) : res());

            if(!moved) {
                retries++;
            }
        }
        
        if(retries === MAX_NUM_MOVEMENT_RETRIES) {
            return false;
        }
        return true;
    }

}