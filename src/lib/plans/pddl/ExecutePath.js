import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { me, parcels, updateMe, carryParcel, getAgentsMap, logDebug } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';

export default class ExecutePath extends Plan {
    constructor() {
        super('execute_path');
    }

    isApplicableTo(desire) {
        return desire === 'execute_path'
    }

    async execute(path, target) {
        
        path = path.map(p => p.action.toLowerCase());
        
        this.stopped = false;

        if (!path || path.length == 0) {
            return true;
        }

        let retries = 0
        const MAX_RETRIES = 2 // Max retries before re-computing path
        while (path.length > 0 && retries < MAX_RETRIES) {
            if (this.stopped)
                return false; // if stopped then quit

            await new Promise(res => setImmediate(res));

            let direction = path.shift();
            const moved = await client.move(direction);

            if (me.x % 1 != 0 || me.y % 1 != 0)
                await new Promise(res => client.onYou(res))

            if (me.x === target.x && me.y === target.y)
                return true;

            // There are parcels in the current cell
            let parcelInCell = Array.from(parcels.values()).find(p => p.x === me.x && p.y === me.y)
            if (parcelInCell) {
                let parcelsFound = await client.pickup();
                if (parcelsFound.length > 0) {
                    parcelsFound.forEach(parcelInfo => {
                        carryParcel(parcelInfo);
                        parcels.delete(parcelInfo.id);
                        agent.changeIntentionScore('go_pick_up', [], -1, parcelInfo.id);
                    });
                }
            }

            // There is an agent in the target cell
            // if (getAgentsMap().find(agent => target.x === agent.x && target.y === agent.y)) {
            //     return false
            // }

            if (!moved) {
                retries++;
                // Re-compute path
                let actions = await this.subIntention('find_path', [target.x, target.y])
                path = actions.map(p => p.action.toLowerCase());
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