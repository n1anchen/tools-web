import settings from './settings';
import { loadFont } from './utils';

const {
  canvasHeight,
  canvasWidth,
  fontSize,
  horizontalTilt,
  textBaseLine,
  graphOffset,
  paddingX,
  hollowPath,
} = settings;

const font = `900 ${fontSize}px RoGSans, 'Noto Sans SC', apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif`;

export class LogoCanvas {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public textL = 'Blue';
  public textR = 'Archive';
  private textMetricsL: TextMetrics | null = null;
  private textMetricsR: TextMetrics | null = null;
  private canvasWidthL = canvasWidth / 2;
  private canvasWidthR = canvasWidth / 2;
  private textWidthL = 0;
  private textWidthR = 0;
  public graphOffset = { ...graphOffset };
  public transparentBg = false;
  public bgShape: 'auto' | 'square' | 'circle' = 'auto';
  
  private haloImg: HTMLImageElement;
  private crossImg: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement, haloImg: HTMLImageElement, crossImg: HTMLImageElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.height = canvasHeight;
    this.canvas.width = canvasWidth;
    this.haloImg = haloImg;
    this.crossImg = crossImg;
  }

  async draw(setLoading?: (loading: boolean) => void) {
    if (setLoading) setLoading(true);
    
    const c = this.ctx;
    //predict canvas width
    await loadFont(fontSize, this.textL + this.textR);
    
    if (setLoading) setLoading(false);
    
    c.font = font;
    this.textMetricsL = c.measureText(this.textL);
    this.textMetricsR = c.measureText(this.textR);
    this.setWidth();
    
    //clear canvas
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    //Background
    if (!this.transparentBg) {
      c.fillStyle = '#fff';
      if (this.bgShape === 'circle') {
        c.beginPath();
        c.arc(this.canvas.width / 2, this.canvas.height / 2, Math.min(this.canvas.width, this.canvas.height) / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    //blue text -> halo -> black text -> cross
    c.font = font;
    c.fillStyle = '#128AFA';
    c.textAlign = 'end';
    // 补偿 skew 变换对 Y 偏移的影响：x' = x + horizontalTilt * y
    const skewCompX = -horizontalTilt * this._drawOffsetY;
    c.setTransform(1, 0, horizontalTilt, 1, 0, 0);
    c.fillText(this.textL, this.canvasWidthL + skewCompX, this._drawOffsetY + canvasHeight * textBaseLine);
    c.resetTransform(); 
    
    c.drawImage(
      this.haloImg,
      this.canvasWidthL - canvasHeight / 2 + this.graphOffset.X,
      this._drawOffsetY + this.graphOffset.Y,
      canvasHeight,
      canvasHeight
    );
    
    c.fillStyle = '#2B2B2B';
    c.textAlign = 'start';
    if (this.transparentBg) {
      c.globalCompositeOperation = 'destination-out';
    }
    c.strokeStyle = 'white';
    c.lineWidth = 12;
    c.setTransform(1, 0, horizontalTilt, 1, 0, 0);
    c.strokeText(this.textR, this.canvasWidthL + skewCompX, this._drawOffsetY + canvasHeight * textBaseLine);
    c.globalCompositeOperation = 'source-over';
    c.fillText(this.textR, this.canvasWidthL + skewCompX, this._drawOffsetY + canvasHeight * textBaseLine);
    c.resetTransform();
    
    const graph = {
      X: this.canvasWidthL - canvasHeight / 2 + this.graphOffset.X,
      Y: this._drawOffsetY + this.graphOffset.Y,
    };
    
    c.beginPath();
    c.moveTo(
      graph.X + (hollowPath[0][0] / 500) * canvasHeight,
      graph.Y + (hollowPath[0][1] / 500) * canvasHeight
    );
    for (let i = 1; i < 4; i++) {
      c.lineTo(
        graph.X + (hollowPath[i][0] / 500) * canvasHeight,
        graph.Y + (hollowPath[i][1] / 500) * canvasHeight
      );
    }
    c.closePath();
    
    if (this.transparentBg) {
      c.globalCompositeOperation = 'destination-out';
    }
    c.fillStyle = 'white';
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.drawImage(
      this.crossImg,
      this.canvasWidthL - canvasHeight / 2 + this.graphOffset.X,
      this._drawOffsetY + this.graphOffset.Y,
      canvasHeight,
      canvasHeight
    );
  }

  setWidth() {
    this.textWidthL =
      this.textMetricsL!.width -
      (textBaseLine * canvasHeight + this.textMetricsL!.fontBoundingBoxDescent) * horizontalTilt;
    this.textWidthR =
      this.textMetricsR!.width +
      (textBaseLine * canvasHeight - this.textMetricsR!.fontBoundingBoxAscent) * horizontalTilt;
      
    //extend canvas
    if (this.textWidthL + paddingX > canvasWidth / 2) {
      this.canvasWidthL = this.textWidthL + paddingX;
    } else {
      this.canvasWidthL = canvasWidth / 2;
    }
    if (this.textWidthR + paddingX > canvasWidth / 2) {
      this.canvasWidthR = this.textWidthR + paddingX;
    } else {
      this.canvasWidthR = canvasWidth / 2;
    }

    let w = this.canvasWidthL + this.canvasWidthR;
    let h = canvasHeight;
    if (this.bgShape === 'square') {
      const size = Math.max(w, h);
      w = size;
      h = size;
    } else if (this.bgShape === 'circle') {
      const diameter = Math.max(w, h) * 1.15;
      w = diameter;
      h = diameter;
    }
    this.canvas.width = w;
    this.canvas.height = h;

    // 居中偏移：让文字内容在画布居中
    if (this.bgShape !== 'auto') {
      const contentW = this.canvasWidthL + this.canvasWidthR;
      const offsetX = (w - contentW) / 2;
      const offsetY = (h - canvasHeight) / 2;
      this.canvasWidthL += offsetX;
      // 也要把 canvasWidthR 调整到对应画布宽度
      this.canvasWidthR = w - this.canvasWidthL;
      this._drawOffsetY = offsetY;
    } else {
      this._drawOffsetY = 0;
    }
  }

  private _drawOffsetY = 0;

  generateImg(): Promise<Blob> {
    let outputCanvas: HTMLCanvasElement;
    if (
      this.bgShape === 'auto' && (
        this.textWidthL + paddingX < canvasWidth / 2 ||
        this.textWidthR + paddingX < canvasWidth / 2
      )
    ) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = this.textWidthL + this.textWidthR + paddingX * 2;
      outputCanvas.height = this.canvas.height;
      const ctx = outputCanvas.getContext('2d')!;
      ctx.drawImage(
        this.canvas,
        canvasWidth / 2 - this.textWidthL - paddingX,
        0,
        this.textWidthL + this.textWidthR + paddingX * 2,
        this.canvas.height,
        0,
        0,
        this.textWidthL + this.textWidthR + paddingX * 2,
        this.canvas.height
      );
    } else {
      outputCanvas = this.canvas;
    }
    return new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob failed'));
        }
      });
    });
  }
}
