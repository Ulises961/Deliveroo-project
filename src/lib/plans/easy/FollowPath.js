import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { me } from '../../utils/utils.js';

export default class FollowPath extends Plan {
    constructor() {
        super('follow_path');
    }

    isApplicableTo(desire) {
        return desire === 'follow_path'
    }

    async execute(path) {
        let retries = 0
        const MAX_RETRIES = 5 // Max retries before re-computing path
        console.log(me, path)
        while (path.length > 0 && retries < MAX_RETRIES) {
            if (this.stopped)
                throw ['stopped']; // if stopped then quit

            me.x = Math.ceil(me.x);
            me.y = Math.ceil(me.y);

            const currentCell = path.shift();
            let direction = 'right';
            if (me.x > currentCell.x)
                direction = 'left';
            else if (me.y > currentCell.y)
                direction = 'down';
            else if (me.y < currentCell.y)
                direction = 'up';

            const moved = await client.move(direction);
            await new Promise(res => client.onYou(m => m.x % 1 !== 0 || m.y % 1 !== 0) ? client.onYou(res) : res());

            if (!moved) {
                retries++;
            }
        }

        if (retries === MAX_RETRIES) {
            return false;
        }
        return true;
    }

}