import Plan from '../Plan.js';
import { me } from '../../utils/utils.js';
import client from '../../utils/client.js';

export default class MoveTo extends Plan {

    constructor() {
        super('go_to');
    }

    isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(x, y) {
        console.log('Executing MoveTo with predicate', x, y)
        while (Math.ceil(me.x) != x || Math.ceil(me.y) != y)  {
            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            let status_x = false;
            let status_y = false;

            if (x > me.x)
                status_x = await client.move('right')
            else if (x < me.x)
                status_x = await client.move('left')

            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            if (y > me.y)
                status_y = await client.move('up')
            else if (y < me.y)
                status_y = await client.move('down')

            if (!status_x && !status_y) {
                console.log('stuck')
                throw 'stuck';
            }
        }
        return true;
    }
}