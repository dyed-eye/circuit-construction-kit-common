// Copyright 2021-2024, University of Colorado Boulder

import circuitConstructionKitCommon from '../../../circuitConstructionKitCommon.js';
import MNACircuitElement from './MNACircuitElement.js';

/**
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default class MNABattery extends MNACircuitElement {
  public readonly voltage: number;

  public constructor( nodeId0: string, nodeId1: string, voltage: number ) {
    super( nodeId0, nodeId1 );
    this.voltage = voltage;
  }
}

circuitConstructionKitCommon.register( 'MNABattery', MNABattery );