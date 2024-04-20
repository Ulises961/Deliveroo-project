import Plan from '../Plan.js';
import { validCells } from '../../utils/utils.js';

export default class RandomMove extends Plan {

    constructor() {
        super('go_random');
    }

    isApplicableTo(go_random) {
        return go_random == 'go_random';
    }

    async execute(predicate) {
        // TODO: choose from a cell right outside the vision, don't go too far.
        console.log('Executing RandomMove')
     
        if (this.stopped) throw ['stopped']; // if stopped then quit
        let index = Math.floor(Math.random() * validCells.length);
        let destination = validCells[index];
        console.log('RandomMove: destination', destination, index);
        let path = await this.subIntention('a_star', [destination.x, destination.y]);
        path.reverse();
        path.shift();

        if (this.stopped) throw ['stopped']; // if stopped then quit
        
        const complete = await this.subIntention('follow_path', [path]);
        if (complete) {
            // return true;
        } else {
            throw ['path not completed'];
        }
    }
}