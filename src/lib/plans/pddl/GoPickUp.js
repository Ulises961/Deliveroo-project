import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { distance, me, deliveryPoints, parcels, carryParcel, logDebug, partner } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { updateCarriedParcelsScore, computeParcelScore, blacklist } from '../AgentLoop.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo(desire) {
        return desire === 'go_pick_up'
    }

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
                logDebug(3, 'GoPickUp.execute: no response from partner');
            }
        }

        let path = await this.subIntention('find_path', [predicate.x, predicate.y]);
        logDebug(0, 'GoPickUp.execute: path ', path);
        if (path.length === 0) {
            agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);

            throw ['No path found'];
        }
        let target = {x: predicate.x, y: predicate.y};
        await this.subIntention('execute_path', [path, target]);
        let pickup = await client.pickup();

        if (pickup.length > 0) {
            pickup.forEach(parcelId => {
                let parcel = parcels.get(parcelId);
                carryParcel(parcel);
                parcels.delete(parcelId);
                agent.changeIntentionScore('go_pick_up', [parcel], -1, parcel.id);
            
            })
        }

        if (this.stopped) throw ['stopped']; // if stopped then quit

        updateCarriedParcelsScore();

        return true;
    }

}
