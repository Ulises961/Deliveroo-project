import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { getCells, me, updateMe, partner, logDebug, findClosestDelivery, distance, map } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'
import { isCellAdjacent, goToMidPoint, askResponse, takeStepBack, getDirection } from './GoPartnerUtils.js';

export default class GoPartnerReceiver extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan
    amAtMidPoint = false;
    goPartnerDone = false;
    planInstance = this;
    isRequestInProcess = false;
    partnerLocation = null;
    isPartnerInPos = false;

    constructor() {
        super('go_partner_receiver');
        client.socket.on('msg', this.onMsg.bind(this));
        this.amAtMidPoint = false;
        this.goPartnerDone = false;
    }

    async onMsg(id, name, messageString, reply) {
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

            let actions = await this.subIntention('find_path', [closestDelivery.point.x, closestDelivery.point.y, true]);
            let path = getCells(actions);

            logDebug(4, "[GoPartner] Found path to closest: ", path)

            // If there is no path to the delivery, failure!
            if (!path || path.length == 0) {
                this.isRequestInProcess = true;
                reply(JSON.stringify({
                    type: 'go_partner_response',
                    success: false,
                    position: me
                }))
                return false;
            }

            let partnerLocation = message.position;
            let midPoint = null;

            if (isCellAdjacent(me, partnerLocation)) {
                logDebug(4, "[GoPartner2] I'm already beside the partner")
                let previousPosition = { x: me.x, y: me.y };
                await takeStepBack(this, partnerLocation);
                midPoint = previousPosition;
                if (midPoint.x == me.x && midPoint.y == me.y) {
                    midPoint = partnerLocation;
                }
            } else {
                // Find a path from me to the other agent
                let retries = 0;
                let MAX_NUM_MOVEMENT_RETRIES = 3;
                do {
                    actions = await this.subIntention('find_path', [partnerLocation.x, partnerLocation.y, true]);
                } while (actions.length == 0 && retries++ < MAX_NUM_MOVEMENT_RETRIES)

                if (actions.length == 0) {
                    logDebug(4, "[GoPartner2] Could not find path to partner!")
                    reply(JSON.stringify({ success: false, position: me }));
                    return false;
                }

                actions.pop(); // Remove the last action, which is the partner's position
                midPoint = actions.pop(); // Remove the position just before the other agent, to leave space for the parcels

                logDebug(4, "[GoPartner3] Path to partner: ", path)

                let pathCompleted = await this.subIntention('execute_path', [actions, partnerLocation]);
            }

            let response = await client.ask(partner.id, JSON.stringify({ type: 'go_partner_ready', position: me, midPoint: midPoint }))

            if (!midPoint)
                reply(JSON.stringify({ success: false, position: me }));
            let direction = getDirection(me, midPoint);
            let moved = await client.move(direction)

            let pickup = await client.pickup();
            logDebug(4, 'Parcel picked up!', pickup)

            agent.changeIntentionScore('go_deliver', [], 999, 'go_deliver')

            reply(JSON.stringify({
                type: 'go_partner_response',
                position: me,
                success: true
            }))
        } else if (message.type == 'go_partner_abort') {
            // The partner has aborted the plan
            agent.changeIntentionScore('go_partner', [message.position], -1, 'go_partner');
        }
    }

    isApplicableTo(desire) {
        return desire === 'go_partner_receiver'
    }

    stop() {
        client.removeListener('msg', this.onMsg);
        this.stopped = true;
        for (let subIntention of this.sub_intentions)
            subIntention.stop();
    }

    /**
     * @param {{x: number, y: number, position: {x: number, y: number}}} midPoint
     * @param {boolean} initiator
     */
    async execute(midPoint, initiator) {

    }
}