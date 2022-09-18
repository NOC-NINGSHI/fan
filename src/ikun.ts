const FRAME = 1000 / 60

const TOUCH_EVENT = 1
const MOUSE_EVENT = 2

const EVENT_TYPE: Record<string, number> = {
    touchstart: TOUCH_EVENT,
    touchmove: TOUCH_EVENT,
    touchend: TOUCH_EVENT,
  
    mousedown: MOUSE_EVENT,
    mousemove: MOUSE_EVENT,
    mouseup: MOUSE_EVENT,
    mouseleave: MOUSE_EVENT
}

// 坐标旋转
const rotatePoint = (cx: number, cy: number, x: number, y: number, angle: number): {x: number, y: number} => {
    const radians = (Math.PI / 180) * angle
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx
    const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy
    return {
        x: nx, 
        y: ny
    }
}

class IKun {
    v = {
        r: 12, // 角度
        y: 2, // 高度
        t: 0, // 垂直速度
        w: 0, // 横向速度
        d: 0.988 // 衰减
    }
    inertia = 0.08 // 惯性
    sticky = 0.1 // 粘性
    maxR = 60 // 最大角度
    maxY = 110 // 最大高度

    last: number | null = null
    rotate = 0
    initiated: number | false = false
    pageX: number = 0

    container: HTMLElement
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    image: HTMLImageElement
    outline: HTMLDivElement
    audio: {
        transient: HTMLAudioElement
        dancing: HTMLAudioElement
        crazy: HTMLAudioElement
    }

    height = 800
    width = 500

    constructor(container: HTMLElement) {
        this.audio = {
            transient: new Audio('/j.mp3'),
            dancing: new Audio('/jntm.mp3'),
            crazy: new Audio('/ngm.mp3')
        }
        const {height, width} = this
        this.container = container
        container.style.position = 'relative'
        container.style.height = height + 'px'
        container.style.width = width + 'px'

        const image = this.image = new Image(197, 300)
        image.src = 'kun.png'

        const outline = this.outline = document.createElement('div')
        outline.style.position = 'absolute'
        outline.style.left = '50%'
        outline.style.top = '50%'
        outline.style.transform = 'translate(-50%, -50%)'
        outline.appendChild(image)

        const canvas = this.canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'

        const context = this.context = canvas.getContext('2d')!
        context.setTransform(1, 0, 0, 1, 0, 0)

        this.mount()
    }

    mount() {
        const {outline, container} = this

        outline.addEventListener('mousedown', this.start)
        outline.addEventListener('touchstart', this.start)
        document.addEventListener('mousemove', this.move)
        document.addEventListener('touchmove', this.move)
        document.addEventListener('mouseup', this.end)
        document.addEventListener('mouseleave', this.end)
        document.addEventListener('touchcancel', this.end)
        document.addEventListener('touchend', this.end)

        container.appendChild(outline)
        container.appendChild(this.canvas)
    }

    dispose = () => {
        const {outline, container} = this

        outline.removeEventListener('mousedown', this.start)
        outline.removeEventListener('touchstart', this.start)
        document.removeEventListener('mousemove', this.move)
        document.removeEventListener('touchmove', this.move)
        document.removeEventListener('mouseup', this.end)
        document.removeEventListener('mouseleave', this.end)
        document.removeEventListener('touchcancel', this.end)
        document.removeEventListener('touchend', this.end)

        container.removeChild(outline)
        container.removeChild(this.canvas)
    }

    start = (event: TouchEvent | MouseEvent) => {
        event.preventDefault()
        const eventType = EVENT_TYPE[event.type]
        if (this.initiated && this.initiated !== eventType) {
            return
        }
        this.initiated = eventType

        const touch = 'targetTouches' in event ? event.touches[0] : event
        this.pageX = touch.pageX

        // 确保通过用户触发事件获得音频播放授权
        const {transient, dancing, crazy} = this.audio
        transient.muted = false
        dancing.muted = false
        crazy.muted = false
    }

    move = (event: TouchEvent | MouseEvent) => {
        event.preventDefault()
        if (EVENT_TYPE[event.type] !== this.initiated) {
            return
        }

        const touch = 'targetTouches' in event ? event.touches[0] : event
        const rect = this.container.getBoundingClientRect()
        const leftCenter = rect.left + rect.width / 2
        const { pageX, pageY } = touch

        const x = pageX - leftCenter
        let y = pageY - this.pageX
       
        let r = x * this.sticky

        r = Math.max(-this.maxR, r)
        r = Math.min(this.maxR, r)

        y = y * this.sticky * 2

        y = Math.max(-this.maxY, y)
        y = Math.min(this.maxY, y)

        this.v.r = r
        this.v.y = y
        this.v.w = 0
        this.v.t = 0

        this.draw()
    }

    end = (event: TouchEvent | MouseEvent) => {
        event.preventDefault()
        if (EVENT_TYPE[event.type] !== this.initiated) {
            return
        }
        this.initiated = false
        this.run()
        this.play()
    }

    play = () => {
        const {transient, dancing, crazy} = this.audio
        if (Math.abs(this.v.r) <= 4) {
            transient.play()
        }
        if (Math.abs(this.v.r) > 4 && Math.abs(this.v.r) <= 30) {
            dancing.play()
        }
        if (Math.abs(this.v.r) > 30) {
            crazy.play()
        }
    }

    draw = () => {
        const { r, y } = this.v
        const x = r * 1
        this.image.style.transform = `rotate(${r}deg) translateX(${x}px) translateY(${y}px)`

        const {context, canvas} = this
        const {width, height} = canvas

        context.clearRect(0, 0, width, height)
        context.save()
    
        context.strokeStyle = '#182562'
        context.lineWidth = 10
    
        context.beginPath()
        context.translate(
            width / 2 ,
            640 // height - 160
        )
        context.moveTo(
            0,
            140
        )
    
        const cx = 0
        const cy = -100
    
        const n = rotatePoint(
            cx,
            cy,
            x,
            -y,
            r
        )
    
        const nx = n.x
        const ny = -n.y - 100
        
        context.quadraticCurveTo(
            0,
            75,
            nx,
            ny
        )

        context.stroke()
        context.restore()
    }

    run = () => {
        if(this.initiated) {
            return
        }

        const now = Date.now()

        if (!this.last) {
            this.last = now
            return
        }

        let i = this.inertia
        const delta = now - this.last
        if(delta < 16){ // 如果单帧间隔超过 16ms 那就躺平不处理
            i = i / FRAME * delta
        }
        this.last = now
        
        let { r, y, t, w, d } = this.v

        w = w - r * 2 - this.rotate
        r = r + w * i * 1.2
        this.v.w = w * d
        this.v.r = r

        t = t - y * 2
        y = y + t * i * 2
        this.v.t = t * d
        this.v.y = y

        // 小于一定动作时停止重绘 #20
        if(
            Math.max(
                Math.abs(this.v.w),
                Math.abs(this.v.r),
                Math.abs(this.v.t),
                Math.abs(this.v.y)
            ) < 0.1
        ) {
            return
        }

        this.draw()
        requestAnimationFrame(this.run)
    }
}

export default IKun