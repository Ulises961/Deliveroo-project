import Plan from './Plan.js';

export default class GoTo extends Plan {

    isApplicableTo ( desire ) {
        return desire === 'go_to'

    }

    async execute ( {x, y} ) {
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
        return true;
    }

}