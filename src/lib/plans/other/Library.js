import { plans } from '../../utils/utils.js'
import GoPickUp from './GoPickUp.js'
import AStar from './AStar.js'
import GoDeliver from './GoDeliver.js'
import FollowPath from './FollowPath.js'
import RandomMove from './RandomMove.js'
import GoPartner from './GoPartner.js'

plans.push(new AStar())
plans.push(new FollowPath())
plans.push(new GoDeliver())
plans.push(new GoPickUp())
plans.push(new RandomMove())
plans.push(new GoPartner())