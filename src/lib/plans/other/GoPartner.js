import Plan from '../Plan.js';
import client from '../../utils/client.js';
import { agentsMap, me, parcels, updateMe, carryParcel, getAgentsMap, partner, logDebug, map, carriedParcels, findClosestDelivery } from '../../utils/utils.js';
import { agent } from '../../utils/agent.js';
import { blacklist } from '../AgentLoop.js'



export default class GoPartner extends Plan {
    // Variable used to know in the listener if the agent has finished the go_partner plan
    amAtMidPoint = false;
    goPartnerDone = false;
    goPartnerProceed = false;

    constructor() {
        super('go_partner');
        this.registerListener();
        this.amAtMidPoint = false;
        this.goPartnerDone = false;
        this.goPartnerProceed = false;
    }

    registerListener() {
        client.onMsg(async (id, name, messageString, reply) => {
            if (this.stopped)
                return;

            if (!partner) // Partner not initialized, ignore the message
                return;
            if (id !== partner.id) // Not my partner, ignore the message
                return;

            let message = null;

            try {
                message = JSON.parse(messageString);
            } catch (e) {
                // logDebug(0, 'Unable to parse message', messageString, e);
                return;
            }

            if (!message)
                return;

            // The message types that are accepted by this listener
            let messageTypes = ['go_partner', 'go_partner_abort', 'go_partner_ready',
                'go_partner_done', 'go_partner_proceed'];

            if (!messageTypes.includes(message.type))
                return;

            // The message is to coordinate on the delivery
            if (message.type === 'go_partner') {
                let closestDelivery = findClosestDelivery([], me);

                let path = await this.subIntention('a_star', [closestDelivery.point.x, closestDelivery.point.y]);

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

                // Find a path from me to the other agent
                path = await this.subIntention('a_star', [partnerLocation.x, partnerLocation.y]);

                // If no path is found, failure!
                if (!path || path.length == 0) {
                    reply(JSON.stringify({
                        type: 'go_partner_response',
                        success: false,
                        position: me
                    }))
                    return false;
                }
                let debugInfo = process.argv[2]

                // Usual reversal of the path (from me to him), then remove current location
                path.reverse();
                path.shift();

                if (path.length <= 1) {
                    // If the agent is already at the partner's location, success!
                    reply(JSON.stringify({
                        type: 'go_partner_response',
                        x: path[0].x,
                        y: path[0].y,
                        position: me,
                        success: true,
                    }))
                    agent.push({ desire: 'go_partner', args: [{ x: me.x, y: me.y, position: path[0] }, false], score: 9999, id: 'go_partner' });
                    return true;
                }

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
                agent.push({ desire: 'go_partner', args: [{ x: myMidPoint.x, y: myMidPoint.x, position: partnerMidPoint }, false], score: 9999, id: 'go_partner' });
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
        })
    }

    isApplicableTo(desire) {
        return desire === 'go_partner'
    }

    isCellAdjacent(firstCell, otherCell) {
        return (firstCell.x === otherCell.x && Math.abs(firstCell.y - otherCell.y) === 1) || (firstCell.y === otherCell.y && Math.abs(firstCell.x - otherCell.x) === 1);
    }

    async askResponse(message) {
        let response = null;
        let retries = 0;
        const MAX_RETRIES = 3;
        while (!response && retries++ < MAX_RETRIES) {
            response = await Promise.race([
                client.ask(partner.id, JSON.stringify(message)),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            await new Promise(res => setImmediate(res));
        }
        agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
    }

    /**
     * @param {{x: number, y: number, position: {x: number, y: number}}} midPoint
     * @param {boolean} initiator
     */
    async execute(midPoint, initiator) {
        setTimeout(() => {
            agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
        }, 5000);

        this.amAtMidPoint = false;
        this.goPartnerDone = false;
        this.goPartnerProceed = false;

        logDebug(2, 'Starting GoPartner!', midPoint, initiator)
        let partnerLocation = midPoint.position

        this.stopped = false;

        let debugInfo = process.argv[2];

        let path = await this.subIntention('a_star', [midPoint.x, midPoint.y]);

        // If not path if found, failure!
        if (!path || path.length == 0) {
            // Send a message to the partner to abort
            logDebug(2, 'No path found!')
            await client.say(partner.id, JSON.stringify({
                type: 'go_partner_abort',
                position: me
            }))
            agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
            return false;
        }

        path = path.reverse(); // From starting point
        path.shift(); // Remove current cell

        let pathCompleted = await this.subIntention('follow_path', [path]);

        if (!pathCompleted && !this.isCellAdjacent(me, partner.position) && !(me.x === partner.position.x && me.y === partner.position.y)) {
            // Send a message to the partner to abort
            logDebug(2, 'Path not completed!')
            await client.say(partner.id, JSON.stringify({
                type: 'go_partner_abort',
                position: me
            }))
            agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
            return false;
        }

        // If I'm still moving, wait!
        if (me.x % 1 != 0 || me.y % 1 != 0)
            await updateMe();

        // If I'm not at the location, failure!
        if ((me.x !== midPoint.x && me.y !== midPoint.y) && !this.isCellAdjacent(me, partner.position)) {
            logDebug(2, 'Not at mid point!')
            // Send a message to the partner to abort
            await client.say(partner.id, JSON.stringify({
                type: 'go_partner_abort',
                position: me
            }))
            agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
            return false;
        }

        // Modify the variable, so the listener knows the agent is at the mid point
        this.amAtMidPoint = true;

        logDebug(2, 'At mid point!')

        // Now they are both in position
        if (initiator) {
            // Now the agent is at the mid point, if it's the initiator, ask if the partner is ready
            let isPartnerInPos = await this.askResponse({ type: 'go_partner_ready', position: me })

            // The initiator needs to put down the parcels, then move one step.
            let parcelsDown = await client.putdown();

            logDebug(2, 'Parcels down!')
            let stepBackPos = map
                .flatMap(row => row)
                .filter(cell => !cell.fakeFloor)
                .filter(cell => cell.x !== partnerLocation.x || cell.y !== partnerLocation.y)
                .filter(cell => this.isCellAdjacent(cell, me))
            logDebug(2, 'Cell found: ', stepBackPos)

            if (!stepBackPos || stepBackPos.length === 0) {
                // TODO We are stuck, need to ask the partner to take a step back 
                logDebug(2, 'Well, error during go_partner, we are f*cked');
                agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
                return false;
            }

            // Go back one step
            pathCompleted = await this.subIntention('follow_path', [stepBackPos]);

            logDebug(2, 'Path completed!')

            this.goPartnerProceed = true;
            await this.askResponse({ type: 'go_partner_done', position: me })
            // await client.ask('go_partner_done', JSON.stringify({ position: me }));

            logDebug(2, 'Go partner successful!')

            // parcelsDown.forEach(parcel => blacklist.push(parcel.id));
            // parcelsDown.forEach(parcel => parcels.delete(parcel.id));

            agent.changeIntentionScore('go_deliver', [], -1, 'go_deliver')
            agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
            carriedParcels.length = 0;
            return true;
        } else {
            // The other agent needs to move one step, then get the parcels
            await this.askResponse({ type: 'go_partner_proceed', position: me })
            // await client.ask('go_partner_proceed', JSON.stringify({ position: me }));

            pathCompleted = await this.subIntention('follow_path', [[{ x: partnerLocation.x, y: partnerLocation.y }]]);

            logDebug(2, 'Path completed!')

            if (me.x % 1 != 0 || me.y % 1 != 0)
                await updateMe();

            logDebug(2, 'Me updated!')

            let pickup = await client.pickup();
            // while (!pickup || pickup.length === 0) {
            //     pickup = ;
            // }
            logDebug(2, 'Parcel picked up!', pickup)

            if (pickup.length < 1) {
                logDebug(2, 'Didn\' pick up any parcel!!!!');
                await client.say(partner.id, JSON.stringify({
                    type: 'go_partner_abort',
                    position: me
                }))
                agent.changeIntentionScore('go_partner', [], -1, 'go_partner')
                return false;
            }

            logDebug(2, 'Done!')
            this.goPartnerDone = true;

            agent.changeIntentionScore('go_partner', [], -1, 'go_partner');
            agent.changeIntentionScore('go_deliver', [], 10000, 'go_deliver');

            return true;
        }
    }
}