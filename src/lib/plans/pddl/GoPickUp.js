import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { distance, me, deliveryPoints, parcels, carryParcel, logDebug, partner, updateMe } from '../../utils/utils.js';
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
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
                ])

                if (response === 'no') {
                    blacklist.push(predicate.id)
                    parcels.delete(predicate.id)
                    agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);
                    return false;
                }
            } catch (e) {
                logDebug(3, 'GoPickUp.execute: no response from partner');
            }
        }

        if (predicate.x !== me.x || predicate.y !== me.y) {

            let path = await this.subIntention('find_path', [predicate.x, predicate.y]);
            logDebug(0, 'GoPickUp.execute: path ', path);

            if (path.length === 0) {
                agent.changeIntentionScore('go_pick_up', [predicate], -1, predicate.id);

                throw ['No path found'];
            }
            let target = { x: predicate.x, y: predicate.y };
            await this.subIntention('execute_path', [path, target]);
        }

        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();

        let pickup = await client.pickup();

        if (pickup.length > 0) {
            pickup.forEach(parcelInfo => {
                let parcelId = parcelInfo.id
                carryParcel(parcelInfo);
                parcels.delete(parcelId);
                agent.changeIntentionScore('go_pick_up', [], -1, parcelId);
            })
        }

        updateCarriedParcelsScore();


        return true;
    }

}
