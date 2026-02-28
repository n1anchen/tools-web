export class TopText {
    value: string = "";
    font: string = "";
    x: number = 70.0;
    y: number = 100.0;
    w: number = 0.0;
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    draw() {
        this.ctx.font = this.font;
        this.ctx.setTransform(1, 0, -0.45, 1, 0, 0);

        //黒色
        {
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = 22;
            this.ctx.strokeText(this.value, this.x + 4, this.y + 4);
        }

        //銀色
        {
            const grad = this.ctx.createLinearGradient(0, 24, 0, 122);
            grad.addColorStop(0.0, 'rgb(0,15,36)');
            grad.addColorStop(0.10, 'rgb(255,255,255)');
            grad.addColorStop(0.18, 'rgb(55,58,59)');
            grad.addColorStop(0.25, 'rgb(55,58,59)');
            grad.addColorStop(0.5, 'rgb(200,200,200)');
            grad.addColorStop(0.75, 'rgb(55,58,59)');
            grad.addColorStop(0.85, 'rgb(25,20,31)');
            grad.addColorStop(0.91, 'rgb(240,240,240)');
            grad.addColorStop(0.95, 'rgb(166,175,194)');
            grad.addColorStop(1, 'rgb(50,50,50)');
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 20;
            this.ctx.strokeText(this.value, this.x + 4, this.y + 4);
        }

        //黒色
        {
            this.ctx.strokeStyle = "#000000";
            this.ctx.lineWidth = 16;
            this.ctx.strokeText(this.value, this.x, this.y);
        }

        //金色
        {
            const grad = this.ctx.createLinearGradient(0, 20, 0, 100);
            grad.addColorStop(0, 'rgb(253,241,0)');
            grad.addColorStop(0.25, 'rgb(245,253,187)');
            grad.addColorStop(0.4, 'rgb(255,255,255)');
            grad.addColorStop(0.75, 'rgb(253,219,9)');
            grad.addColorStop(0.9, 'rgb(127,53,0)');
            grad.addColorStop(1, 'rgb(243,196,11)');
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 10;
            this.ctx.strokeText(this.value, this.x, this.y);
        }

        //黒
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeText(this.value, this.x + 2, this.y - 3);

        //白
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.strokeText(this.value, this.x, this.y - 3);

        //赤
        {
            const grad = this.ctx.createLinearGradient(0, 20, 0, 100);
            grad.addColorStop(0, 'rgb(255, 100, 0)');
            grad.addColorStop(0.5, 'rgb(123, 0, 0)');
            grad.addColorStop(0.51, 'rgb(240, 0, 0)');
            grad.addColorStop(1, 'rgb(5, 0, 0)');
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = grad;
            this.ctx.strokeText(this.value, this.x, this.y - 3);
        }

        //赤
        {
            const grad = this.ctx.createLinearGradient(0, 20, 0, 100);
            grad.addColorStop(0, 'rgb(230, 0, 0)');
            grad.addColorStop(0.5, 'rgb(123, 0, 0)');
            grad.addColorStop(0.51, 'rgb(240, 0, 0)');
            grad.addColorStop(1, 'rgb(5, 0, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.fillText(this.value, this.x, this.y - 3);
        }

        this.w = this.ctx.measureText(this.value).width + 30;
    }
}

export class BottomText {
    value: string = "";
    font: string = "";
    x: number = 250.0;
    y: number = 230.0;
    w: number = 0.0;
    ctx: CanvasRenderingContext2D;
    useImg: boolean = false;
    img: HTMLImageElement;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.img = new Image();
        this.img.src = '/images/choyen/hoshii.png';
    }

    draw() {
        if (this.useImg) {
            this.drawImg();
            return;
        }

        this.ctx.font = this.font;
        this.ctx.setTransform(1, 0, -0.45, 1, 0, 0);

        //黒色
        {
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = 22;
            this.ctx.strokeText(this.value, this.x + 5, this.y + 2);
        }

        // 銀
        {
            const grad = this.ctx.createLinearGradient(0, this.y - 80, 0, this.y + 18);
            grad.addColorStop(0, 'rgb(0,15,36)');
            grad.addColorStop(0.25, 'rgb(250,250,250)');
            grad.addColorStop(0.5, 'rgb(150,150,150)');
            grad.addColorStop(0.75, 'rgb(55,58,59)');
            grad.addColorStop(0.85, 'rgb(25,20,31)');
            grad.addColorStop(0.91, 'rgb(240,240,240)');
            grad.addColorStop(0.95, 'rgb(166,175,194)');
            grad.addColorStop(1, 'rgb(50,50,50)');
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 19;
            this.ctx.strokeText(this.value, this.x + 5, this.y + 2);
        }

        //黒色
        {
            this.ctx.strokeStyle = "#10193A";
            this.ctx.lineWidth = 17;
            this.ctx.strokeText(this.value, this.x, this.y);
        }

        // 白
        {
            this.ctx.strokeStyle = "#DDD";
            this.ctx.lineWidth = 8;
            this.ctx.strokeText(this.value, this.x, this.y);
        }

        //紺
        {
            const grad = this.ctx.createLinearGradient(0, this.y - 80, 0, this.y);
            grad.addColorStop(0, 'rgb(16,25,58)');
            grad.addColorStop(0.03, 'rgb(255,255,255)');
            grad.addColorStop(0.08, 'rgb(16,25,58)');
            grad.addColorStop(0.2, 'rgb(16,25,58)');
            grad.addColorStop(1, 'rgb(16,25,58)');
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 7;
            this.ctx.strokeText(this.value, this.x, this.y);
        }

        //銀
        {
            const grad = this.ctx.createLinearGradient(0, this.y - 80, 0, this.y);
            grad.addColorStop(0, 'rgb(245,246,248)');
            grad.addColorStop(0.15, 'rgb(255,255,255)');
            grad.addColorStop(0.35, 'rgb(195,213,220)');
            grad.addColorStop(0.5, 'rgb(160,190,201)');
            grad.addColorStop(0.51, 'rgb(160,190,201)');
            grad.addColorStop(0.52, 'rgb(196,215,222)');
            grad.addColorStop(1.0, 'rgb(255,255,255)');
            this.ctx.fillStyle = grad;
            this.ctx.fillText(this.value, this.x, this.y - 3);
        }

        this.w = this.ctx.measureText(this.value).width + 30;
    }

    drawImg() {
        const x = this.x;
        const y = this.y - 100.0;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        this.onLoadImg(() => {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.drawImage(this.img, x + 5, y + 2);
            this.w = this.img.width + 30;
        });

        this.w = this.img.width + 30;
    }

    onLoadImg(callback: () => void) {
        if (this.isLoadedImg()) {
            callback();
            return;
        }
        this.img.onload = callback;
    }

    isLoadedImg() {
        if (!this.img.complete) return false;
        if (typeof this.img.naturalWidth !== "undefined" && this.img.naturalWidth === 0) return false;
        return true;
    }
}

