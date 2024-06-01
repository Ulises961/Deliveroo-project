import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { agentsMap, me, parcels, updateMe, carryParcel, getAgentsMap, partner, logDebug, map, carriedParcels, findClosestDelivery } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'
import { isCellAdjacent, goToMidPoint, askResponse } from './GoPartnerUtils.js';

export default class GoPartnerReceiver extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan
    amAtMidPoint = false;
    goPartnerDone = false;
    planInstance = this;

    constructor() {
        super('go_partner_receiver');
        client.socket.on('msg', this.onMsg.bind(this));
        this.amAtMidPoint = false;
        this.goPartnerDone = false;
    }

    async onMsg(id, name, messageString, reply) {
        if (this.stopped)
            return;

        if (!partner || id !== partner.id) // Not my partner, ignore the message
            return;

        let message = null;

        try {
            message = JSON.parse(messageString);
        } catch (e) {
            return;
        }

        // The message types that are accepted by this listener
        let messageTypes = ['go_partner', 'go_partner_abort', 'go_partner_ready', 'go_partner_done'];

        if (!messageTypes.includes(message.type))
            return;

        // The message is to coordinate on the delivery
        if (message.type === 'go_partner') {
            let closestDelivery = findClosestDelivery([], me);

            let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);

            logDebug(4, "[GoPartner] Found path to closest: ", path)

            // If there is no path to the delivery, failure!
            if (!path || path.length == 0) {
                reply(JSON.stringify({
                    type: 'go_partner_response',
                    success: false,
                    position: me
                }))
                return false;
            }

            let partnerLocation = message.position;

            if (isCellAdjacent(me, partnerLocation)) {
                logDebug(4, "[GoPartner2] I'm already beside the partner")
                reply(JSON.stringify({
                    type: 'go_partner_response',
                    x: partnerLocation.x,
                    y: partnerLocation.y,
                    position: me,
                    success: true,
                }))
                // this.stop();
                agent.push({ desire: 'go_partner_receiver', args: [{ x: me.x, y: me.y, position: partnerLocation }], score: 9999, id: 'go_partner_receiver' });
                return true;
            }

            // Find a path from me to the other agent
            path = await this.subIntention('a_star', [partnerLocation.x, partnerLocation.y]);

            logDebug(4, "[GoPartner3] Path to partner: ", path)

            // If no path is found, failure!
            if (!path || path.length == 0) {
                reply(JSON.stringify({
                    type: 'go_partner_response',
                    success: false,
                    position: me
                }))
                return false;
            }

            // Usual reversal of the path (from me to him), then remove current location
            path.reverse();
            path.shift();

            // if (path.length <= 1) {
            //     // If the agent is already at the partner's location, success!
            //     reply(JSON.stringify({
            //         type: 'go_partner_response',
            //         x: path[0].x,
            //         y: path[0].y,
            //         position: me,
            //         success: true,
            //     }))
            //     agent.push({ desire: 'go_partner_receiver', args: [{ x: me.x, y: me.y, position: path[0] }], score: 9999, id: 'go_partner_receiver' });
            //     return true;
            // }

            // Otherwise, find the mid point of the path and send it to the partner, then follow the path
            let partnerMidPoint = path[Math.floor(path.length / 2)];
            let myMidPoint = path[Math.floor(path.length / 2) - 1];
            reply(JSON.stringify({
                type: 'go_partner_response',
                x: partnerMidPoint.x,
                y: partnerMidPoint.y,
                success: true,
                position: me
            }))
            agent.push({ desire: 'go_partner_receiver', args: [{ x: myMidPoint.x, y: myMidPoint.x, position: partnerMidPoint }], score: 9999, id: 'go_partner_receiver' });
        } else if (message.type == 'go_partner_abort') {
            // The partner has aborted the plan
            agent.changeIntentionScore('go_partner', [message.position], -1, 'go_partner');
        } else if (message.type == 'go_partner_ready') {
            // The partner is ready to meet at the mid point
            while (!this.amAtMidPoint) {
                if (this.stopped)
                    return;
                await new Promise(resolve => setTimeout(resolve, 100));
                await new Promise(res => setImmediate(res));
            }

            reply(JSON.stringify({
                type: 'go_partner_ready_response',
                position: me
            }))
        } else if (message.type == 'go_partner_done') {
            // The partner is ready to meet at the mid point
            while (!this.goPartnerDone) {
                if (this.stopped)
                    return;
                await new Promise(resolve => setTimeout(resolve, 100));
                await new Promise(res => setImmediate(res));
            }

            reply(JSON.stringify({
                type: 'go_partner_done_response',
                position: me
            }))
        }
    }

    isApplicableTo(desire) {
        return desire === 'go_partner_receiver'
    }

    /**
     * @param {{x: number, y: number, position: {x: number, y: number}}} midPoint
     * @param {boolean} initiator
     */
    async execute(midPoint, initiator) {
        setTimeout(() => {
            agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
        }, 5000);

        this.amAtMidPoint = false;
        this.goPartnerDone = false;
        this.stopped = false;
        let partnerLocation = midPoint.position

        logDebug(4, 'Starting GoPartner!', midPoint, initiator)

        let pathCompleted = await goToMidPoint(midPoint, 'go_partner_receiver', this);

        if (!pathCompleted) {
            this.stop();
            return false;
        }

        // Modify the variable, so the listener knows the agent is at the mid point
        this.amAtMidPoint = true;

        logDebug(4, 'At mid point!')

        // The other agent needs to move one step, then get the parcels
        let proceedResponse = await askResponse({ type: 'go_partner_proceed', position: me }, this)

        if (!proceedResponse) {
            agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
            this.stop();
            return false;
        }

        pathCompleted = await this.subIntention('follow_path', [[{ x: partnerLocation.x, y: partnerLocation.y }]]);

        logDebug(4, 'Path completed!')

        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();

        logDebug(4, 'Me updated!')

        let pickup = await client.pickup();
        logDebug(4, 'Parcel picked up!', pickup)

        if (pickup.length < 1) {
            logDebug(4, 'Didn\' pick up any parcel!!!!');
            await client.say(partner.id, JSON.stringify({
                type: 'go_partner_abort',
                position: me
            }))
            agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
            return false;
        }

        logDebug(4, 'Done!')
        this.goPartnerDone = true;

        agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver');
        agent.changeIntentionScore('go_deliver', [], 10000, 'go_deliver');

        return true;
    }
}