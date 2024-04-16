import MoveTo from './MoveTo.js'
import PickUpNearest from './PickUpNearest.js'
import RandomMove from './RandomMove.js'
import AStar from './AStar.js'
import FollowPath from './FollowPath.js'
import { plans } from '../../utils/utils.js'

plans.push(new MoveTo())
plans.push(new PickUpNearest())
plans.push(new RandomMove())
plans.push(new AStar())
plans.push(new FollowPath())