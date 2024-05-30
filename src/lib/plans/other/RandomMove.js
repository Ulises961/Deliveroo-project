import Plan from '../Plan.js';
import { validCells, configs, distance, me, updateMe, logDebug } from '../../utils/utils.js';

export default class RandomMove extends Plan {

    constructor() {
        super('go_random');
    }

    isApplicableTo(go_random) {
        return go_random == 'go_random';
    }
    /**
     * Find a random destination and move to it
     * @returns true if the agent has reached the destination
     */
    async execute() {
        this.stopped = false;

        if (this.stopped){
            logDebug(3, 'RandomMove: stopped')
            throw ['stopped']; 
        } 
        
        /**
         * Choose a cell that is outside the observation range
         * but not too far away
         */
        const MAX_DISTANCE = configs.PARCELS_OBSERVATION_DISTANCE * 2;

        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();
        
        let validDestinations = validCells.filter(cell => {
            if (cell.x === me.x && cell.y === me.y)
                return false;
            if (!cell.parcelSpawner)
                return false;
            return true;
        })

        if (this.stopped) throw ['stopped']; 
        if (validDestinations.length === 0) {
            // I'm in the only parcel spawner? Stay here
            return;
        }
        
        if (this.stopped) throw ['stopped']; 

        let index = Math.floor(Math.random() * validDestinations.length);
        let destination = validDestinations[index];
        
        if (!destination) {
            throw ['no destination found'];
        }

        logDebug(0, 'RandomMove: destination', destination, index);
        let path = await this.subIntention('a_star', [destination.x, destination.y]);
        path.reverse();
        path.shift();
        
        if(path.length === 0) {
            throw ['no path found'];
        }

        if (this.stopped) throw ['stopped']; 

        const complete = await this.subIntention('follow_path', [path]);

        if (complete) {
            return true;
        } else {
            throw ['path not completed'];
        }
    }
}