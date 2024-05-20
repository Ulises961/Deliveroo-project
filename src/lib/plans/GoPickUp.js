import Plan from './Plan.js';
import client from '../utils/client.js';
import { distance, me, deliveryPoints, parcels, carryParcel, logDebug, partner } from '../utils/utils.js';
import { agent } from '../utils/agent.js';
import { updateCarriedParcelsScore, computeParcelScore, blacklist } from './other/AgentLoop.js';

export default class GoPickUp extends Plan {

    constructor() {
        super('go_pick_up');
    }

    isApplicableTo(desire) {
        return desire === 'go_pick_up'
    }

    async execute(predicate) {
        logDebug('GoPickUp.execute: predicate ', predicate, ' me ', me);

        if (partner.id) {

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
                logDebug('GoPickUp.execute: no response from partner');
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
        let pickup = await client.pickup();

        if (pickup.length > 0) {
            pickup.forEach(parcelId => {
                let parcel = parcels.get(parcelId);
                carryParcel(parcel);
                parcels.delete(parcelId);
                agent.changeIntentionScore('go_pick_up', [parcel], -1, parcel.id);
            })
            let carryMessage = {
                type: 'carrying',
                parcels: pickup.map(p => p.id),
                position: me
            }
            client.say(partner.id, JSON.stringify(carryMessage)); // send message to partner
        }

        if (this.stopped) throw ['stopped']; // if stopped then quit

        updateCarriedParcelsScore();

        return true;
    }

}
