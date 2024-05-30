import client from '../../utils/client.js';
import { carryParcel, getAgentsMap, me, parcels } from '../../utils/utils.js';
import Plan from '../Plan.js';

export default class ExecutePath extends Plan {
    constructor() {
        super('execute_path');
    }

    isApplicableTo(desire) {
        return desire === 'execute_path'
    }

    async execute(path, target) {
        this.stopped = false;
      
        if (!path || path.length == 0) {
            return true;
        }
        
        let retries = 0
        const MAX_RETRIES = 5 // Max retries before re-computing path
        while (path.length > 0 && retries < MAX_RETRIES) {
            if (this.stopped)
                throw ['stopped'];

            await new Promise(res => setImmediate(res));
            if (me.x % 1 != 0 || me.y % 1 != 0)
                await new Promise(res => client.onYou(res))

            let direction = path.shift();
            const moved = await client.move(direction);

            if (me.x % 1 != 0 || me.y % 1 != 0)
                await new Promise(res => client.onYou(res))

            // There are parcels in the current cell
            let parcelInCell = Array.from(parcels.values()).find(p => p.x === me.x && p.y === me.y)
            if (parcelInCell) {
                await client.pickup();
                carryParcel(parcelInCell);
            }

            // There is an agent in the target cell
            if (getAgentsMap().find(agent => target.x === agent.x && target.y === agent.y)) {
                return false
            }

            if (!moved) {
                retries++;
                // Re-compute path
                path = await this.subIntention('find_path', [target.x, target.y]);
            }
        }

        if (retries === MAX_RETRIES) {
            return false;
        }

        if (me?.x === target?.x && me?.y === target?.y) {
            return true;
        } else {
            return false;
        }
    }
}