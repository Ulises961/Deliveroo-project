import { plans } from '../../utils/utils.js'
import GoPickUp from './GoPickUp.js'
import AStar from './AStar.js'
import GoDeliver from './GoDeliver.js'
import FollowPath from './FollowPath.js'
import RandomMove from './RandomMove.js'
import GoPartnerInitiator from './GoPartnerInitiator.js'
import GoPartnerReceiver from './GoPartnerReceiver.js'

plans.push(new AStar())
plans.push(new FollowPath())
plans.push(new GoDeliver())
plans.push(new GoPickUp())
plans.push(new RandomMove())
plans.push(new GoPartnerInitiator())
plans.push(new GoPartnerReceiver())