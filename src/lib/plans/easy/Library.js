import MoveTo from './MoveTo.js'
import PickUpNearest from './PickUpNearest.js'
import RandomMove from './RandomMove.js'
import { plans } from '../../utils/utils.js'

plans.push(new MoveTo())
plans.push(new PickUpNearest())
plans.push(new RandomMove())