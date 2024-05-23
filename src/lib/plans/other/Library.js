import { plans } from '../../utils/utils.js'
import GoPickUp from '../GoPickUp.js'
import AStarOld from '../AStar.js'
import GoDeliver from '../GoDeliver.js'
import FollowPath from '../FollowPath.js'
import RandomMove from '../RandomMove.js'
import AStar from '../pddl/AStar.js'

plans.push(new GoPickUp())
plans.push(new AStarOld())
plans.push(new AStar())
plans.push(new GoDeliver())
plans.push(new FollowPath())
plans.push(new RandomMove())