import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { distance, me, deliveryPoints, parcels, carryParcel, logDebug, partner } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { updateCarriedParcelsScore, blacklist } from '../AgentLoop.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo(desire) {
        return desire === 'go_pick_up'
    }

    /**
     * Execute the plan to pick up a parcel
     * @param {{}} predicate 
     * @returns true if the parcel is picked up successfully
     * @throws {['No path found']} if no path is found to the parcel
     */
    async execute(predicate) {
        logDebug(0, 'GoPickUp.execute: predicate ', predicate, ' me ', me);

        if (partner && partner.id) {
            let question = {
                type: 'pick_up',
                parcel: predicate,
                position: me,
                distance: distance(me, predicate)
            }

            // Wait for 500ms for a response from the partner, otherwise continue
            try {
                let response = await Promise.race([
                    client.ask(partner.id, JSON.stringify(question)),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
                ])
    
                if (response === 'no') {
                    blacklist.push(predicate.id)
                    agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);
                    return false;
                }
            } catch (e) {
                logDebug(3, 'GoPickUp.execute: no response from partner', e);
            }
        }

        let path = await this.subIntention('a_star', [predicate.x, predicate.y]);

        if (path.length === 0) {
            agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);

            throw ['No path found'];
        }
      
        path = path.reverse();
        path.shift();
        await this.subIntention('follow_path', [path]);

        if (me.x % 1 != 0 || me.y % 1 != 0)
            await client.onYou(res => res());
        
        let pickup = await client.pickup();

        if (pickup.length > 0) {
            pickup.forEach(parcelInfo => {
                carryParcel(parcelInfo);
                parcels.delete(parcelInfo.id);
                agent.changeIntentionScore('go_pick_up', [], -1, parcelInfo.id);
            })
        } else {
            agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);
            parcels.delete(predicate.id)
        }

        if (this.stopped) throw ['stopped']; // if stopped then quit

        updateCarriedParcelsScore();

        return true;
    }

}
