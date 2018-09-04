/**
 * @typedef {Object} RectWithValue
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {*} value
 **/

/**
 * @typedef {Object} RectWithIndicesAndValues
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {Array.<number>} indices
 * @property {Array.<*>} values
 **/

/** Clusterer groups a set of rects.
 *     Each rect of resulting rects contains one or more rects of input elements
 *     and has a smaller (or equal) width and height of clusterWidth and clusterHeight.
 **/
class Clusterer{
  static execute(rects, clusterSize){
    return new Clusterer(clusterSize.width, clusterSize.height).execute(rects);
  }

  /**
   * @param {number} clusterWidth maximum width of a cluster
   * @param {number} clusterHeight maximum height of a cluster
   **/
  constructor(clusterWidth, clusterHeight){
    this.clusterWidth = clusterWidth;
    this.clusterHeight = clusterHeight;
  }

  /**
   * @param {Array.<RectWithValue>}} rects
   *     the property 'value' of elements are added to result elements's 'values' field
   * @return {Array.<RectWithIndicesAndValues>}
   * @public
   **/
  execute(rects){
    const rtree = RTree(),
          resultClusters = [];

    // feed indices as leaf values
    rects.forEach(rtree.insert.bind(rtree));

    let pivotRect, currentCluster;

    while (pivotRect = this.getLeaf(rtree)){
      currentCluster = new RectCluster(pivotRect, pivotRect.leaf);
      rtree.remove(pivotRect, pivotRect.leaf);

      const clusterableRectIndices = rtree.search(
        this.clusterableRect(currentCluster)
      ).sort( (i1,i2) =>
        this.rectDistance(rects[i1], rects[i2])
      );
      while (clusterableRectIndices.length > 0){
        const rectIndexToAdd = clusterableRectIndices.shift(),
              rectToAdd = rects[rectIndexToAdd];
        if (this.rectContains(this.clusterableRect(currentCluster), rectToAdd)){
          currentCluster.addRect(rectToAdd, rectIndexToAdd);
          rtree.remove(rectToAdd, rectIndexToAdd);
        }
      }
      resultClusters.push(currentCluster);
    }

    return resultClusters.map( (cluster) => {
      const rect = cluster.getBoundingRect();
      rect.indices = cluster.indices;
      rect.values = rect.indices.map( (i) => rects[i].value );
      return rect;
    });
  }

  /**
   * @param {Cluster} cluster
   * @return {Rect}
   **/
  clusterableRect(cluster){
    return cluster.getClusterableRect(this.clusterWidth, this.clusterHeight);
  }

  /** Find and return a leaf in RTree.
   * @param {RTree}
   * @return {?RTreeLeaf}
   * @private
   **/
  getLeaf(rtree){
    return search(rtree.getTree());

    function search(node){
      if ("leaf" in node){
        return node;
      }else{
        for (const child of node.nodes){
          const leaf = search(child);
          if (leaf){
            return leaf;
          }
        }
        return null;
      }
    }
  }

  /**
   * @private
   **/
  rectDistance(rect1, rect2){
    return Math.max(rect1.x + rect1.width - rect2.x,
                    rect2.x + rect2.width - rect1.x) +
           Math.max(rect1.y + rect1.height - rect2.y,
                    rect2.y + rect2.height - rect1.y);
  }

  /**
   * @private
   **/
  rectContains(parent, child){
    return (parent.x <= child.x) && (child.x + child.w <= parent.x + parent.w) &&
           (parent.y <= child.y) && (child.y + child.h <= parent.y + parent.h);
  }
}

class RectCluster{
  /**
   * @param {Rect} initialRect
   * @param {*} index
   **/
  constructor(initialRect, index){
    this.rects = [initialRect];
    this.indices = [index];
  }

  /**
   * @param {Rect} rect
   * @param {*} index
   **/
  addRect(rect, index){
    this.rects.push(rect);
    this.indices.push(index);
  }

  /**
   * @return {Rect}
   **/
  getBoundingRect(){
    if (this.rects.length === 0){
      throw new Error("rects empty");
    }
    const x = Math.min(...(this.rects.map( rect => rect.x ))),
          y = Math.min(...(this.rects.map( rect => rect.y ))),
          xRight = Math.max(...(this.rects.map( rect => rect.x + rect.w))),
          yBottom = Math.max(...(this.rects.map( rect => rect.y + rect.h)));
    return {
      x, y,
      w: xRight - x,
      h: yBottom - y,
    };
  }

  /** Returns the rect which contains all possible area that this cluster can be extended.
   * @param {number} clusterWidth
   * @param {number} clusterHeight
   * @return {Rect}
   **/
  getClusterableRect(clusterWidth, clusterHeight){
    const br = this.getBoundingRect();
    return {
      x: br.x + br.w - clusterWidth,
      y: br.y + br.h - clusterHeight,
      w: clusterWidth * 2 - br.w,
      h: clusterHeight * 2 - br.h,
    };
  }

}
