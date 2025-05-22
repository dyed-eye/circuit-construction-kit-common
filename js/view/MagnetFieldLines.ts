// Copyright 2025, University of Colorado Boulder
// @author student

import Shape from '../../../kite/js/Shape.js';
import Node from '../../../scenery/js/nodes/Node.js';
import Path from '../../../scenery/js/nodes/Path.js';
import Property from '../../../axon/js/Property.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import type Inductor from '../model/Inductor.js';
import Vector2 from '../../../dot/js/Vector2.js';

// constants
const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 14;
const LINE_WIDTH = 3;

// Number of field lines to show
const MAX_FIELD_LINES = 4;
const MIN_FIELD_LINES = 1;

// Sizes for field lines - adjusted for better figure-8 shape
const FIELD_LINE_BASE_WIDTH = 120; // Width of field lines (along inductor)
const FIELD_LINE_BASE_HEIGHT = 80;  // Height of field lines (perpendicular to inductor)

function createArrow( options: { stroke: string; lineWidth: number } ): Path {
  return new Path(
    new Shape()
      .moveTo( -ARROW_WIDTH, -ARROW_HEIGHT / 2 )
      .lineTo( 0, 0 )
      .lineTo( -ARROW_WIDTH, ARROW_HEIGHT / 2 )
      .close(),
    {
      stroke: options.stroke,
      lineWidth: options.lineWidth,
      fill: options.stroke
    }
  );
}

// Create a figure-8 shaped magnetic field line
function createFigure8FieldLine(
  width: number,
  height: number,
  arrowPositions: number[],  // Multiple positions for arrows (0-1)
  orientation: number,       // Direction of field
  options: { stroke: string; lineWidth: number }
): Node {
  const container = new Node( { pickable: false } );
  
  // Create the figure-8 shape centered at (0,0)
  const shape = new Shape();
  
  // Top loop
  shape.moveTo( -width / 2, 0 );          // Start at left center
  shape.cubicCurveTo(
    -width / 4, -height / 2,              // Control point 1
    width / 4, -height / 2,               // Control point 2
    width / 2, 0                        // End point
  );
  
  // Bottom loop (forming the figure-8)
  shape.cubicCurveTo(
    width / 4, height / 2,                // Control point 1
    -width / 4, height / 2,               // Control point 2
    -width / 2, 0                       // End point (connecting back to start)
  );
  
  // Create the path for the field line
  const fieldLine = new Path( shape, {
    stroke: options.stroke,
    lineWidth: options.lineWidth,
    pickable: false
  } );
  
  container.addChild( fieldLine );
  
  // Add arrows to indicate direction
  arrowPositions.forEach( position => {
    // Calculate position and tangent angle at this point on the curve
    let arrowX: number;
    let arrowY: number;
    let tangentAngle: number;
    
    if ( position < 0.25 ) {
      // First quadrant of top loop
      const t = position * 4;
      arrowX = -width / 2 + width * t;
      arrowY = -height / 2 * Math.sin( Math.PI * t );
      tangentAngle = Math.atan2( Math.cos( Math.PI * t ) * height / 2, width );
    }
    else if ( position < 0.5 ) {
      // Second quadrant of top loop
      const t = ( position - 0.25 ) * 4;
      arrowX = width / 2 - width * t;
      arrowY = -height / 2 * Math.sin( Math.PI * t );
      tangentAngle = Math.atan2( -Math.cos( Math.PI * t ) * height / 2, -width );
    }
    else if ( position < 0.75 ) {
      // First quadrant of bottom loop
      const t = ( position - 0.5 ) * 4;
      arrowX = -width / 2 + width * t;
      arrowY = height / 2 * Math.sin( Math.PI * t );
      tangentAngle = Math.atan2( Math.cos( Math.PI * t ) * height / 2, width );
    }
    else {
      // Second quadrant of bottom loop
      const t = ( position - 0.75 ) * 4;
      arrowX = width / 2 - width * t;
      arrowY = height / 2 * Math.sin( Math.PI * t );
      tangentAngle = Math.atan2( -Math.cos( Math.PI * t ) * height / 2, -width );
    }
    
    const arrow = createArrow( options );
    arrow.center = new Vector2( arrowX, arrowY );
    
    // Apply orientation to arrow angle (flip direction based on current direction)
    arrow.rotation = tangentAngle + ( orientation < 0 ? Math.PI : 0 );
    
    container.addChild( arrow );
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

    // Container for all field lines, non-pickable
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

    // Only update when current changes
    if ( ( inductor as Inductor & { currentProperty?: Property<number> } ).currentProperty ) {
      ( inductor as Inductor & { currentProperty: Property<number> } ).currentProperty.link( ( current: number ): void => {
        // Check if current is zero or nearly zero
        if ( Math.abs( current ) < this.CURRENT_THRESHOLD ) {
          this.fieldLinesContainer.removeAllChildren();
          this.prevCurrent = current;
          return;
        }

        const now = Date.now();
        const currentChanged = Math.abs( current - this.prevCurrent ) > this.CURRENT_THRESHOLD;
        
        // If current hasn't changed significantly in a while
        if ( !currentChanged && now - this.lastUpdateTime > 1000 ) {
          this.fieldLinesContainer.removeAllChildren();
          return;
        }
        
        // If the current has changed
        if ( currentChanged ) {
          this.lastUpdateTime = now;
          this.prevCurrent = current;
        }

        const absCurrent = Math.abs( current );
        let nLines = MIN_FIELD_LINES + Math.floor( ( MAX_FIELD_LINES - MIN_FIELD_LINES ) * Math.min( absCurrent / 2, 1 ) );
        nLines = Math.max( MIN_FIELD_LINES, Math.min( MAX_FIELD_LINES, nLines ) );
        
        this.fieldLinesContainer.removeAllChildren();
        
        // Create multiple figure-8 field lines of increasing size
        for ( let i = 0; i < nLines; i++ ) {
          // Scale size based on which line we're drawing (inner to outer)
          const scaleFactor = ( i + 1 ) / nLines;
          const width = FIELD_LINE_BASE_WIDTH * scaleFactor;
          const height = FIELD_LINE_BASE_HEIGHT * scaleFactor;
          
          // For different sized loops, place arrows at different positions
          let arrowPositions: number[];
          
          if ( i === 0 ) {
            // Smallest loop - one arrow
            arrowPositions = [ 0.2 ];
          }
          else if ( i === 1 ) {
            // Medium loop - two arrows
            arrowPositions = [ 0.2, 0.7 ];
          }
          else {
            // Larger loops - three arrows
            arrowPositions = [ 0.1, 0.4, 0.7 ];
          }
          
          // Create the figure-8 field line with arrows
          const fieldLine = createFigure8FieldLine(
            width, height,
            arrowPositions,
            orientationProperty.value * Math.sign( current ),
            { stroke: color, lineWidth: LINE_WIDTH }
          );
          
          this.fieldLinesContainer.addChild( fieldLine );
        }
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