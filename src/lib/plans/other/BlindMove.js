import Plan from '../Plan.js';
import client from '../../utils/client.js';
export default class BlindMove extends Plan {
    
    constructor() {
        super('blind_move');
    }

    isApplicableTo ( desire ) {
        return desire === 'blind_move'

    }

    async execute ( path ) {
        while(path.length > 0 && retries < 5) {
            
            if ( this.stopped ) throw ['stopped']; // if stopped then quit
            
            const direction = path.shift();
            console.log('Moving', direction);
            
            const moved = await client.move(direction);
            
            await new Promise(res => client.onYou(m => m.x % 1 !== 0 || m.y % 1 !== 0) ? client.onYou(res) : res());

            if(!moved) {
                retries++;
            }
        }
        
        if(retries === 5) {
            return false;
        }
    }
}