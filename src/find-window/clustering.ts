import { Size2d, Rect, RectWithValue } from '../types';
// @ts-ignore
import RTree from 'rtree';


 type RectWithIndicesAndValues<T> = Rect & {
   indices: number[],
   values: T[],
 }

 type RTreeLeaf = Rect & { leaf: number };
 type RTreeParent = { nodes: (RTreeLeaf | RTreeParent)[] };
 type RTreeNode = RTreeLeaf | RTreeParent;

/** Clusterer groups a set of rects.
 *     Each rect of resulting rects contains one or more rects of input elements
 *     and has a smaller (or equal) width and height of clusterWidth and clusterHeight.
 **/
export class Clusterer{
  static execute<T>(rects: RectWithValue<T>[], clusterSize: Size2d){
    return new Clusterer(clusterSize.width, clusterSize.height).execute(rects);
  }

  private readonly clusterWidth: number;
  private readonly clusterHeight: number;

  /**
   * @param clusterWidth maximum width of a cluster
   * @param clusterHeight maximum height of a cluster
   **/
  constructor(clusterWidth: number, clusterHeight: number){
    this.clusterWidth = clusterWidth;
    this.clusterHeight = clusterHeight;
  }

  /**
   * @param rects
   *     the property 'value' of elements are appended to result elements's 'values' field
   * @return
   **/
  execute<T>(rects: RectWithValue<T>[]): RectWithIndicesAndValues<T>[]{
    const rtree = (RTree as unknown as RTreeFactory)(),
          resultClusters: RectCluster[] = [];

    // feed indices as leaf values
    rects.forEach(rtree.insert.bind(rtree));

    let pivotRect: RTreeLeaf | null,
        currentCluster: RectCluster;

    while (pivotRect = this.getLeaf(rtree)){
      currentCluster = new RectCluster(pivotRect, pivotRect.leaf);
      rtree.remove(pivotRect, pivotRect.leaf);

      const currentClusterBoundingRect = currentCluster.getBoundingRect();

      const clusterableRectIndices: number[] = rtree.search(
        this.clusterableRect(currentCluster)
      ).sort( (i1,i2) =>
          this.rectDistance(rects[i1], currentClusterBoundingRect) -
            this.rectDistance(rects[i2], currentClusterBoundingRect)
      );
      while (clusterableRectIndices.length > 0){
        const rectIndexToAdd = clusterableRectIndices.shift() as number;
        const rectToAdd = rects[rectIndexToAdd];
        if (this.rectContains(this.clusterableRect(currentCluster), rectToAdd)){
          currentCluster.addRect(rectToAdd, rectIndexToAdd);
          rtree.remove(rectToAdd, rectIndexToAdd);
        }
      }
      resultClusters.push(currentCluster);
    }

    return resultClusters.map( (cluster) => {
      const rect = cluster.getBoundingRect();
      return {
        indices: cluster.indices,
        values: cluster.indices.map( (i) => rects[i].value ),
        ...rect
      };
    });
  }

  /**
   * @param cluster
   * @return
   **/
  clusterableRect(cluster: RectCluster): Rect{
    return cluster.getClusterableRect(this.clusterWidth, this.clusterHeight);
  }

  /** Find a leaf in RTree.
   * @param rtree
   * @return
   **/
  private getLeaf(rtree: RTreeStatic): RTreeLeaf | null{
    // @ts-ignore (calling deprecated getTree)
    return search(rtree.getTree() as RTreeNode);

    function search(node: RTreeNode): RTreeLeaf | null{
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

  private rectDistance(rect1: Rect, rect2: Rect){
    return Math.max(rect1.x + rect1.w - rect2.x,
                    rect2.x + rect2.w - rect1.x) +
           Math.max(rect1.y + rect1.h - rect2.y,
                    rect2.y + rect2.h - rect1.y);
  }

  /**
   * @private
   **/
  rectContains(parent: Rect, child: Rect){
    return (parent.x <= child.x) && (child.x + child.w <= parent.x + parent.w) &&
           (parent.y <= child.y) && (child.y + child.h <= parent.y + parent.h);
  }
}

class RectCluster{
  readonly rects: Rect[];
  readonly indices: number[];

  /**
   * @param initialRect
   * @param index
   **/
  constructor(initialRect: Rect, index: number){
    this.rects = [initialRect];
    this.indices = [index];
  }

  /**
   * @param rect
   * @param index
   **/
  addRect(rect: Rect, index: number){
    this.rects.push(rect);
    this.indices.push(index);
  }

  getBoundingRect(): Rect{
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
   * @param clusterWidth
   * @param clusterHeight
   **/
  getClusterableRect(clusterWidth: number, clusterHeight: number): Rect{
    const br = this.getBoundingRect();
    return {
      x: br.x + br.w - clusterWidth,
      y: br.y + br.h - clusterHeight,
      w: clusterWidth * 2 - br.w,
      h: clusterHeight * 2 - br.h,
    };
  }

}
