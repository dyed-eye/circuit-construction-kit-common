// Copyright 2025, University of Colorado Boulder
// @author author

import Shape from '../../../kite/js/Shape.js';
import Node from '../../../scenery/js/nodes/Node.js';
import Path from '../../../scenery/js/nodes/Path.js';
import Property from '../../../axon/js/Property.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import type Inductor from '../model/Inductor.js';
import Vector2 from '../../../dot/js/Vector2.js';

const ARROW_WIDTH = 36;
const LINE_WIDTH = 3;

const ELLIPSES_PER_SIDE = 3;

// Large ellipses, just touching
const FIELD_LINE_BASE_WIDTH = 210;   // Vertical span (since 90deg rotated)
const FIELD_LINE_BASE_HEIGHT = 126;  // Horizontal span (since 90deg rotated)
const FIELD_LINE_BASE_OFFSET = FIELD_LINE_BASE_HEIGHT / 2; // Centers just touch

// Angles for arrows: ±π/4 and ±3π/4, plus 50deg offset for > heads
const ARROW_ANGLES_ORIGINAL = [ Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4 ];
const ARROW_ANGLE_OFFSET = Math.PI / 180 * 50; // 50 degrees in radians

function createArrow( options: { stroke: string; lineWidth: number } ): Path {
  // Draw a simple ">" shape with a 50deg opening, 3x larger
  const theta = 0.5 * ARROW_ANGLE_OFFSET;
  const r = ARROW_WIDTH / 2;
  const shape = new Shape()
    .moveTo( 0, 0 )
    .lineTo( r * Math.cos( theta ), r * Math.sin( theta ) )
    .moveTo( 0, 0 )
    .lineTo( r * Math.cos( -theta ), r * Math.sin( -theta ) );
  return new Path( shape, {
    stroke: options.stroke,
    lineWidth: options.lineWidth,
    fill: null
  } );
}

// Two vertically stacked ellipses ("00"), rotated by 90deg from standard, just touching
function createDoubleEllipseFieldLine(
  width: number,
  height: number,
  offset: number,
  arrowAngles: number[], // Angles in radians for arrows along each ellipse
  orientation: number,
  options: { stroke: string; lineWidth: number }
): Node {
  const container = new Node( { pickable: false } );
  const N = 100;

  // TOP ellipse (center at 0, -offset)
  const topPoints: Vector2[] = [];
  for ( let i = 0; i <= N; i++ ) {
    const t = ( i / N ) * 2 * Math.PI;
    topPoints.push( new Vector2( width / 2 * Math.sin( t ), -offset + height / 2 * Math.cos( t ) ) );
  }
  // BOTTOM ellipse (center at 0, +offset)
  const bottomPoints: Vector2[] = [];
  for ( let i = 0; i <= N; i++ ) {
    const t = ( i / N ) * 2 * Math.PI;
    bottomPoints.push( new Vector2( width / 2 * Math.sin( t ), offset + height / 2 * Math.cos( t ) ) );
  }

  // Path for top ellipse
  const topShape = new Shape();
  topShape.moveTo( topPoints[ 0 ].x, topPoints[ 0 ].y );
  for ( let i = 1; i < topPoints.length; i++ ) {
    topShape.lineTo( topPoints[ i ].x, topPoints[ i ].y );
  }
  topShape.close();
  const topEllipse = new Path( topShape, {
    stroke: options.stroke,
    lineWidth: options.lineWidth,
    pickable: false
  } );
  container.addChild( topEllipse );

  // Path for bottom ellipse
  const bottomShape = new Shape();
  bottomShape.moveTo( bottomPoints[ 0 ].x, bottomPoints[ 0 ].y );
  for ( let i = 1; i < bottomPoints.length; i++ ) {
    bottomShape.lineTo( bottomPoints[ i ].x, bottomPoints[ i ].y );
  }
  bottomShape.close();
  const bottomEllipse = new Path( bottomShape, {
    stroke: options.stroke,
    lineWidth: options.lineWidth,
    pickable: false
  } );
  container.addChild( bottomEllipse );

  // Arrow placement at ±π/4 and ±3π/4 for both ellipses, with 50deg ">" head
  arrowAngles.forEach( angle => {
  // TOP ellipse (center at 0, -offset)
  const xT = width / 2 * Math.sin( angle );
  const yT = -offset + height / 2 * Math.cos( angle );
  const dxT = width / 2 * Math.cos( angle );
  const dyT = -height / 2 * Math.sin( angle );
  let tangentAngleT = Math.atan2( dyT, dxT );
  if ( orientation < 0 ) {tangentAngleT += Math.PI;}

  const arrowT = createArrow( options );
  arrowT.center = new Vector2( xT, yT ); // NO offset subtraction!
  arrowT.rotation = tangentAngleT;
  container.addChild( arrowT );

  // BOTTOM ellipse (center at 0, +offset)
  const mirroredAngle = -angle;
  const xB = width / 2 * Math.sin( mirroredAngle );
  const yB = offset + height / 2 * Math.cos( mirroredAngle );
  const dxB = width / 2 * Math.cos( mirroredAngle );
  const dyB = -height / 2 * Math.sin( mirroredAngle );
  let tangentAngleB = Math.atan2( dyB, dxB );
  if ( orientation < 0 ) {tangentAngleB += Math.PI;}

  const arrowB = createArrow( options );
  arrowB.center = new Vector2( xB, yB ); // NO offset subtraction!
  arrowB.rotation = tangentAngleB;
  container.addChild( arrowB );
} );

  return container;
}

