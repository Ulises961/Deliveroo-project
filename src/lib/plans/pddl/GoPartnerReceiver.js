import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { getCells, me, updateMe, partner, logDebug, findClosestDelivery } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'
import { isCellAdjacent, goToMidPoint, askResponse } from './GoPartnerUtils.js';

export default class GoPartnerReceiver extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan
    amAtMidPoint = false;
    goPartnerDone = false;
    planInstance = this;
    isRequestInProcess = false;

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

            if (isCellAdjacent(me, partnerLocation)) {
                logDebug(4, "[GoPartner2] I'm already beside the partner")
                this.isRequestInProcess = true;
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
            actions = await this.subIntention('find_path', [partnerLocation.x, partnerLocation.y, true]);
            path = getCells(actions);

            logDebug(4, "[GoPartner3] Path to partner: ", path)

            // If no path is found, failure!
            if (!path || path.length == 0) {
                this.isRequestInProcess = true;
                reply(JSON.stringify({
                    type: 'go_partner_response',
                    success: false,
                    position: me
                }))
                return false;
            }

            // Usual reversal of the path (from me to him), then remove current location
            if (path.length > 1) {
                path.reverse();
                // path.shift();
            }

            if (path.length <= 1) {
                // If the agent is already at the partner's location, success!
                this.isRequestInProcess = true;
                reply(JSON.stringify({
                    type: 'go_partner_response',
                    x: path[0].x,
                    y: path[0].y,
                    position: me,
                    success: true,
                }))
                agent.push({ desire: 'go_partner_receiver', args: [{ x: me.x, y: me.y, position: path[0] }], score: 9999, id: 'go_partner_receiver' });
                return true;
            }

            // Otherwise, find the mid point of the path and send it to the partner, then follow the path
            let partnerMidPoint = path[Math.floor(path.length / 2)];
            let myMidPoint = path[Math.floor(path.length / 2) - 1];
            this.isRequestInProcess = true;
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
            setTimeout(() => {
                if (!this.goPartnerDone) {
                    this.stop();
                    client.say(partner.id, JSON.stringify({
                        type: 'go_partner_abort',
                        position: me
                    }))
                    agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
                }
            }, 2000)
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
            setTimeout(() => {
                if (!this.goPartnerDone) {
                    this.stop();
                    client.say(partner.id, JSON.stringify({
                        type: 'go_partner_abort',
                        position: me
                    }))
                    agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
                }
            }, 2000)

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
        this.amAtMidPoint = false;
        this.goPartnerDone = false;
        this.stopped = false;
        let partnerLocation = midPoint.position

        logDebug(4, 'Starting GoPartner!', midPoint, initiator)

        let pathCompleted = false;
        if (me.x !== midPoint.x || me.y !== midPoint.y) 
            pathCompleted = await goToMidPoint(midPoint, 'go_partner_receiver', this);

        if (!pathCompleted && (me.x !== midPoint.x && me.y !== midPoint.y) && !isCellAdjacent(me, partnerLocation)) {
            this.stop();
            return false;
        }

        // if (this.stopped)
        //     return false;

        // Modify the variable, so the listener knows the agent is at the mid point
        this.amAtMidPoint = true;

        logDebug(4, 'At mid point!')

        // The other agent needs to move one step, then get the parcels
        let proceedResponse = await askResponse({ type: 'go_partner_proceed', position: me }, this)

        // if (!proceedResponse) {
        //     agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
        //     this.stop();
        //     return false;
        // }

        // if (this.stopped)
        //     return false;
        let direction = 'right'
        if (me.x > partnerLocation.x)
            direction = 'left'
        else if (me.y > partnerLocation.y)
            direction = 'up'
        else if (me.y < partnerLocation.y)
            direction = 'down'

        pathCompleted = await this.subIntention('execute_path', [[{x:partnerLocation.x, y: partnerLocation.y, action: direction }], partnerLocation]);

        logDebug(4, 'Path completed!')

        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();

        // if (this.stopped)
        //     return false;

        logDebug(4, 'Me updated!')

        let pickup = await client.pickup();
        logDebug(4, 'Parcel picked up!', pickup)

        // if (pickup.length < 1) {
        //     logDebug(4, 'Didn\' pick up any parcel!!!!');
        //     await client.say(partner.id, JSON.stringify({
        //         type: 'go_partner_abort',
        //         position: me
        //     }))
        //     agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver')
        //     return false;
        // }

        // if (this.stopped)
        //     return false;

        logDebug(4, 'Done!')
        this.goPartnerDone = true;

        let delivery = await this.subIntention('go_deliver', []);

        // agent.changeIntentionScore('go_partner_receiver', [], -1, 'go_partner_receiver');

        return true;
    }
}