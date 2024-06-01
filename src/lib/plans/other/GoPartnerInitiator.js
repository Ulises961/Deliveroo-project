import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { agentsMap, me, parcels, updateMe, carryParcel, getAgentsMap, partner, logDebug, map, carriedParcels, findClosestDelivery } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'
import { isCellAdjacent, goToMidPoint, askResponse } from './GoPartnerUtils.js';


export default class GoPartnerInitiator extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan
    amAtMidPoint = false;
    goPartnerProceed = false;

    constructor() {
        super('go_partner_initiator');
        client.socket.on('msg', this.onMsg.bind(this));
        this.amAtMidPoint = false;
        this.goPartnerProceed = false;
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
        let messageTypes = ['go_partner_abort', 'go_partner_proceed'];

        if (!messageTypes.includes(message.type))
            return;

        if (message.type == 'go_partner_abort') {
            // The partner has aborted the plan
            agent.changeIntentionScore('go_partner_initiator', [message.position], -1, 'go_partner_initiator');
            this.stop();
        } else if (message.type == 'go_partner_proceed') {
            // The partner is ready to meet at the mid point
            while (!this.goPartnerProceed) {
                if (this.stopped)
                    return;
                await new Promise(resolve => setTimeout(resolve, 100));
                await new Promise(res => setImmediate(res));
            }

            reply(JSON.stringify({
                type: 'go_partner_proceed_response',
                position: me
            }))
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
        setTimeout(() => {
            this.stop();
            agent.changeIntentionScore('go_partner_initiator', [], -1, 'go_partner_initiator')
        }, 5000);

        if (carriedParcels.length == 0) {
            this.stop();
            return false;
        }

        this.amAtMidPoint = false;
        this.goPartnerProceed = false;
        this.stopped = false;
        let partnerLocation = midPoint.position

        logDebug(4, 'Starting GoPartner!', midPoint, initiator)

        let pathCompleted = await goToMidPoint(midPoint, 'go_partner_initiator', this);

        if (this.stopped)
            return false;

        if (!pathCompleted) {
            this.stop();
            return false;
        }

        this.amAtMidPoint = true;

        logDebug(4, 'At mid point!')

        // Now they are both in position
        // Now the agent is at the mid point, if it's the initiator, ask if the partner is ready
        let isPartnerInPos = await askResponse({ type: 'go_partner_ready', position: me }, this)

        if (this.stopped)
            return false;

        logDebug(4, 'Partner in position: ', isPartnerInPos)

        if (!isPartnerInPos) {
            agent.changeIntentionScore('go_partner_initiator', [], -1, 'go_partner_initiator')
            return false;
        }

        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();

        // The initiator needs to put down the parcels, then move one step.
        let parcelsDown = []
        do {
            parcelsDown = await client.putdown();
        } while (parcelsDown.length == 0)

        if (this.stopped)
            return false;

        carriedParcels.length = 0;
        parcelsDown.forEach(parcel => parcels.delete(parcel.id));
        agent.changeIntentionScore('go_deliver', [], -1, 'go_deliver')

        logDebug(4, 'Parcels down!')
        let stepBackPos = map
            .flatMap(row => row)
            .filter(cell => !cell.fakeFloor)
            .filter(cell => cell.x !== partnerLocation.x || cell.y !== partnerLocation.y)
            .filter(cell => cell.x !== midPoint.x || cell.y !== midPoint.y)
            .filter(cell => isCellAdjacent(cell, me))
        logDebug(4, 'Cell found: ', stepBackPos)

        if (this.stopped)
            return false;

        if (!stepBackPos || stepBackPos.length === 0) {
            logDebug(4, 'Well, error during go_partner, we are f*cked');
            agent.changeIntentionScore('go_partner_initiator', [], -1, 'go_partner_initiator')
            return false;
        }

        // Go back one step
        pathCompleted = await this.subIntention('follow_path', [stepBackPos, true]);

        if (this.stopped)
            return false;

        logDebug(4, 'Path completed!')

        this.goPartnerProceed = true;
        let partnerDone = await askResponse({ type: 'go_partner_done', position: me }, this)

        if (!partnerDone) {
            agent.changeIntentionScore('go_partner_initiator', [], -1, 'go_partner_initiator')
            return false;
        }

        if (this.stopped)
            return false;

        logDebug(4, 'Go partner successful!')

        agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
        carriedParcels.length = 0;
        return true;
    }
}