class MagnetFieldLines extends Node {
  private readonly fieldLinesContainer: Node;
  private readonly inductor: Inductor;
  private readonly orientationProperty: Property<number>;
  private readonly fieldLinesVisibleProperty: Property<boolean>;
  private readonly color: string;
  private prevCurrent = 0;
  private lastUpdateTime = 0;
  private readonly CURRENT_THRESHOLD: number = 0.001;
  private fieldLineOffset: Vector2 = new Vector2( 0, 0 );

  public setFieldLineOffset( offset: Vector2 ): void {
    this.fieldLineOffset = offset;
    this.fieldLinesContainer.center = offset;
  }

  public constructor(
    inductor: Inductor,
    options?: { tandem?: unknown; color?: string }
  ) {
    const orientationProperty: Property<number> =
      ( inductor as Inductor & { orientationProperty?: Property<number> } ).orientationProperty ||
      new Property( 1 );
    const fieldLinesVisibleProperty: Property<boolean> =
      ( inductor as Inductor & { fieldLinesVisibleProperty?: Property<boolean> } ).fieldLinesVisibleProperty ||
      new Property( true );
    const color = options?.color ?? '#ffffff';

    const fieldLinesContainer = new Node( { pickable: false } );

    super( {
      tandem: options?.tandem,
      children: [ fieldLinesContainer ],
      pickable: false
    } );

    this.inductor = inductor;
    this.orientationProperty = orientationProperty;
    this.fieldLinesVisibleProperty = fieldLinesVisibleProperty;
    this.fieldLinesContainer = fieldLinesContainer;
    this.color = color;
    this.prevCurrent = 0;

    if ( ( inductor as Inductor & { currentProperty?: Property<number> } ).currentProperty ) {
      ( inductor as Inductor & { currentProperty: Property<number> } ).currentProperty.link( ( current: number ): void => {
        if ( Math.abs( current ) < this.CURRENT_THRESHOLD ) {
          this.fieldLinesContainer.removeAllChildren();
          this.prevCurrent = current;
          return;
        }

        const now = Date.now();
        const currentChanged = Math.abs( current - this.prevCurrent ) > this.CURRENT_THRESHOLD;

        if ( !currentChanged && now - this.lastUpdateTime > 1000 ) {
          this.fieldLinesContainer.removeAllChildren();
          return;
        }

        if ( currentChanged ) {
          this.lastUpdateTime = now;
          this.prevCurrent = current;
        }

        // Always draw 6 ellipses (3 on each side), but sizes respond to current
        // field line 0: smallest, 5: largest
        const absCurrent = Math.abs( current );
        const response = 0.6 + 0.8 * Math.min( absCurrent / 2, 1 ); // 0.6 to 1.4
        const baseScales = [ 0.67, 0.85, 1.0 ]; // for "innermost", "middle", "outermost"

        this.fieldLinesContainer.removeAllChildren();

        for ( let i = 0; i < ELLIPSES_PER_SIDE; i++ ) {
          const scale = baseScales[ i ] * response;
          const width = FIELD_LINE_BASE_WIDTH * scale;
          const height = FIELD_LINE_BASE_HEIGHT * scale;
          const offset = FIELD_LINE_BASE_OFFSET * scale;

          // Place arrows at ±π/4 and ±3π/4, with 50deg opening for the ">" shape
          const arrowAngles = ARROW_ANGLES_ORIGINAL;

          // Top ellipse (center at 0, -offset)
          const fieldLineTop = createDoubleEllipseFieldLine(
            width,
            height,
            offset,
            arrowAngles,
            this.orientationProperty.value * Math.sign( current ),
            { stroke: color, lineWidth: LINE_WIDTH }
          );
          this.fieldLinesContainer.addChild( fieldLineTop );
        }
        this.fieldLinesContainer.center = this.fieldLineOffset;
      } );
    }

    this.fieldLinesVisibleProperty.linkAttribute( this, 'visible' );
  }

  public override dispose(): void {
    super.dispose();
  }
}

circuitConstructionKitCommon.register( 'MagnetFieldLines', MagnetFieldLines );
export default MagnetFieldLines;