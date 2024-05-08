import Plan from './Plan.js';
import { validCells, configs, distance, me, updateMe, logDebug } from '../utils/utils.js';

export default class RandomMove extends Plan {

    constructor() {
        super('go_random');
    }

    isApplicableTo(go_random) {
        return go_random == 'go_random';
    }

    async execute(predicate) {
        this.stopped = false;

        if (this.stopped) throw ['stopped']; // if stopped then quit
        /**
         * Choose a cell that is outside the observation range, but not too far away
         */
        const MAX_DISTANCE = configs.PARCELS_OBSERVATION_DISTANCE * 3;
        // const MIN_DISTANCE = configs.PARCELS_OBSERVATION_DISTANCE;
        await new Promise(res => setImmediate(res));
        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();
        let validDestinations = validCells.filter(cell => {
            if (cell.x === me.x && cell.y === me.y) 
                return false;
            let distanceToCell = distance(cell, me);
            return distanceToCell < MAX_DISTANCE;
        })
        let index = Math.floor(Math.random() * validDestinations.length);
        let destination = validDestinations[index];
        logDebug('RandomMove: destination', destination, index);
        let path = await this.subIntention('a_star', [destination.x, destination.y]);
        path.reverse();
        path.shift();
        
        if(path.length === 0) {
            throw ['no path found'];
        }

        if (this.stopped) throw ['stopped']; // if stopped then quit

        const complete = await this.subIntention('follow_path', [path]);
        if (complete) {
            return true;
        } else {
            throw ['path not completed'];
        }
    }
}