export class Drawer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    topText: TopText;
    bottomText: BottomText;
    useTransparent: boolean = false;
    dragging: boolean = false;
    dragStartCursorPos: number = 0;
    dragStartBottomTextPos: number = 0;
    lang: string = "cn";

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        
        // bind events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this), false);
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

        this.ctx = canvas.getContext('2d')!;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.topText = new TopText(this.ctx);
        this.bottomText = new BottomText(this.ctx);
    }

    refresh() {
        this.clear();

        if (this.lang == "ja") {
            this.topText.font = "900 100px notobk";
            this.bottomText.font = "900 100px notoserifbk";
        } else {
            this.topText.font = "900 100px 'Noto Sans SC', sans-serif";
            this.bottomText.font = "900 100px 'Noto Serif SC', serif";
        }

        this.topText.draw();
        this.bottomText.draw();
    }

    clear() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (!this.useTransparent) {
            this.ctx.fillStyle = `white`;
            this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        } else {
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        }
    }

    getCanvasLocalX(clientX: number): number {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        return (clientX - rect.left) * scaleX;
    }

    onCursorDown(e: MouseEvent | Touch) {
        this.dragging = true;
        this.dragStartCursorPos = this.getCanvasLocalX(e.clientX);
        this.dragStartBottomTextPos = this.bottomText.x;
    }

    onCursorMove(e: MouseEvent | Touch) {
        if (this.dragging) {
            const currentX = this.getCanvasLocalX(e.clientX);
            const dx = currentX - this.dragStartCursorPos;
            this.bottomText.x = this.dragStartBottomTextPos + dx;
            this.refresh();
        }

        const rect = this.canvas.getBoundingClientRect();
        // Scale handles if canvas is display scaled
        const scaleY = this.canvas.height / rect.height;
        const pointerY = (e.clientY - rect.top) * scaleY;
        
        const bottomTextTop = this.topText.y;
        const bottomTextBottom = this.canvas.height;
        if (bottomTextTop < pointerY && pointerY < bottomTextBottom) {
            document.body.style.cursor = "move";
        } else {
            document.body.style.cursor = "auto";
        }
    }

    onCursorUp(_e: MouseEvent | Touch) {
        this.dragging = false;
        this.dragStartCursorPos = 0;
        this.dragStartBottomTextPos = 0;
    }

    onCursorLeave(_e: MouseEvent | Touch) {
        if (this.dragging) {
            this.dragging = false;
            this.dragStartCursorPos = 0;
            this.dragStartBottomTextPos = 0;
        }
        document.body.style.cursor = "auto";
    }

    onMouseDown(e: MouseEvent) {
        this.onCursorDown(e);
    }

    onMouseMove(e: MouseEvent) {
        this.onCursorMove(e);
    }

    onMouseUp(e: MouseEvent) {
        this.onCursorUp(e);
    }

    onMouseLeave(e: MouseEvent) {
        this.onCursorLeave(e);
    }

    onTouchStart(e: TouchEvent) {
        e.preventDefault();
        this.onCursorDown(e.touches[0]);
    }

    onTouchMove(e: TouchEvent) {
        e.preventDefault();
        this.onCursorMove(e.touches[0]);
    }

    onTouchEnd(e: TouchEvent) {
        e.preventDefault();
        this.onCursorUp(e.changedTouches[0]);
    }

    saveImage() {
        const width = Math.max(this.topText.x + this.topText.w, this.bottomText.x + this.bottomText.w);
        const height = this.ctx.canvas.height;

        const data = this.ctx.getImageData(0, 0, width, height);
        const canvas = document.createElement('canvas');
        canvas.width = data.width;
        canvas.height = data.height;

        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(data, 0, 0);

        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.setAttribute("download", "5000choyen.png");

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
