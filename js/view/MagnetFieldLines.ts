// Copyright 2025, University of Colorado Boulder
// @author student

import Shape from '../../../kite/js/Shape.js';
import Node from '../../../scenery/js/nodes/Node.js';
import Path from '../../../scenery/js/nodes/Path.js';
import Property from '../../../axon/js/Property.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import type Inductor from '../model/Inductor.js';

// constants
const ARROW_WIDTH = 16;
const ARROW_HEIGHT = 18;

// Describes ellipse lines (sizes + arrow locations)
const LINE_DESCRIPTION = [
  { a: 60, b: 30, arrowPositions: [ Math.PI / 3.5, Math.PI - Math.PI / 3.5 ] },
  { a: 35, b: 12.5, arrowPositions: [ Math.PI / 7, Math.PI - Math.PI / 7 ] },
  { a: 18, b: 5, arrowPositions: [ -Math.PI / 2 ] },
  { a: 9, b: 2.5, arrowPositions: [ -Math.PI / 2 ] }
];

// Updated to accept centerX, centerY
function createArrow( options: { stroke: string; lineWidth: number } ): Path {
  return new Path(
    new Shape()
      .moveTo( -ARROW_WIDTH, -ARROW_HEIGHT / 2 )
      .lineTo( 0, 0 )
      .lineTo( -ARROW_WIDTH, ARROW_HEIGHT / 2 ),
    {
      stroke: options.stroke,
      lineWidth: options.lineWidth
    }
  );
}

function createArcWithArrow(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  arrowPositions: number[],
  orientationProperty: Property<number>,
  options: { stroke: string; lineWidth: number }
): Node {
  const arcWithArrow = new Node();

  // Draw ellipse centered at centerX, centerY
  const ellipticalShape = new Shape().ellipticalArc( centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI );
  arcWithArrow.addChild( new Path( ellipticalShape, {
    stroke: options.stroke,
    lineWidth: options.lineWidth
  } ) );

  // Draw arrows
  arrowPositions.forEach( angle => {
    const x = centerX + radiusX * Math.cos( angle );
    const y = centerY + radiusY * Math.sin( angle );
    const arrow = createArrow( options );
    arrow.right = x;
    arrow.centerY = y;

    // Direction: tangent to ellipse at angle
    const tangentAngle = Math.atan2(
      radiusX * Math.sin( angle ),
      -radiusY * Math.cos( angle )
    );
    arrow.rotation = tangentAngle;

    // Flip on orientation
    orientationProperty.link( orientation => {
      arrow.rotation = tangentAngle + ( orientation < 0 ? Math.PI : 0 );
    } );
    arcWithArrow.addChild( arrow );
  } );

  return arcWithArrow;
}

function createSideFieldLines(
  orientationProperty: Property<number>,
  scaleY: number,
  color: string,
  visibleLines: number,
  centerX: number,
  centerY: number
): Node {
  const sideFieldLinesContainer = new Node();
  const dy = 3;

  for ( let i = 0; i < visibleLines; i++ ) {
    const line = LINE_DESCRIPTION[ i ];
    const arc = createArcWithArrow(
      centerX, centerY,
      line.a, line.b, line.arrowPositions,
      orientationProperty, {
        stroke: color,
        lineWidth: 3
      }
    );
    arc.bottom = 2 - i * dy;
    arc.centerX = 0;
    sideFieldLinesContainer.addChild( arc );
  }
  sideFieldLinesContainer.scale( 1, scaleY );
  return sideFieldLinesContainer;
}

class MagnetFieldLines extends Node {
  private readonly topLines: Node;
  private readonly bottomLines: Node;
  private readonly inductor: Inductor;
  private readonly orientationProperty: Property<number>;
  private readonly fieldLinesVisibleProperty: Property<boolean>;
  private readonly color: string;
  private readonly centerX: number;
  private readonly centerY: number;

  public constructor(
    inductor: Inductor,
    options?: { tandem?: unknown; color?: string; centerX?: number; centerY?: number }
  ) {
    const orientationProperty: Property<number> =
      ( inductor as Inductor & { orientationProperty?: Property<number> } ).orientationProperty ||
      new Property( 1 );
    const fieldLinesVisibleProperty: Property<boolean> =
      ( inductor as Inductor & { fieldLinesVisibleProperty?: Property<boolean> } ).fieldLinesVisibleProperty ||
      new Property( true );
    const color = options?.color ?? '#ffffff';
    const centerX = options?.centerX ?? 0;
    const centerY = options?.centerY ?? 0;

    const topLines = new Node();
    const bottomLines = new Node();

    super( {
      tandem: options?.tandem,
      children: [ topLines, bottomLines ]
    } );

    this.inductor = inductor;
    this.orientationProperty = orientationProperty;
    this.fieldLinesVisibleProperty = fieldLinesVisibleProperty;
    this.topLines = topLines;
    this.bottomLines = bottomLines;
    this.color = color;
    this.centerX = centerX;
    this.centerY = centerY;

    // Only maxLines = 4 since LINE_DESCRIPTION has 4 entries
    if ( ( inductor as Inductor & { currentProperty?: Property<number> } ).currentProperty ) {
      ( inductor as Inductor & { currentProperty: Property<number> } ).currentProperty.link( ( current: number ): void => {
        const maxLines = 4;
        const minLines = 1;
        const absCurrent = Math.abs( current );
        let nLines = minLines + Math.floor( ( maxLines - minLines ) * Math.min( absCurrent / 2, 1 ) );
        nLines = Math.max( minLines, Math.min( maxLines, nLines ) );
        this.topLines.removeAllChildren();
        this.bottomLines.removeAllChildren();
        for ( let i = 0; i < nLines; i++ ) {
          this.topLines.addChild( createArcWithArrow(
            centerX, centerY,
            LINE_DESCRIPTION[ i ].a, LINE_DESCRIPTION[ i ].b, LINE_DESCRIPTION[ i ].arrowPositions,
            orientationProperty, { stroke: color, lineWidth: 3 }
          ) );
          this.bottomLines.addChild( createArcWithArrow(
            centerX, centerY,
            LINE_DESCRIPTION[ i ].a, LINE_DESCRIPTION[ i ].b, LINE_DESCRIPTION[ i ].arrowPositions,
            orientationProperty, { stroke: color, lineWidth: 3 }
          ) );
        }
      } );
    }

    this.fieldLinesVisibleProperty.linkAttribute( this, 'visible' );
  }
}

circuitConstructionKitCommon.register( 'MagnetFieldLines', MagnetFieldLines );
export default MagnetFieldLines;