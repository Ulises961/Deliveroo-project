import {plans} from '../../utils/utils.js'
import GoPickUp from './GoPickUp.js'
import BlindMove from './BlindMove.js'
import GoTo from './GoTo.js'

plans.push( new GoPickUp())
plans.push( new BlindMove())
plans.push( new GoTo())