import Plan from './Plan.js';
import client from '../utils/client.js';
import { me, parcels, updateMe } from '../utils/utils.js';

export default class FollowPath extends Plan {
    constructor() {
        super('follow_path');
    }

    isApplicableTo(desire) {
        return desire === 'follow_path'
    }

    async execute(path) {
        // const parcelsOnTheWay = Array.from(parcels.values()).map(p => path.filter(cell => cell.x === p.x && cell.y === p.y)).flat();
        // console.log('GoPickUp.execute: path ', path, ' parcelsOnTheWay ', parcelsOnTheWay);
        const target = path[path.length - 1];

        let retries = 0
        const MAX_RETRIES = 5 // Max retries before re-computing path
        while (path.length > 0 && retries < MAX_RETRIES) {
            if (this.stopped)
                throw ['stopped']; // if stopped then quit
            
            await new Promise(res => setImmediate(res));
            if (me.x % 1 != 0 || me.y % 1 != 0)
                await new Promise(res => client.onYou(res))

            const currentCell = path.shift();
            let direction = 'right';
            if (me.x > currentCell.x)
                direction = 'left';
            else if (me.y > currentCell.y)
                direction = 'down';
            else if (me.y < currentCell.y)
                direction = 'up';

            const moved = await client.move(direction);

            updateMe();
            if (me.x % 1 != 0 || me.y % 1 != 0)
                await new Promise(res => client.onYou(res))

            if (Array.from(parcels.values()).find(p => p.x === me.x && p.y === me.y)) {
                await client.pickup();
            }

            if (!moved) {
                retries++;
                // Re-compute path
                path = await this.subIntention('a_star', [target.x, target.y]);
            }
        }


        if (retries === MAX_RETRIES) {
            return false;
        }


        if (me?.x === target?.x && me?.y === target?.y) {
            return true;
        } else {
            // console.log('FollowPath.execute: path not completed', path, me);
            return false;
        }
    }
}