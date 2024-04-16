import Plan from '../Plan.js';
import { me } from '../../utils/utils.js';
import client from '../../utils/client.js';

class MoveTo extends Plan {

    constructor() {
        super('a_star');
    }

    isApplicableTo(go_to, x, y) {
        return go_to == 'a_star';
    }

    async execute(go_to, x, y, id) {
        console.log('Executing MoveTo')
        while (me.x != x || me.y != y) {
            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            let status_x = false;
            let status_y = false;

            if (x > me.x)
                status_x = await client.move('right')
            else if (x < me.x)
                status_x = await client.move('left')

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            if (y > me.y)
                status_y = await client.move('up')
            else if (y < me.y)
                status_y = await client.move('down')

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            if (!status_x && !status_y) {
                this.log('stuck');
                throw 'stuck';
            } else if (me.x == x && me.y == y) {
                // this.log('target reached');
            }
        }
        return true;
    }
}

export { MoveTo };