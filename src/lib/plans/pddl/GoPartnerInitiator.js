import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { me, parcels, updateMe, partner, logDebug, map, carriedParcels, distance } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'
import { getDirection, getOppositeCell } from './GoPartnerUtils.js';


export default class GoPartnerInitiator extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan

    constructor() {
        super('go_partner_initiator');
        client.socket.on('msg', this.onMsg.bind(this));
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
        let messageTypes = ['go_partner_abort', 'go_partner_ready'];

        if (!messageTypes.includes(message.type))
            return;

        if (message.type == 'go_partner_abort') {
            // The partner has aborted the plan
            agent.changeIntentionScore('go_partner_initiator', [message.position], -1, 'go_partner_initiator');
            this.stop();
        } else if (message.type == 'go_partner_ready') {
            logDebug(4, "[GoPartner] Received go_partner_ready message: ", message)
            // The partner is ready to meet at the mid point
            let midPoint = message.midPoint;
            let direction = null;
            let moved = false;
            let parcelsDown = false;
            let freeCell = null;
            if (!midPoint) {
                reply(JSON.stringify({ success: false, position: me }));
                return false;
            }
            if (midPoint.x != me.x || midPoint.y != me.y) {
                let previousPosition = { x: me.x, y: me.y };
                direction = getDirection(me, midPoint);
                moved = await client.move(direction);
                parcelsDown = await client.putdown();
                direction = getDirection(me, previousPosition);
                moved = await client.move(direction);
            } else {
                parcelsDown = await client.putdown();
                freeCell = getOppositeCell(me, message.position);
                direction = getDirection(me, freeCell);
                moved = await client.move(direction);
            }
            carriedParcels.length = 0;
            agent.changeIntentionScore('go_deliver', [true], -1, 'go_deliver');
            reply(JSON.stringify({
                type: 'go_partner_ready_response',
                success: moved && parcelsDown,
                position: me
            }));
        }
    }

    stop() {
        client.removeListener('msg', this.onMsg);
        this.stopped = true;
        for (let subIntention of this.sub_intentions)
            subIntention.stop();
    }

    isApplicableTo(desire) {
        return desire === 'go_partner_initiator'
    }

    /**
     * @param {{x: number, y: number, position: {x: number, y: number}}} midPoint
     * @param {boolean} initiator
     */
    async execute(midPoint, initiator) {
        return true;
    }
}