import {plans} from '../../utils/utils.js'
import GoPickUp from './GoPickUp.js'
import AStar from '../other/AStar.js'
import GoDeliver from './GoDeliver.js'
import FollowPath from '../other/FollowPath.js'
import RandomMove from '../easy/RandomMove.js'

plans.push( new GoPickUp())
plans.push( new AStar())
plans.push(new GoDeliver())
plans.push(new FollowPath())
plans.push(new RandomMove())