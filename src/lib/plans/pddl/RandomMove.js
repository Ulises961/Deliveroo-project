import Plan from '../Plan.js';
import { validCells, configs, distance, me, updateMe, logDebug } from '../../utils/utils.js';

export default class RandomMove extends Plan {

    constructor() {
        super('go_random');
    }

    isApplicableTo(go_random) {
        return go_random == 'go_random';
    }

    async execute(predicate) {
        this.stopped = false;

        if (this.stopped) throw ['stopped']; 
        
        /**
         * Choose a cell that is outside the observation range,
         * but not too far away
         */
        const MAX_DISTANCE = configs.PARCELS_OBSERVATION_DISTANCE * 4;

        await new Promise(res => setImmediate(res));
        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();
        
        let validDestinations = validCells.filter(cell => {
            if (cell.x === me.x && cell.y === me.y)
                return false;
            if (!cell.parcelSpawner)
                return false;
            // if (distance(cell, me) > MAX_DISTANCE)
            //     return false;
            return true;
        })

        if (this.stopped) 
            return false; // if stopped then quit
        if (validDestinations.length === 0) {
            // I'm in the only parcel spawner? Stay here
            while (!this.stopped) {
                await new Promise(res => setImmediate(res));
                return;
            }
        }
        
        if (this.stopped) throw ['stopped']; 

        let index = Math.floor(Math.random() * validDestinations.length);
        let destination = validDestinations[index];
        if (!destination) {
            throw ['no destination found'];
        }

        logDebug(3, 'RandomMove: destination', destination, index);
        
        let path = await this.subIntention('find_path', [destination.x, destination.y]);

        if(path.length === 0) {
            throw ['no path found'];
        }

        if (this.stopped) 
            return false; // if stopped then quit

        const complete = await this.subIntention('execute_path', [path, destination]);
        if (complete) {
            return true;
        } else {
            throw ['path not completed'];
        }
    }
}