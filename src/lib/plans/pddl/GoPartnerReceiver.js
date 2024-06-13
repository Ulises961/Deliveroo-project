import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { getCells, me, updateMe, partner, logDebug, findClosestDelivery, distance, map } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'
import { isCellAdjacent, goToMidPoint, askResponse, takeStepBack, getDirection } from './GoPartnerUtils.js';

let requestInProgress = false;

export default class GoPartnerReceiver extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan
    goPartnerDone = false;

    constructor() {
        super('go_partner_receiver');
        client.socket.on('msg', this.onMsg.bind(this));
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
        let messageTypes = ['go_partner', 'go_partner_abort'];

        if (!messageTypes.includes(message.type))
            return;

        if (requestInProgress) {
            reply(JSON.stringify({ success: false, position: me }));
            return false;
        }

        // The message is to coordinate on the delivery
        if (message.type === 'go_partner') {
            requestInProgress = true;
            let closestDelivery = findClosestDelivery([], me);
            let actions = null;
            let path = null;

            if (me.x !== closestDelivery.point.x || me.y === closestDelivery.point.y) {
                actions = await this.subIntention('find_path', [closestDelivery.point.x, closestDelivery.point.y, true]);
                path = getCells(actions);

                logDebug(4, "[GoPartner] Found path to closest: ", path)

                // If there is no path to the delivery, failure!
                if (!actions || actions.length == 0) {
                    reply(JSON.stringify({
                        type: 'go_partner_response',
                        success: false,
                        position: me
                    }))
                    requestInProgress = false;
                    return false;
                }
            }

            let partnerLocation = message.position;
            let midPoint = null;

            if (isCellAdjacent(me, partnerLocation)) {
                logDebug(4, "[GoPartner2] I'm already beside the partner")
                let previousPosition = { x: me.x, y: me.y };
                let stepBack = await takeStepBack(this, partnerLocation);
                if (!stepBack)
                    midPoint = partnerLocation;
                else
                    midPoint = previousPosition;
            } else {
                logDebug(4, "Partner's position: ", partnerLocation)
                // Find a path from me to the other agent
                let retries = 0;
                let MAX_NUM_MOVEMENT_RETRIES = 3;
                do {
                    actions = await this.subIntention('find_path', [partnerLocation.x, partnerLocation.y, true]);
                } while (actions.length == 0 && retries++ < MAX_NUM_MOVEMENT_RETRIES)

                if (actions.length == 0) {
                    logDebug(4, "[GoPartner2] Could not find path to partner!")
                    reply(JSON.stringify({ success: false, position: me }));
                    requestInProgress = false;
                    return false;
                }

                actions.pop(); // Remove the last action, which is the partner's position
                midPoint = actions.pop(); // Remove the position just before the other agent, to leave space for the parcels

                midPoint = getCells([midPoint])[0];
                logDebug(4, "[GoPartner3] Path to partner: ", actions)

                let pathCompleted = await this.subIntention('execute_path', [actions, partnerLocation]);
            }

            logDebug(4, "[GoPartner4] Now in position")

            let response = await client.ask(partner.id, JSON.stringify({ type: 'go_partner_ready', position: me, midPoint: midPoint }))
            response = JSON.parse(response);

            if (!response.success) {
                reply(JSON.stringify({ success: false, position: me }));
                requestInProgress = false;
                return false;
            }

            if (!midPoint) {
                reply(JSON.stringify({ success: false, position: me }));
                requestInProgress = false;
                return false;
            }
            let direction = getDirection(me, midPoint);
            let moved = await client.move(direction)

            if (!moved) {
                reply(JSON.stringify({ success: false, position: me }));
                requestInProgress = false;
                return false;
            }

            let pickup = await client.pickup();
            logDebug(4, 'Parcel picked up!', pickup)

            agent.changeIntentionScore('go_deliver', [], 999, 'go_deliver')

            reply(JSON.stringify({
                type: 'go_partner_response',
                position: me,
                success: true
            }))
            requestInProgress = false;
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