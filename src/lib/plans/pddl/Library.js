import { plans } from '../../utils/utils.js'
import GoPickUp from './GoPickUp.js'
import GoDeliver from './GoDeliver.js'
import ExecutePath from './ExecutePath.js'
import RandomMove from './RandomMove.js'
import PathFinder from './PathFinder.js';
import PickUpNearest from './PickUpNearest.js'
import GoPartnerInitiator from './GoPartnerInitiator.js'
import GoPartnerReceiver from './GoPartnerReceiver.js'

plans.push(new ExecutePath())
plans.push(new GoDeliver())
plans.push(new GoPickUp())
plans.push(new PathFinder())
plans.push(new PickUpNearest())
plans.push(new RandomMove())
plans.push(new GoPartnerInitiator())
plans.push(new GoPartnerReceiver())